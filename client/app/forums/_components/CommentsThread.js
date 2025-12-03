/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import astyles from "../article.module.css";
import { useForumPost } from "../../../hooks/use-forums";
import { formatWhen } from "../utils/date";

// 從多種可能欄位抓 userId 的輔助函式（保險用）
function getUserId(node) {
  return (
    node?.userId ?? node?.user?.id ?? node?.users_id ?? node?.user_id ?? null
  );
}

// ★ 新增：頭像工具（與 UserHeader / ArticleContent 同規則）
const DEFAULT_AVATAR = "/images/default-avatar.svg";
const PLACEHOLDER_HOST =
  /^https?:\/\/(?:placehold\.co|via\.placeholder\.com)(?:\/|$)/i;

function resolveAvatar(input) {
  if (!input) return DEFAULT_AVATAR;

  let s = String(input).trim();
  if (!s) return DEFAULT_AVATAR;

  // 任何 placeholder 網域 → 視為空值
  if (PLACEHOLDER_HOST.test(s)) return DEFAULT_AVATAR;

  // 外部完整網址
  if (/^https?:\/\//i.test(s)) return s;

  // 只有檔名 → /uploads/avatars/<檔名>
  if (!s.includes("/")) s = `/uploads/avatars/${s}`;
  // 相對路徑補起始斜線
  if (!s.startsWith("/")) s = `/${s}`;

  const origin =
    (typeof window !== "undefined" && window.__API_ORIGIN__) ||
    "http://localhost:3005";

  return `${origin}${s}`;
}

// ★ 新增：安全頭像（先顯示預設 → 背景預載成功才切換）
function SafeAvatar({
  src: raw,
  alt = "avatar",
  className,
  width = 40,
  height = 40,
}) {
  const [safeSrc, setSafeSrc] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    const url = resolveAvatar(raw);
    if (!url || url === DEFAULT_AVATAR) {
      setSafeSrc(DEFAULT_AVATAR);
      return;
    }
    let canceled = false;
    const img = new Image();
    img.onload = () => {
      if (!canceled) setSafeSrc(url);
    };
    img.onerror = () => {
      if (!canceled) setSafeSrc(DEFAULT_AVATAR);
    };
    img.src = url;
    return () => {
      canceled = true;
    };
  }, [raw]);

  return (
    <img
      className={className}
      src={safeSrc}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
    />
  );
}

