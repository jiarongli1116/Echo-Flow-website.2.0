/* eslint-disable no-console */
// server/lib/chat-wss.js
import { WebSocketServer } from "ws";
import connection from "../connect.js"; // ← 用跟 routes 一樣的連線物件

/**
 * 建立聊天室 WSS
 * @param {import('http').Server} server
 * @param {{ path?: string }} [options]
 */
export function setupChatWSS(server, { path = "/ws/chat" } = {}) {
  const wss = new WebSocketServer({ server, path });
  console.log(`[chat-wss] mounted at ${path}`);

  // roomId -> Set<WebSocket>
  const rooms = new Map();

  function ensureRoom(roomId) {
    const key = String(roomId);
    if (!rooms.has(key)) rooms.set(key, new Set());
    return rooms.get(key);
  }

  function joinRoom(ws, roomId) {
    const key = String(roomId);
    const set = ensureRoom(key);
    set.add(ws);
    ws.__rooms.add(key);
    ws.send(
      JSON.stringify({
        type: "joined",
        roomId: Number(roomId),
        message: "joined",
      })
    );
    console.log("[chat-wss] join:", { userId: ws.__userId, roomId: key });
  }

  function leaveRoom(ws, roomId) {
    const key = String(roomId);
    const set = rooms.get(key);
    if (set) set.delete(ws);
    ws.__rooms.delete(key);
    console.log("[chat-wss] leave:", { userId: ws.__userId, roomId: key });
  }

  function broadcastToRoom(roomId, dataObj) {
    const key = String(roomId);
    const set = rooms.get(key);
    if (!set || set.size === 0) return 0;
    const data = JSON.stringify(dataObj);
    let n = 0;
    for (const client of set) {
      if (client.readyState === 1) {
        client.send(data);
        n++;
      }
    }
    return n;
  }

  wss.on("connection", (ws) => {
    ws.__userId = 0;
    ws.__rooms = new Set();

    ws.on("message", async (buf) => {
      let payload = null;
      try {
        payload = JSON.parse(String(buf));
      } catch (err) {
        console.log("[chat-wss] bad json:", err);
        return;
      }

      const type = String(payload?.type || "");

      // === join ===
      if (type === "join") {
        const roomId = Number(
          payload.threadId ?? payload.room ?? payload.roomId ?? payload.room_id
        );
        // ★ 接受 userId 或 selfId
        const userId = Number(payload.userId ?? payload.selfId ?? 0);
        if (!roomId || !userId) return;

        ws.__userId = userId;
        joinRoom(ws, roomId);
        return;
      }

      // === leave ===
      if (type === "leave") {
        const roomId = Number(
          payload.threadId ?? payload.room ?? payload.roomId ?? payload.room_id
        );
        if (!roomId) return;
        leaveRoom(ws, roomId);
        return;
      }

      // === message ===
      if (type === "message" || type.startsWith("message:")) {
        const roomId = Number(
          payload.threadId ?? payload.room ?? payload.roomId ?? payload.room_id
        );
        // ★ 接受 userId 或 selfId
        const userId = Number(payload.userId ?? payload.selfId ?? 0);
        const text = String(payload.text ?? payload.message ?? "").trim();
        const clientId = payload.clientId || undefined;
        if (!roomId || !userId || !text) return;

        try {
          // 寫入 DB：chat_messages
          const insertSql = `
            INSERT INTO chat_messages (room, from_user_id, text, created_at, is_deleted)
            VALUES (?, ?, ?, NOW(), 0)
          `;
          const [ins] = await connection.execute(insertSql, [
            roomId,
            userId,
            text,
          ]);
          const msgId = Number(ins.insertId || 0);

          // 取出 DB 寫入時間（避免時區差異）
          let createdAtIso = new Date().toISOString();
          if (msgId) {
            const [[row]] = await connection.execute(
              "SELECT created_at FROM chat_messages WHERE id=? LIMIT 1",
              [msgId]
            );
            if (row?.created_at) {
              createdAtIso = new Date(row.created_at).toISOString();
            }
          }

          // 更新 chat_rooms.updated_at 讓左欄排序可用
          await connection.execute(
            "UPDATE chat_rooms SET updated_at = NOW() WHERE id=? LIMIT 1",
            [roomId]
          );

          // 廣播
          const out = {
            type: "message",
            id: msgId || Date.now(),
            threadId: roomId, // 前端吃 threadId
            room: roomId, // 兼容：也帶 room 欄位
            userId,
            text,
            createdAt: createdAtIso,
            clientId,
          };
          broadcastToRoom(roomId, out);
        } catch (dbErr) {
          console.error("[chat-wss] DB insert error:", dbErr);
        }
        return;
      }

      // === read ===  ← ★ 新增：同步清除未讀
      if (type === "read") {
        const roomId = Number(
          payload.threadId ?? payload.room ?? payload.roomId ?? payload.room_id
        );
        const userId = Number(payload.userId ?? payload.selfId ?? 0);
        const at = payload.at || new Date().toISOString();
        if (!roomId || !userId) return;

        const out = {
          type: "read",
          threadId: roomId, // 前端吃 threadId
          room: roomId,     // 兼容：也帶 room 欄位
          userId,
          at,
        };
        broadcastToRoom(roomId, out);
        return;
      }
    });

    ws.on("close", () => {
      for (const key of ws.__rooms) {
        const set = rooms.get(key);
        if (set) set.delete(ws);
      }
      ws.__rooms.clear();
    });
  });

  return wss;
}

export default setupChatWSS;
