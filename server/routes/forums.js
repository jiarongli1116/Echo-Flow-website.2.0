// == 你要我保留、不可更動的區塊（原封不動） ==
import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import connection from "../connect.js";
import fs from "fs";
import path from "path";

const upload = multer();
const secretKey = process.env.JWT_SECRET_KEY;
const router = express.Router();

// 檢查 JWT Token 的中間件函數
function checkToken(req, res, next) {
  let token = req.get("Authorization");
  if (token && token.includes("Bearer ")) {
    token = token.slice(7);
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        console.log(error);
        res.status(401).json({
          status: "error",
          message: "登入驗證失效，請重新登入",
        });
        return;
      }
      req.decoded = decoded;
      next();
    });
  } else {
    res.status(401).json({
      status: "error",
      message: "無登入驗證資料，請重新登入",
    });
  }
}

// == 以下為論壇 API ==
function toInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? d : n;
}

/** 取得目前登入者的 users.id（token 以 id 為主，沒有再用 account 查一次） */
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
    res.status(401).json({ status: "error", message: "登入驗證失敗" });
  }
}

/** 解析 tag_ids：支援逗號或 JSON 陣列，回傳不重複正整數陣列 */
function parseTagIds(input) {
  if (!input) return [];
  let arr = [];
  if (Array.isArray(input)) arr = input;
  else if (typeof input === "string") {
    const s = input.trim();
    if (!s) return [];
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        arr = JSON.parse(s);
      } catch {
        arr = s.split(",");
      }
    } else arr = s.split(",");
  } else arr = [input];

  return Array.from(
    new Set(arr.map((x) => toInt(String(x).trim(), 0)).filter((n) => n > 0))
  );
}

/** 解析 tag_names：支援逗號或 JSON 陣列；undefined 代表「沒傳」，[] 代表「清空」 */
function parseTagNames(input) {
  if (input === undefined) return undefined;
  if (!input) return [];
  let arr = [];
  if (Array.isArray(input)) arr = input;
  else if (typeof input === "string") {
    const s = input.trim();
    if (!s) return [];
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        arr = JSON.parse(s);
      } catch {
        arr = s.split(",");
      }
    } else arr = s.split(",");
  } else arr = [input];

  return Array.from(
    new Set(
      arr
        .map((x) => String(x ?? "").trim())
        .filter((s) => s.length > 0)
        .map((s) => (s.length > 50 ? s.slice(0, 50) : s))
    )
  );
}

/** ★ 新作法：嘗試新增；撞 UNIQUE 就改查既有 id（並復活 is_deleted=1） */
async function createOrGetTagIds(names) {
  const ids = [];
  for (const name of names) {
    try {
      const [ins] = await connection.execute(
        "INSERT INTO tags (name, is_deleted) VALUES (?, 1)",
        [name]
      );
      ids.push(Number(ins.insertId));
    } catch (err) {
      // MySQL duplicate entry
      if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
        const [[row]] = await connection.execute(
          "SELECT id, is_deleted FROM tags WHERE name = ? LIMIT 1",
          [name]
        );
        if (row) {
          if (Number(row.is_deleted) !== 1) {
            await connection.execute(
              "UPDATE tags SET is_deleted=1 WHERE id=?",
              [row.id]
            );
          }
          ids.push(Number(row.id));
        }
      } else {
        throw err;
      }
    }
  }
  return ids;
}

/** 設定某篇貼文的標籤：先全部軟刪，再把要啟用的設為 1（不存在就插入） */
async function setPostTags(postId, tagIds) {
  await connection.execute(
    "UPDATE post_tags SET is_deleted=0 WHERE post_id=?",
    [postId]
  );
  for (const tid of tagIds) {
    const [[exist]] = await connection.execute(
      "SELECT id FROM post_tags WHERE post_id=? AND tag_id=? LIMIT 1",
      [postId, tid]
    );
    if (exist) {
      await connection.execute("UPDATE post_tags SET is_deleted=1 WHERE id=?", [
        exist.id,
      ]);
    } else {
      await connection.execute(
        "INSERT INTO post_tags (post_id, tag_id, is_deleted) VALUES (?, ?, 1)",
        [postId, tid]
      );
    }
  }
}

/* ============================
 * ▲ 保留區塊到這裡
 * ============================ */

/* === 新增：圖片上傳設定 === */
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/forums");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const ALLOWED_MIME = new Set(Object.keys(MIME_EXT));

