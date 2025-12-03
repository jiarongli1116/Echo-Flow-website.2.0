"use client";

import astyles from "../article.module.css";
import styles from "../forums.module.css";
import { useEffect, useState } from "react"; // ★ 新增
import { formatWhen } from "../utils/date";

// ★ 新增：本地頭像工具（與 UserHeader 同步）
const DEFAULT_AVATAR = "/images/default-avatar.svg";
const PLACEHOLDER_HOST = /^https?:\/\/(?:placehold\.co|via\.placeholder\.com)(?:\/|$)/i; // ★ 新增

// 將後端的 avatar 欄位轉成可用 URL；空值直接回傳預設頭像
function resolveAvatar(input) {
  if (!input) return DEFAULT_AVATAR;

  let s = String(input).trim();
  if (!s) return DEFAULT_AVATAR;

  // ★ 只要是 placeholder 網域，一律改用站內預設圖
  if (PLACEHOLDER_HOST.test(s)) return DEFAULT_AVATAR;

  // 絕對網址 → 原樣
  if (/^https?:\/\//i.test(s)) return s;

  // 僅檔名 → /uploads/avatars/<檔名>
  if (!s.includes("/")) s = `/uploads/avatars/${s}`;
  // 相對路徑補上起始斜線
  if (!s.startsWith("/")) s = `/${s}`;

  const origin =
    (typeof window !== "undefined" && window.__API_ORIGIN__) ||
    "http://localhost:3005";

  return `${origin}${s}`;
}


/** 正規化 tags → 純字串陣列 */
function normTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) =>
      typeof t === "string" ? t : t?.name || t?.tag_name || t?.title || ""
    )
    .map((s) => String(s).replace(/^#/, "").trim())
    .filter(Boolean);
}

/** 文字 + [img] + images[] → 內容區塊
 *  - 保留空行
 *  - 但會「修剪」每張圖片**前後各一個**空行（避免編輯器自動插入的空段落造成多一行）
 */
function buildBlocks(content = "", images = []) {
  const parts = String(content).split(/\[img\]/i);
  const imgs = Array.isArray(images) ? images : [];
  const blocks = [];
  let imgIdx = 0;

  for (let segIdx = 0; segIdx < parts.length; segIdx++) {
    let lines = String(parts[segIdx] ?? "").split(/\r?\n/);

    // ★ 修剪：此段後面接著圖片 → 段尾空行移除（避免圖上方多一行）
    if (
      segIdx < parts.length - 1 &&
      lines.length &&
      lines[lines.length - 1] === ""
    ) {
      lines = lines.slice(0, -1);
    }
    // ★ 修剪：此段前面剛放過圖片 → 段首空行移除（避免圖下方多一行）
    if (segIdx > 0 && lines.length && lines[0] === "") {
      lines = lines.slice(1);
    }

    // 推進文字行（可為空行）
    for (const ln of lines) blocks.push({ type: "line", text: ln });

    // 插入圖片
    if (segIdx < parts.length - 1 && imgIdx < imgs.length) {
      blocks.push({ type: "img", src: imgs[imgIdx++] });
    }
  }

  if (!blocks.length) blocks.push({ type: "line", text: "" });
  return blocks;
}

export default function ArticleContent({
  title,
  author,
  timeText,
  content = "",
  images = [],
  tags = [],
  canManage = false,
}) {
  const tagNames = normTags(tags);
  const blocks = buildBlocks(content, images);
  // ★ 作者頭像：預設先顯示 default，背景預載成功才切換
  const [authorAvatarSrc, setAuthorAvatarSrc] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    const url = resolveAvatar(author?.avatar);

    // 空值或預設 → 維持預設，不切換，避免 SSR 閃爍
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
  }, [author?.avatar]);

  return (
    <>
      <div className={astyles.articleHead}>
        <a className={astyles.backBtn} href="/forums" aria-label="返回首頁">
          <i className="bi bi-arrow-left" aria-hidden="true"></i>
        </a>

        {/* 右上三點（僅作者顯示；Modal id = postDeleteModal） */}
        {canManage ? (
          <details className={astyles.moreWrap}>
            <summary className={astyles.moreBtn} aria-label="更多">
              <i className="bi bi-three-dots-vertical" aria-hidden="true" />
            </summary>
            <div className={astyles.moreMenu}>
              <button
                type="button"
                className={`${astyles.moreMenuItem} ${astyles.btnWarn}`}
                onClick={() =>
                  (window.location.href = `${window.location.pathname}/edit`)
                }
              >
                編輯貼文
              </button>
              <button
                type="button"
                className={`${astyles.moreMenuItem} ${astyles.btnDanger}`}
                data-bs-toggle="modal"
                data-bs-target="#postDeleteModal"
              >
                刪除貼文
              </button>
            </div>
          </details>
        ) : null}

        <div className={astyles.titleWrap}>
          <div className={astyles.articleTitle}>{title}</div>

          <div className={astyles.articleMeta}>
            <img
              className={astyles.metaAvatar}
              src={authorAvatarSrc} // ★ 使用預載後的安全來源
              alt="用戶頭像"
            />
            {author?.id ? (
              <a
                href={`/forums/info?id=${author.id}`}
                className={astyles.metaName}
              >
                {author?.name}
              </a>
            ) : (
              <span>{author?.name}</span>
            )}
            <span className={astyles.sep}>{formatWhen(timeText)}</span>
          </div>
        </div>
      </div>

      {/* 內文（p 與 figure），圖片上下不再多一行 */}
      <div className={astyles.articleText}>
        {blocks.map((b, i) =>
          b.type === "img" ? (
            <figure key={`img-${i}`} className={astyles.articleHero}>
              <img src={b.src} alt={`內文圖片 ${i + 1}`} />
            </figure>
          ) : (
            <p key={`p-${i}`}>{b.text}</p>
          )
        )}
      </div>

      {/* ★ 標籤保持在這裡（內文之後、按鈕列之前） */}
      {tagNames.length ? (
        <div className={styles.forusWriteTags} aria-label="文章標籤">
          {tagNames.map((t, i) => (
            <span key={`${t}-${i}`} className={styles.forusTag}>
              #{t}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
