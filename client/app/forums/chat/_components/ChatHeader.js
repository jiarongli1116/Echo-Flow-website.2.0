/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "./chat.module.css";
import { useAvatarSrc } from "./avatar-utils";

export default function ChatHeader({
  title,
  subtitle,
  avatar,
  onBack,
  onMore,
}) {
  const { src: avatarSrc, onError } = useAvatarSrc(avatar);

  return (
    <header className={styles.chatHeader}>
      <div className={styles.chatHeaderLeft}>
        {onBack && (
          <button
            className={styles.chatHeaderBack}
            onClick={onBack}
            aria-label="返回"
          >
            <i className="bi bi-chevron-left"></i>
          </button>
        )}
        {avatarSrc ? (
          <img
            className={styles.chatHeaderAvatar}
            src={avatarSrc}
            alt={title || "chat"}
            onError={onError}
          />
        ) : (
          <div className={styles.chatHeaderDot}></div>
        )}
        <div className={styles.chatHeaderMeta}>
          <div className={styles.chatHeaderTitle}>
            {title || "未命名聊天室"}
          </div>
          {subtitle ? (
            <div className={styles.chatHeaderSub}>{subtitle}</div>
          ) : null}
        </div>
      </div>
      <div className={styles.chatHeaderRight}>
        {onMore && (
          <button
            className={styles.chatHeaderMore}
            onClick={onMore}
            aria-label="更多"
          >
            ⋯
          </button>
        )}
      </div>
    </header>
  );
}
