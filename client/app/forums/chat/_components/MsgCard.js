/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "./chat.module.css";
import { useAvatarSrc } from "./avatar-utils";

export default function MsgCard({ item, active = false, onClick, onClearUnread }) {
  const { src: avatarSrc, onError } = useAvatarSrc(item?.avatar);
  const roomId = item?.id;

  const handleBadgeClick = (e) => {
    e.stopPropagation();
    onClearUnread?.(roomId);
  };

  return (
    <button
      type="button"
      className={`${styles.chatThreadItem} ${
        active ? styles["chatThreadItem--active"] : ""
      }`}
      onClick={onClick}
    >
      <img
        className={styles.chatThreadItemAvatar}
        src={avatarSrc}
        alt={item.title}
        onError={onError}
      />
      <div className={styles.chatThreadItemMain}>
        <div className={styles.chatThreadItemTop}>
          <strong className={styles.chatThreadItemTitle}>{item.title}</strong>
          <time className={styles.chatThreadItemTime}>{item.time}</time>
        </div>
        <div className={styles.chatThreadItemBottom}>
          <span className={styles.chatThreadItemLast}>{item.lastMessage}</span>
          {item.unread > 0 && (
            <span
              className={styles.chatThreadItemBadge}
              onClick={handleBadgeClick}
              title="點擊清除未讀"
            >
              {item.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
