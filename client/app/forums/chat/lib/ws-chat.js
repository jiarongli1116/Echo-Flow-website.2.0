/* client/app/chat/lib/ws-chat.js */
/* eslint-disable no-console */

export function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const handlers = {
    open: new Set(),
    close: new Set(),
    error: new Set(),
    joined: new Set(),
    message: new Set(),
    read: new Set(), // ★ 新增：read 事件
  };

  function emit(type, payload) {
    if (!handlers[type]) return;
    for (const h of handlers[type]) {
      try {
        h(payload);
      } catch (e) {
        console.log("[ws] handler error:", e);
      }
    }
  }

  ws.addEventListener("open", () => emit("open"));
  ws.addEventListener("close", () => emit("close"));
  ws.addEventListener("error", (e) => emit("error", e));
  ws.addEventListener("message", (ev) => {
    let data = null;
    try {
      data = JSON.parse(ev.data);
    } catch {}
    if (!data || typeof data !== "object") return;
    const { type } = data;
    if (type && handlers[type]) emit(type, data);
  });

  function send(obj) {
    try {
      if (ws.readyState !== 1) {
        console.log("[ws] send blocked (state=", ws.readyState, "):", obj);
        return;
      }
      ws.send(JSON.stringify(obj));
    } catch (e) {
      console.log("[ws] send error:", e);
    }
  }

  return {
    on(type, fn) {
      if (!handlers[type]) handlers[type] = new Set();
      handlers[type].add(fn);
    },
    off(type, fn) {
      if (!handlers[type]) return;
      handlers[type].delete(fn);
    },

    // ★ 必須把 selfId 一起送
    join(threadId, selfId) {
      const payload = { type: "join", threadId, selfId };
      console.log("[ws] → join", payload);
      send(payload);
    },
    leave(threadId) {
      const payload = { type: "leave", threadId };
      console.log("[ws] → leave", payload);
      send(payload);
    },
    // ★ 送訊息同樣帶 userId（= selfId）
    sendText(threadId, selfId, text) {
      const payload = { type: "message", threadId, userId: selfId, text };
      console.log("[ws] → message", payload);
      send(payload);
    },

    // ★ 新增：送出已讀，同步其他分頁/裝置
    sendRead(threadId, selfId, at = new Date().toISOString()) {
      const payload = { type: "read", threadId, userId: selfId, at };
      console.log("[ws] → read", payload);
      send(payload);
    },

    close() {
      try {
        ws.close();
      } catch {}
    },
  };
}
