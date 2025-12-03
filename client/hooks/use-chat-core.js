/* eslint-disable no-console */
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { connect } from "@/app/forums/chat/lib/ws-chat";

// 與後端一致的 WS 位址
const WS_URL = "ws://localhost:3005/ws/chat";

// 把各種欄位名（threadId/room/roomId/room_id、createdAt/created_at、text/message）正規化
function normalizeIncoming(payload) {
  const type = String(payload?.type || "");
  if (!type || !type.startsWith("message")) return null;

  const roomField =
    payload.threadId ?? payload.room ?? payload.roomId ?? payload.room_id;
  const roomId = Number(roomField || 0);
  if (!roomId) return null;

  const userId = Number(payload.userId ?? payload.from_user_id ?? 0) || 0;
  const createdAt =
    payload.createdAt || payload.created_at || new Date().toISOString();
  const text = String(payload.text ?? payload.message ?? "");
  const id = payload.id
    ? String(payload.id)
    : `ws-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const sender = payload.sender || null;

  return { id, roomId, userId, text, createdAt, sender };
}

/** read 事件正規化 */
function normalizeRead(payload) {
  const roomField =
    payload.threadId ?? payload.room ?? payload.roomId ?? payload.room_id;
  const roomId = Number(roomField || 0);
  if (!roomId) return null;
  const userId =
    Number(payload.userId ?? payload.from_user_id ?? payload.user_id ?? 0) || 0;
  const at =
    payload.at ||
    payload.createdAt ||
    payload.created_at ||
    new Date().toISOString();
  return { roomId, userId, at };
}

/**
 * useChatCore
 * - 管理 WS 生命週期與基本動作：join/leave/send/close
 * - 透過 onMessage/onJoined/onRead 把事件往上拋（訊息已正規化）
 */
export default function useChatCore({
  selfId,
  isAuth,
  isInitialized,
  onMessage, // (msg) => void   msg: {id, roomId, userId, text, createdAt, sender?}
  onJoined, // (payload) => void
  onRead, // (p) => void   p: {roomId, userId, at}
} = {}) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // 連線
  useEffect(() => {
    const ws = connect(WS_URL);
    wsRef.current = ws;

    const handleOpen = () => {
      setConnected(true);
      console.log("[chat-core] ws open");
    };
    const handleClose = () => {
      setConnected(false);
      console.log("[chat-core] ws close");
    };
    const handleError = (e) => {
      console.log("[chat-core] ws error:", e);
    };
    const handleMessage = (payload) => {
      const msg = normalizeIncoming(payload);
      if (msg) onMessage?.(msg);
    };
    const handleJoined = (payload) => {
      onJoined?.(payload);
    };
    const handleRead = (payload) => {
      const p = normalizeRead(payload);
      if (p) onRead?.(p);
    };

    ws.on("open", handleOpen);
    ws.on("close", handleClose);
    ws.on("error", handleError);
    ws.on("message", handleMessage);
    ws.on("joined", handleJoined);
    ws.on("read", handleRead);

    return () => {
      ws.off("open", handleOpen);
      ws.off("close", handleClose);
      ws.off("error", handleError);
      ws.off("message", handleMessage);
      ws.off("joined", handleJoined);
      ws.off("read", handleRead);
      ws.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在掛載時建立連線

  const join = useCallback(
    (roomId) => {
      if (!wsRef.current) return;
      if (!roomId || !selfId || !isAuth || !isInitialized) return;
      wsRef.current.join(Number(roomId), Number(selfId));
    },
    [selfId, isAuth, isInitialized]
  );

  const leave = useCallback((roomId) => {
    if (!wsRef.current) return;
    if (!roomId) return;
    wsRef.current.leave(Number(roomId));
  }, []);

  const sendText = useCallback(
    (roomId, text) => {
      if (!wsRef.current) return;
      if (!roomId || !selfId || !isAuth || !isInitialized) return;
      if (!text || !String(text).trim()) return;
      wsRef.current.sendText(Number(roomId), Number(selfId), String(text));
    },
    [selfId, isAuth, isInitialized]
  );

  /** 送出已讀 */
  const sendRead = useCallback(
    (roomId) => {
      if (!wsRef.current) return;
      if (!roomId || !selfId || !isAuth || !isInitialized) return;

      const payload = {
        type: "read",
        roomId: Number(roomId),
        userId: Number(selfId),
        at: new Date().toISOString(),
      };

      if (typeof wsRef.current.sendRead === "function") {
        wsRef.current.sendRead(payload.roomId, payload.userId, payload.at);
        return;
      }
      if (typeof wsRef.current.send === "function") {
        wsRef.current.send(payload);
        return;
      }
      const raw =
        wsRef.current._ws || wsRef.current.ws || wsRef.current.socket || null;
      if (raw && typeof raw.send === "function") {
        try {
          raw.send(JSON.stringify(payload));
          return;
        } catch (err) {
          console.log("[chat-core] raw ws sendRead error:", err);
        }
      }
      console.log("[chat-core] sendRead not supported by ws wrapper");
    },
    [selfId, isAuth, isInitialized]
  );

  const close = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.close();
  }, []);

  return {
    connected,
    join,
    leave,
    sendText,
    sendRead,
    close,
  };
}
