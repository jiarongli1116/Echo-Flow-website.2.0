"use client";

import styles from "./chat.module.css";

export default function EmptyState({ hint = "尚未選擇會話" }) {
  return <div className={styles.chatEmptyState}>{hint}</div>;
}
