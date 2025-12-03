import express from "express";
import multer from "multer";
import mysql from "mysql2";
import connection from "../connect.js";
import path from "path";

const router = express.Router();
const upload = multer();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "../client/public/product_img/"); // 存到前端資料夾
  },
  filename: function (req, file, cb) {
  cb(null, Date.now() + path.extname(file.originalname));
},
});

const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制 5MB
  },
  fileFilter: (req, file, cb) => {
    // 只允許圖片檔案
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("只允許上傳圖片檔案"));
    }
  },
});
//商品列表
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 16;
    const offset = (page - 1) * limit;
    const status = req.query.status || "active";
    //主分類次分類
    const mcid = req.query.mcid;
    const scid = req.query.scid;
    //排序
    const sortBy = req.query.sortBy; // 'release_date', 'price', 'average_rating'
    const sortOrder = req.query.sortOrder || "DESC"; // 'ASC' 或 'DESC'
    // 搜尋
    const search = req.query.search || "";
    const searchType = req.query.qtype || "";
    //尺寸
    const lp = req.query.lp || "";
    //價格篩選
    const minPrice = req.query.minPrice || "";
    const maxPrice = req.query.maxPrice || "";

    // 動態建構 WHERE 條件
    let whereConditions = [];
    let queryParams = [];
    if (status === "active") {
      whereConditions.push("vinyl.is_valid = 1");
    } else if (status === "inactive") {
      whereConditions.push("vinyl.is_valid = 0");
    } else if (status === "all") {
      // 不加條件，顯示全部
    }
    if (mcid) {
      whereConditions.push("vinyl.main_category_id = ?");
      queryParams.push(mcid);
    }
    if (scid) {
      whereConditions.push("vinyl.sub_category_id = ?");
      queryParams.push(scid);
    }
    if (search) {
      const allowedSearchFields = ["name", "artist"];

      if (allowedSearchFields.includes(searchType)) {
        whereConditions.push(`vinyl.${searchType} LIKE ?`);
        queryParams.push(`%${search}%`);
      }
    }
    if (lp) {
      if (lp === "3") {
        // 處理 3LP 以上：排除 1LP 和 2LP
        whereConditions.push("vinyl.lp_id >= ?");
        queryParams.push(lp);
      } else {
        // 處理一般情況：1LP, 2LP
        whereConditions.push("vinyl.lp_id = ?");
        queryParams.push(lp);
      }
    }
    // ✅ 正確檢查
    if (minPrice && minPrice !== "") {
      whereConditions.push("vinyl.price >= ?");
      queryParams.push(minPrice);
    }

    if (maxPrice && maxPrice !== "") {
      whereConditions.push("vinyl.price <= ?");
      queryParams.push(maxPrice);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";
    // 有預設排序：
    let orderClause = "ORDER BY vinyl.id DESC";
    if (sortBy) {
      const allowedSortFields = ["release_date", "price", "average_rating"];
      if (allowedSortFields.includes(sortBy)) {
        if (sortBy === "average_rating") {
          orderClause = `ORDER BY rating_stats.average_rating ${sortOrder}`;
        } else {
          orderClause = `ORDER BY vinyl.${sortBy} ${sortOrder}`;
        }
      }
    }

    // 獲取總商品數量
    const countSql = `SELECT COUNT(*) as total FROM vinyl ${whereClause}`;
    const [countResult] = await connection.execute(countSql, queryParams);
    const total = countResult[0].total;
    const sql = `
      SELECT
        vinyl.id,
        vinyl.name,
        vinyl.price,
        vinyl.is_valid,
        vinyl.artist,
        vinyl.stock,vinyl.created_at,
        vinyl_images.pathname,
        main_category.title as main_title,
        sub_category.title as sub_title,
        COALESCE(rating_stats.average_rating, 0) as average_rating
      FROM vinyl
      LEFT JOIN vinyl_images ON vinyl.id = vinyl_images.vinyl_id
      LEFT JOIN main_category ON vinyl.main_category_id = main_category.id
      LEFT JOIN sub_category ON vinyl.sub_category_id = sub_category.id
      LEFT JOIN (
        SELECT vinyl_id, ROUND(AVG(rating), 1) as average_rating
        FROM vinyl_review
        WHERE is_valid = 1
        GROUP BY vinyl_id
      ) as rating_stats ON vinyl.id = rating_stats.vinyl_id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);
    let [products] = await connection.execute(sql, queryParams);
    // 計算總頁數
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "success",
      data: products,
      message: "已 獲取所有商品",
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    // 補獲錯誤
    console.log(error);
    const statusCode = error.code ?? 401;
    const statusText = error.status ?? "error";
    const message = error.message ?? "商品驗證錯誤，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});

//獲取主分類
router.get("/main_category", async (req, res) => {
  try {
    const sqlMain = `
   SELECT * FROM main_category
`;

    let [mainCategory] = await connection.execute(sqlMain);

    res.status(200).json({
      status: "success",
      mainCategory,
      message: "已 獲取所有商品",
    });
  } catch (error) {
    // 補獲錯誤
    console.log(error);
    const statusCode = error.code ?? 401;
    const statusText = error.status ?? "error";
    const message = error.message ?? "查無此主分類";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});
//獲取次分類
router.get("/sub_category", async (req, res) => {
  try {
    const sqlSub = `
   SELECT * FROM sub_category
`;

    let [subCategory] = await connection.execute(sqlSub);

    res.status(200).json({
      status: "success",
      subCategory,
      message: "已 獲取所有商品",
    });
  } catch (error) {
    // 補獲錯誤
    console.log(error);
    const statusCode = error.code ?? 401;
    const statusText = error.status ?? "error";
    const message = error.message ?? "查無此次分類";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});
//收藏商品
router.put("/bookmarks", async (req, res) => {
  try {
    const { vinyl_id, users_id } = req.body;

    if (!vinyl_id || !users_id) {
      return res.status(400).json({
        status: "fail",
        message: "請提供完整的參數",
      });
    }

    // 檢查是否已收藏
    const sqlCheck =
      "SELECT * FROM `vinyl_bookmarks` WHERE `users_id` = ? AND `vinyl_id` = ?;";
    const [existingBookmark] = await connection.execute(sqlCheck, [
      users_id,
      vinyl_id,
    ]);

    let isBookmarked;
    let message;

    if (existingBookmark.length > 0) {
      // 已收藏 -> 取消收藏
      const sqlDelete =
        "DELETE FROM `vinyl_bookmarks` WHERE `users_id` = ? AND `vinyl_id` = ?;";
      await connection.execute(sqlDelete, [users_id, vinyl_id]);
      isBookmarked = false;
      message = "已取消收藏";
    } else {
      // 未收藏 -> 加入收藏
      const sqlInsert =
        "INSERT INTO `vinyl_bookmarks` (vinyl_id, users_id) VALUES (?, ?);";
      await connection.execute(sqlInsert, [vinyl_id, users_id]); // ✅ 修正參數
      isBookmarked = true;
      message = "收藏成功";
    }

    res.status(200).json({
      // ✅ 200 不是 201
      status: "success",
      data: { isBookmarked }, // ✅ 正確回傳狀態
      message,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      message: "收藏操作失敗，請洽管理人員",
    });
  }
});

//獲取特定用戶收藏商品
router.get("/bookmarks", async (req, res) => {
  const { users_id } = req.query;
  try {
    // ✅ 先查詢資料庫
    const sql = `
      SELECT vinyl_id
      FROM vinyl_bookmarks
      WHERE users_id = ?
    `;
    let bookmarks = await connection
      .execute(sql, [users_id])
      .then(([result]) => {
        return result;
      });

    res.status(200).json({
      status: "success",
      data: bookmarks,
      message: "取得收藏清單成功",
    });
  } catch (error) {
    console.log(error);
    const statusCode = error.code ?? 401;
    const statusText = error.status ?? "error";
    const message = error.message ?? "取得收藏清單失敗";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});
// 獲取用戶收藏商品的完整列表
router.get("/favorites/:users_id", async (req, res) => {
  const users_id = req.params.users_id;

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // ✅ 直接傳入參數陣列
    const countSql = `SELECT COUNT(*) as total FROM vinyl_bookmarks WHERE users_id = ?`;
    const [countResult] = await connection.execute(countSql, [users_id]);
    const total = countResult[0].total;

    const sql = `
      SELECT
        v.id,
        v.name,
        v.price,
        v.artist,
        vi.pathname
      FROM vinyl_bookmarks vb
      JOIN vinyl v ON vb.vinyl_id = v.id
      LEFT JOIN vinyl_images vi ON v.id = vi.vinyl_id
      WHERE vb.users_id = ?
      LIMIT ? OFFSET ?
    `;

    // ✅ 直接傳入參數陣列
    const [favorites] = await connection.execute(sql, [
      users_id,
      limit,
      offset,
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "success",
      data: favorites,
      message: "取得我的黑膠收藏成功",
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      message: error.message || "取得我的黑膠收藏清單失敗",
    });
  }
});
// 獲取用戶收藏商品的完整列表
router.delete("/favorites/:users_id/:vinyl_id", async (req, res) => {
  const users_id = req.params.users_id;
  const vinyl_id = req.params.vinyl_id;

  try {
    const deleteSql = `DELETE FROM vinyl_bookmarks WHERE users_id = ? AND vinyl_id = ?`;

    // ✅ 直接傳入參數陣列
    await connection.execute(deleteSql, [users_id, vinyl_id]);

    res.status(200).json({
      status: "success",
      message: "已取消收藏",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      message: error.message || "取消收藏失敗",
    });
  }
});

//上下架特定id商品
router.put("/:id", async (req, res) => {
  try {
    const vinyl_id = req.params.id; // 從 URL 參數取得 ID

    if (!vinyl_id) {
      return res.status(400).json({
        status: "fail",
        message: "請提供商品 ID",
      });
    }

    // 修正 SQL 語法錯誤
    const sqlCheck = "SELECT * FROM `vinyl` WHERE `id` = ?";
    const [rows] = await connection.execute(sqlCheck, [vinyl_id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "找不到該商品",
      });
    }

    const currentStatus = rows[0].is_valid;
    const newStatus = currentStatus === 1 ? 0 : 1;
    let message;

    // 更新商品狀態
    const sqlUpdate = "UPDATE `vinyl` SET `is_valid` = ? WHERE `id` = ?";
    await connection.execute(sqlUpdate, [newStatus, vinyl_id]);

    if (newStatus === 1) {
      message = "商品上架成功";
    } else {
      message = "商品下架成功";
    }

    res.status(200).json({
      status: "success",
      data: {
        vinyl_id: vinyl_id,
        is_valid: newStatus,
        action: newStatus === 1 ? "上架" : "下架",
      },
      message: message,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      message: "商品上下架操作失敗，請洽管理人員",
    });
  }
});
//修改商品
router.put("/:id/edit", uploadImage.single("image"), async (req, res) => {
  try {
    const vinyl_id = req.params.id;
    const {
      name, price, artist, stock, description,
      main_category_id, sub_category_id, company_name,
      lp_id, release_date, list
    } = req.body;

    // 處理 company_id
    let company_id = null;
    if (company_name) {
      const checkCompanySql = "SELECT id FROM company WHERE name = ?";
      const [existingCompany] = await connection.execute(checkCompanySql, [company_name]);
      
      if (existingCompany.length > 0) {
        company_id = existingCompany[0].id;
      } else {
        const insertCompanySql = "INSERT INTO company (name) VALUES (?)";
        const [companyResult] = await connection.execute(insertCompanySql, [company_name]);
        company_id = companyResult.insertId;
      }
    }

    // 動態組建更新欄位
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      updateValues.push(parseFloat(price));
    }
    if (artist !== undefined) {
      updateFields.push('artist = ?');
      updateValues.push(artist);
    }
    if (stock !== undefined) {
      updateFields.push('stock = ?');
      updateValues.push(parseInt(stock));
    }
    if (description !== undefined) {
      updateFields.push('`desc` = ?');
      updateValues.push(description);
    }
    if (main_category_id !== undefined) {
      updateFields.push('main_category_id = ?');
      updateValues.push(main_category_id);
    }
    if (sub_category_id !== undefined) {
      updateFields.push('sub_category_id = ?');
      updateValues.push(sub_category_id);
    }
    if (company_id !== null) {
      updateFields.push('company_id = ?');
      updateValues.push(company_id);
    }
    if (lp_id !== undefined) {
      updateFields.push('lp_id = ?');
      updateValues.push(lp_id);
    }
    if (release_date !== undefined) {
      updateFields.push('release_date = ?');
      updateValues.push(release_date);
    }
    if (list !== undefined) {
      updateFields.push('`list` = ?');
      updateValues.push(list);
    }

    // 如果沒有要更新的欄位
    if (updateFields.length === 0 && !req.file) {
      return res.status(400).json({
        status: "fail",
        message: "沒有提供要更新的資料"
      });
    }

    // 執行更新（如果有欄位要更新）
    if (updateFields.length > 0) {
      const sql = `UPDATE vinyl SET ${updateFields.join(', ')} WHERE id = ?`;
      updateValues.push(vinyl_id);
      await connection.execute(sql, updateValues);
    }

    // 圖片處理
    if (req.file) {
      const imagePath = `/product_img/${req.file.filename}`;
      const imageSql = `UPDATE vinyl_images SET pathname = ? WHERE vinyl_id = ?`;
      await connection.execute(imageSql, [imagePath, vinyl_id]); 
      console.log(`圖片路徑更新成功: vinyl_id=${vinyl_id}, 新路徑=${imagePath}`);
    }

    res.status(200).json({
      status: "success",
      data: { id: vinyl_id },
      message: "商品修改成功"
    });

  } catch (error) {
    console.error("修改商品錯誤:", error);
    res.status(500).json({
      status: "error",
      message: "修改商品失敗，請洽管理人員"
    });
  }
});

//增加商品
router.post("/", uploadImage.single("image"), async (req, res) => {
  try {
    const {
      name,
      price,
      artist,
      stock,
      description,
      main_category_id,
      sub_category_id,
      company_name,
      lp_id,
      release_date,
      list,
    } = req.body;

    if (!name || !price || !artist) {
      return res.status(400).json({
        status: "fail",
        message: "請填寫完整的商品資訊",
      });
    }

    let company_id = null;
    if (company_name) {
      const checkCompanySql = "SELECT id FROM company WHERE name = ?";
      const [existingCompany] = await connection.execute(checkCompanySql, [
        company_name,
      ]);

      if (existingCompany.length > 0) {
        company_id = existingCompany[0].id;
      } else {
        const insertCompanySql = "INSERT INTO company (name) VALUES (?)";
        const [companyResult] = await connection.execute(insertCompanySql, [
          company_name,
        ]);
        company_id = companyResult.insertId;
      }
    }

    // 插入商品資料
    const sql = `
      INSERT INTO vinyl (
        name, price, stock, artist, main_category_id,
        sub_category_id, company_id, lp_id, \`desc\`,
        release_date, \`list\`, is_valid, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
    `;

    const [result] = await connection.execute(sql, [
      name,
      parseFloat(price),
      parseInt(stock) || 1,
      artist,
      main_category_id || null,
      sub_category_id || null,
      company_id,
      lp_id || null,
      description || null,
      release_date || null,
      list || null,
    ]);

    // 圖片處理
    if (req.file) {
      const imagePath = `/product_img/${req.file.filename}`;
      const imageSql = `INSERT INTO vinyl_images (vinyl_id, pathname) VALUES (?, ?)`;
      await connection.execute(imageSql, [result.insertId, imagePath]);
    }

    res.status(201).json({
      status: "success",
      data: { id: result.insertId, name, price: parseFloat(price), artist },
      message: "商品新增成功",
    });
  } catch (error) {
    console.error("新增商品錯誤:", error);
    res.status(500).json({
      status: "error",
      message: "新增商品失敗，請洽管理人員",
    });
  }
});

