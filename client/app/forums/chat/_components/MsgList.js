/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "./chat.module.css";
import MsgCard from "./MsgCard";

/** 依 id 去重，保留第一個出現的順序；不動 item 結構與 props */
function uniqById(list) {
  const seen = new Set();
  const out = [];
  for (const it of Array.isArray(list) ? list : []) {
    const raw = it?.id;
    const key = Number.isFinite(Number(raw)) ? Number(raw) : String(raw ?? "");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

export default function MsgList({
  items = [],
  activeId = null,
  onSelect,
  onClearUnread,
}) {
  const safeItems = uniqById(items); // ★ 只加這行避免重複 key

  return (
    <div className={styles.chatThreadList} role="list">
      {safeItems.map((item) => (
        <MsgCard
          key={item.id}
          item={item}
          active={item.id === activeId}
          onClick={() => onSelect?.(item.id)}
          onClearUnread={onClearUnread}
        />
      ))}
      {safeItems.length === 0 && (
        <div className={styles.chatThreadListEmpty}>尚無會話</div>
      )}
    </div>
  );
}