function genSafeFilename(file) {
  const extByMime =
    MIME_EXT[file.mimetype] || path.extname(file.originalname) || ".jpg";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${rand}${extByMime}`;
}

const storageForums = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, genSafeFilename(file)),
});

const uploadImages = multer({
  storage: storageForums,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error("不支援的圖片格式"));
  },
  limits: { files: 6, fileSize: 5 * 1024 * 1024 },
});

const publicUrlFromName = (filename) => `/static/uploads/forums/${filename}`;

/* 小工具：將絕對網址轉資料庫相對路徑（/static/uploads/forums/...） */
function toRelStatic(u) {
  if (!u) return "";
  const s = String(u);
  const i = s.indexOf("/static/uploads/forums/");
  return i >= 0 ? s.slice(i) : s;
}

/* === content_html 欄位檢查（若你有此欄位才會使用） === */
let hasContentHtmlCache = null;
async function hasPostsContentHtml() {
  if (hasContentHtmlCache !== null) return hasContentHtmlCache;
  try {
    const [rows] = await connection.execute(
      "SHOW COLUMNS FROM posts LIKE 'content_html'"
    );
    hasContentHtmlCache = Array.isArray(rows) && rows.length > 0;
  } catch {
    hasContentHtmlCache = false;
  }
  return hasContentHtmlCache;
}

/* =========================================================
 * 0) 一次撈全部貼文（含暱稱/分類/三計數/圖片/標籤）
 * ========================================================= */
router.get(["/", "/posts/join"], async (_req, res) => {
  try {
    const sql = `
      SELECT
        p.id, p.users_id, p.category_id, p.title, p.content,
        p.created_at, p.updated_at, p.is_hot, p.view_count,
        COALESCE(u.nickname, u.name) AS author_nickname,
        u.img  AS author_img,
        c.name AS category_name,
        c.icon AS category_icon, 
        lc.like_count, cc.comment_count, bc.bookmark_count,
        pi.id AS image_id, pi.image_url AS image_url, pi.sort_order AS image_sort_order,
        t.id AS tag_id, t.name AS tag_name
      FROM posts p
      JOIN users u      ON u.id = p.users_id
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS like_count FROM likes WHERE is_deleted = 1 GROUP BY post_id
      ) lc ON lc.post_id = p.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS comment_count FROM comments WHERE is_deleted = 1 GROUP BY post_id
      ) cc ON cc.post_id = p.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS bookmark_count FROM bookmarks WHERE is_deleted = 1 GROUP BY post_id
      ) bc ON bc.post_id = p.id
      LEFT JOIN post_images pi ON pi.post_id = p.id AND pi.is_deleted = 1
      LEFT JOIN post_tags   pt ON pt.post_id = p.id AND pt.is_deleted = 1
      LEFT JOIN tags        t  ON t.id = pt.tag_id AND t.is_deleted = 1
      WHERE p.is_deleted = 1
      ORDER BY p.created_at DESC, pi.sort_order ASC, pi.id ASC, t.id ASC
    `;
    const [rows] = await connection.execute(sql);
    res.status(200).json({
      status: "success",
      data: rows,
      message: "已獲取所有貼文（含暱稱/分類/計數/圖片/標籤）",
    });
  } catch (error) {
    console.error("一次撈全部貼文失敗:", error);
    res
      .status(500)
      .json({ status: "error", message: "取得貼文失敗，請稍後再試" });
  }
});

/* =========================================
 * 1) 我發的貼文（需登入）
 * ========================================= */
router.get(
  ["/mine", "/posts/mine"],
  checkToken,
  attachUserId,
  async (req, res) => {
    try {
      const [rows] = await connection.execute(
        `
      SELECT
        p.id, p.users_id, p.category_id, p.title, p.content,
        p.created_at, p.updated_at, p.is_hot, p.view_count,
        (SELECT COUNT(*) FROM likes     l  WHERE l.post_id=p.id AND l.is_deleted=1) AS like_count,
        (SELECT COUNT(*) FROM comments  cm WHERE cm.post_id=p.id AND cm.is_deleted=1) AS comment_count,
        (SELECT COUNT(*) FROM bookmarks b  WHERE b.post_id=p.id AND b.is_deleted=1) AS bookmark_count
      FROM posts p
      WHERE p.is_deleted = 1 AND p.users_id = ?
      ORDER BY p.created_at DESC
      LIMIT 100
      `,
        [req.userId]
      );
      res
        .status(200)
        .json({ status: "success", data: rows, message: "已取得我的貼文" });
    } catch (error) {
      console.error("取得我的貼文失敗:", error);
      res.status(500).json({ status: "error", message: "取得我的貼文失敗" });
    }
  }
);

/* =========================================
 * 2) 基礎資料：分類 / 標籤
 * ========================================= */
router.get("/categories", async (_req, res) => {
  try {
    const [rows] = await connection.execute(
      "SELECT id, name, description FROM categories WHERE is_deleted=1 ORDER BY id ASC"
    );
    res.json({ status: "success", data: rows });
  } catch (error) {
    res.status(500).json({ status: "error", message: "取得分類失敗" });
  }
});

router.get("/tags", async (_req, res) => {
  try {
    const [rows] = await connection.execute(
      "SELECT id, name FROM tags WHERE is_deleted=1 ORDER BY id ASC"
    );
    res.json({ status: "success", data: rows });
  } catch (error) {
    res.status(500).json({ status: "error", message: "取得標籤失敗" });
  }
});

/* =========================================
 * 3) 列表
 * ========================================= */
// ★★★ 覆蓋整段：/posts（支援 sort=hot|new，穩定排序+分頁）★★★
router.get("/posts", async (req, res) => {
  try {
    const categoryId = toInt(req.query.category_id, 0);
    const page = Math.max(1, toInt(req.query.page, 1));
    const perPage = Math.max(1, Math.min(100, toInt(req.query.per_page, 20)));
    const offset = (page - 1) * perPage;
    const sort = String(req.query.sort || "hot").toLowerCase();
    const q = String(req.query.q || "").trim();

    const where = ["p.is_deleted = 1"];
    const params = [];
    if (categoryId) {
      where.push("p.category_id = ?");
      params.push(categoryId);
    }
    if (q) {
      where.push(`(
    p.title   LIKE ? OR
    p.content LIKE ? OR
    EXISTS (
      SELECT 1
      FROM post_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE pt.post_id = p.id
        AND pt.is_deleted = 1
        AND t.is_deleted  = 1
        AND t.name LIKE ?
    )
  )`);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    // 總數
    const [[cntRow]] = await connection.execute(
      `SELECT COUNT(*) AS total FROM posts p ${whereSql}`,
      params
    );
    const total = Number(cntRow?.total || 0);
    const pages = Math.max(1, Math.ceil(total / perPage));

    // 排序子句（穩定：加上 id DESC）
    const orderBy =
      sort === "new"
        ? "p.created_at DESC, p.id DESC"
        : "(like_count + bookmark_count) DESC, p.created_at DESC, p.id DESC";

    // 當頁資料
    const [rows] = await connection.execute(
      `
      SELECT
        p.id, p.users_id, p.category_id, p.title, p.content,
        p.created_at, p.updated_at, p.is_hot, p.view_count,
        COALESCE(u.nickname, u.name) AS author_nickname,
        u.img AS author_img,
        c.name AS category_name,
        c.icon AS category_icon,
        /* 三種計數 */
        (SELECT COUNT(1) FROM likes     l  WHERE l.post_id = p.id AND l.is_deleted = 1) AS like_count,
        (SELECT COUNT(1) FROM comments  cm WHERE cm.post_id = p.id AND cm.is_deleted = 1) AS comment_count,
        (SELECT COUNT(1) FROM bookmarks b  WHERE b.post_id = p.id AND b.is_deleted = 1) AS bookmark_count
      FROM posts p
      JOIN users u ON u.id = p.users_id
      JOIN categories c ON c.id = p.category_id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
      `,
      [...params, perPage, offset]
    );

    // 圖片（最多 6 張）
    const ids = rows.map((r) => r.id);
    const imagesMap = new Map();
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      const [imgRows] = await connection.execute(
        `SELECT post_id, image_url
         FROM post_images
         WHERE is_deleted = 1 AND post_id IN (${placeholders})
         ORDER BY sort_order ASC, id ASC`,
        ids
      );
      for (const r of imgRows) {
        if (!imagesMap.has(r.post_id)) imagesMap.set(r.post_id, []);
        const arr = imagesMap.get(r.post_id);
        if (arr.length < 6) arr.push(r.image_url);
      }
    }

    const data = rows.map((r) => ({ ...r, images: imagesMap.get(r.id) || [] }));

    res.json({
      status: "success",
      data,
      pagination: {
        page,
        per_page: perPage,
        total,
        pages,
        has_more: page < pages,
        sort, // 回傳目前排序
      },
    });
  } catch (error) {
    console.error("取得文章列表失敗:", error);
    res.status(500).json({ status: "error", message: "取得文章列表失敗" });
  }
});

/* =========================================
 * 4) 取得單篇（基本欄位 + 三計數 + 圖片 + 標籤 + [可選]個人互動旗標）
 *    ★ 若資料表有 content_html 欄位，額外回傳 content_html
 *    ★ 若帶 Authorization: Bearer <token>，會回傳 is_liked / is_bookmarked
 * ========================================= */
router.get("/posts/:postId", async (req, res) => {
  const postId = toInt(req.params.postId, 0);
  if (!postId)
    return res
      .status(400)
      .json({ status: "error", message: "postId 不可為空" });

  try {
    // 1) 文章基本資料
    const [[post]] = await connection.execute(
      `
      SELECT
        p.id, p.users_id, p.category_id, p.title, p.content,
        p.created_at, p.updated_at, p.is_hot, p.view_count,
        COALESCE(u.nickname, u.name) AS author_nickname,
        u.img AS author_img,
        c.name AS category_name, c.icon AS category_icon
      FROM posts p
      JOIN users u ON u.id = p.users_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id=? AND p.is_deleted=1
      `,
      [postId]
    );
    if (!post)
      return res.status(404).json({ status: "error", message: "文章不存在" });

    // 2) 三計數
    const [[counts]] = await connection.execute(
      `
      SELECT
        (SELECT COUNT(*) FROM likes     l  WHERE l.post_id=? AND l.is_deleted=1) AS like_count,
        (SELECT COUNT(*) FROM bookmarks b  WHERE b.post_id=? AND b.is_deleted=1) AS bookmark_count,
        (SELECT COUNT(*) FROM comments  cm WHERE cm.post_id=? AND cm.is_deleted=1) AS comment_count
      `,
      [postId, postId, postId]
    );

    // 3) 圖片（依 sort_order, id）
    const [imgRows] = await connection.execute(
      `
      SELECT image_url
      FROM post_images
      WHERE post_id=? AND is_deleted=1
      ORDER BY sort_order ASC, id ASC
      `,
      [postId]
    );
    const images = (imgRows || []).map((r) => r.image_url).filter(Boolean);

    // 4) 標籤（維持 is_deleted=1）
    const [tagRows] = await connection.execute(
      `
      SELECT t.name
      FROM post_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE pt.post_id=? AND pt.is_deleted=1 AND t.is_deleted=1
      ORDER BY t.id ASC
      `,
      [postId]
    );
    const tags = (tagRows || []).map((r) => r.name).filter((s) => !!s);

    // 5) content_html（若欄位存在才查）
    let content_html = null;
    if (await hasPostsContentHtml()) {
      const [[h]] = await connection.execute(
        `SELECT content_html FROM posts WHERE id=?`,
        [postId]
      );
      content_html = h?.content_html ?? null;
    }

    // 6) ★ 個人互動旗標（若帶 token）
    let is_liked = 0;
    let is_bookmarked = 0;
    try {
      let token = req.get("Authorization");
      if (token && token.startsWith("Bearer ")) {
        token = token.slice(7);
        const decoded = jwt.verify(token, secretKey);
        let meId = Number(decoded?.id || 0);
        if (!meId && decoded?.account) {
          const [[u]] = await connection.execute(
            "SELECT id FROM users WHERE account=? LIMIT 1",
            [decoded.account]
          );
          meId = Number(u?.id || 0);
        }
        if (meId) {
          const [[flags]] = await connection.execute(
            `
            SELECT
              EXISTS(SELECT 1 FROM likes     l WHERE l.post_id=? AND l.users_id=? AND l.is_deleted=1)  AS is_liked,
              EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id=? AND b.users_id=? AND b.is_deleted=1)  AS is_bookmarked
            `,
            [postId, meId, postId, meId]
          );
          is_liked = flags?.is_liked ? 1 : 0;
          is_bookmarked = flags?.is_bookmarked ? 1 : 0;
        }
      }
    } catch (e) {
      // token 無效就忽略個人旗標，不影響公開資料
    }

    // 回傳
    res.json({
      status: "success",
      data: {
        ...post,
        ...counts,
        images,
        tags,
        content_html,
        is_liked,
        is_bookmarked,
      },
    });
  } catch (error) {
    console.error("取得單篇失敗:", error);
    res.status(500).json({ status: "error", message: "取得單篇失敗" });
  }
});

/* =========================================
 * 5) 新增貼文（multipart 支援圖片）
 * ========================================= */
router.post(
  "/posts",
  checkToken,
  attachUserId,
  uploadImages.array("images", 6),
  async (req, res) => {
    try {
      const users_id = req.userId;
      const category_id = toInt(req.body.category_id, 0);
      const title = (req.body.title || "").trim();
      const content = (req.body.content || "").trim();

      if (!category_id)
        return res
          .status(400)
          .json({ status: "error", message: "category_id 必填" });
      if (!title || title.length > 50)
        return res
          .status(400)
          .json({ status: "error", message: "標題必填且 ≤ 50 字" });
      if (!content || content.length > 500)
        return res
          .status(400)
          .json({ status: "error", message: "內文必填且 ≤ 500 字" });

      // 建立文章
      const [result] = await connection.execute(
        `INSERT INTO posts (users_id, category_id, title, content, created_at, updated_at, is_hot, view_count, is_deleted)
         VALUES (?, ?, ?, ?, NOW(), NOW(), 0, 0, 1)`,
        [users_id, category_id, title, content]
      );
      const postId = result.insertId;

      // 處理圖片（依上傳順序給 sort_order）
      const files = Array.isArray(req.files) ? req.files : [];
      const urls = files
        .map((f) => publicUrlFromName(path.basename(f.filename)))
        .filter(Boolean);

      for (let i = 0; i < urls.length; i++) {
        await connection.execute(
          `INSERT INTO post_images (post_id, image_url, sort_order, is_deleted)
           VALUES (?, ?, ?, 1)`,
          [postId, urls[i], i]
        );
      }

      // 若你有 content_html 欄位：把 blob 圖換成實際網址後寫回
      const rawHtml = (req.body.content_html || "").trim();
      if (rawHtml && (await hasPostsContentHtml())) {
        let idx = 0;
        const replaced = rawHtml.replace(
          /src=(["'])blob:[^"']+\1/g,
          (_m, q) => `src=${q}${urls[idx++] || ""}${q}`
        );
        await connection.execute(`UPDATE posts SET content_html=? WHERE id=?`, [
          replaced,
          postId,
        ]);
      }

      // 標籤（支援 ids / names）
      let tagIdsDirect = parseTagIds(req.body.tag_ids);
      let tagNames = parseTagNames(req.body.tag_names);
      let allTagIds = [...tagIdsDirect];
      if (tagNames !== undefined) {
        const createdOrExistingIds = await createOrGetTagIds(tagNames);
        allTagIds = Array.from(
          new Set([...allTagIds, ...createdOrExistingIds])
        );
      }
      if (allTagIds.length) await setPostTags(postId, allTagIds);

      res.status(201).json({ status: "success", data: { id: postId } });
    } catch (error) {
      console.error("發文失敗:", error);
      res.status(500).json({ status: "error", message: "發文失敗" });
    }
  }
);

// ====== 把編輯的實作抽成 handler，PATCH/PUT 共用（避免路由不一致造成 404） ======
async function updatePostHandler(req, res) {
  try {
    const users_id = req.userId;
    const postId = toInt(req.params.postId, 0);

    const [[own]] = await connection.execute(
      "SELECT users_id FROM posts WHERE id=? AND is_deleted=1",
      [postId]
    );
    if (!own)
      return res.status(404).json({ status: "error", message: "文章不存在" });
    if (toInt(own.users_id, 0) !== toInt(users_id, 0))
      return res
        .status(403)
        .json({ status: "error", message: "無權限編輯此文章" });

    /* 1) 文字欄位 */
    const fields = [];
    const params = [];
    if (typeof req.body.title === "string") {
      const title = req.body.title.trim();
      if (!title || title.length > 50)
        return res
          .status(400)
          .json({ status: "error", message: "標題必填且 ≤ 50 字" });
      fields.push("title=?");
      params.push(title);
    }
    if (typeof req.body.content === "string") {
      const content = req.body.content.trim();
      if (!content || content.length > 500)
        return res
          .status(400)
          .json({ status: "error", message: "內文必填且 ≤ 500 字" });
      fields.push("content=?");
      params.push(content);
    }
    if (toInt(req.body.category_id, 0)) {
      fields.push("category_id=?");
      params.push(toInt(req.body.category_id, 0));
    }
    if (fields.length) {
      fields.push("updated_at=NOW()");
      params.push(postId);
      await connection.execute(
        `UPDATE posts SET ${fields.join(", ")} WHERE id=?`,
        params
      );
    }

    /* 2) 標籤（有帶就覆蓋） */
    if ("tag_names" in req.body || "tag_ids" in req.body) {
      const tagIdsDirect = parseTagIds(req.body.tag_ids);
      const tagNames = parseTagNames(req.body.tag_names);
      let allTagIds = [...tagIdsDirect];
      if (tagNames !== undefined) {
        const createdOrExistingIds = await createOrGetTagIds(tagNames);
        allTagIds = Array.from(
          new Set([...allTagIds, ...createdOrExistingIds])
        );
      }
      await setPostTags(postId, allTagIds); // 可為空 => 清空
    }

    /* 3) 這次上傳的新圖（diskStorage 已寫檔，直接取 filename） */
    const files = Array.isArray(req.files) ? req.files : [];
    const newUrls = files.map((f) => publicUrlFromName(f.filename));

    /* 4) 取現有啟用中的舊圖（依 sort_order） */
    const [oldRows] = await connection.execute(
      "SELECT id, image_url FROM post_images WHERE post_id=? AND is_deleted=1 ORDER BY sort_order ASC, id ASC",
      [postId]
    );
    const oldIds = oldRows.map((r) => r.id);
    const urlToId = new Map(oldRows.map((r) => [r.image_url, r.id]));

    /* 5) 解析 keep_urls 與 image_plan —— 這裡要能分辨「沒傳」與「傳了空陣列」 */
    const keepProvided = Object.prototype.hasOwnProperty.call(
      req.body,
      "keep_urls"
    );
    const planProvided = Object.prototype.hasOwnProperty.call(
      req.body,
      "image_plan"
    );

    let keepUrls = [];
    if (typeof req.body.keep_urls === "string") {
      try {
        const parsed = JSON.parse(req.body.keep_urls);
        if (Array.isArray(parsed))
          keepUrls = parsed.map(toRelStatic).filter(Boolean);
      } catch {}
    }

    let imagePlan = [];
    if (typeof req.body.image_plan === "string") {
      try {
        const parsed = JSON.parse(req.body.image_plan);
        if (Array.isArray(parsed)) {
          imagePlan = parsed.filter((x) => x === "keep" || x === "new");
        }
      } catch {}
    }

    const placeholderCount =
      typeof req.body.content === "string"
        ? (req.body.content.match(/\[img\]/gi) || []).length
        : null;

    /* 6) 決定最終順序（關鍵修正：若「有傳 keep_urls 但為 []」＝清空舊圖，不再 fallback 保留） */
    const finalKeptIds = [];
    const finalNewUrls = [];

    if (keepProvided) {
      // 明確給了 keep_urls（可能為 []）：完全以 keepUrls 為準
      for (const u of keepUrls) {
        const id = urlToId.get(toRelStatic(u));
        if (id) finalKeptIds.push(id);
      }
      // 新圖數量：依 image_plan "new" 個數；若未提供 plan，則以 placeholders - kept；再不然以新上傳總數
      let wantNew = planProvided
        ? imagePlan.filter((x) => x === "new").length
        : placeholderCount != null
        ? Math.max(0, placeholderCount - finalKeptIds.length)
        : newUrls.length;
      finalNewUrls.push(...newUrls.slice(0, wantNew));
    } else {
      // 沒有 keep_urls：沿用原本 fallback 行為
      const keepCount = planProvided
        ? Math.min(oldIds.length, imagePlan.filter((x) => x === "keep").length)
        : placeholderCount != null
        ? Math.min(oldIds.length, placeholderCount)
        : oldIds.length;

      // 取「最後」 keepCount 張舊圖，避免刪除前面的舊圖卻又被保留
      finalKeptIds.push(...oldIds.slice(-keepCount));

      const newCount = planProvided
        ? imagePlan.filter((x) => x === "new").length
        : placeholderCount != null
        ? Math.max(0, placeholderCount - keepCount)
        : newUrls.length;

      finalNewUrls.push(...newUrls.slice(0, newCount));
    }

    /* 7) 重建 post_images：先全部軟刪，再依新順序啟用/插入
          is_deleted=1 表示有效、0 表示軟刪 */
    await connection.execute(
      "UPDATE post_images SET is_deleted=0 WHERE post_id=?",
      [postId]
    );

    // 重新啟用舊圖（依新順序）
    for (let i = 0; i < finalKeptIds.length; i++) {
      await connection.execute(
        "UPDATE post_images SET is_deleted=1, sort_order=? WHERE id=?",
        [i, finalKeptIds[i]]
      );
    }
    // 插入新圖
    for (let i = 0; i < finalNewUrls.length; i++) {
      await connection.execute(
        "INSERT INTO post_images (post_id, image_url, sort_order, is_deleted) VALUES (?, ?, ?, 1)",
        [postId, finalNewUrls[i], finalKeptIds.length + i]
      );
    }

    /* 8) 若帶 content_html：把 blob: 依「新圖出現順序」替換成 finalNewUrls */
    const rawHtml = (req.body.content_html || "").trim();
    if (rawHtml && (await hasPostsContentHtml())) {
      let idx = 0;
      const replaced = rawHtml.replace(
        /src=(["'])blob:[^"']+\1/g,
        (_m, q) => `src=${q}${finalNewUrls[idx++] || ""}${q}`
      );
      await connection.execute("UPDATE posts SET content_html=? WHERE id=?", [
        replaced,
        postId,
      ]);
    }

    res.json({ status: "success", message: "更新成功" });
  } catch (error) {
    console.error("更新文章失敗:", error);
    res.status(500).json({ status: "error", message: "更新文章失敗" });
  }
}

// 編輯（支援 keep_urls + image_plan；避免刪掉圖1仍渲染圖1）
router.patch(
  "/posts/:postId",
  checkToken,
  attachUserId,
  uploadImages.array("images", 6),
  updatePostHandler
);

// ★ 新增：PUT 與 PATCH 同行為，避免前端用 PUT 時 404
router.put(
  "/posts/:postId",
  checkToken,
  attachUserId,
  uploadImages.array("images", 6),
  updatePostHandler
);

// 刪除（軟刪）
router.delete("/posts/:postId", checkToken, attachUserId, async (req, res) => {
  try {
    const users_id = req.userId;
    const postId = toInt(req.params.postId, 0);

    const [[own]] = await connection.execute(
      "SELECT users_id FROM posts WHERE id=? AND is_deleted=1",
      [postId]
    );
    if (!own)
      return res.status(404).json({ status: "error", message: "文章不存在" });
    if (toInt(own.users_id, 0) !== toInt(users_id, 0))
      return res
        .status(403)
        .json({ status: "error", message: "無權限刪除此文章" });

    await connection.execute("UPDATE posts SET is_deleted=0 WHERE id=?", [
      postId,
    ]);
    res.json({ status: "success", message: "已刪除（軟刪）" });
  } catch (error) {
    console.error("刪除文章失敗:", error);
    res.status(500).json({ status: "error", message: "刪除文章失敗" });
  }
});

/* =========================================
 * 6) 互動：按讚 / 收藏（toggle，需登入）
 * ========================================= */
router.post(
  "/posts/:postId/likes",
  checkToken,
  attachUserId,
  async (req, res) => {
    try {
      const users_id = req.userId;
      const postId = toInt(req.params.postId, 0);

      const [[row]] = await connection.execute(
        "SELECT id, is_deleted FROM likes WHERE post_id=? AND users_id=? LIMIT 1",
        [postId, users_id]
      );

      if (!row) {
        await connection.execute(
          "INSERT INTO likes (post_id, users_id, created_at, is_deleted) VALUES (?, ?, NOW(), 1)",
          [postId, users_id]
        );
        return res.json({ status: "success", message: "已按讚" });
      }

      const next = row.is_deleted === 1 ? 0 : 1;
      await connection.execute(
        "UPDATE likes SET is_deleted=?, created_at=NOW() WHERE id=?",
        [next, row.id]
      );
      res.json({
        status: "success",
        message: next === 1 ? "已按讚" : "已取消讚",
      });
    } catch (error) {
      console.error("按讚切換失敗:", error);
      res.status(500).json({ status: "error", message: "按讚切換失敗" });
    }
  }
);

router.post(
  "/posts/:postId/bookmarks",
  checkToken,
  attachUserId,
  async (req, res) => {
    try {
      const users_id = req.userId;
      const postId = toInt(req.params.postId, 0);

      const [[row]] = await connection.execute(
        "SELECT id, is_deleted FROM bookmarks WHERE post_id=? AND users_id=? LIMIT 1",
        [postId, users_id]
      );

      if (!row) {
        await connection.execute(
          "INSERT INTO bookmarks (post_id, users_id, created_at, is_deleted) VALUES (?, ?, NOW(), 1)",
          [postId, users_id]
        );
        return res.json({ status: "success", message: "已收藏" });
      }

      const next = row.is_deleted === 1 ? 0 : 1;
      await connection.execute(
        "UPDATE bookmarks SET is_deleted=?, created_at=NOW() WHERE id=?",
        [next, row.id]
      );
      res.json({
        status: "success",
        message: next === 1 ? "已收藏" : "已取消收藏",
      });
    } catch (error) {
      console.error("收藏切換失敗:", error);
      res.status(500).json({ status: "error", message: "收藏切換失敗" });
    }
  }
);

/* =========================================
 * 7) 留言：列表 / 新增
 * ========================================= */

// 取得某篇文章的留言（支援分頁與排序）
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const postId = toInt(req.params.postId, 0);
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.max(1, Math.min(500, toInt(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const order =
      String(req.query.order || "asc").toLowerCase() === "desc"
        ? "DESC"
        : "ASC";

    const [[countRow]] = await connection.execute(
      "SELECT COUNT(*) AS total FROM comments WHERE post_id=? AND is_deleted=1",
      [postId]
    );
    const total = countRow?.total ?? 0;

    const [rows] = await connection.execute(
      `
      SELECT
        cm.id, cm.post_id, cm.users_id,
        cm.parent_comment_id AS parent_id,
        cm.reply_to_comment_id,
        cm.content,
        DATE_FORMAT(cm.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        COALESCE(u.nickname, u.name) AS author_nickname,
        u.img AS author_img
      FROM comments cm
      JOIN users u ON u.id = cm.users_id
      WHERE cm.post_id=? AND cm.is_deleted=1
      ORDER BY cm.created_at ${order}, cm.id ${order}
      LIMIT ? OFFSET ?
      `,
      [postId, limit, offset]
    );

    res.json({
      status: "success",
      data: rows || [],
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /posts/:postId/comments error:", error);
    res.status(500).json({ status: "error", message: "取得留言失敗" });
  }
});

// 新增留言（支援根樓與子樓；子樓可指定 reply_to_comment_id）
router.post(
  "/posts/:postId/comments",
  checkToken,
  attachUserId,
  upload.none(),
  async (req, res) => {
    try {
      const postId = toInt(req.params.postId, 0);
      const users_id = req.userId;
      const content = (req.body.content || "").trim();

      const parent_id = toInt(req.body.parent_id, 0) || null;
      const reply_to_comment_id =
        toInt(req.body.reply_to_comment_id, 0) || null;

      if (!content || content.length > 50) {
        return res
          .status(400)
          .json({ status: "error", message: "留言必填且 ≤ 50 字" });
      }

      const [[p]] = await connection.execute(
        "SELECT id FROM posts WHERE id=? AND is_deleted=1",
        [postId]
      );
      if (!p)
        return res.status(404).json({ status: "error", message: "文章不存在" });

      const [result] = await connection.execute(
        `
        INSERT INTO comments
          (post_id, users_id, parent_comment_id, reply_to_comment_id, content, created_at, is_deleted)
        VALUES (?, ?, ?, ?, ?, NOW(), 1)
        `,
        [postId, users_id, parent_id, reply_to_comment_id, content]
      );

      const [[row]] = await connection.execute(
        `
        SELECT
          cm.id, cm.post_id, cm.users_id,
          cm.parent_comment_id AS parent_id,
          cm.reply_to_comment_id,
          cm.content,
          DATE_FORMAT(cm.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
          COALESCE(u.nickname, u.name) AS author_nickname,
          u.img AS author_img
        FROM comments cm
        JOIN users u ON u.id = cm.users_id
        WHERE cm.id = ?
        `,
        [result.insertId]
      );

      res.status(201).json({ status: "success", data: row });
    } catch (error) {
      console.error("POST /posts/:postId/comments error:", error);
      res.status(500).json({ status: "error", message: "新增留言失敗" });
    }
  }
);

/* =========================================
 * 8) 瀏覽數 +1（不需登入）
 * ========================================= */
router.post("/posts/:postId/view", async (req, res) => {
  try {
    const postId = toInt(req.params.postId, 0);
    await connection.execute(
      "UPDATE posts SET view_count = view_count + 1 WHERE id=? AND is_deleted=1",
      [postId]
    );
    res.json({ status: "success", message: "view_count +1" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "view_count 增加失敗" });
  }
});

// ▲ 放在所有 route 後面、export 前面
router.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ status: "error", message: "圖片超過 5MB 上限" });
  }
  if (err?.code === "LIMIT_FILE_COUNT") {
    return res
      .status(400)
      .json({ status: "error", message: "一次最多 6 張圖片" });
  }
  if (err?.message === "不支援的圖片格式") {
    return res
      .status(400)
      .json({ status: "error", message: "只支援 JPG/PNG/WebP" });
  }
  return res.status(500).json({ status: "error", message: "伺服器錯誤" });
});

// ▲ 放在所有 route 後面、export 前面
/* =========================================
 * 會員資訊（含統計、是否已追隨）
 * ========================================= */
router.get("/users/:userId/info", async (req, res) => {
  try {
    const userId = toInt(req.params.userId, 0);
    if (!userId)
      return res.status(400).json({ status: "fail", message: "缺少 userId" });

    // 使用者基本
    const [[user]] = await connection.execute(
      `SELECT id, account, nickname, name, email, img
       FROM users
       WHERE id=? LIMIT 1`,
      [userId]
    );
    if (!user)
      return res.status(404).json({ status: "fail", message: "找不到使用者" });

    // 統計
    const [[postCountRow]] = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM posts WHERE users_id=? AND is_deleted=1`,
      [userId]
    );
    const [[followerCountRow]] = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM follows WHERE followee_id=? AND is_deleted=1`,
      [userId]
    );

    // 是否已追隨（若帶 Authorization）
    let isFollowing = false;
    try {
      let token = req.get("Authorization");
      if (token && token.startsWith("Bearer ")) {
        token = token.slice(7);
        const decoded = jwt.verify(token, secretKey);
        let viewerId = Number(decoded?.id || 0);
        if (!viewerId && decoded?.account) {
          const [[u]] = await connection.execute(
            "SELECT id FROM users WHERE account=? LIMIT 1",
            [decoded.account]
          );
          viewerId = Number(u?.id || 0);
        }
        if (viewerId && viewerId !== userId) {
          const [[f]] = await connection.execute(
            `SELECT id FROM follows
             WHERE follower_id=? AND followee_id=? AND is_deleted=1
             LIMIT 1`,
            [viewerId, userId]
          );
          isFollowing = !!f;
        }
      }
    } catch (_) {
      isFollowing = false;
    }

    res.json({
      status: "success",
      data: {
        id: user.id,
        account: user.account,
        nickname: user.nickname || user.name || "",
        name: user.name || "",
        email: user.email || "",
        img: user.img || "",
        avatar: user.img || "",
        stats: {
          posts_count: Number(postCountRow?.cnt || 0),
          followers_count: Number(followerCountRow?.cnt || 0),
        },
        is_following: isFollowing,
      },
    });
  } catch (error) {
    console.error("GET /users/:userId/info error:", error);
    res.status(500).json({ status: "error", message: "取得會員資訊失敗" });
  }
});

/* =========================================
 * 該會員貼文列表（方案 b：獨立端點，支援分頁）
 * ========================================= */
router.get("/users/:userId/posts", async (req, res) => {
  try {
    const userId = toInt(req.params.userId, 0);
    if (!userId)
      return res.status(400).json({ status: "fail", message: "缺少 userId" });

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.max(
      1,
      Math.min(100, toInt(req.query.limit || req.query.per_page, 20))
    );
    const offset = (page - 1) * limit;

    const [[cntRow]] = await connection.execute(
      `SELECT COUNT(*) AS total FROM posts WHERE users_id=? AND is_deleted=1`,
      [userId]
    );
    const total = Number(cntRow?.total || 0);

    const [rows] = await connection.execute(
      `
      SELECT
        p.id, p.users_id, p.category_id, p.title, p.content,
        p.created_at, p.updated_at, p.is_hot, p.view_count,
        COALESCE(u.nickname, u.name) AS author_nickname,
        u.img AS author_img,
        c.name AS category_name,
        c.icon AS category_icon,
        (SELECT COUNT(1) FROM likes     l  WHERE l.post_id=p.id AND l.is_deleted=1) AS like_count,
        (SELECT COUNT(1) FROM comments  cm WHERE cm.post_id=p.id AND cm.is_deleted=1) AS comment_count,
        (SELECT COUNT(1) FROM bookmarks b  WHERE b.post_id=p.id AND b.is_deleted=1) AS bookmark_count
      FROM posts p
      JOIN users u ON u.id = p.users_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_deleted=1 AND p.users_id=?
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?
      `,
      [userId, limit, offset]
    );

    // 圖片（最多 6 張）
    const ids = rows.map((r) => r.id);
    const imagesMap = new Map();
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      const [imgRows] = await connection.execute(
        `SELECT post_id, image_url
         FROM post_images
         WHERE is_deleted=1 AND post_id IN (${placeholders})
         ORDER BY sort_order ASC, id ASC`,
        ids
      );
      for (const r of imgRows) {
        if (!imagesMap.has(r.post_id)) imagesMap.set(r.post_id, []);
        const arr = imagesMap.get(r.post_id);
        if (arr.length < 6) arr.push(r.image_url);
      }
    }

    const data = rows.map((r) => ({ ...r, images: imagesMap.get(r.id) || [] }));

    res.json({
      status: "success",
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /users/:userId/posts error:", error);
    res.status(500).json({ status: "error", message: "取得會員文章失敗" });
  }
});

/* =========================================
 * 追隨 / 取消追隨（需登入）
 * ========================================= */
router.post(
  "/users/:userId/follow",
  checkToken,
  attachUserId,
  async (req, res) => {
    try {
      const followeeId = toInt(req.params.userId, 0);
      const followerId = Number(req.userId || 0);
      if (!followeeId)
        return res.status(400).json({ status: "fail", message: "缺少 userId" });
      if (!followerId)
        return res.status(401).json({ status: "error", message: "請先登入" });
      if (followeeId === followerId)
        return res
          .status(400)
          .json({ status: "fail", message: "不可追隨自己" });

      const [[exist]] = await connection.execute(
        `SELECT id FROM follows WHERE follower_id=? AND followee_id=? LIMIT 1`,
        [followerId, followeeId]
      );

      if (exist) {
        await connection.execute(
          `UPDATE follows SET is_deleted=1, created_at=NOW() WHERE id=?`,
          [exist.id]
        );
      } else {
        await connection.execute(
          `INSERT INTO follows (follower_id, followee_id, is_deleted, created_at)
         VALUES (?, ?, 1, NOW())`,
          [followerId, followeeId]
        );
      }

      res.json({ status: "success", data: { is_following: true } });
    } catch (error) {
      console.error("POST /users/:userId/follow error:", error);
      res.status(500).json({ status: "error", message: "追隨失敗" });
    }
  }
);

router.delete(
  "/users/:userId/follow",
  checkToken,
  attachUserId,
  async (req, res) => {
    try {
      const followeeId = toInt(req.params.userId, 0);
      const followerId = Number(req.userId || 0);
      if (!followeeId)
        return res.status(400).json({ status: "fail", message: "缺少 userId" });
      if (!followerId)
        return res.status(401).json({ status: "error", message: "請先登入" });
      if (followeeId === followerId)
        return res
          .status(400)
          .json({ status: "fail", message: "不可取消追隨自己" });

      await connection.execute(
        `UPDATE follows SET is_deleted=0 WHERE follower_id=? AND followee_id=?`,
        [followerId, followeeId]
      );

      res.json({ status: "success", data: { is_following: false } });
    } catch (error) {
      console.error("DELETE /users/:userId/follow error:", error);
      res.status(500).json({ status: "error", message: "取消追隨失敗" });
    }
  }
);

/* =========================================
 * 會員「按讚」文章清單（支援分頁）
 * GET /api/forums/users/:userId/likes/posts?page=1&limit=3
 * ========================================= */
router.get("/users/:userId/likes/posts", async (req, res) => {
  try {
    const userId = toInt(req.params.userId, 0);
    if (!userId)
      return res.status(400).json({ status: "fail", message: "缺少 userId" });

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.max(
      1,
      Math.min(100, toInt(req.query.limit || req.query.per_page, 3))
    );
    const offset = (page - 1) * limit;

    const [[cntRow]] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM likes l
       JOIN posts p ON p.id = l.post_id
       WHERE l.users_id=? AND l.is_deleted=1 AND p.is_deleted=1`,
      [userId]
    );
    const total = Number(cntRow?.total || 0);

    const [rows] = await connection.execute(
      `
      SELECT
        p.id, p.users_id, p.category_id, p.title, p.content,
        p.created_at, p.updated_at, p.is_hot, p.view_count,
        COALESCE(u.nickname, u.name) AS author_nickname,
        u.img AS author_img,
        c.name AS category_name,
        c.icon AS category_icon,
        (SELECT COUNT(1) FROM likes     l2 WHERE l2.post_id=p.id AND l2.is_deleted=1) AS like_count,
        (SELECT COUNT(1) FROM comments  cm WHERE cm.post_id=p.id AND cm.is_deleted=1) AS comment_count,
        (SELECT COUNT(1) FROM bookmarks b2 WHERE b2.post_id=p.id AND b2.is_deleted=1) AS bookmark_count,
        1 AS is_liked,
        EXISTS(SELECT 1 FROM bookmarks bb WHERE bb.post_id=p.id AND bb.users_id=? AND bb.is_deleted=1 LIMIT 1) AS is_bookmarked
      FROM likes l
      JOIN posts p ON p.id = l.post_id
      JOIN users u ON u.id = p.users_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE l.users_id=? AND l.is_deleted=1 AND p.is_deleted=1
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ? OFFSET ?`,
      [userId, userId, limit, offset]
    );

    // 取圖片（最多 6 張，依 sort_order / id）
    const ids = rows.map((r) => r.id);
    const imagesMap = new Map();
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      const [imgRows] = await connection.execute(
        `SELECT post_id, image_url
         FROM post_images
         WHERE is_deleted=1 AND post_id IN (${placeholders})
         ORDER BY sort_order ASC, id ASC`,
        ids
      );
      for (const r of imgRows) {
        if (!imagesMap.has(r.post_id)) imagesMap.set(r.post_id, []);
        const arr = imagesMap.get(r.post_id);
        if (arr.length < 6) arr.push(r.image_url);
      }
    }

    const data = rows.map((r) => ({ ...r, images: imagesMap.get(r.id) || [] }));
    res.json({
      status: "success",
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("GET /users/:userId/likes/posts error:", error);
    res.status(500).json({ status: "error", message: "取得喜歡文章失敗" });
  }
});

