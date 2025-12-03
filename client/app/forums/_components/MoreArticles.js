/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import astyles from "../article.module.css";
import styles from "../forums.module.css";

/** 轉成純文字標籤陣列（支援多種來源型態） */
function normalizeTags(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((t) =>
        typeof t === "string"
          ? t
          : t?.name || t?.tag_name || t?.title || t?.label || t?.tag || ""
      )
      .map((s) => String(s).replace(/^#/, "").trim())
      .filter(Boolean);
  }
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return normalizeTags(parsed);
    } catch {}
    return s
      .split(/[,\s]+/)
      .map((x) => x.replace(/^#/, "").trim())
      .filter(Boolean);
  }
  return [];
}

/** 把「join 列表的 row」依 post id 歸戶並彙整 tag */
function groupFromJoinRows(rows) {
  const map = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const id = r?.id ?? r?.post_id ?? r?.postId;
    if (!id) continue;
    let bucket = map.get(id);
    if (!bucket) {
      bucket = { id, title: r?.title ?? r?.post_title ?? "", tags: new Set() };
      map.set(id, bucket);
    }
    const t =
      r?.tag_name ||
      r?.tag ||
      r?.name ||
      (Array.isArray(r?.tags) ? r.tags : null);
    if (t) {
      if (Array.isArray(t)) {
        for (const one of normalizeTags(t)) bucket.tags.add(one);
      } else {
        const clean = String(t).replace(/^#/, "").trim();
        if (clean) bucket.tags.add(clean);
      }
    }
  }
  return Array.from(map.values()).map((b) => ({
    id: b.id,
    title: b.title,
    tags: Array.from(b.tags),
  }));
}

/** Fisher–Yates 洗牌 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * MoreArticles
 * - 固定顯示 2 篇文章
 * - 每篇文章最多顯示 3 個標籤
 * - 支援排除當前文章：excludeId
 * - ★ 只在資料有變動時才「抽樣一次」，避免留言造成重抽
 */
export default function MoreArticles({ items = [], excludeId = null }) {
  const [autoRows, setAutoRows] = useState([]);
  const [picks, setPicks] = useState([]); // ★ 把結果存成狀態
  const useExternal = Array.isArray(items) && items.length > 0;

  // 取資料：優先 /api/forums（含 join tag_name），失敗退 /posts
  useEffect(() => {
    if (useExternal) return;
    (async () => {
      async function safeFetch(url) {
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });
        const j = await res.json().catch(() => ({}));
        if (j?.status === "success" && Array.isArray(j.data)) return j.data;
        return null;
      }
      let rows =
        (await safeFetch("http://localhost:3005/api/forums")) ||
        (await safeFetch(
          "http://localhost:3005/api/forums/posts?per_page=50"
        )) ||
        [];
      setAutoRows(rows);
    })();
  }, [useExternal]);

  // 標準化清單並排除自己
  const normalizedList = useMemo(() => {
    let list = [];
    if (useExternal) {
      list = (items || []).map((it) => ({
        id: it.id ?? it.post_id ?? it.postId,
        title: it.title ?? "",
        tags: normalizeTags(
          it.tags ??
            it.post_tags ??
            it.tag_names ??
            it.tags_json ??
            it.tagList ??
            it.tag_list ??
            it.tags_str ??
            []
        ),
      }));
    } else {
      list = groupFromJoinRows(autoRows);
    }
    if (excludeId != null) {
      const ex = Number(excludeId);
      list = list.filter((it) => Number(it.id) !== ex);
    }
    return list;
  }, [useExternal, items, autoRows, excludeId]);

  // ★ 以「資料鍵」決定是否要重新抽樣（留言造成的 re-render 不會觸發）
  const dataKey = useMemo(() => {
    const ids = normalizedList.map((it) => it.id).join(",");
    return `${ids}|${excludeId ?? ""}`;
  }, [normalizedList, excludeId]);

  useEffect(() => {
    if (!normalizedList.length) {
      setPicks([]);
      return;
    }
    const arr = shuffle(normalizedList)
      .slice(0, 2)
      .map((it) => ({ ...it, tags: (it.tags || []).slice(0, 3) }))
      .filter((it) => it.id && it.title);
    setPicks(arr);
  }, [dataKey]); // ← 只有資料「真的換了」才重抽

  if (!picks.length) return null;

  return (
    <section aria-label="更多文章">
      <div className={astyles.moreTitle}>更多文章</div>
      <div className={astyles.moreGrid}>
        {picks.map((it) => (
          <a key={it.id} href={`/forums/${it.id}`} className={astyles.miniCard}>
            <div className={astyles.miniTitle}>{it.title}</div>
            {it.tags?.length ? (
              <div className={styles.forusWriteTags} style={{ marginTop: 8 }}>
                {it.tags.map((t, i) => (
                  <span key={`${t}-${i}`} className={styles.forusTag}>
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}
