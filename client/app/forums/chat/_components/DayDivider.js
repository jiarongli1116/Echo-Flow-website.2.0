"use client";

import styles from "./chat.module.css";

export default function DayDivider({ label }) {
  return <div className={styles.chatDayDivider}>{label}</div>;
}
