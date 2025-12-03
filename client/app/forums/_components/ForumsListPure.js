/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ForumsProvider, useForumsList } from "@/hooks/use-forums";
import { useSearchParams } from "next/navigation";
import PostCard from "./PostCard";

/** ---------- Tag 正規化（盡量涵蓋後端不同欄位） ---------- */
function normTagsFromAny(cand) {
  if (!cand) return [];
  if (Array.isArray(cand)) {
    return cand
      .map((t) =>
        typeof t === "string"
          ? t
          : t?.name || t?.tag_name || t?.title || t?.label || ""
      )
      .map((s) => String(s).replace(/^#/, "").trim())
      .filter(Boolean);
  }
  if (typeof cand === "string") {
    try {
      const arr = JSON.parse(cand);
      if (Array.isArray(arr)) return normTagsFromAny(arr);
    } catch {}
    return cand
      .split(/,|\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
function pickTagsFromPost(p) {
  const cands = [
    p?.tags,
    p?.post_tags,
    p?.tag_list,
    p?.tag_names,
    p?.tags_json,
  ];
  for (const c of cands) {
    const arr = normTagsFromAny(c);
    if (arr.length) return arr;
  }
  return [];
}

/** ---------- Content 取值 + 轉純文字 ---------- */
function pickContentFromPost(p) {
  // 盡量涵蓋不同欄位命名
  return p?.content ?? p?.body ?? p?.post_content ?? p?.text ?? "";
}

function tiptapToText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(tiptapToText).join(" ");
  let out = "";
  if (node.type === "text" && node.text) out += node.text;
  if (node.content && Array.isArray(node.content)) {
    out += " " + node.content.map(tiptapToText).join(" ");
  }
  return out;
}

function toPlainText(any) {
  if (!any) return "";
  // 字串：先試 JSON；否則去除 [img] 與 HTML tag
  if (typeof any === "string") {
    const s = any.trim();
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        const obj = JSON.parse(s);
        return toPlainText(obj);
      } catch {}
    }
    return s
      .replace(/\[img\]/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  // 物件（可能是 Tiptap doc）
  if (typeof any === "object") {
    const txt = tiptapToText(any);
    return String(txt).replace(/\s+/g, " ").trim();
  }
  return String(any || "").trim();
}

/** API base（沿用你專案） */
const API_FORUMS = "http://localhost:3005/api/forums";

// ★★★ 覆蓋整個 Inner 元件：改由後端排序，前端不再重排 ★★★
function Inner({ query }) {
  const { posts, isLoading, pagination, list } = useForumsList();
  const searchParams = useSearchParams();

  const q = (searchParams.get("q") || "").trim();
  const sort = (searchParams.get("sort") || "hot").toLowerCase(); // 傳給後端

  // 詳細資料快取（補 tags / contentText 給客端關鍵字過濾用）
  const [detailCache, setDetailCache] = useState({});

  // 穩定 query
  const stableQueryKey = useMemo(() => JSON.stringify(query || {}), [query]);
  const stableQueryRef = useRef(query || {});
  useEffect(() => {
    stableQueryRef.current = query || {};
  }, [query]);

  // 初次載入/分類變更 → 抓第 1 頁（由後端排序）
  // 在 Inner 裡的這個 useEffect 改成下面這版
  useEffect(() => {
    list({
      ...stableQueryRef.current,
      page: 1,
      per_page: 20,
      sort, // hot / new
      q: q || undefined, // ★ 把搜尋字一起丟給後端
    });
  }, [list, stableQueryKey, sort, q]); // ★ 記得把 q 放進相依

  // 補抓單篇細節（供 q 過濾）
  useEffect(() => {
    let alive = true;
    if (!q || !Array.isArray(posts) || posts.length === 0) return;

    const idsToFetch = [];
    for (const p of posts) {
      const hasTags = pickTagsFromPost(p).length > 0;
      const rawContent = pickContentFromPost(p);
      const hasContentText = toPlainText(rawContent).length > 0;
      const cached = detailCache[p.id];

      const needTags = !hasTags && !(cached && Array.isArray(cached.tags));
      const needContent = !hasContentText && !(cached && cached.contentText);

      if (needTags || needContent) idsToFetch.push(p.id);
      if (idsToFetch.length >= 20) break;
    }
    if (idsToFetch.length === 0) return;

    (async () => {
      try {
        const results = await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const res = await fetch(`${API_FORUMS}/posts/${id}`, {
                cache: "no-store",
                credentials: "include",
              });
              const json = await res.json().catch(() => null);
              const data = json?.data || {};
              const tags = normTagsFromAny(data?.tags || []);
              const contentText = toPlainText(
                pickContentFromPost(data) || data?.content || data?.body
              );
              return { id, tags, contentText };
            } catch {
              return null;
            }
          })
        );
        if (!alive) return;
        const patch = {};
        for (const r of results) if (r && r.id) patch[r.id] = r;
        setDetailCache((prev) => ({ ...prev, ...patch }));
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, [posts, q, detailCache]);

  // 客端關鍵字過濾（不改變原有順序）
  const filtered = useMemo(() => {
    if (!Array.isArray(posts) || posts.length === 0) return [];
    const keys = q
      .toLowerCase()
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (keys.length === 0) return posts;

    return posts.filter((p) => {
      const title = String(p?.title || "").toLowerCase();
      const tagList = (
        pickTagsFromPost(p).length > 0
          ? pickTagsFromPost(p)
          : detailCache[p.id]?.tags || []
      ).map((s) => s.toLowerCase());

      const contentText =
        toPlainText(pickContentFromPost(p)) ||
        String(detailCache[p.id]?.contentText || "");
      const content = contentText.toLowerCase();

      return keys.every(
        (k) =>
          title.includes(k) ||
          content.includes(k) ||
          tagList.some((t) => t.includes(k))
      );
    });
  }, [posts, q, detailCache]);

  // 無限卷動（放慢觸發）
  const loaderRef = useRef(null);
  const lastLoadAtRef = useRef(0);
  const pendingTimerRef = useRef(null);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const COOLDOWN_MS = 800;
    const DELAY_MS = 200;

    const observer = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (!ent || !ent.isIntersecting) {
          if (pendingTimerRef.current) {
            clearTimeout(pendingTimerRef.current);
            pendingTimerRef.current = null;
          }
          return;
        }
        if (isLoading) return;

        const now = Date.now();
        if (now - lastLoadAtRef.current < COOLDOWN_MS) return;

        const pg = Number(pagination?.page || 1);
        const pages = Number(pagination?.pages || 1);
        const per = Number(pagination?.per_page || 20);
        if (pg >= pages) return;

        pendingTimerRef.current = setTimeout(async () => {
          if (!loaderRef.current) return;
          const rect = loaderRef.current.getBoundingClientRect();
          const vh =
            window.innerHeight || document.documentElement.clientHeight;
          const stillVisible = rect.top < vh && rect.bottom >= 0;
          if (!stillVisible) return;

          lastLoadAtRef.current = Date.now();
          // 在 IntersectionObserver 的 setTimeout 裡，list(...) 改成這版
          await list({
            ...(stableQueryRef.current || {}),
            page: pg + 1,
            per_page: per,
            sort, // 維持同一排序
            q: q || undefined, // ★ 也把搜尋字一起丟
            append: true,
          });
        }, DELAY_MS);
      },
      { rootMargin: "0px 0px 80px 0px", threshold: 1.0 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [list, isLoading, pagination, stableQueryKey, sort]);

  // if (!filtered || filtered.length === 0) return null;

  return (
    <>
      {filtered.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      <div ref={loaderRef} style={{ height: 1 }} />
    </>
  );
}

export default function ForumsListPure(props) {
  return (
    <ForumsProvider>
      <Inner {...props} />
    </ForumsProvider>
  );
}