/* =========================================
 * 會員「收藏」文章清單（支援分頁）
 * GET /api/forums/users/:userId/bookmarks/posts?page=1&limit=3
 * ========================================= */
router.get("/users/:userId/bookmarks/posts", async (req, res) => {
  try {
    const userId = toInt(req.params.userId, 0);
    if (!userId)
      return res.status(400).json({ status: "fail", message: "缺少 userId" });

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.max(
      1,
      Math.min(100, toInt(req.query.limit || req.query.per_page, 3))
    );
    const offset = (page - 1) * limit;

    const [[cntRow]] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM bookmarks b
       JOIN posts p ON p.id = b.post_id
       WHERE b.users_id=? AND b.is_deleted=1 AND p.is_deleted=1`,
      [userId]
    );
    const total = Number(cntRow?.total || 0);

    const [rows] = await connection.execute(
      `
      SELECT
        p.id, p.users_id, p.category_id, p.title, p.content,
        p.created_at, p.updated_at, p.is_hot, p.view_count,
        COALESCE(u.nickname, u.name) AS author_nickname,
        u.img AS author_img,
        c.name AS category_name,
        c.icon AS category_icon,
        (SELECT COUNT(1) FROM likes     l2 WHERE l2.post_id=p.id AND l2.is_deleted=1) AS like_count,
        (SELECT COUNT(1) FROM comments  cm WHERE cm.post_id=p.id AND cm.is_deleted=1) AS comment_count,
        (SELECT COUNT(1) FROM bookmarks b2 WHERE b2.post_id=p.id AND b2.is_deleted=1) AS bookmark_count,
        EXISTS(SELECT 1 FROM likes ll WHERE ll.post_id=p.id AND ll.users_id=? AND ll.is_deleted=1 LIMIT 1) AS is_liked,
        1 AS is_bookmarked
      FROM bookmarks b
      JOIN posts p ON p.id = b.post_id
      JOIN users u ON u.id = p.users_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE b.users_id=? AND b.is_deleted=1 AND p.is_deleted=1
      ORDER BY b.created_at DESC, b.id DESC
      LIMIT ? OFFSET ?`,
      [userId, userId, limit, offset]
    );

    // 取圖片（最多 6 張，依 sort_order / id）
    const ids = rows.map((r) => r.id);
    const imagesMap = new Map();
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      const [imgRows] = await connection.execute(
        `SELECT post_id, image_url
         FROM post_images
         WHERE is_deleted=1 AND post_id IN (${placeholders})
         ORDER BY sort_order ASC, id ASC`,
        ids
      );
      for (const r of imgRows) {
        if (!imagesMap.has(r.post_id)) imagesMap.set(r.post_id, []);
        const arr = imagesMap.get(r.post_id);
        if (arr.length < 6) arr.push(r.image_url);
      }
    }

    const data = rows.map((r) => ({ ...r, images: imagesMap.get(r.id) || [] }));
    res.json({
      status: "success",
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("GET /users/:userId/bookmarks/posts error:", error);
    res.status(500).json({ status: "error", message: "取得收藏文章失敗" });
  }
});

/* =========================================
 * 會員「追蹤中」使用者清單（支援分頁）
 * GET /api/forums/users/:userId/following?page=1&limit=8
 * follows 欄位：follower_id（追蹤者）、followee_id（被追蹤者）
 * is_deleted = 1 為有效
 * ========================================= */
router.get("/users/:userId/following", async (req, res) => {
  try {
    const userId = toInt(req.params.userId, 0);
    if (!userId) {
      return res.status(400).json({ status: "fail", message: "缺少 userId" });
    }

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.max(
      1,
      Math.min(100, toInt(req.query.limit || req.query.per_page, 8))
    );
    const offset = (page - 1) * limit;

    // 總數
    const [[cnt]] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM follows f
       JOIN users u ON u.id = f.followee_id
       WHERE f.follower_id = ? AND f.is_deleted = 1`,
      [userId]
    );
    const total = Number(cnt?.total || 0);

    // 清單（依追蹤時間新→舊）
    const [rows] = await connection.execute(
      `
      SELECT
        u.id,
        COALESCE(u.nickname, u.name) AS nickname,
        u.name AS name,
        u.img  AS img,
        f.created_at AS followed_at
      FROM follows f
      JOIN users u ON u.id = f.followee_id
      WHERE f.follower_id = ? AND f.is_deleted = 1
      ORDER BY f.created_at DESC, f.id DESC
      LIMIT ? OFFSET ?
      `,
      [userId, limit, offset]
    );

    const data = rows.map((r) => ({
      id: Number(r.id),
      nickname: r.nickname || r.name || "",
      name: r.name || "",
      img: r.img || "",
      followed_at: r.followed_at,
      is_following: 1, // 此列表皆為追蹤中
    }));

    res.json({
      status: "success",
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("GET /users/:userId/following error:", error);
    res.status(500).json({ status: "error", message: "取得追蹤清單失敗" });
  }
});

export default router;
