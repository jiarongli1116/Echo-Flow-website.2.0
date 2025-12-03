/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "./chat.module.css";
import { useMemo, useEffect, useRef, useCallback } from "react";
import MessageItem from "./MessageItem";
import DayDivider from "./DayDivider";

function toDateKey(iso) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "unknown";
  }
}

export default function MessageList({ messages = [], selfId }) {
  // ====== 自動捲到底（僅新增這段，不動你的 DOM / class） ======
  const listRef = useRef(null); // 可捲動容器：.chatMessages
  const bottomRef = useRef(null); // 底部哨兵
  const nearBottomRef = useRef(true);

  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    const gap = el.scrollHeight - (el.scrollTop + el.clientHeight);
    return gap <= 80; // 距底 80px 內視為在底部
  }, []);

  const onScroll = useCallback(() => {
    nearBottomRef.current = isNearBottom();
  }, [isNearBottom]);

  const scrollToBottom = useCallback((behavior = "auto") => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: "end" });
      return;
    }
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // 初次掛載（或切房後 remount）→ 直接捲底
  useEffect(() => {
    const id = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => cancelAnimationFrame(id);
  }, [scrollToBottom]);

  // 訊息變更：
  // - 自己送出的最後一則：一定捲底
  // - 別人送出：只有當前本來就在底部附近才捲
  const last = messages.length ? messages[messages.length - 1] : null;
  const lastFromSelf = !!(last && Number(last?.sender?.id) === Number(selfId));
  useEffect(() => {
    if (!last) return;
    const id = requestAnimationFrame(() => {
      if (lastFromSelf || nearBottomRef.current) {
        scrollToBottom("smooth");
      }
    });
    return () => cancelAnimationFrame(id);
  }, [last, lastFromSelf, scrollToBottom]);

  // ====== 原本的群組 + 渲染邏輯（不變） ======
  const withDividers = useMemo(() => {
    const arr = [];
    let lastKey = null;
    for (const msg of messages) {
      const key = msg?.createdAt ? toDateKey(msg.createdAt) : "unknown";
      if (key !== lastKey) {
        arr.push({
          __type: "divider",
          id: `day-${key}-${arr.length}`,
          label: key,
        });
        lastKey = key;
      }
      arr.push(msg);
    }
    return arr;
  }, [messages]);

  return (
    <div
      className={styles.chatMessages}
      role="list"
      ref={listRef}
      onScroll={onScroll}
    >
      {withDividers.map((node) =>
        node.__type === "divider" ? (
          <DayDivider key={node.id} label={node.label} />
        ) : (
          <MessageItem
            key={node.id}
            message={node}
            isSelf={node?.sender?.id === selfId}
          />
        )
      )}
      {/* 底部哨兵（用於精準捲底） */}
      <div ref={bottomRef} />
    </div>
  );
}
