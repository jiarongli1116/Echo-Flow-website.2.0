// server/routes/chat.js
/* eslint-disable no-console */
import express from "express";
import jwt from "jsonwebtoken";
import connection from "../connect.js";

const router = express.Router();
const secretKey = process.env.JWT_SECRET_KEY;

/* ====== 與 forums.js 相同的驗證中介層 ====== */
function checkToken(req, res, next) {
  let token = req.get("Authorization");
  if (token && token.includes("Bearer ")) {
    token = token.slice(7);
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        console.log(error);
        return res
          .status(401)
          .json({ status: "error", message: "登入驗證失效，請重新登入" });
      }
      req.decoded = decoded;
      next();
    });
  } else {
    return res
      .status(401)
      .json({ status: "error", message: "無登入驗證資料，請重新登入" });
  }
}

async function attachUserId(req, res, next) {
  try {
    let userId = Number(req?.decoded?.id || 0);
    if (!userId) {
      const account = req?.decoded?.account || "";
      if (!account)
        return res
          .status(401)
          .json({ status: "error", message: "缺少登入識別，請重新登入" });
      const [[u]] = await connection.execute(
        "SELECT id FROM users WHERE account = ? LIMIT 1",
        [account]
      );
      if (!u)
        return res
          .status(401)
          .json({ status: "error", message: "找不到使用者，請重新登入" });
      userId = Number(u.id);
    }
    req.userId = userId;
    next();
  } catch (err) {
    console.error("attachUserId 失敗:", err);
    return res.status(401).json({ status: "error", message: "登入驗證失敗" });
  }
}