/* 依 parent_id 組兩層樹（根樓/子樓） */
function buildTree(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const map = new Map(items.map((x) => [x.id, { ...x, children: [] }]));
  const roots = [];
  items.forEach((it) => {
    const n = map.get(it.id);
    const pid = it.parent_id || null;
    if (!pid) roots.push(n);
    else {
      const p = map.get(pid);
      (p ? p.children : roots).push(n);
    }
  });
  const cmp = (a, b) =>
    a.created_at === b.created_at
      ? (a.id || 0) - (b.id || 0)
      : a.created_at < b.created_at
      ? -1
      : 1; // ★ 升冪穩定
  const sortRec = (arr) => {
    arr.sort(cmp);
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/* 建立樓層編號與 root 對照 */
function buildFloorMaps(roots = []) {
  const floorOf = new Map(); // id -> "B1" | "B1-1"
  const rootOf = new Map(); // id -> rootId
  roots.forEach((r, i) => {
    const base = `B${i + 1}`;
    floorOf.set(r.id, base);
    rootOf.set(r.id, r.id);
    (r.children || []).forEach((c, j) => {
      floorOf.set(c.id, `${base}-${j + 1}`);
      rootOf.set(c.id, r.id);
    });
  });
  return { floorOf, rootOf };
}

/* 子樓 */
function CommentNode({
  node,
  label, // Bx-y
  replyToLabel, // 「回覆 Bx-y」（藍字）
  parentLabel, // 根樓 Bx
  onReply,
}) {
  const uid = getUserId(node);

  return (
    <li className={astyles.comment} style={{ marginLeft: 16 }}>
      <SafeAvatar
        className={astyles.avatar}
        src={node.user.avatar} // ★ 原值
        alt={`${node.user.name} 頭像`}
        width={40}
        height={40}
      />
      <div className={astyles.cBody}>
        <div className={astyles.cMeta}>
          {uid ? (
            <a href={`/forums/info?id=${uid}`} className={astyles.cUser}>
              <strong>{node.user.name}</strong>
            </a>
          ) : (
            <strong>{node.user.name}</strong>
          )}
          <span className={astyles.cTime}>　{node.timeText}</span>
          <span className={astyles.floorTag}>{label}</span>
        </div>

        <div className={astyles.replyMeta}>
          回覆{" "}
          <span className={astyles.floorLink}>
            {replyToLabel || parentLabel}
          </span>
        </div>

        <p
          className={astyles.cText}
          style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
        >
          {node.text}
        </p>

        <div className={astyles.cActions}>
          <button
            type="button"
            className={astyles.cBtn}
            onClick={() => onReply?.(node)}
          >
            <i className="bi bi-chat" aria-hidden="true"></i> 回覆
          </button>
        </div>
      </div>
      <div aria-hidden="true"></div>
    </li>
  );
}

export default function CommentsThread({
  articleId,
  initialComments = [],
  totalCount = 0,
  onReplyToChange, // { parentId, targetId, label, nickname }
}) {
  const { commentsMap, commentsList } = useForumPost();

  // 預設折疊子樓（全部隱藏）
  const [expanded, setExpanded] = useState(() => new Set());

  // 第 1 頁（後端回傳順序不一定，前端會升冪重排）
  // 一次撈 500（後端也已放寬上限到 500）
  useEffect(() => {
    if (articleId)
      commentsList(articleId, { page: 1, limit: 500, append: false });
  }, [articleId, commentsList]);

  const { flat, roots, floorOf, rootOf, page, pages, total, isLoading } =
    useMemo(() => {
      const bucket = commentsMap[articleId] || {};
      const raw =
        Array.isArray(bucket.items) && bucket.items.length
          ? bucket.items
          : initialComments;

      // ★ 關鍵修正：把 userId 放進 flat，來源多重後備
      const flat = [...raw]
        .map((c) => ({
          id: c.id,
          parent_id: c.parent_id ?? null,
          reply_to_comment_id: c.reply_to_comment_id ?? null,
          userId: c.author?.id ?? c.user?.id ?? c.users_id ?? c.user_id ?? null,
          user: {
            name: c.author?.nickname || "匿名",
            // ★ 改存原值，由 SafeAvatar 負責解析/預載/回退
            avatar:
              c.author?.avatar ??
              c.user?.avatar ??
              c.author_img ??
              c.user_img ??
              "",
          },
          timeText: formatWhen(c.created_at),
          text: c.content,
          created_at: c.created_at,
        }))
        .sort((a, b) =>
          a.created_at === b.created_at
            ? (a.id || 0) - (b.id || 0)
            : a.created_at < b.created_at
            ? -1
            : 1
        );

      const tree = buildTree(flat);
      const maps = buildFloorMaps(tree);

      const withDecorations = tree.map((r) => ({
        ...r,
        __floorLabel: maps.floorOf.get(r.id),
        replies: (r.children || []).map((c) => ({
          ...c,
          __floorLabel: maps.floorOf.get(c.id),
          __replyToLabel: c.reply_to_comment_id
            ? maps.floorOf.get(c.reply_to_comment_id)
            : null,
        })),
      }));

      const p = bucket.pagination?.page ?? 1;
      const ps = bucket.pagination?.pages ?? 1;
      const t = bucket.pagination?.total ?? totalCount ?? flat.length;

      return {
        flat,
        roots: withDecorations,
        ...maps,
        page: p,
        pages: ps,
        total: t,
        isLoading: !!bucket.isLoading,
      };
    }, [commentsMap, articleId, initialComments, totalCount]);

  const hasNext = false; // 一次撈滿，不再有下一頁

  // 點回覆：帶 parentId（根樓）與 targetId（被點那一則，可能是 B1-1）
  const onReply = useCallback(
    (node) => {
      const parentId = rootOf.get(node.id) || node.id;
      const displayLabel = floorOf.get(node.id) || "";
      const nickname = node.user?.name || "匿名";
      onReplyToChange?.({
        parentId,
        targetId: node.id,
        label: displayLabel,
        nickname,
      });
    },
    [floorOf, rootOf, onReplyToChange]
  );

  const toggleExpand = useCallback((rootId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }, []);

  return (
    <section className={astyles.comments} aria-label="留言串">
      <div className={astyles.commentsHead}>
        <div>全部回應（{total}）</div>
      </div>

      <ul className="list-unstyled m-0">
        {roots.length > 0 ? (
          roots.map((root) => {
            const isOpen = expanded.has(root.id);
            const allChildren = root.replies || [];

            // ★ 你的規格：預設子樓全部隱藏（包含第一則）
            const firstOnly = allChildren.slice(0, 0);
            const restCount = allChildren.length; // 直接就是全部子樓數

            const rootUid = getUserId(root);

            return (
              <li key={root.id} className={astyles.comment}>
                <SafeAvatar
                  className={astyles.avatar}
                  src={root.user.avatar} // ★ 原值
                  alt={`${root.user.name} 頭像`}
                  width={40}
                  height={40}
                />
                <div className={astyles.cBody}>
                  <div className={astyles.cMeta}>
                    {rootUid ? (
                      <a
                        href={`/forums/info?id=${rootUid}`}
                        className={astyles.cUser}
                      >
                        <strong>{root.user.name}</strong>
                      </a>
                    ) : (
                      <strong>{root.user.name}</strong>
                    )}
                    <span className={astyles.cTime}>　{root.timeText}</span>
                    <span className={astyles.floorTag}>
                      {root.__floorLabel}
                    </span>
                  </div>

                  <p className={astyles.cText}>{root.text}</p>

                  <div className={astyles.cActions}>
                    <button
                      type="button"
                      className={astyles.cBtn}
                      onClick={() => onReply(root)}
                    >
                      <i className="bi bi-chat" aria-hidden="true"></i> 回覆
                    </button>
                  </div>

                  {/* ★ 子樓控制鈕在最上面；即使只有 1 則也要顯示 */}
                  {allChildren.length > 0 && !isOpen && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className={astyles.viewMoreBtn}
                        onClick={() => toggleExpand(root.id)}
                      >
                        查看其他留言（{restCount}）
                      </button>
                    </div>
                  )}
                  {isOpen && allChildren.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className={astyles.viewMoreBtn}
                        onClick={() => toggleExpand(root.id)}
                      >
                        收合留言
                      </button>
                    </div>
                  )}

                  {/* 子樓列表（未展開：0 則；展開：全部） */}
                  {(isOpen ? allChildren : firstOnly).length > 0 && (
                    <ul className="list-unstyled m-0" style={{ marginTop: 8 }}>
                      {(isOpen ? allChildren : firstOnly).map((child) => (
                        <CommentNode
                          key={child.id}
                          node={child}
                          label={child.__floorLabel}
                          replyToLabel={child.__replyToLabel}
                          parentLabel={root.__floorLabel}
                          onReply={onReply}
                        />
                      ))}
                    </ul>
                  )}
                </div>
                <div aria-hidden="true"></div>
              </li>
            );
          })
        ) : (
          <li className="text-muted small" style={{ padding: "4px 0" }}>
            還沒有留言
          </li>
        )}
      </ul>

      {isLoading && (
        <div style={{ padding: "8px 0", textAlign: "center", opacity: 0.7 }}>
          讀取中…
        </div>
      )}
      {!isLoading && flat.length > 0 && (
        <div style={{ padding: "8px 0", textAlign: "center", opacity: 0.5 }}>
          沒有更多留言了
        </div>
      )}
    </section>
  );
}
