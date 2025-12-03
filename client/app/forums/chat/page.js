/* eslint-disable @next/next/no-img-element */
/* eslint-disable no-console */
"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import styles from "../forums.module.css";
import cstyles from "./_components/chat.module.css";
import { ToastContainer, Bounce, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AsideRight from "./_components/AsideRight";
import MsgList from "./_components/MsgList";
import ChatRoom from "./_components/ChatRoom";
import LeftFooter from "./_components/LeftFooter";
import EmptyState from "./_components/EmptyState";
import NewChatModal from "./_components/NewChatModal";

import useChatStore from "@/hooks/use-chat-store";

// ★ 新增：導流所需（只新增 import，不動其他）
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";

export default function ForumsPage() {
  // ★ 新增：未登入導流（不影響既有結構）
  const { isAuth, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isAuth) {
      router.replace("/auth/login");
    }
  }, [isInitialized, isAuth, router]);

  // 用 hook 取得狀態與方法（UI 結構不變）
  const {
    threads,
    activeId,
    messages,
    selfId,
    setActiveId,
    sendText,
    createDm,
    reloadRooms,
    markRead, // ← 新增：從 hook 解構 markRead
    // ★ 新增：從 hook 解構 createGroup（其他不動）
    createGroup,
  } = useChatStore();

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId]
  );

  // ★ 新增：RWD 切換（手機：未選則顯示左欄；選擇後顯示中欄）
  const leftColClass = useMemo(
    () => `col-12 col-lg-3${activeThread ? " d-none d-lg-block" : ""}`,
    [activeThread]
  );
  const midColClass = useMemo(
    () => `col-12 col-lg-7${activeThread ? "" : " d-none d-lg-block"}`,
    [activeThread]
  );

  // 進房自動清除未讀（debounce 300ms）
  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => {
      markRead(activeId);
    }, 300);
    return () => clearTimeout(t);
  }, [activeId, markRead]);

  // 清單徽章點擊清除未讀
  const handleClearUnread = useCallback(
    (roomId) => {
      if (!roomId) return;
      markRead(roomId);
    },
    [markRead]
  );

  // 送出訊息（維持原行為）
  const handleSend = useCallback(
    (text) => {
      if (!text?.trim()) return;
      if (!selfId) {
        toast.warn("請先登入再發訊息");
        return;
      }
      sendText(text);
    },
    [sendText, selfId]
  );

  // 建立聊天（相容 DM；支援群組）
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  // ★ 方案 B：預選名單
  const [initialSelectedIds, setInitialSelectedIds] = useState([]);
  const openNewChat = useCallback(() => setIsNewChatOpen(true), []);
  const closeNewChat = useCallback(() => setIsNewChatOpen(false), []);
  // ★ 方案 B：從 query 自動開啟建立聊天並帶入預選成員
  const searchParams = useSearchParams();
  useEffect(() => {
    // 等待驗證狀態，以免未登入直接彈窗
    if (!isInitialized || !isAuth) return;
    if (!searchParams) return;

    const open = searchParams.get("open");
    const membersStr = searchParams.get("members") || "";

    if (open === "create") {
      const ids = membersStr
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);

      if (ids.length > 0) {
        setInitialSelectedIds(ids);
        setIsNewChatOpen(true);

        // 清掉 query，避免返回本頁又自動彈出
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("open");
          url.searchParams.delete("members");
          window.history.replaceState({}, "", url.toString());
        } catch {}
      }
    }
  }, [isInitialized, isAuth, searchParams]);

  const confirmNewChat = useCallback(
    async (payload) => {
      try {
        // ★ 群組模式：NewChatModal 會丟物件 { mode:'group', title, selectedIds }
        if (
          payload &&
          typeof payload === "object" &&
          !Array.isArray(payload) &&
          payload.mode === "group"
        ) {
          const title = String(payload.title || "").trim();
          const ids = Array.isArray(payload.selectedIds)
            ? payload.selectedIds
            : [];
          if (!title) {
            toast.warn("請輸入群組名稱");
            return;
          }
          if (ids.length < 1) {
            toast.warn("請至少選擇 1 位成員");
            return;
          }
          const roomId = await createGroup(title, ids);
          await reloadRooms();
          setIsNewChatOpen(false);
          setActiveId(roomId);
          toast.success("已建立/切換至群組");
          return;
        }

        // ★ DM 模式：維持原行為，payload 是陣列
        const ids = payload;
        if (!Array.isArray(ids) || ids.length !== 1) {
          toast.warn("請選擇 1 位使用者建立私聊");
          return;
        }
        const roomId = await createDm(ids[0]);
        await reloadRooms();
        setIsNewChatOpen(false);
        setActiveId(roomId);
        toast.success("已建立/切換至私聊");
      } catch (err) {
        console.log("[chat] create dm/group error:", err);
        toast.error(err.message || "建立聊天失敗");
      }
    },
    [createDm, createGroup, reloadRooms, setActiveId]
  );

  // ★ 新增：導流中不渲染頁面，避免閃爍（不影響已登入）
  if (!isInitialized || !isAuth) return null;

  return (
    <div className={styles.forusVars}>
      <main className={styles.forusMain}>
        <div className={styles.forusContainer}>
          <div className="row">
            {/* 左欄 */}
            <div className={leftColClass}>
              <div className={cstyles.chatAside + " " + cstyles.chatAsidep}>
                <div className={cstyles.chatAsideInner}>
                  <div className={cstyles.chatAsideHead}>
                    <h2 className={cstyles.chatAsideTitle}>聊天室</h2>
                    <div className={cstyles.chatAsideActions}>
                      <button
                        type="button"
                        className={cstyles.chatIconBtn}
                        aria-label="建立聊天"
                        onClick={openNewChat}
                        title="建立聊天"
                      >
                        <i className="bi bi-person-plus-fill"></i>
                      </button>
                    </div>
                  </div>
                  <MsgList
                    items={threads}
                    activeId={activeId}
                    onSelect={setActiveId}
                    onClearUnread={handleClearUnread} // ← 新增：讓徽章可清除未讀
                  />
                </div>
                <LeftFooter />
              </div>
            </div>

            {/* 中欄 */}
            <div className={midColClass}>
              <div className={styles.forusContentStack}>
                {!activeThread ? (
                  <EmptyState hint="選擇左側一個會話開始聊天，或點右上角建立私聊" />
                ) : (
                  <ChatRoom
                    thread={activeThread}
                    messages={messages}
                    selfId={selfId ?? 0}
                    onSend={handleSend}
                    onBack={() => setActiveId(null)} /* 手機返回列表 */
                  />
                )}
              </div>
            </div>

            {/* 右欄 */}
            <div className="d-none d-lg-block col-lg-2">
              <AsideRight />
            </div>
          </div>
        </div>
      </main>

      <NewChatModal
        open={isNewChatOpen}
        initialSelectedIds={initialSelectedIds}
        onClose={closeNewChat}
        onConfirm={confirmNewChat}
      />

      <ToastContainer
        position="bottom-center"
        autoClose={1800}
        limit={2}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        transition={Bounce}
      />
    </div>
  );
}