//獲取特定id的商品
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // ✅ 先查詢資料庫
    const sqlCheck1 = `
                         SELECT
          v.id,
          v.name,
          v.price,
          v.stock,
          v.listing_date,
          v.release_date,
          v.desc as description,
          v.list,
          v.artist,
          v.sale_price,
          v.spotify_album_id,
          vi.pathname as pathname,
          l.size as lp_size,
          mc.title as main_category_title,
          mc.id as main_category_id,
           sc.id as sub_category_id,
          sc.title as sub_category_title,
          c.name as company,
          rating_stats.average_rating,
          rating_stats.total_reviews
      FROM
          \`vinyl\` v
          LEFT JOIN \`vinyl_images\` vi ON v.id = vi.vinyl_id
          LEFT JOIN \`lp\` l ON l.id = v.lp_id
          LEFT JOIN \`main_category\` mc ON mc.id = v.main_category_id
          LEFT JOIN \`sub_category\` sc ON sc.id = v.sub_category_id
          LEFT JOIN \`company\` c ON c.id = v.company_id
          LEFT JOIN (
            SELECT
              vinyl_id,
              ROUND(AVG(rating), 1) as average_rating,
              COUNT(*) as total_reviews
            FROM vinyl_review
            WHERE is_valid = 1
            GROUP BY vinyl_id
          ) as rating_stats ON v.id = rating_stats.vinyl_id
      WHERE v.id = ?
                        `;
    let product = await connection.execute(sqlCheck1, [id]).then(([result]) => {
      return result[0];
    });

    // ✅ 查詢完才檢查結果
    if (!product) {
      const err = new Error("找不到此商品");
      err.code = 404;
      err.status = "fail";
      throw err;
    }

    res.status(200).json({
      status: "success",
      data: product, // ✅ 修正拼字
      message: "查詢商品成功",
    });
  } catch (error) {
    console.log(error);
    const statusCode = error.code ?? 401; // ✅ 建議預設用 500
    const statusText = error.status ?? "error";
    const message = error.message ?? "商品驗證錯誤，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});
//獲取特定id的相關專輯
router.get("/:id/related", async (req, res) => {
  try {
    const id = req.params.id;

    const sqlCheckrelated = `
      SELECT
        v.id,
        v.name,
        v.price,
        v.artist,
        vi.pathname,
        COALESCE(rs.average_rating, 0) AS average_rating
      FROM vinyl v
      LEFT JOIN vinyl_images vi ON v.id = vi.vinyl_id
      LEFT JOIN (
          SELECT vinyl_id, ROUND(AVG(rating), 1) AS average_rating
          FROM vinyl_review
          WHERE is_valid = 1
          GROUP BY vinyl_id
      ) rs ON v.id = rs.vinyl_id
      WHERE (v.main_category_id, v.sub_category_id) = (
          SELECT main_category_id, sub_category_id
          FROM vinyl
          WHERE id = ?
      )
      AND v.id != ?
      LIMIT 6;
    `;

    let relate = await connection
      .execute(sqlCheckrelated, [id, id])
      .then(([result]) => {
        return result; // ✅ 拿全部，不要只拿第一筆
      });

    if (!relate || relate.length === 0) {
      const err = new Error("找不到相關專輯");
      err.code = 404;
      err.status = "fail";
      throw err;
    }

    res.status(200).json({
      status: "success",
      data: relate, // ✅ 修正拼字
      message: "查詢相關專輯成功",
    });
  } catch (error) {
    console.log(error);
    const statusCode = error.code ?? 500; // ✅ 預設用 500
    const statusText = error.status ?? "error";
    const message = error.message ?? "相關專輯查詢錯誤，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});
//獲取特定id的同藝人
router.get("/:id/artist", async (req, res) => {
  try {
    const id = req.params.id;

    const sqlartist = `
     SELECT
    v.id,
    v.name,
    v.price,
    v.artist,
    vi.pathname,
    COALESCE(rs.average_rating, 0) AS average_rating
FROM vinyl v
LEFT JOIN vinyl_images vi ON v.id = vi.vinyl_id
LEFT JOIN (
    SELECT vinyl_id, ROUND(AVG(rating), 1) AS average_rating
    FROM vinyl_review
    WHERE is_valid = 1
    GROUP BY vinyl_id
) rs ON v.id = rs.vinyl_id
WHERE v.artist = (
    SELECT artist
    FROM vinyl
    WHERE id = ?
)
AND v.id != ?
LIMIT 6;

    `;

    let artist = await connection
      .execute(sqlartist, [id, id])
      .then(([result]) => {
        return result; //
      });

    if (!artist || artist.length === 0) {
      const err = new Error("找不到同藝人專輯");
      err.code = 404;
      err.status = "fail";
      throw err;
    }

    res.status(200).json({
      status: "success",
      data: artist, // ✅ 修正拼字
      message: "查詢藝人專輯成功",
    });
  } catch (error) {
    console.log(error);
    const statusCode = error.code ?? 500; // ✅ 預設用 500
    const statusText = error.status ?? "error";
    const message = error.message ?? "相關專輯查詢錯誤，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});

//獲取特定id商品的評論
router.get("/:id/reviews", async (req, res) => {
  try {
    const id = req.params.id;
    const sortBy = req.query.sortBy; // 'release_date', 'price', 'average_rating'
    const sortOrder = req.query.sortOrder || "DESC"; // 'ASC' 或 'DESC'
    // 有預設排序：
    let orderClause = "ORDER BY vinyl_review.id DESC";
    if (sortBy) {
      const allowedSortFields = ["rating", "review_date"];
      if (allowedSortFields.includes(sortBy)) {
        orderClause = `ORDER BY vinyl_review.${sortBy} ${sortOrder}`;
      }
    }
    // ✅ 先查詢資料庫
    const sqlCheck2 = `
                      SELECT
    vinyl_review.id,
    vinyl_review.comment,
    vinyl_review.rating,
    vinyl_review.review_date,
    users.name as reviewer_name
FROM vinyl_review
LEFT JOIN users  ON vinyl_review.users_id = users.id
WHERE vinyl_review.vinyl_id = ?
 ${orderClause};`;
    let comments = await connection
      .execute(sqlCheck2, [id])
      .then(([result]) => {
        return result;
      });

    if (!comments || comments.length === 0) {
      const err = new Error("此商品暫無評論");
      err.code = 404;
      err.status = "fail";
      throw err;
    }

    res.status(200).json({
      status: "success",
      data: comments,
      message: "查詢商品成功",
    });
  } catch (error) {
    console.log(error);
    const statusCode = error.code ?? 401;
    const statusText = error.status ?? "error";
    const message = error.message ?? "商品評論驗證錯誤，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});
//增加特定id商品評論
router.post("/:id/reviews", upload.none(), async (req, res) => {
  try {
    const id = req.params.id;
    // 取得表單中的欄位內容
    const { rating, users_id, comment } = req.body;

    //檢查必填
    if (!rating || !users_id || !comment) {
      // 設定 Error 物件
      const err = new Error("請填寫完整表單");
      err.code = 400;
      err.status = "fail";
      throw err;
    }

    // 檢查用戶是否已對此商品評論過
    const sqlCheckrcomment =
      "SELECT * FROM `vinyl_review` WHERE `users_id` = ? AND `vinyl_id` = ?;";

    let user = await connection
      .execute(sqlCheckrcomment, [users_id, id])
      .then(([result]) => {
        return result[0];
      });

    if (user) {
      const err = new Error("已評論過此商品");
      err.code = 400;
      err.status = "fail";
      throw err;
    }

    // 建立 SQL 語法
    const sql =
      "INSERT INTO `vinyl_review` (vinyl_id, users_id, comment, rating) VALUES (?, ?, ?, ?);";
    await connection.execute(sql, [id, users_id, comment, rating]);

    res.status(201).json({
      status: "success",
      data: {},
      message: "新增評論成功",
    });
  } catch (error) {
    // 捕獲錯誤
    console.log(error);
    const statusCode = error.code ?? 401;
    const statusText = error.status ?? "error";
    const message = error.message ?? "新增評論失敗，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});

// 後台管理專用：獲取商品總數
router.get("/admin/count", async (req, res) => {
  try {
    const sql = "SELECT COUNT(*) as total FROM vinyl WHERE is_valid = 1";
    const [result] = await connection.execute(sql);
    const total = result[0].total;

    res.status(200).json({
      status: "success",
      data: { total },
      message: `總商品數：${total} 項`,
    });
  } catch (error) {
    console.error("獲取商品總數錯誤:", error);
    res.status(500).json({
      status: "error",
      message: "獲取商品總數失敗",
    });
  }
});

export default router;
