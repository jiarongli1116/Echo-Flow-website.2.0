/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation"; // ★ 新增
import styles from "../forums.module.css";
import ArticleActionBar from "./ArticleActionBar";
import { formatWhen } from "../utils/date"; // 時間顯示用
import { useEffect, useState } from "react"; // ★ 新增

/** 把相對/裸路徑補成完整網址（預設指到 3005） */
function withHost(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const u = url.startsWith("/") ? url : `/${url}`;
  return `http://localhost:3005${u}`;
}

// ★ 新增：本地頭像工具（forums 專用，與 UserHeader 同規則）
const DEFAULT_AVATAR = "/images/default-avatar.svg";

// 將後端的 avatar 欄位轉成可用 URL；空值直接回傳預設頭像
function resolveAvatar(input) {
  if (!input) return DEFAULT_AVATAR;

  let s = String(input).trim();
  if (!s) return DEFAULT_AVATAR;

  // 絕對網址直接用
  if (/^https?:\/\//i.test(s)) return s;

  // 僅檔名 → /uploads/avatars/<檔名>
  if (!s.includes("/")) s = `/uploads/avatars/${s}`;
  // 相對路徑補斜線
  if (!s.startsWith("/")) s = `/${s}`;

  const origin =
    (typeof window !== "undefined" && window.__API_ORIGIN__) ||
    "http://localhost:3005";

  return `${origin}${s}`;
}

/** 依固定寬度產生 srcset（180/360/540）。伺服器若未處理 ?w= 仍可用。 */
function buildSrcSet(url, baseWidth = 180) {
  const mk = (w) => {
    const u = new URL(withHost(url));
    u.searchParams.set("w", String(w));
    return `${u.href} ${w}w`;
  };
  return [mk(baseWidth), mk(baseWidth * 2), mk(baseWidth * 3)].join(", ");
}

export default function PostCard({ post = {} }) {
  const router = useRouter(); // ★ 新增

  // 後端資料映射（不動你的 DOM/class）
  const title = post.title ?? "文章標題";
  const content = post.content ?? "";
  const board = post.category_name ?? "看板";

  const authorId = Number(
    post?.users_id ?? post?.author_id ?? post?.author?.id ?? 0
  ); // ★ 新增
  const authorName = post?.author?.nickname ?? post?.author_nickname ?? "匿名";
  const authorAvatarRaw = post?.author?.avatar ?? post?.author_img ?? ""; // DB 可能是檔名
  // ★ 頭像：預設先顯示 default，背景預載成功才切換
  const [authorAvatarSrc, setAuthorAvatarSrc] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    const url = resolveAvatar(authorAvatarRaw);

    // 空值或預設 → 維持預設，不切換，避免閃爍
    if (!url || url === DEFAULT_AVATAR) {
      setAuthorAvatarSrc(DEFAULT_AVATAR);
      return;
    }

    let canceled = false;
    const img = new Image();
    img.onload = () => {
      if (!canceled) setAuthorAvatarSrc(url);
    };
    img.onerror = () => {
      if (!canceled) setAuthorAvatarSrc(DEFAULT_AVATAR);
    };
    img.src = url;

    return () => {
      canceled = true;
    };
  }, [authorAvatarRaw]);

  // ★ 時間顯示改用 utils/date.js
  const createTimeText = formatWhen(post.created_at);

  // 文字預覽：移除 [img] 代碼
  const excerpt = String(content || "")
    .replace(/\[img\]/gi, "")
    .trim();

  const likes = Number(post.likes ?? post.like_count ?? 0);
  const comments = Number(post.comments ?? post.comment_count ?? 0);
  const bookmarks = Number(post.bookmarks ?? post.bookmark_count ?? 0);

  // 看板 icon 來自 DB 的 categories.icon
  const boardIcon = post.category_icon
    ? withHost(post.category_icon)
    : "/forums/icon/default.svg";

  // 縮圖列（最多 6 張）
  const images = Array.isArray(post.images)
    ? post.images.slice(0, 6).map(withHost)
    : [];

  const href = `/forums/${post.id}`;

  // ★ 作者名稱點擊：阻止外層文章 Link，導去 /forums/info?id=<uid>
  const goAuthor = (e) => {
    if (!authorId) return;
    e.preventDefault();
    e.stopPropagation();
    router.push(`/forums/info?id=${authorId}`);
  };

  const goAuthorByKey = (e) => {
    if (!authorId) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/forums/info?id=${authorId}`);
    }
  };

  return (
    <article className={styles.forusPostCard}>
      {/* 外層文章連結：維持 header + body 皆可點 */}
      <Link
        href={href}
        className={styles.forusToplink}
        style={{ display: "block" }}
        aria-label={`查看〈${title}〉`}
      >
        <header className={styles.forusPostHeader}>
          <div className={styles.forusAvatar}>
            {/* 背景圓：分類 icon */}
            <img
              className={styles.forusAvatarBg}
              src={boardIcon}
              alt=""
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            {/* 徽章：作者頭像 */}
            <img
              className={styles.forusAvatarBadge}
              src={authorAvatarSrc} // ★ 使用預載後的安全來源
              alt=""
              width={24}
              height={24}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>

          <div className={styles.forusPostMeta}>
            <div className={styles.forusMetaBoard}>{board}</div>
            <div className={styles.forusMetaSub}>
              <span className={styles.forusMetaAuthor}>
                {/* ★ 這裡改成可點的「偽連結」：避免 Link 巢狀 */}
                <span
                  role="link"
                  tabIndex={authorId ? 0 : -1}
                  className={styles.forusAuthorLink}
                  onClick={goAuthor}
                  onKeyDown={goAuthorByKey}
                  aria-disabled={!authorId}
                  aria-label={
                    authorId ? `前往 ${authorName} 的個人頁` : undefined
                  }
                >
                  {authorName}
                </span>
              </span>
              <span className={styles.forusDot}>•</span>
              <span className={styles.forusMetaTime}>{createTimeText}</span>
            </div>
          </div>
        </header>

        <div className={styles.forusPostBody}>
          <div className={styles.forusPostTitleText}>{title}</div>
          <p className={styles.forusPostExcerpt}>{excerpt}</p>

          {images.length > 0 && (
            <div className={styles.forusPhotoStrip}>
              {images.map((src, i) => {
                // 原始 src 要保留，srcset 供裝置選更合適的寬度
                const srcSet = buildSrcSet(src, 180);
                return (
                  <img
                    key={i}
                    className={styles.forusPhotoThumb}
                    src={src}
                    srcSet={srcSet}
                    sizes="180px" // 此縮圖在卡片內寬度固定為 180px
                    alt=""
                    width={180}
                    height={150}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                );
              })}
            </div>
          )}
        </div>
      </Link>

      <ArticleActionBar
        articleId={post.id}
        initialCounts={{ likes, comments, bookmarks }}
      />
    </article>
  );
}
