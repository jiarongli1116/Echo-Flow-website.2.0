/* eslint-disable no-console */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useChatCore from "./use-chat-core";
import { useAuth } from "@/hooks/use-auth";

const API_BASE = "http://localhost:3005";
const API_CHAT_HISTORY = `${API_BASE}/api/chat/history`;
const API_ROOMS_MINE = `${API_BASE}/api/chat/rooms/mine`;
const API_CREATE_ROOM = `${API_BASE}/api/chat/rooms`;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("reactLoginToken");
}

/* ========== Avatar 正規化（修掉一律變預設圖的問題） ========== */
function normalizeAvatar(url) {
  const DEFAULT_AVATAR = "/images/default-avatar.svg";
  if (url == null) return DEFAULT_AVATAR;

  let s = String(url).trim();
  if (!s || s === "null" || s === "undefined") return DEFAULT_AVATAR;

  // 內建靜態圖：保持相對路徑（不要改成預設）
  if (s.startsWith("/images/")) return s;

  // 絕對網址直接用
  if (/^https?:\/\//i.test(s)) return s;

  // 後端上傳：檔名 → /uploads/avatars/<file>
  if (!s.includes("/")) s = `/uploads/avatars/${s}`;
  if (!s.startsWith("/")) s = `/${s}`;

  const API_ORIGIN =
    (typeof window !== "undefined" && window.__API_ORIGIN__) ||
    "http://localhost:3005";
  return `${API_ORIGIN}${s}`;
}

/* 幫忙在 primary 無效時回退到 fallback（避免把空字串轉成預設、覆蓋快取） */
function pickAvatar(primary, fallback) {
  const hasPrimary =
    primary != null &&
    String(primary).trim() !== "" &&
    String(primary).trim() !== "null" &&
    String(primary).trim() !== "undefined";
  return hasPrimary ? normalizeAvatar(primary) : fallback;
}

/* ====== 新增：判斷空白/暫名/預設頭像 的工具 ====== */
function isBlank(v) {
  if (v == null) return true;
  const s = String(v).trim();
  return !s || s === "null" || s === "undefined";
}
function isPlaceholderNick(nick) {
  const s = String(nick || "").trim();
  return /^U\d+$/.test(s); // U123 這類暫名
}
function isDefaultAvatarPath(path) {
  const s = String(path || "").trim();
  return s === "/images/default-avatar.svg";
}

function formatListTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();
  if (isToday) return d.toTimeString().slice(0, 5);
  if (isYesterday) return "昨天";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* 訊息去重＋依時間排序（升冪）
 * 修正重複：當收到正式訊息（有真實 id）時，若找到同房間、同 sender、同內容、時間相近的 temp-* 訊息，
 * 以正式訊息「取代」那筆 temp-*，避免重複顯示。
 */
function upsertMsgList(prevArr = [], incomingArr = []) {
  const prev = Array.isArray(prevArr) ? prevArr : [];
  const inc = Array.isArray(incomingArr) ? incomingArr : [incomingArr];

  // 以 id 建索引（沿用你原本的作法）
  const byId = new Map(prev.map((m) => [String(m.id), m]));

  // 工具：抓 senderId
  const getSenderId = (m) =>
    Number(m?.sender?.id ?? m?.userId ?? m?.users_id ?? 0) || 0;

  // 工具：時間差（毫秒）
  const timeDiff = (a, b) => {
    const ta = +new Date(a || 0);
    const tb = +new Date(b || 0);
    return Math.abs(ta - tb);
  };

  // 專找 prev 裡的 temp-* 候選
  const prevTemps = [];
  for (const [id, msg] of byId.entries()) {
    if (String(id).startsWith("temp-")) prevTemps.push([id, msg]);
  }

  // 逐筆併入
  for (const m of inc) {
    if (!m) continue;

    const idStr = String(m.id);

    // 情境 A：正式訊息（非 temp-*）
    if (!idStr.startsWith("temp-")) {
      // 找看看有沒有可以被取代的 temp-*（同房、同 sender、同內容、時間差 <= 7 秒）
      const sid = getSenderId(m);
      let replaced = false;

      for (const [tempId, tm] of prevTemps) {
        if (!byId.has(tempId)) continue; // 可能先前被換掉了
        const sameRoom =
          Number(tm.roomId ?? tm.threadId ?? tm.room ?? 0) ===
          Number(m.roomId ?? m.threadId ?? m.room ?? 0);
        const sameSender = getSenderId(tm) === sid;
        const sameText = String(tm.text || "") === String(m.text || "");
        const closeInTime = timeDiff(tm.createdAt, m.createdAt) <= 7000; // 7 秒容忍

        if (sameRoom && sameSender && sameText && closeInTime) {
          const merged = { ...tm, ...m, id: m.id }; // 用正式 id 取代
          byId.delete(tempId);
          byId.set(idStr, merged);
          replaced = true;
          break;
        }
      }

      if (!replaced) {
        // 沒有對應 temp，走一般 upsert（同 id 覆蓋）
        const older = byId.get(idStr) || {};
        byId.set(idStr, { ...older, ...m });
      }
      continue;
    }

    // 情境 B：temp-* 本身（例如樂觀插入）
    const older = byId.get(idStr) || {};
    byId.set(idStr, { ...older, ...m });
  }

  // 依時間排序（升冪）
  return Array.from(byId.values()).sort((a, b) => {
    const ta = +new Date(a?.createdAt || 0);
    const tb = +new Date(b?.createdAt || 0);
    return ta - tb;
  });
}


export default function useChatStore() {
  const { user, isInitialized, isAuth } = useAuth();
  const selfId = user?.id ?? null;
  const selfNick = (user?.nickname ?? "Me").trim() || "Me";
  const selfAvatar = normalizeAvatar(
    (user?.img ?? "/images/default-avatar.svg").trim() ||
      "/images/default-avatar.svg"
  );

  const [threads, setThreads] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [activeId, _setActiveId] = useState(null);
  const prevActiveRef = useRef(null);

  // 避免 onMessage 使用到舊的 activeId
  const activeIdRef = useRef(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // 保持最新 self
  const selfRef = useRef({ id: selfId, nick: selfNick, avatar: selfAvatar });
  useEffect(() => {
    selfRef.current = { id: selfId, nick: selfNick, avatar: selfAvatar };
  }, [selfId, selfNick, selfAvatar]);

  // 使用者快取（他人暱稱與頭像）
  const userCacheRef = useRef(new Map()); // userId -> { id, nickname, avatar }
  const cacheUser = useCallback((u) => {
    if (!u) return;
    const id = Number(u.id);
    if (!Number.isInteger(id) || id <= 0) return;

    // 進來的暱稱/頭像
    const incomingNickRaw = u.nickname != null ? String(u.nickname).trim() : "";
    const incomingNick = incomingNickRaw || null;
    const incomingAvatar = !isBlank(u.avatar)
      ? normalizeAvatar(u.avatar)
      : null;

    const prev = userCacheRef.current.get(id) || {};

    // === 暱稱合併策略 ===
    // 1) 如果舊的是空白或暫名，且新的是「非空白且非暫名」→ 覆蓋
    // 2) 如果舊的是正常暱稱，就保留；新來的是暫名或空白不覆蓋
    let nextNick = prev.nickname;
    if (isBlank(nextNick) || isPlaceholderNick(nextNick)) {
      if (!isBlank(incomingNick) && !isPlaceholderNick(incomingNick)) {
        nextNick = incomingNick;
      } else if (isBlank(nextNick)) {
        // 兩邊都沒有有效暱稱 → 至少填一個暫名
        nextNick = `U${id}`;
      }
    } else {
      // 既有是正常暱稱；如果新資料也是正常暱稱且不同，可更新（以較新的為準）
      if (!isBlank(incomingNick) && !isPlaceholderNick(incomingNick)) {
        nextNick = incomingNick;
      }
    }

    // === 頭像合併策略 ===
    // 1) 如果舊的是空白或預設頭像，且新的是有效頭像 → 覆蓋
    // 2) 否則保留舊的
    let nextAvatar = prev.avatar;
    const prevIsMissing =
      isBlank(nextAvatar) || isDefaultAvatarPath(nextAvatar);
    if (incomingAvatar && prevIsMissing) {
      nextAvatar = incomingAvatar;
    } else if (isBlank(nextAvatar)) {
      // 兩邊都沒有 → 不主動塞預設，交給 UI；但為了列表縮圖穩定，可以最後兜一個預設
      nextAvatar = "/images/default-avatar.svg";
    }

    userCacheRef.current.set(id, {
      id,
      nickname: nextNick,
      avatar: nextAvatar,
    });
  }, []);
  const getUserFromCache = useCallback(
    (id) => userCacheRef.current.get(Number(id)) || null,
    []
  );

  // 每房已收訊息 id（避免重播重覆插入）
  const msgSeenRef = useRef(new Map()); // roomId -> Set(messageId)
  function ensureSeenSet(roomId) {
    const rid = Number(roomId);
    if (!msgSeenRef.current.has(rid)) msgSeenRef.current.set(rid, new Set());
    return msgSeenRef.current.get(rid);
  }
  function hasSeen(roomId, msgId) {
    const set = ensureSeenSet(roomId);
    return set.has(String(msgId));
  }
  function markSeen(roomId, msgId) {
    const set = ensureSeenSet(roomId);
    set.add(String(msgId));
  }

  // === 核心連線：join / leave / sendText / sendRead ===
  const {
    join,
    // leave, // 不再主動 leave，避免離開房後左欄不更新
    sendText: wsSendText,
    sendRead,
  } = useChatCore({
    selfId,
    isAuth,
    isInitialized,

    // 收到訊息：更新 messages 與左欄（未讀/預覽/置頂）
    onMessage: (msg) => {
      if (!msg || !msg.roomId) return;

      // 1) 去重
      if (msg?.id != null && hasSeen(msg.roomId, msg.id)) return;

      // 2) sender 整備
      const my = selfRef.current;
      const myId = Number(my.id || 0);
      const isMe = Number(msg.userId) === myId;

      const sid = Number(msg.sender?.id ?? msg.userId ?? 0);
      const cached = getUserFromCache(sid);
      const sender = isMe
        ? { id: myId, nickname: my.nick, avatar: my.avatar }
        : {
            id: sid,
            nickname:
              (msg.sender?.nickname && String(msg.sender.nickname).trim()) ||
              cached?.nickname ||
              `U${sid}`,
            // 這裡用 pickAvatar，避免空字串覆蓋快取；快取裡若是預設，WS 有帶就會被覆蓋
            avatar: pickAvatar(msg.sender?.avatar, cached?.avatar),
          };

      cacheUser(sender);

      const nextMsg = {
        id: String(msg.id ?? `${msg.roomId}-${Date.now()}`),
        type: "text",
        text: String(msg.text || ""),
        sender,
        createdAt: msg.createdAt || new Date().toISOString(),
      };

      if (msg?.id != null) markSeen(msg.roomId, msg.id);

      // 3) 併入訊息列表
      setMessagesMap((prev) => {
        const arr = Array.isArray(prev[msg.roomId]) ? prev[msg.roomId] : [];
        const merged = upsertMsgList(arr, [nextMsg]);
        return { ...prev, [msg.roomId]: merged };
      });

      // 4) 更新左欄 threads：最後訊息/時間/未讀（非目前房才 +1）並置頂
      setThreads((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const list = [...prev];
        const idx = list.findIndex((t) => Number(t.id) === Number(msg.roomId));
        if (idx < 0) return prev;

        const isActive = Number(activeIdRef.current) === Number(msg.roomId);
        const old = list[idx];
        const next = {
          ...old,
          lastMessage: String(msg.text || ""),
          time: formatListTime(nextMsg.createdAt),
          unread: isActive ? 0 : (old.unread || 0) + (isMe ? 0 : 1),
        };
        list.splice(idx, 1);
        list.unshift(next);
        return list;
      });
    },

    onJoined: (p) => {
      console.log("[chat-store] joined:", p);
    },

    // 已讀同步（只處理自己）
    onRead: ({ roomId, userId }) => {
      if (!roomId) return;
      const myId = Number(selfRef.current.id || 0);
      if (Number(userId) !== myId) return;
      setThreads((prev) =>
        prev.map((t) =>
          Number(t.id) === Number(roomId) ? { ...t, unread: 0 } : t
        )
      );
    },
  });

  /* ★★★ 把 ensureJoined 放在 useChatCore 之後，閉包拿到正確的 join */
  const joinedSetRef = useRef(new Set());
  const ensureJoined = useCallback(
    (roomId) => {
      const rid = Number(roomId);
      if (!rid) return;
      if (!joinedSetRef.current.has(rid)) {
        joinedSetRef.current.add(rid);
        try {
          join(rid);
        } catch (e) {
          console.log("[chat-store] ensureJoined join error:", e);
        }
      }
    },
    [join]
  );

  const messages = useMemo(
    () => messagesMap[activeId] || [],
    [messagesMap, activeId]
  );

  // 載入我的房間列表（並「自動加入所有房」→ 才能即時收到未點開房的推播）
  const reloadRooms = useCallback(async () => {
    try {
      const token = getToken();
      if (!token || !selfId || !isInitialized || !isAuth) {
        setThreads([]);
        return;
      }
      const res = await fetch(`${API_ROOMS_MINE}?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (json?.status !== "success") return;

      const rooms = Array.isArray(json.data?.rooms) ? json.data.rooms : [];

      setThreads(
        rooms.map((r) => {
          if (r.type === "dm" && r.peer?.id) {
            cacheUser({
              id: Number(r.peer.id),
              nickname: r.peer.nickname,
              avatar: r.peer.avatar,
            });
          }
          return {
            id: Number(r.id),
            title:
              r.type === "dm"
                ? r.peer?.nickname || `U${r.peer?.id}`
                : `${r.title || "群組"} (${Number(r.memberCount || 0)})`,
            avatar: pickAvatar(
              r.type === "dm" ? r.peer?.avatar : null,
              normalizeAvatar("https://placehold.co/40x40?text=G")
            ),
            lastMessage: r.last?.text || "",
            time: r.last?.createdAt ? formatListTime(r.last.createdAt) : "",
            unread: Number(r.unread || 0),
            isGroup: r.type !== "dm",
          };
        })
      );

      // ★ 自動加入所有房（用 ensureJoined，確保 join 一次即可）
      if (rooms.length && selfId && isInitialized && isAuth) {
        rooms.forEach((r) => ensureJoined(Number(r.id)));
      }
    } catch (err) {
      console.log("[chat-store] reloadRooms error:", err);
    }
  }, [selfId, isInitialized, isAuth, cacheUser, ensureJoined]);

  // 載入歷史訊息
  const loadHistory = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      const url = `${API_CHAT_HISTORY}?room=${encodeURIComponent(
        String(roomId)
      )}&limit=20`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json?.status !== "success" || !json?.data?.messages) return;

      const my = selfRef.current;
      const myId = Number(my.id || 0);

      const list = json.data.messages.map((m) => {
        const uid = Number(m.userId) || 0;
        const isMe = uid === myId;

        const sender = isMe
          ? { id: myId, nickname: my.nick, avatar: my.avatar }
          : {
              id: m?.sender?.id || uid,
              nickname: m?.sender?.nickname || `U${uid}`,
              // 歷史訊息也用 pickAvatar，避免空字串覆蓋快取
              avatar: pickAvatar(m?.sender?.avatar, undefined),
            };

        cacheUser(sender);
        if (m?.id != null) markSeen(roomId, m.id);

        return {
          id: String(m.id),
          type: "text",
          text: String(m.text || ""),
          sender,
          createdAt: new Date(m.createdAt).toISOString(),
        };
      });

      setMessagesMap((prev) => {
        const old = prev[roomId] || [];
        const merged = upsertMsgList(old, list);
        return { ...prev, [roomId]: merged };
      });
    } catch (err) {
      console.log("[chat-store] loadHistory error:", err);
    }
  }, []);

  // 切換房：只確保新房 join + 拉歷史 + 清本地未讀（不 leave 舊房）
  const setActiveId = useCallback(
    (roomId) => {
      if (roomId != null && selfId && isAuth && isInitialized) {
        ensureJoined(roomId);
        loadHistory(roomId);

        // 本地把未讀清零（暫不打 /read）
        setThreads((prev) => {
          const list = [...prev];
          const idx = list.findIndex((t) => Number(t.id) === Number(roomId));
          if (idx >= 0) list[idx] = { ...list[idx], unread: 0 };
          return list;
        });
      }
      prevActiveRef.current = roomId;
      _setActiveId(roomId);
    },
    [selfId, isAuth, isInitialized, ensureJoined, loadHistory]
  );

  // 標記已讀（成功後透過 WS 廣播）
  const markRead = useCallback(
    async (roomId) => {
      if (!roomId) return false;

      // 樂觀更新
      setThreads((prev) =>
        prev.map((t) =>
          Number(t.id) === Number(roomId) && Number(t.unread || 0) > 0
            ? { ...t, unread: 0 }
            : t
        )
      );

      try {
        const token = getToken();
        if (!token) throw new Error("未登入");
        const res = await fetch(
          `${API_BASE}/api/chat/rooms/${Number(roomId)}/read`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
            cache: "no-store",
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.status !== "success") {
          throw new Error(json?.message || "標記已讀失敗");
        }

        // 通知其他分頁/裝置
        try {
          sendRead(Number(roomId));
        } catch {}

        return true;
      } catch (err) {
        console.log("[chat-store] markRead error:", err);
        try {
          await reloadRooms();
        } catch {}
        return false;
      }
    },
    [reloadRooms, sendRead]
  );

  // 送出訊息（樂觀更新中欄與左欄）
  const sendText = useCallback(
    async (text) => {
      const rid = Number(activeId);
      if (!rid) return;

      const my = selfRef.current;
      const tempId = `temp-${rid}-${Date.now()}`;

      // 1) 中欄樂觀插入
      const optimisticMsg = {
        id: tempId,
        type: "text",
        text: String(text || ""),
        sender: {
          id: Number(my.id || 0),
          nickname: my.nick,
          avatar: my.avatar,
        },
        createdAt: new Date().toISOString(),
      };
      setMessagesMap((prev) => {
        const arr = Array.isArray(prev[rid]) ? prev[rid] : [];
        const merged = upsertMsgList(arr, [optimisticMsg]);
        return { ...prev, [rid]: merged };
      });

      // 2) 左欄同步更新（最後訊息/時間/置頂），未讀清零
      setThreads((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const list = [...prev];
        const idx = list.findIndex((t) => Number(t.id) === rid);
        if (idx < 0) return prev;
        const next = {
          ...list[idx],
          lastMessage: String(text || ""),
          time: formatListTime(optimisticMsg.createdAt),
          unread: 0,
        };
        list.splice(idx, 1);
        list.unshift(next);
        return list;
      });

      // 3) 發送 WS 並標記已讀
      wsSendText(rid, text);
      try {
        await markRead(rid);
      } catch {}
    },
    [activeId, wsSendText, markRead]
  );

  // 掛載：依登入狀態載入房清單（含自動 join）
  useEffect(() => {
    if (!isInitialized) return;
    if (isAuth) reloadRooms();
    else setThreads([]);
  }, [isInitialized, isAuth, reloadRooms]);

  // 建立私聊（1 對 1）
  const createDm = useCallback(async (targetId) => {
    const token = getToken();
    if (!token) throw new Error("未登入");

    const idNum = Number(targetId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      throw new Error("目標成員不合法");
    }

    try {
      const res = await fetch(API_CREATE_ROOM, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          type: "dm",
          members: [idNum],
        }),
      });

      let json = {};
      try {
        json = await res.json();
      } catch {}

      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || `建立私聊失敗（${res.status}）`);
      }

      const roomId =
        json?.data?.roomId ?? json?.data?.id ?? json?.roomId ?? json?.id;

      if (!roomId) throw new Error("建立私聊失敗：缺少 roomId");

      return Number(roomId);
    } catch (err) {
      console.log("[chat] create dm error:", err);
      throw err;
    }
  }, []);

  // 建立群組
  const createGroup = useCallback(async (title, memberIds) => {
    const token = getToken();
    if (!token) throw new Error("未登入");

    const name = String(title || "").trim();
    if (!name) throw new Error("請輸入群組名稱");

    const members = Array.isArray(memberIds) ? memberIds : [];
    const clean = members
      .map((n) => Number(n))
      .filter((id) => Number.isInteger(id) && id > 0);

    const res = await fetch(API_CREATE_ROOM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ type: "group", title: name, members: clean }),
    });

    const json = await res.json();
    if (json?.status !== "success") {
      throw new Error(json?.message || "建立群組失敗");
    }
    return Number(json?.data?.roomId);
  }, []);

  return {
    threads,
    activeId,
    messages,
    selfId,
    setActiveId,
    reloadRooms,
    loadHistory,
    sendText,
    // 既有
    markRead,
    // 新增
    createGroup,
    createDm,
  };
}
