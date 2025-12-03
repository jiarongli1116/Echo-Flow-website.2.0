/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo } from "react";
import styles from "./follow-user-card.module.css";

/**
 * FollowUserCard
 * - Info 鈕：連到 /forums/info?id=:id
 * - 聊天鈕：連到 /forums/chat?open=create&members=:id  （方案 B：query 帶預選成員）
 * - 頭像預設：/images/default-avatar.svg；僅在實際圖片載入成功後才切換
 */

const DEFAULT_AVATAR = "/images/default-avatar.svg";

/** 與論壇既有規則一致：把相對頭像轉成可用 URL（含僅檔名 → /uploads/avatars/ 機制） */
function normalizeAvatar(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  let path = String(url).trim();
  // 僅檔名 → /uploads/avatars/<檔名>
  if (!path.includes("/")) path = `/uploads/avatars/${path}`;
  // 相對路徑補斜線
  if (!path.startsWith("/")) path = `/${path}`;

  // 後端靜態檔在 3005
  return `http://localhost:3005${path}`;
}

/** 顯示用名稱挑選（盡量容錯，避免 undefined） */
function pickName(u) {
  if (!u) return "";
  return (
    u.nickname ||
    u.name ||
    u.username ||
    u.display_name ||
    (u.id ? `U${u.id}` : "")
  );
}

/** 安全取 ID（對應不同欄位命名） */
function pickId(u) {
  if (!u) return 0;
  return Number(u.id ?? u.user_id ?? u.users_id ?? 0) || 0;
}

export default function FollowUserCard({ user }) {
  const uid = useMemo(() => pickId(user), [user]);
  const name = useMemo(() => pickName(user), [user]);

  // 頭像預載：預設 SVG，載入成功才換
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  useEffect(() => {
    const raw = user?.img || user?.avatar || user?.photo || user?.picture || "";
    const url = normalizeAvatar(raw);
    if (!url) {
      setAvatar(DEFAULT_AVATAR);
      return;
    }
    let ok = true;
    const img = new Image();
    img.onload = () => ok && setAvatar(url);
    img.onerror = () => ok && setAvatar(DEFAULT_AVATAR);
    img.src = url;
    return () => {
      ok = false;
    };
  }, [user]);

  const infoHref = uid > 0 ? `/forums/info?id=${uid}` : "#";

  // 方案 B：帶 query 到聊天頁，進頁自動開「建立聊天」並預選該成員
  const chatHref = uid > 0 ? `/forums/chat?open=create&members=${uid}` : "#";

  return (
    <div className={styles.forusFollowCard}>
      {/* 左：頭像 + 名稱 */}
      <div className={styles.forusProfile}>
        <img
          src={avatar}
          alt={name || "avatar"}
          className={styles.forusAvatar}
          width="56"
          height="56"
        />
        <a className={styles.forusUserName} href={infoHref}>
          {name || "未命名使用者"}
        </a>
      </div>

      {/* 右：動作按鈕（樣式沿用本模組） */}
      <div className={styles.forusActions}>
        <a
          className={`${styles.forusActionBtn} ${styles.forusFollowBtn}`}
          href={infoHref}
        >
          已追蹤
        </a>

        {/* 聊天：導到 /forums/chat?open=create&members=:id */}
        <a
          className={`${styles.forusActionBtn} ${styles.forusChatBtn}`}
          href={chatHref}
        >
          聊天
        </a>
      </div>
    </div>
  );
}
