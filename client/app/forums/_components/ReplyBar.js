/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import astyles from "../article.module.css";
import { useForumPost } from "../../../hooks/use-forums";

const DEFAULT_AVATAR = "/images/default-avatar.svg"; // 統一預設
const PLACEHOLDER_HOST =
  /^https?:\/\/(?:placehold\.co|via\.placeholder\.com)(?:\/|$)/i; // 辨識 placeholder
const MAX_LEN = 50;

function resolveAvatar(input) {
  if (!input) return DEFAULT_AVATAR;

  let s = String(input).trim();
  if (!s) return DEFAULT_AVATAR;

  // 任何 placeholder 網域一律視為空值 → 用站內預設
  if (PLACEHOLDER_HOST.test(s)) return DEFAULT_AVATAR;

  // 絕對網址
  if (/^https?:\/\//i.test(s)) return s;

  // 僅檔名 → /uploads/avatars/<檔名>
  if (!s.includes("/")) s = `/uploads/avatars/${s}`;
  // 相對路徑補起始斜線
  if (!s.startsWith("/")) s = `/${s}`;

  const origin =
    (typeof window !== "undefined" && window.__API_ORIGIN__) ||
    "http://localhost:3005";

  return `${origin}${s}`;
}

/**
 * ReplyBar（置底）
 * props:
 *  - articleId: number
 *  - replyTo?: { parentId:number, targetId?:number, label?:string } | null
 *  - onCancelReply?: () => void
 */
export default function ReplyBar({ articleId, replyTo = null, onCancelReply }) {
  const router = useRouter();
  const { currentUser, ensureMe, postComment } = useForumPost();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(DEFAULT_AVATAR); // 先顯示預設
  const inputRef = useRef(null);

  useEffect(() => {
    ensureMe();
  }, [ensureMe]);

  useEffect(() => {
    // 未登入 → 用預設頭像
    if (!currentUser?.id) {
      setDisplaySrc(DEFAULT_AVATAR);
      return;
    }

    const raw = currentUser.img || currentUser.avatar || "";
    const url = resolveAvatar(raw);

    // 空值 / 預設 → 維持預設，不切換，避免 SSR 閃爍
    if (!url || url === DEFAULT_AVATAR) {
      setDisplaySrc(DEFAULT_AVATAR);
      return;
    }

    // 預載成功才切換
    let canceled = false;
    const img = new Image();
    img.onload = () => {
      if (!canceled) setDisplaySrc(url);
    };
    img.onerror = () => {
      if (!canceled) setDisplaySrc(DEFAULT_AVATAR);
    };
    img.src = url;

    return () => {
      canceled = true;
    };
  }, [currentUser?.id, currentUser?.img, currentUser?.avatar]);

  const isLoggedIn = !!currentUser?.id;

  const goLogin = useCallback(() => {
    router.push("/auth/login");
  }, [router]);

  const onSubmit = async () => {
    const content = (text || "").trim();
    if (!content || sending) return;
    if (!isLoggedIn) {
      goLogin();
      return;
    }
    try {
      setSending(true);
      await postComment(articleId, content, {
        parentId: replyTo?.parentId ?? replyTo?.id ?? null,
        replyToCommentId:
          replyTo?.targetId ?? replyTo?._replyToCommentId ?? null,
      });
      setText("");
      if (inputRef.current) inputRef.current.value = "";
      if (replyTo && onCancelReply) onCancelReply();
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === "Escape" && replyTo && onCancelReply) onCancelReply();
  };

  return (
    <div
      className={`${astyles.replyBar} ${
        !isLoggedIn ? astyles.replyBarGuest : ""
      }`}
      onClick={!isLoggedIn ? goLogin : undefined}
      role={!isLoggedIn ? "button" : undefined}
      tabIndex={!isLoggedIn ? 0 : -1}
      aria-label={!isLoggedIn ? "請先登入" : "回覆輸入列"}
      title={!isLoggedIn ? "請先登入" : "輸入留言"}
      onMouseDown={!isLoggedIn ? (e) => e.preventDefault() : undefined}
    >
      <img
        className={astyles.avatar}
        src={displaySrc} // 預載成功才切換，失敗就一直是 DEFAULT_AVATAR
        alt="使用者頭像"
      />

      {/* 回覆 chip（不顯示暱稱） */}
      {replyTo && (
        <span
          style={{
            marginRight: 8,
            height: "36px",
            padding: "5px 12px",
            border: "1px solid #e5e5e5",
            borderRadius: 999,
            fontSize: 16,
            color: "#555",
            background: "#fafafa",
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          title={`回覆 ${
            replyTo.label || `#${replyTo.parentId ?? replyTo.id}`
          }`}
        >
          回覆{" "}
          <strong style={{ color: "#2979ff" }}>
            {replyTo.label || `#${replyTo.parentId ?? replyTo.id}`}
          </strong>
          <button
            type="button"
            aria-label="取消回覆"
            onClick={(e) => {
              e.stopPropagation();
              onCancelReply?.();
            }}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              fontSize: 18,
            }}
          >
            ×
          </button>
        </span>
      )}

      <input
        ref={inputRef}
        type="text"
        className={astyles.replyInput}
        placeholder={
          isLoggedIn
            ? `留言⋯⋯（最多 ${MAX_LEN} 字）${replyTo ? " —— 回覆模式" : ""}`
            : "請先登入後留言"
        }
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
        onKeyDown={onKeyDown}
        disabled={sending || !isLoggedIn}
        readOnly={!isLoggedIn}
      />

      <button
        type="button"
        className={astyles.sendBtn}
        onClick={onSubmit}
        aria-label="送出留言"
        disabled={sending || !text.trim() || !isLoggedIn}
        title={isLoggedIn ? "送出" : "請先登入"}
      >
        <i className="bi bi-send-fill" aria-hidden="true"></i>
      </button>
    </div>
  );
}
