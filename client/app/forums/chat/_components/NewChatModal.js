/* eslint-disable @next/next/no-img-element */
/* eslint-disable no-console */
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import styles from "./chat.module.css";
import UserPicker from "./UserPicker";
import { toast } from "react-toastify";

const API_BASE = "http://localhost:3005";
const API_USERS = `${API_BASE}/api/chat/users`;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("reactLoginToken");
}

export default function NewChatModal({
  open = false,
  onClose,
  onConfirm,
  users: fallbackUsers,
  initialSelectedIds,
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(
    Array.isArray(initialSelectedIds) ? initialSelectedIds : []
  );

  const [list, setList] = useState(
    Array.isArray(fallbackUsers) ? fallbackUsers : []
  );
  const [loading, setLoading] = useState(false);

  // ★ 群組名稱（當選取 >=2 人時才需要）
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(Array.isArray(initialSelectedIds) ? initialSelectedIds : []);
    setTitle("");
    fetchUsers(""); // 預設載全部
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const timerRef = useRef(null);
  const onQueryChange = useCallback((v) => {
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchUsers(v);
    }, 350);
  }, []);

  async function fetchUsers(q) {
    try {
      const token = getToken();
      if (!token) {
        toast.warn("請先登入");
        return;
      }
      setLoading(true);
      // 帶 all=1，後端會放寬上限
      const url = `${API_USERS}?q=${encodeURIComponent(q)}&excludeSelf=1&all=1`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (json?.status !== "success") {
        toast.error(json?.message || "載入使用者失敗");
        return;
      }
      setList(Array.isArray(json.data?.users) ? json.data.users : []);
    } catch (err) {
      console.log("[modal] fetch users error:", err);
      toast.error("載入使用者失敗");
    } finally {
      setLoading(false);
    }
  }

  const toggle = useCallback((id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const displayUsers = useMemo(() => {
    return list.length
      ? list
      : Array.isArray(fallbackUsers)
      ? fallbackUsers
      : [];
  }, [list, fallbackUsers]);

  // ★ 是否為群組模式（選取 >=2 人）
  const isGroup = selected.length >= 2;
  // ★ 顯示「含自己的人數」→ 只顯示一個數字（你要求）
  const countWithSelf = selected.length + 1;

  // ★ 送出可用條件
  const canSubmit = isGroup
    ? String(title || "").trim().length > 0
    : selected.length === 1;

  // ★ 群組區塊（插到搜尋欄下面）
  const belowSearch = isGroup ? (
    <div className={styles.groupSection}>
      <div className={styles.groupMetaRow}>
        群組人數 <span className={styles.groupCount}>({countWithSelf})</span>
      </div>
      <input
        type="text"
        className={styles.groupTitleInput}
        placeholder="輸入群組名稱"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
      />
    </div>
  ) : null;

  // ★ 送出
  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    if (!isGroup) {
      // DM：維持舊行為（回傳陣列）
      onConfirm?.(selected);
      return;
    }
    // 群組：回傳物件（第 3 步在 page.js 接線）
    onConfirm?.({
      mode: "group",
      title: String(title || "").trim(),
      selectedIds: selected,
    });
  }, [canSubmit, isGroup, onConfirm, selected, title]);

  if (!open) return null;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className={styles.chatModalBackdrop}
      onClick={handleBackdrop}
      aria-hidden={!open}
    >
      <div
        className={styles.chatModal}
        role="dialog"
        aria-modal="true"
        aria-label="建立聊天"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.chatModalHead}>
          <div className={styles.chatModalTitle}>建立聊天</div>
          <button
            type="button"
            className={styles.chatModalClose}
            aria-label="關閉"
            onClick={onClose}
            title="關閉"
          >
            ×
          </button>
        </div>

        <div className={styles.chatModalBody}>
          {/* 使用者搜尋 + 勾選（內含搜尋欄；這裡把群組區塊插到搜尋欄正下方） */}
          <UserPicker
            users={displayUsers}
            selectedIds={selected}
            onToggle={toggle}
            query={query}
            onQueryChange={onQueryChange}
            loading={loading}
            belowSearch={belowSearch} // ★ 新增：把群組區塊插入搜尋欄下面
          />
        </div>

        <div className={styles.chatModalFoot}>
          <button
            type="button"
            className={`${styles.chatModalBtn} ${styles["chatModalBtn--ghost"]}`}
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className={`${styles.chatModalBtn} ${styles["chatModalBtn--primary"]}`}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            建立
          </button>
        </div>
      </div>
    </div>
  );
}