/* 工具：補頭像絕對路徑 */
function absAvatar(img) {
  const host = process.env.STATIC_HOST || "http://localhost:3005";
  if (!img) return `${host}/images/default-avatar.svg`;
  if (/^https?:\/\//i.test(img)) return img;
  let p = String(img).trim();
  if (!p.includes("/")) p = `/uploads/avatars/${p}`;
  if (!p.startsWith("/")) p = `/${p}`;
  return `${host}${p}`;
}

/* ================================
 * GET /api/chat/history  （維持公開）
 * ================================ */
router.get("/history", async (req, res) => {
  try {
    const room = String(req.query.room || "").trim();
    if (!room)
      return res.status(400).json({ status: "fail", message: "room 必填" });

    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const sql = `SELECT cm.id, cm.room, cm.from_user_id AS userId, cm.text, cm.created_at AS createdAt,
              u.id AS senderId, u.nickname, u.img
       FROM chat_messages cm
       JOIN users u ON u.id = cm.from_user_id
       WHERE cm.room = ? AND cm.created_at < ? AND cm.is_deleted = 0
       ORDER BY cm.created_at DESC
       LIMIT ?`;

    const [rows] = await connection.execute(sql, [room, before, limit]);

    rows.reverse();
    const messages = rows.map((r) => ({
      id: Number(r.id),
      room: String(r.room),
      userId: Number(r.userId),
      text: String(r.text || ""),
      createdAt: new Date(r.createdAt).toISOString(),
      sender: {
        id: Number(r.senderId),
        nickname: r.nickname || `U${r.senderId}`,
        avatar: absAvatar(r.img),
      },
    }));

    const hasMore = rows.length >= limit;
    const nextBefore = messages.length
      ? messages[0].createdAt
      : new Date(0).toISOString();

    return res.json({
      status: "success",
      data: { room, messages, hasMore, nextBefore },
    });
  } catch (err) {
    console.error("[chat.history] error:", err);
    return res.status(500).json({ status: "error", message: "取得歷史失敗" });
  }
});

/* ================================
 * POST /api/chat/rooms
 * 既有：dm（唯一房）
 * 新增：group（多人群組）
 * ================================ */
router.post("/rooms", checkToken, attachUserId, async (req, res) => {
  try {
    const { type, members = [], title = "" } = req.body || {};
    const selfId = Number(req.userId);

    /* ---------- 分支：DM（沿用你原本行為） ---------- */
    if (type === "dm") {
      if (!Array.isArray(members) || members.length !== 1) {
        return res
          .status(400)
          .json({ status: "fail", message: "僅支援 dm 且 members 需為 1 人" });
      }

      const targetId = Number(members[0]);
      if (!Number.isInteger(targetId) || targetId <= 0) {
        return res
          .status(400)
          .json({ status: "fail", message: "成員格式錯誤" });
      }
      if (targetId === selfId) {
        return res
          .status(400)
          .json({ status: "fail", message: "不可與自己建立 DM" });
      }

      const a = Math.min(selfId, targetId);
      const b = Math.max(selfId, targetId);

      const upsert =
        "INSERT INTO chat_rooms (type, member_a, member_b) VALUES ('dm', ?, ?) " +
        "ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)";
      const [ins] = await connection.execute(upsert, [a, b]);
      const roomId = Number(ins.insertId);
      if (!roomId)
        return res
          .status(500)
          .json({ status: "error", message: "建立/取得房間失敗" });

      const insMembers =
        "INSERT IGNORE INTO chat_room_members (room_id, user_id, role) VALUES (?, ?, 'member'), (?, ?, 'member')";
      await connection.execute(insMembers, [roomId, a, roomId, b]);

      await connection.execute(
        "UPDATE chat_rooms SET updated_at = NOW() WHERE id = ?",
        [roomId]
      );

      return res.json({ status: "success", data: { roomId } });
    }

    /* ---------- 分支：GROUP（新增） ---------- */
    if (type === "group") {
      const name = String(title || "").trim();

      // 群組名稱必填（1~100 字）
      if (!name || name.length > 100) {
        return res
          .status(400)
          .json({ status: "fail", message: "群組名稱必填且需小於 100 字" });
      }

      // 整理成員（加入自己、數字化、去重、過濾非法/自己重覆）
      const uniq = new Set();
      uniq.add(selfId);
      if (Array.isArray(members)) {
        for (const m of members) {
          const uid = Number(m);
          if (Number.isInteger(uid) && uid > 0) uniq.add(uid);
        }
      }
      const all = Array.from(uniq.values()).map((n) => Number(n));
      if (all.length < 2) {
        return res
          .status(400)
          .json({ status: "fail", message: "群組成員不足，至少需 2 人" });
      }

      // 建立群組房
      const [ins] = await connection.execute(
        "INSERT INTO chat_rooms (type, title, owner_id) VALUES ('group', ?, ?)",
        [name, selfId]
      );
      const roomId = Number(ins.insertId);
      if (!roomId) {
        return res
          .status(500)
          .json({ status: "error", message: "建立群組失敗" });
      }

      // 寫入成員：自己 owner，其餘 member
      const values = [];
      const placeholders = all
        .map((uid) => {
          const role = uid === selfId ? "owner" : "member";
          values.push(roomId, uid, role);
          return "(?, ?, ?)";
        })
        .join(", ");
      const sqlMembers = `
        INSERT IGNORE INTO chat_room_members (room_id, user_id, role)
        VALUES ${placeholders}
      `;
      await connection.execute(sqlMembers, values);

      await connection.execute(
        "UPDATE chat_rooms SET updated_at = NOW() WHERE id = ?",
        [roomId]
      );

      return res.json({ status: "success", data: { roomId } });
    }

    // 其它 type 一律當成不支援
    return res
      .status(400)
      .json({ status: "fail", message: "type 參數錯誤（支援 dm / group）" });
  } catch (err) {
    console.error("[chat.rooms] error:", err);
    return res.status(500).json({ status: "error", message: "建立房間失敗" });
  }
});

/* ================================
 * GET /api/chat/users
 * ================================ */
router.get("/users", checkToken, attachUserId, async (req, res) => {
  try {
    const selfId = Number(req.userId);
    const q = String(req.query.q || "").trim();
    const wantAll = String(req.query.all || "0") === "1";

    let limit = parseInt(req.query.limit || "20", 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 20;
    limit = wantAll ? 100000 : Math.min(limit, 50);

    const excludeSelf = String(req.query.excludeSelf || "1") !== "0";

    const params = [];
    let where = "WHERE 1=1";

    if (excludeSelf) {
      where += " AND id <> ?";
      params.push(selfId);
    }
    if (q) {
      where += " AND (nickname LIKE ? OR account LIKE ? OR email LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const sql = `
      SELECT id, nickname, email, img
      FROM users
      ${where}
      ORDER BY id ASC
      LIMIT ?`;
    params.push(limit);

    const [rows] = await connection.execute(sql, params);

    const users = rows.map((u) => ({
      id: Number(u.id),
      nickname: u.nickname || `U${u.id}`,
      email: u.email || "",
      avatar: absAvatar(u.img),
    }));

    return res.json({ status: "success", data: { users } });
  } catch (err) {
    console.error("[chat.users] error:", err);
    return res.status(500).json({ status: "error", message: "搜尋使用者失敗" });
  }
});

/* ================================
 * GET /api/chat/rooms/mine
 * － 新增回傳：memberCount（包含自己的人數）
 * ================================ */
router.get("/rooms/mine", checkToken, attachUserId, async (req, res) => {
  try {
    const selfId = Number(req.userId);
    let limit = parseInt(req.query.limit || "50", 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    if (limit > 200) limit = 200;

    // 取我加入的房 + 最後訊息 + 未讀數 + (DM) 對象資訊 + 成員數
    const sql = `
      SELECT
        r.id,
        r.type,
        r.title,
        -- DM 對象 id
        CASE
          WHEN r.type = 'dm' AND r.member_a = ? THEN r.member_b
          WHEN r.type = 'dm' AND r.member_b = ? THEN r.member_a
          ELSE NULL
        END AS peer_id,

        u.nickname  AS peer_nickname,
        u.email     AS peer_email,
        u.img       AS peer_img,

        lm.text     AS last_text,
        lm.created_at AS last_created_at,
        COALESCE(unread.cnt, 0) AS unread,

        -- ★ 新增：房間成員數（包含自己）
        COALESCE(mc.cnt, 0) AS member_count

      FROM chat_room_members me
      JOIN chat_rooms r
        ON r.id = me.room_id AND r.is_deleted = 0
      -- 最後一則訊息
      LEFT JOIN (
        SELECT m.room, m.text, m.created_at
        FROM chat_messages m
        JOIN (
          SELECT room, MAX(created_at) AS max_created
          FROM chat_messages
          GROUP BY room
        ) x ON x.room = m.room AND x.max_created = m.created_at
      ) lm ON lm.room = r.id
      -- 未讀數（不含自己發的）
      LEFT JOIN (
        SELECT m.room, COUNT(*) AS cnt
        FROM chat_messages m
        JOIN chat_room_members me2 ON me2.room_id = m.room AND me2.is_deleted = 0
        WHERE me2.user_id = ?
          AND m.from_user_id <> me2.user_id
          AND m.created_at > COALESCE(me2.last_read_at, '1970-01-01')
        GROUP BY m.room
      ) unread ON unread.room = r.id
      -- ★ 新增：每房成員數
      LEFT JOIN (
        SELECT room_id, COUNT(*) AS cnt
        FROM chat_room_members
        WHERE is_deleted = 0
        GROUP BY room_id
      ) mc ON mc.room_id = r.id
      -- DM 對象資料
      LEFT JOIN users u
        ON u.id = CASE
          WHEN r.type = 'dm' AND r.member_a = ? THEN r.member_b
          WHEN r.type = 'dm' AND r.member_b = ? THEN r.member_a
          ELSE NULL
        END
      WHERE me.user_id = ? AND me.is_deleted = 0
      ORDER BY COALESCE(lm.created_at, r.updated_at) DESC, r.id DESC
      LIMIT ?`;

    const params = [
      selfId,
      selfId,
      selfId, // me2.user_id = ?
      selfId, // join users case a
      selfId, // join users case b
      selfId, // WHERE me.user_id = ?
      limit,
    ];

    const [rows] = await connection.execute(sql, params);

    const rooms = rows.map((r) => ({
      id: Number(r.id),
      type: r.type,
      title:
        r.type === "dm"
          ? r.peer_nickname || `U${r.peer_id}`
          : r.title || "群組",
      peer:
        r.type === "dm"
          ? {
              id: Number(r.peer_id),
              nickname: r.peer_nickname || `U${r.peer_id}`,
              email: r.peer_email || "",
              avatar: absAvatar(r.peer_img),
            }
          : null,
      last: r.last_created_at
        ? {
            text: String(r.last_text || ""),
            createdAt: new Date(r.last_created_at).toISOString(),
            userId: undefined,
          }
        : null,
      unread: Number(r.unread || 0),
      // ★ 新增：memberCount 回傳到前端（包含自己）
      memberCount: Number(r.member_count || 0),
    }));

    return res.json({ status: "success", data: { rooms } });
  } catch (err) {
    console.error("[chat.rooms.mine] error:", err);
    return res
      .status(500)
      .json({ status: "error", message: "取得聊天室清單失敗" });
  }
});

/* ================================
 * PATCH /api/chat/rooms/:roomId/read
 * 將目前使用者在該房的 last_read_at 設為 NOW()
 * ================================ */
router.patch(
  "/rooms/:roomId/read",
  checkToken,
  attachUserId,
  async (req, res) => {
    try {
      const roomId = Number(req.params.roomId || 0);
      if (!Number.isInteger(roomId) || roomId <= 0) {
        return res
          .status(400)
          .json({ status: "error", message: "roomId 格式錯誤" });
      }
      const selfId = Number(req.userId);

      // 確認是房內成員
      const [chk] = await connection.execute(
        "SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ? LIMIT 1",
        [roomId, selfId]
      );
      if (!chk.length) {
        return res
          .status(404)
          .json({ status: "error", message: "非此房成員或房間不存在" });
      }

      // 標記已讀
      const [ret] = await connection.execute(
        "UPDATE chat_room_members SET last_read_at = NOW() WHERE room_id = ? AND user_id = ?",
        [roomId, selfId]
      );
      if (!ret.affectedRows) {
        return res
          .status(500)
          .json({ status: "error", message: "標記已讀失敗" });
      }

      return res.json({
        status: "success",
        data: { roomId, userId: selfId, readAt: new Date().toISOString() },
      });
    } catch (err) {
      console.error("[chat.rooms.read] error:", err);
      return res.status(500).json({ status: "error", message: "標記已讀失敗" });
    }
  }
);

export default router;
