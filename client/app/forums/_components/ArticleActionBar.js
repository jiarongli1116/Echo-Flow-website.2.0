/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "../forums.module.css";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const API_FORUMS = "http://localhost:3005/api/forums";

function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("reactLoginToken") || null;
  } catch {
    return null;
  }
}
function clamp(n) {
  const v = Number.isFinite(+n) ? +n : 0;
  return v < 0 ? 0 : v;
}

export default function ArticleActionBar({
  articleId,
  initialCounts = { likes: 0, bookmarks: 0, comments: 0 },
  className = "",
}) {
  const router = useRouter();

  const [counts, setCounts] = useState({
    likes: clamp(initialCounts.likes),
    bookmarks: clamp(initialCounts.bookmarks),
    comments: clamp(initialCounts.comments),
  });
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // 父層給的計數有變就同步
  useEffect(() => {
    setCounts({
      likes: clamp(initialCounts.likes),
      bookmarks: clamp(initialCounts.bookmarks),
      comments: clamp(initialCounts.comments),
    });
  }, [initialCounts.likes, initialCounts.bookmarks, initialCounts.comments]);

  // 以伺服器為準抓取（含個人旗標，需帶 token）
  const fetchPostState = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_FORUMS}/posts/${articleId}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json();
      if (json?.status !== "success" || !json?.data) return;

      const d = json.data;
      setCounts({
        likes: clamp(d.like_count ?? d.likes ?? 0),
        bookmarks: clamp(d.bookmark_count ?? d.bookmarks ?? 0),
        comments: clamp(d.comment_count ?? d.comments ?? 0),
      });

      if (token) {
        // 只有登入狀態才讀取個人旗標；未登入一律空心
        setLiked(
          !!(d.is_liked === 1 || d.is_liked === true || d.isLiked === true)
        );
        setSaved(
          !!(
            d.is_bookmarked === 1 ||
            d.is_bookmarked === true ||
            d.isBookmarked === true
          )
        );
      } else {
        setLiked(false);
        setSaved(false);
      }
    } catch (err) {
      // 靜默
      console.warn("fetchPostState failed:", err);
    }
  }, [articleId]);

  // 掛載時讀一次（登入中會拿到個人旗標；未登入則空心）
  useEffect(() => {
    if (!articleId) return;
    fetchPostState();
  }, [articleId, fetchPostState]);

  const goLogin = () => {
    if (typeof window !== "undefined")
      window.location.assign("http://localhost:3000/auth/login");
  };

  // 再撈一次（互動成功後校正）
  const refreshAll = useCallback(async () => {
    await fetchPostState();
  }, [fetchPostState]);

  const onLike = async () => {
    const token = getToken();
    if (!token) return goLogin();
    const prev = liked;
    const next = !prev;

    // 樂觀更新
    setLiked(next);
    setCounts((c) => ({ ...c, likes: clamp(c.likes + (next ? 1 : -1)) }));

    try {
      const res = await fetch(`${API_FORUMS}/posts/${articleId}/likes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== "success")
        throw new Error(json?.message || "按讚失敗");
      await refreshAll();
    } catch (err) {
      setLiked(prev);
      setCounts((c) => ({ ...c, likes: clamp(c.likes + (next ? -1 : 1)) }));
      toast.error(err?.message || "按讚失敗");
    }
  };

  const onSave = async () => {
    const token = getToken();
    if (!token) return goLogin();
    const prev = saved;
    const next = !prev;

    setSaved(next);
    setCounts((c) => ({
      ...c,
      bookmarks: clamp(c.bookmarks + (next ? 1 : -1)),
    }));

    try {
      const res = await fetch(`${API_FORUMS}/posts/${articleId}/bookmarks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== "success")
        throw new Error(json?.message || "收藏失敗");
      await refreshAll();
    } catch (err) {
      setSaved(prev);
      setCounts((c) => ({
        ...c,
        bookmarks: clamp(c.bookmarks + (next ? -1 : 1)),
      }));
      toast.error(err?.message || "收藏失敗");
    }
  };

  const onComment = () => router.push(`/forums/${articleId}`);

  const onLink = async () => {
    const url =
      typeof window !== "undefined"
        ? window.location.origin + `/forums/${articleId}`
        : `/forums/${articleId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("已複製連結");
    } catch {
      try {
        const ip = document.createElement("input");
        ip.value = url;
        document.body.appendChild(ip);
        ip.select();
        document.execCommand("copy");
        document.body.removeChild(ip);
        toast.success("已複製連結");
      } catch {}
    }
  };

  const wrapperClass =
    (className ? className + " " : "") + ("pt-2 " + styles.forusPostActions);

  return (
    <div className={wrapperClass}>
      <span
        className={styles.forusActionItem}
        role="button"
        onClick={onLike}
        aria-pressed={liked}
      >
        <i
          className={`bi ${liked ? "bi-heart-fill text-danger" : "bi-heart"}`}
          aria-hidden="true"
        ></i>
        <small>{counts.likes}</small>
      </span>

      <span
        className={styles.forusActionItem}
        role="button"
        onClick={onComment}
      >
        <i className="bi bi-chat" aria-hidden="true"></i>
        <small>{counts.comments}</small>
      </span>

      <span
        className={styles.forusActionItem}
        role="button"
        onClick={onSave}
        aria-pressed={saved}
      >
        <i
          className={`bi ${
            saved ? "bi-bookmark-fill text-warning" : "bi-bookmark"
          }`}
          aria-hidden="true"
        ></i>
        <small>{counts.bookmarks}</small>
      </span>

      <span
        className={styles.forusActionItem}
        role="button"
        onClick={onLink}
        aria-label="複製連結"
      >
        <i className="bi bi-link-45deg" aria-hidden="true"></i>
      </span>
    </div>
  );
}
