/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "./chat.module.css";
import { useAvatarSrc } from "./avatar-utils";

export default function MessageItem({ message, isSelf = false }) {
  if (message?.type === "system") {
    return (
      <div className={`${styles.chatMsg} ${styles["chatMsg--system"]}`}>
        {message.text}
      </div>
    );
  }

  const sender = message?.sender || null;
  const { src: avatarSrc, onError } = useAvatarSrc(sender?.avatar);

  // 暱稱 + 時間（只顯示上午/下午HH:MM:SS）
  const nickname =
    (sender?.nickname && String(sender.nickname).trim()) ||
    (sender?.id != null ? `U${sender.id}` : "系統");
  const timeText = message?.createdAt
    ? new Date(message.createdAt).toLocaleTimeString("zh-TW", {
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  return (
    <div
      className={`${styles.chatMsg} ${isSelf ? styles["chatMsg--self"] : ""}`}
    >
      {!isSelf && (
        <img
          className={styles.chatMsgAvatar}
          src={avatarSrc}
          alt={sender?.nickname || "user"}
          onError={onError}
        />
      )}

      <div className={styles.chatMsgBody}>
        {message?.type === "image" ? (
          <div className={styles.chatMsgBubble}>
            <img
              className={styles.chatMsgImage}
              src={message?.images?.[0]}
              alt="image"
            />
          </div>
        ) : (
          <div className={styles.chatMsgBubble}>{message?.text || ""}</div>
        )}

        <div className={styles.chatMsgMeta}>
          <time className={styles.chatMsgTime} dateTime={message?.createdAt || ""}>
            {/* ★ 暱稱單獨包一個 span，交給 CSS 上色 */}
            <span className={styles.chatMsgNick}>{nickname}</span>{" "}
            {timeText}
          </time>
        </div>
      </div>
    </div>
  );
}
