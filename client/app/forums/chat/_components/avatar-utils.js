/* eslint-disable @next/next/no-img-element */
/**
 * 統一頭像處理：
 * - 空值 → /images/default-avatar.svg
 * - /images/...（含任何主機的 /images/default-avatar.svg）→ 回相對路徑 /images/default-avatar.svg（走前端）
 * - http/https → 原樣
 * - 檔名或相對路徑 → 視為後端上傳檔，補到 http://localhost:3005
 * 另提供 useAvatarSrc() 讓 404 後能「黏住」fallback，不被 re-render 蓋回。
 */

import { useEffect, useState } from "react";

export const DEFAULT_AVATAR = "/images/default-avatar.svg";

// 判斷是否為前端內建圖
function isClientBuiltinImage(u) {
  if (!u) return false;
  const s = String(u).trim();
  if (s.includes("/images/default-avatar.svg")) return true;
  if (s.startsWith("/images/")) return true;
  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      return url.pathname.startsWith("/images/");
    } catch {}
  }
  return false;
}

function getApiOrigin() {
  if (typeof window !== "undefined" && window.__API_ORIGIN__) {
    return window.__API_ORIGIN__;
  }
  return "http://localhost:3005";
}

/** 單次計算：把任意輸入轉成可用的頭像 URL（不處理 404 黏住） */
export function srcOrDefault(input) {
  if (!input) return DEFAULT_AVATAR;
  const s = String(input).trim();

  // 任何 /images/... 都視為前端資源 → 回相對路徑，避免被拼到 3005
  if (isClientBuiltinImage(s)) return DEFAULT_AVATAR;

  // 絕對網址
  if (/^https?:\/\//i.test(s)) return s;

  // 上傳檔：檔名 → /uploads/avatars/<file>
  let path = s;
  if (!path.includes("/")) path = `/uploads/avatars/${path}`;
  if (!path.startsWith("/")) path = `/${path}`;

  return `${getApiOrigin()}${path}`;
}

/**
 * Hook：提供能「黏住 fallback」的 src/onError
 * 用法：
 *   const { src, onError } = useAvatarSrc(avatar);
 *   <img src={src} onError={onError} ... />
 */
export function useAvatarSrc(input) {
  const [broken, setBroken] = useState(false);

  // 來源改變時，重置壞圖狀態
  useEffect(() => {
    setBroken(false);
  }, [input]);

  const src = broken ? DEFAULT_AVATAR : srcOrDefault(input);
  const onError = () => setBroken(true);

  return { src, onError, broken };
}

/**
 * 舊有 onError 的相容函式（不保證在頻繁 re-render 下「黏住」）
 * 建議逐步改用 useAvatarSrc。
 */
export function onAvatarError(e) {
  const img = e?.currentTarget;
  if (!img || img.dataset.fallback === "1") return;
  img.dataset.fallback = "1";
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    img.src = origin ? `${origin}${DEFAULT_AVATAR}` : DEFAULT_AVATAR;
  } catch {
    img.src = DEFAULT_AVATAR;
  }
}
