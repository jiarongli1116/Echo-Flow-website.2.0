"use client";

import styles from "./chat.module.css";
import { useState, useCallback } from "react";

export default function Composer({ onSend, disabled = false }) {
  const [text, setText] = useState("");

  const submit = useCallback(() => {
    const v = text.trim();
    if (!v || disabled) return;
    onSend?.(v);
    setText("");
  }, [text, disabled, onSend]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  return (
    <div className={styles.chatComposer}>
      <input
        className={styles.chatComposerInput}
        type="text"
        placeholder="輸入訊息…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      <button className={styles.chatComposerSend} onClick={submit} disabled={disabled}>
        <i className="bi bi-send-fill" aria-hidden="true"></i>
      </button>
    </div>
  );
}
