"use client";

// 不用 next/image，避免遠端域名白名單問題
import styles from "../forums.module.css";
import { useEffect, useState } from "react";

// ★ 新增：本地頭像工具（forums 專用）
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

/**
 * UserHeader
 * - { user } 為主；可選 isFollowing / onFollow / onUnfollow / chatHref
 * - 未追隨：forusBtnFollow（黃底白字）
 * - 已追隨：forusBtnFollowed（維持你原本樣式）
 */
export default function UserHeader({
  user,
  isFollowing,
  onFollow,
  onUnfollow,
  chatHref,
}) {
  const u = user || {};
  // ★ 新增：預設頭像先顯示；背景預載真實圖，成功才切換
  const [displaySrc, setDisplaySrc] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    const url = resolveAvatar(u.avatar);

    // 空值或預設 → 直接維持預設，不切換，避免閃爍
    if (!url || url === DEFAULT_AVATAR) {
      setDisplaySrc(DEFAULT_AVATAR);
      return;
    }

    let canceled = false;
    const img = new Image();
    img.onload = () => {
      if (!canceled) setDisplaySrc(url); // 只有「成功載入」才切換
    };
    img.onerror = () => {
      if (!canceled) setDisplaySrc(DEFAULT_AVATAR); // 失敗就維持預設
    };
    img.src = url;

    return () => {
      canceled = true;
    };
  }, [u?.avatar]);

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const stats = u.stats || { posts: 0, followers: 0, following: 0 };

  const canControlFollow =
    typeof onFollow === "function" || typeof onUnfollow === "function";

  return (
    <section className={[styles.forusPostCard, styles.forusUserCard].join(" ")}>
      <div className={styles.forusUserHead}>
        <img
          className={styles.forusUserAvatar}
          src={displaySrc}           // ★ 使用預載後的安全來源
          alt="avatar"
          width="72"
          height="72"
          loading="lazy"
        />
        <h3 className={styles.forusUserName}>{u.name || "使用者"}</h3>
        {!!u.handle && <p className={styles.forusUserId}>{u.handle}</p>}
      </div>

      <div className={styles.forusUserStats}>
        <div className={styles.forusUserStat}>
          <div className={styles.forusUserStatNum}>{stats.posts}</div>
          <div className={styles.forusUserStatLabel}>文章</div>
        </div>
        <div className={styles.forusUserDivider}></div>
        <div className={styles.forusUserStat}>
          <div className={styles.forusUserStatNum}>{stats.followers}</div>
          <div className={styles.forusUserStatLabel}>追隨者</div>
        </div>
      </div>

      <div className={styles.forusUserFollowRow}>
        {canControlFollow ? (
          isFollowing ? (
            <button
              type="button"
              className={styles.forusBtnFollowed}
              onClick={onUnfollow}
            >
              已追隨
            </button>
          ) : (
            <button
              type="button"
              className={styles.forusBtnFollow}
              onClick={onFollow}
            >
              追隨
            </button>
          )
        ) : (
          <button type="button" className={styles.forusBtnFollowed}>
            已追蹤
          </button>
        )}

        <a href={chatHref || "#"} className={styles.forusBtnChat}>
          <i className="bi bi-chat-dots me-1" aria-hidden="true"></i> 發訊息
        </a>
      </div>
    </section>
  );
}
