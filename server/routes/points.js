import express from "express";
import jwt from "jsonwebtoken";
import connection from "../connect.js";

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

// 獲取用戶點數摘要
router.get("/summary", checkToken, async (req, res) => {
  try {
    const userId = req.decoded.id;
    const userAccount = req.decoded.account;
    
    // 優先從 users.points 獲取總點數，如果為0則從歷史記錄計算
    const userSql = "SELECT points FROM users WHERE id = ?";
    const [userResult] = await connection.execute(userSql, [userId]);
    
    if (userResult.length === 0) {
      const err = new Error("找不到使用者");
      err.code = 404;
      err.status = "fail";
      throw err;
    }
    
    let totalPoints = userResult[0].points || 0;
    
    // 如果 users.points 為0，則從歷史記錄計算
    if (totalPoints === 0) {
      const totalPointsSql = `
        SELECT SUM(points) as totalPoints
        FROM users_points 
        WHERE users_id = ?
      `;
      const [totalResult] = await connection.execute(totalPointsSql, [userId]);
      totalPoints = totalResult[0].totalPoints || 0;
      
      // 更新 users.points 欄位
      if (totalPoints > 0) {
        await connection.execute("UPDATE users SET points = ? WHERE id = ?", [totalPoints, userId]);
      }
    }
    
    console.log(`使用者 ${userAccount} 查詢點數摘要 - 總點數: ${totalPoints}`);
    
    res.status(200).json({
      status: "success",
      data: {
        totalPoints,
        userId
      },
      message: "已獲取點數摘要",
    });
  } catch (error) {
    // 補獲錯誤
    console.log("獲取點數摘要錯誤:", error);
    const statusCode = error.code ?? 500;
    const statusText = error.status ?? "error";
    const message = error.message ?? "獲取點數摘要失敗，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});

// 獲取用戶點數歷史記錄
router.get("/history", checkToken, async (req, res) => {
  try {
    const userId = req.decoded.id;
    const userAccount = req.decoded.account;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // 獲取點數歷史記錄
    const sql = `
      SELECT 
        id,
        points,
        type as points_type,
        description,
        created_at as sendDate
      FROM users_points 
      WHERE users_id = ? 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [history] = await connection.execute(sql, [userId, parseInt(limit), offset]);
    
    // 獲取總記錄數
    const countSql = "SELECT COUNT(*) as total FROM users_points WHERE users_id = ?";
    const [countResult] = await connection.execute(countSql, [userId]);
    const total = countResult[0].total;
    
    console.log(`使用者 ${userAccount} 查詢了 ${history.length} 筆點數記錄`);
    
    res.status(200).json({
      status: "success",
      data: {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        },
        userId
      },
      message: "已獲取點數歷史記錄",
    });
  } catch (error) {
    // 補獲錯誤
    console.log("獲取點數歷史記錄錯誤:", error);
    const statusCode = error.code ?? 500;
    const statusText = error.status ?? "error";
    const message = error.message ?? "獲取點數歷史記錄失敗，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});

// 新增點數記錄（管理員功能）
router.post("/add", checkToken, async (req, res) => {
  try {
    const userId = req.decoded.id;
    const userAccount = req.decoded.account;
    const { points, pointsType, source, description } = req.body;
    
    // 檢查必填欄位
    if (!points || !pointsType) {
      const err = new Error("點數和點數類型為必填欄位");
      err.code = 400;
      err.status = "fail";
      throw err;
    }
    
    // 開始交易
    const conn = await connection.getConnection();
    await conn.beginTransaction();
    
    try {
      // 新增點數歷史記錄
      const insertSql = `
        INSERT INTO users_points (
          users_id, points, type, description, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `;
      
      await conn.execute(insertSql, [
        userId,
        points,
        pointsType,
        description || null
      ]);
      
      // 更新用戶總點數
      const updateUserSql = "UPDATE users SET points = points + ? WHERE id = ?";
      await conn.execute(updateUserSql, [points, userId]);
      
      // 提交交易
      await conn.commit();
      
      console.log(`使用者 ${userAccount} 新增了 ${points} 點，類型: ${pointsType}`);
      
      res.status(201).json({
        status: "success",
        data: {
          points,
          pointsType,
          description
        },
        message: "點數新增成功",
      });
    } catch (transactionError) {
      // 回滾交易
      await conn.rollback();
      throw transactionError;
    } finally {
      // 釋放連接
      conn.release();
    }
  } catch (error) {
    // 補獲錯誤
    console.log("新增點數記錄錯誤:", error);
    const statusCode = error.code ?? 500;
    const statusText = error.status ?? "error";
    const message = error.message ?? "新增點數記錄失敗，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});

// 扣除點數記錄（購物車使用）
router.post("/deduct", checkToken, async (req, res) => {
  try {
    const userId = req.decoded.id;
    const userAccount = req.decoded.account;
    const { points, description } = req.body;
    
    // 檢查必填欄位
    if (!points || points <= 0) {
      const err = new Error("扣除點數必須大於0");
      err.code = 400;
      err.status = "fail";
      throw err;
    }
    
    // 檢查用戶點數是否足夠
    const userSql = "SELECT points FROM users WHERE id = ?";
    const [userResult] = await connection.execute(userSql, [userId]);
    
    if (userResult.length === 0) {
      const err = new Error("找不到使用者");
      err.code = 404;
      err.status = "fail";
      throw err;
    }
    
    const currentPoints = userResult[0].points || 0;
    if (currentPoints < points) {
      const err = new Error("點數不足，無法扣除");
      err.code = 400;
      err.status = "fail";
      throw err;
    }
    
    // 開始交易
    const conn = await connection.getConnection();
    await conn.beginTransaction();
    
    try {
      // 新增扣除點數歷史記錄（負數）
      const insertSql = `
        INSERT INTO users_points (
          users_id, points, type, description, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `;
      
      await conn.execute(insertSql, [
        userId,
        -points, // 負數表示扣除
        '使用',
        description || '購物消費'
      ]);
      
      // 更新用戶總點數
      const updateUserSql = "UPDATE users SET points = points - ? WHERE id = ?";
      await conn.execute(updateUserSql, [points, userId]);
      
      // 提交交易
      await conn.commit();
      
      console.log(`使用者 ${userAccount} 扣除了 ${points} 點，剩餘點數: ${currentPoints - points}`);
      
      res.status(201).json({
        status: "success",
        data: {
          deductedPoints: points,
          remainingPoints: currentPoints - points,
          description: description || '購物消費'
        },
        message: "點數扣除成功",
      });
    } catch (transactionError) {
      // 回滾交易
      await conn.rollback();
      throw transactionError;
    } finally {
      // 釋放連接
      conn.release();
    }
  } catch (error) {
    // 補獲錯誤
    console.log("扣除點數記錄錯誤:", error);
    const statusCode = error.code ?? 500;
    const statusText = error.status ?? "error";
    const message = error.message ?? "扣除點數記錄失敗，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});

// 檢查點數餘額（購物車使用）
router.get("/balance", checkToken, async (req, res) => {
  try {
    const userId = req.decoded.id;
    const userAccount = req.decoded.account;
    
    // 獲取用戶點數餘額
    const userSql = "SELECT points FROM users WHERE id = ?";
    const [userResult] = await connection.execute(userSql, [userId]);
    
    if (userResult.length === 0) {
      const err = new Error("找不到使用者");
      err.code = 404;
      err.status = "fail";
      throw err;
    }
    
    const currentPoints = userResult[0].points || 0;
    
    console.log(`使用者 ${userAccount} 查詢點數餘額: ${currentPoints}`);
    
    res.status(200).json({
      status: "success",
      data: {
        userId,
        currentPoints,
        availablePoints: currentPoints
      },
      message: "已獲取點數餘額",
    });
  } catch (error) {
    // 補獲錯誤
    console.log("獲取點數餘額錯誤:", error);
    const statusCode = error.code ?? 500;
    const statusText = error.status ?? "error";
    const message = error.message ?? "獲取點數餘額失敗，請洽管理人員";
    res.status(statusCode).json({
      status: statusText,
      message,
    });
  }
});

export default router;
