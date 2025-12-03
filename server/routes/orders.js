import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import connection from '../connect.js';

const upload = multer();
const secretKey = process.env.JWT_SECRET_KEY;
const router = express.Router();

// 🚀 新增：地址格式化函數 - 解決 711 門市地址和宅配地址格式問題
const formatShippingAddress = (address, deliveryMethod) => {
  if (!address) return '';

  if (deliveryMethod === '711') {
    // 711 門市地址：移除 null 值，解決 "null null null 苗栗縣西湖鄉金獅村2鄰金獅26-2號" 問題
    return address
      .replace(/\bnull\b/g, '') // 移除 "null" 字串
      .replace(/\s+/g, ' ') // 將多個空格替換為單個空格
      .trim(); // 移除首尾空格
  } else {
    // 宅配地址：移除多餘空格，解決 "512彰化縣永靖鄉大同路28號" 格式
    return address
      .replace(/\s+/g, '') // 移除所有空格
      .trim();
  }
};

// 檢查 JWT Token 的中間件函數
function checkToken(req, res, next) {
  let token = req.get('Authorization');
  if (token && token.includes('Bearer ')) {
    token = token.slice(7);
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        console.log(error);
        res.status(401).json({
          status: 'error',
          message: '登入驗證失效，請重新登入',
        });
        return;
      }
      req.decoded = decoded;
      next();
    });
  } else {
    res.status(401).json({
      status: 'error',
      message: '無登入驗證資料，請重新登入',
    });
  }
}

// 1. 建立訂單暫存資料 (從購物車點擊立即結帳按鈕觸發)
router.post('/', checkToken, async (req, res) => {
  try {
    const userAccount = req.decoded.account;

    // 不需要檢查 req.body，因為這個 API 不需要任何參數
    // 直接從購物車取得已勾選的商品

    if (!userAccount) {
      return res.status(400).json({
        status: 'error',
        message: '使用者帳號資訊缺失',
      });
    }

    // 先根據帳號取得使用者ID
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE account = ?',
      [userAccount],
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '使用者不存在',
      });
    }

    const userId = userRows[0].id;

    // 取得已勾選商品的詳細資訊（包含庫存和圖片路徑）
    const [items] = await connection.execute(
      `
      SELECT
        ci.id,
        ci.vinyl_id,
        ci.quantity,
        v.name as vinyl_name,
        v.artist,
        v.image_id,
        v.price,
        v.sale_price,
        v.stock as current_stock,
        (v.price * ci.quantity) as total_price,
        vi.pathname AS image_path,
        vi.url AS image_url
      FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      LEFT JOIN vinyl v ON ci.vinyl_id = v.id
      LEFT JOIN vinyl_images vi ON v.id = vi.vinyl_id
      WHERE c.users_id = ? AND ci.is_checked = 1
    `,
      [userId],
    );

    if (items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '沒有已勾選的商品',
      });
    }

    // 計算訂單總價
    const orderTotal = items.reduce((sum, item) => sum + item.total_price, 0);

    // 建立訂單摘要資料（不寫入資料庫，只回傳給前端localStorage）
    const orderSummary = {
      order_id: `ORDER_${Date.now()}_${userId}`, // 臨時訂單ID
      user_id: userId,
      items: items.map((item) => ({
        vinyl_id: item.vinyl_id,
        vinyl_name: item.vinyl_name,
        artist: item.artist,
        image_id: item.image_id,
        image_path: item.image_path, // 本地圖片路徑
        image_url: item.image_url, // 遠端圖片URL
        price: item.price,
        quantity: item.quantity,
        current_stock: item.current_stock, // 目前庫存數量
        total_price: item.total_price,
      })),
      total_amount: orderTotal,
      created_at: new Date().toISOString(),
      status: 'pending', // 待結帳狀態
    };

    res.status(200).json({
      status: 'success',
      message: '訂單摘要已建立',
      data: orderSummary,
    });
  } catch (error) {
    console.error('建立訂單摘要失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '建立訂單摘要失敗',
    });
  }
});

// 2. 確認訂單 (結帳成功後寫入資料庫)
router.post('/checkout', checkToken, async (req, res) => {
  try {
    const userAccount = req.decoded.account;

    // 根據資料庫結構調整接收的資料格式
    const {
      user_id,
      total_price,
      points_used,
      coupon_id,
      payment_status,
      shipping_status,
      recipient_name,
      recipient_phone,
      shipping_address,
      items,
      logisticsInfo, // 🚀 新增：物流資訊
      payment_method, // 🚀 新增：付款方式，由前端傳入
    } = req.body;

    if (!userAccount) {
      return res.status(400).json({
        status: 'error',
        message: '使用者帳號資訊缺失',
      });
    }

    // 驗證付款方式
    if (!payment_method) {
      return res.status(400).json({
        status: 'error',
        message: '付款方式必填',
      });
    }

    // 驗證付款方式是否為有效值
    const validPaymentMethods = ['ECPAY', 'LINE_PAY', 'CREDIT_CARD'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({
        status: 'error',
        message: `無效的付款方式: ${payment_method}。有效值: ${validPaymentMethods.join(
          ', ',
        )}`,
      });
    }

    // 先根據帳號取得使用者ID
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE account = ?',
      [userAccount],
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '使用者不存在',
      });
    }

    const userId = userRows[0].id;

    // 驗證訂單資料
    if (!items || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '訂單項目資料缺失',
      });
    }

    if (!total_price || total_price <= 0) {
      return res.status(400).json({
        status: 'error',
        message: '訂單金額無效',
      });
    }

    // 🚀 新增：格式化地址 - 根據配送方式決定格式化邏輯
    const deliveryMethod = logisticsInfo?.type === '711' ? '711' : 'home';
    const formattedAddress = formatShippingAddress(
      shipping_address,
      deliveryMethod,
    );

    // 開始資料庫交易
    const conn = await connection.getConnection();

    try {
      await conn.beginTransaction();

      // 🚀 新增：計算點數回饋 (每消費10元回饋1點)
      const points_got = Math.floor(total_price / 10);
      console.log(`💰 訂單金額: ${total_price} 元，將回饋: ${points_got} 點`);

      // 1. 建立訂單記錄 - 對應 orders 表結構
      const [orderResult] = await conn.execute(
        `INSERT INTO orders (
            users_id,
            total_price,
            points_used,
            points_got,
            coupon_id,
            payment_status,
            shipping_status,
            recipient_name,
            recipient_phone,
            shipping_address,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          total_price,
          points_used || 0,
          points_got, // 🚀 新增：點數回饋
          coupon_id || null,
          payment_status || 'pending',
          shipping_status || 'processing',
          recipient_name || '未提供',
          recipient_phone || '未提供',
          formattedAddress || '未提供', // 🚀 使用格式化後的地址
        ],
      );

      const orderId = orderResult.insertId;
      console.log('🔍 新建立的訂單 ID:', orderId);
      console.log('🔍 orderId 類型:', typeof orderId);

      // 2. 建立訂單項目 - 對應 order_items 表結構
      for (const item of items) {
        await conn.execute(
          `INSERT INTO order_items (order_id, vinyl_id, quantity, unit_price)
             VALUES (?, ?, ?, ?)`,
          [orderId, item.vinyl_id, item.quantity, item.unit_price],
        );
      }

      // 3. 清空購物車中已購買的商品
      await conn.execute(
        `DELETE ci FROM cart_items ci
           JOIN carts c ON ci.cart_id = c.id
           WHERE c.users_id = ? AND ci.is_checked = 1`,
        [userId],
      );

      // 4. 更新商品庫存
      for (const item of items) {
        await conn.execute('UPDATE vinyl SET stock = stock - ? WHERE id = ?', [
          item.quantity,
          item.vinyl_id,
        ]);
      }

      // 🚀 新增：5. 處理點數使用記錄 (如果有使用點數)
      if (points_used > 0) {
        // 5.1 檢查用戶點數是否足夠
        const [userPointsResult] = await conn.execute(
          'SELECT points FROM users WHERE id = ?',
          [userId],
        );

        if (userPointsResult.length === 0) {
          throw new Error('找不到使用者');
        }

        const currentPoints = userPointsResult[0].points || 0;
        if (currentPoints < points_used) {
          throw new Error(
            `點數不足！您有 ${currentPoints} 點，無法使用 ${points_used} 點`,
          );
        }

        // 5.2 在 users_points 表中記錄點數使用（負數）
        await conn.execute(
          `INSERT INTO users_points (users_id, type, points, description, created_at)
           VALUES (?, '使用', ?, ?, NOW())`,
          [userId, -points_used, `購物車結帳使用 ${points_used} 點`],
        );

        // 5.3 更新用戶總點數（扣除已使用的點數）
        await conn.execute(
          'UPDATE users SET points = points - ? WHERE id = ?',
          [points_used, userId],
        );

        console.log(
          `✅ 用戶 ${userId} 使用 ${points_used} 點，剩餘點數: ${
            currentPoints - points_used
          }`,
        );
      }

      // 🚀 新增：6. 處理點數回饋 (如果有點數回饋)
      if (points_got > 0) {
        // 6.1 在 users_points 表中記錄點數獲得
        await conn.execute(
          `INSERT INTO users_points (users_id, type, points, description, created_at)
           VALUES (?, '獲得', ?, ?, NOW())`,
          [userId, points_got, `消費 ${total_price} 元獲得 ${points_got} 點`],
        );

        // 6.2 更新用戶總點數（加上獲得的點數）
        await conn.execute(
          'UPDATE users SET points = points + ? WHERE id = ?',
          [points_got, userId],
        );

        console.log(`✅ 用戶 ${userId} 獲得 ${points_got} 點回饋`);
      }

      // 7. 建立付款記錄 - 對應 payment_records 表
      // ECPay MerchantTradeNo 規範：英數字，長度上限 20，需唯一
      const now = new Date();
      const pad2 = (n) => n.toString().padStart(2, '0');
      const ts = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(
        now.getDate(),
      )}${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(
        now.getSeconds(),
      )}`;
      let merchantTradeNo = `od${ts}${String(orderId).padStart(3, '0')}`.slice(
        0,
        20,
      );

      // 根據付款方式決定 merchant_trade_no 的初始值
      let initialMerchantTradeNo;
      if (payment_method === 'LINE_PAY') {
        // LINE Pay 暫時留空，等 confirm 時填入 transactionId
        initialMerchantTradeNo = '';
      } else {
        // ECPay 和其他付款方式使用訂單編號
        initialMerchantTradeNo = merchantTradeNo;
      }

      await conn.execute(
        `INSERT INTO payment_records (
            order_id,
            merchant_trade_no,
            ecpay_trade_no,
            payment_method,
            payment_status,
            trade_amount,
            payment_date
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderId,
          initialMerchantTradeNo, // 根據付款方式決定初始值
          payment_method === 'ECPAY' ? merchantTradeNo : '', // 只有 ECPay 才填入 ecpay_trade_no
          payment_method, // 使用傳入的付款方式
          payment_status, // 固定為待付款
          total_price,
        ],
      );

      // 🚀 新增：8. 建立物流資訊記錄 - 對應 logistics_info 表
      if (logisticsInfo) {
        await conn.execute(
          `INSERT INTO logistics_info (
              order_id,
              type,
              store_id,
              store_name,
              store_telephone,
              tracking_number,
              status,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            orderId,
            logisticsInfo.type || 'home', // 預設為宅配
            logisticsInfo.store_id || null,
            logisticsInfo.store_name || null,
            logisticsInfo.store_telephone || null,
            logisticsInfo.tracking_number || null,
            logisticsInfo.status || 'pending',
          ],
        );
      }

      // 提交交易
      await conn.commit();
      conn.release();

      const responseData = {
        orderId: orderId,
        orderNo: `ORDER_${orderId}`,
        payment: {
          status: 'pending',
          method: 'CREDIT_CARD',
          amount: total_price,
        },
        shipping_status: 'processing',
        total_amount: total_price,
        merchant_trade_no: merchantTradeNo,
        logistics_info: logisticsInfo, // 🚀 新增：回傳物流資訊
        // 🚀 新增：回傳點數回饋資訊
        points_reward: {
          points_got: points_got,
          description:
            points_got > 0
              ? `消費 ${total_price} 元獲得 ${points_got} 點`
              : null,
        },
      };

      console.log('🔍 準備返回的資料:', JSON.stringify(responseData, null, 2));
      console.log('🔍 返回的 orderId:', responseData.orderId);

      res.status(200).json({
        status: 'success',
        message: '訂單已確認並建立付款記錄',
        data: responseData,
      });
    } catch (error) {
      // 回滾交易
      await conn.rollback();
      conn.release();
      throw error;
    }
  } catch (error) {
    console.error('確認訂單失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '確認訂單失敗',
    });
  }
});

// 3. 取得使用者訂單列表(前台會員中心)
router.get('/', checkToken, async (req, res) => {
  try {
    const userAccount = req.decoded.account;
    const { page = 1, limit = 10, search = '', status = '' } = req.query;

    if (!userAccount) {
      return res.status(400).json({
        status: 'error',
        message: '使用者帳號資訊缺失',
      });
    }

    // 先根據帳號取得使用者ID
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE account = ?',
      [userAccount],
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '使用者不存在',
      });
    }

    const userId = userRows[0].id;
    const offset = (page - 1) * limit;

    // 先檢查 orders 表是否存在
    try {
      const [tableStructure] = await connection.execute('DESCRIBE orders');
      console.log('Orders table structure:', tableStructure);

      // 檢查是否有 user_id 欄位
      const hasUserId = tableStructure.some(
        (field) =>
          field.Field === 'user_id' ||
          field.Field === 'users_id' ||
          field.Field === 'userid',
      );

      if (!hasUserId) {
        console.log('No user_id field found in orders table');
        // 如果沒有 user_id 欄位，回傳空結果
        return res.status(200).json({
          status: 'success',
          data: {
            orders: [],
            pagination: {
              current_page: parseInt(page),
              total_pages: 0,
              total_orders: 0,
              limit: parseInt(limit),
            },
          },
        });
      }

      // 找到正確的 user_id 欄位名稱
      const userIdField =
        tableStructure.find(
          (field) =>
            field.Field === 'user_id' ||
            field.Field === 'users_id' ||
            field.Field === 'userid',
        )?.Field || 'user_id';

      console.log('Using userId field:', userIdField);

      // 建立搜尋條件
      let whereConditions = [`o.${userIdField} = ?`];
      let queryParams = [userId];

      // 狀態篩選
      if (status && status !== 'all') {
        if (status === 'processing') {
          whereConditions.push('o.shipping_status = ?');
          queryParams.push('processing');
        } else if (status === 'shipped') {
          whereConditions.push('o.shipping_status = ?');
          queryParams.push('shipped');
        }
      }

      // 搜尋條件
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereConditions.push(`(
          o.id LIKE ? OR
          EXISTS (
            SELECT 1 FROM order_items oi
            LEFT JOIN vinyl v ON oi.vinyl_id = v.id
            WHERE oi.order_id = o.id AND (
              v.name LIKE ? OR
              v.artist LIKE ?
            )
          )
        )`);
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.join(' AND ');

      // 取得訂單列表（包含基本資訊）
      const [orders] = await connection.execute(
        `SELECT
            o.id,
            o.total_price,
            o.points_used,
            o.points_got,
            o.coupon_id,
            o.payment_status,
            o.shipping_status,
            o.recipient_name,
            o.recipient_phone,
            o.shipping_address,
            o.created_at
           FROM orders o
           WHERE ${whereClause}
           ORDER BY o.created_at DESC
           LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), offset],
      );

      // 為每個訂單獲取訂單項目和付款記錄
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          // 獲取訂單項目
          const [orderItems] = await connection.execute(
            `SELECT
                oi.id,
                oi.vinyl_id,
                oi.quantity,
                oi.unit_price,
                (oi.quantity * oi.unit_price) as item_total_price,
                v.name as vinyl_name,
                v.artist,
                v.image_id,
                vi.pathname AS image_path,
                vi.url AS image_url
               FROM order_items oi
               LEFT JOIN vinyl v ON oi.vinyl_id = v.id
               LEFT JOIN vinyl_images vi ON v.id = vi.vinyl_id
               WHERE oi.order_id = ?`,
            [order.id],
          );

          // 獲取付款記錄
          const [paymentRecords] = await connection.execute(
            `SELECT
                payment_method,
                payment_status,
                trade_amount,
                payment_date,
                merchant_trade_no,
                ecpay_trade_no
               FROM payment_records
               WHERE order_id = ?
               ORDER BY payment_date DESC, id DESC
               LIMIT 1`,
            [order.id],
          );

          // 獲取物流資訊
          const [logisticsRecords] = await connection.execute(
            `SELECT
                type,
                store_id,
                store_name,
                store_telephone,
                tracking_number,
                status,
                created_at
               FROM logistics_info
               WHERE order_id = ?
               ORDER BY created_at DESC, id DESC
               LIMIT 1`,
            [order.id],
          );

          return {
            ...order,
            items: orderItems,
            payment: paymentRecords.length > 0 ? paymentRecords[0] : null,
            logistics: logisticsRecords.length > 0 ? logisticsRecords[0] : null,
          };
        }),
      );

      // 取得總訂單數（使用相同的篩選條件）
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`,
        queryParams,
      );

      const totalOrders = countResult[0].total;
      const totalPages = Math.ceil(totalOrders / limit);

      res.status(200).json({
        status: 'success',
        data: {
          orders: ordersWithDetails,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_orders: totalOrders,
            limit: parseInt(limit),
          },
        },
      });
    } catch (tableError) {
      console.error('檢查訂單表結構失敗:', tableError);
      // 如果檢查表結構失敗，回傳空結果
      return res.status(200).json({
        status: 'success',
        data: {
          orders: [],
          pagination: {
            current_page: parseInt(page),
            total_pages: 0,
            total_orders: 0,
            limit: parseInt(limit),
          },
        },
      });
    }
  } catch (error) {
    console.error('取得訂單列表失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '取得訂單列表失敗',
    });
  }
});

// 4. 取得單一訂單詳情(前台會員中心)
router.get('/:orderId', checkToken, async (req, res) => {
  try {
    const userAccount = req.decoded.account;
    const { orderId } = req.params;

    if (!userAccount) {
      return res.status(400).json({
        status: 'error',
        message: '使用者帳號資訊缺失',
      });
    }

    // 先根據帳號取得使用者ID
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE account = ?',
      [userAccount],
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '使用者不存在',
      });
    }

    const userId = userRows[0].id;

    // 取得訂單詳情 - 支援通過 order ID 或 merchant_trade_no 查詢
    let orders;

    // 檢查 orderId 是否為數字（orders.id）還是字符串（merchant_trade_no）
    if (/^\d+$/.test(orderId)) {
      // 數字 ID：直接查詢 orders 表
      [orders] = await connection.execute(
        `SELECT
          o.*,
          oi.vinyl_id,
          oi.quantity,
          oi.unit_price,
          (oi.quantity * oi.unit_price) as item_total_price,
          v.name as vinyl_name,
          v.artist,
         v.image_id,
          vi.pathname AS image_path,
          vi.url AS image_url
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN vinyl v ON oi.vinyl_id = v.id
         LEFT JOIN vinyl_images vi ON v.id = vi.vinyl_id
         WHERE o.id = ? AND o.users_id = ?`,
        [orderId, userId],
      );
    } else {
      // 字符串：通過 merchant_trade_no 查詢
      [orders] = await connection.execute(
        `SELECT
          o.*,
          oi.vinyl_id,
          oi.quantity,
          oi.unit_price,
          (oi.quantity * oi.unit_price) as item_total_price,
          v.name as vinyl_name,
          v.artist,
         v.image_id,
          vi.pathname AS image_path,
          vi.url AS image_url
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN vinyl v ON oi.vinyl_id = v.id
         LEFT JOIN vinyl_images vi ON v.id = vi.vinyl_id
         LEFT JOIN payment_records pr ON o.id = pr.order_id
         WHERE pr.merchant_trade_no = ? AND o.users_id = ?`,
        [orderId, userId],
      );
    }

    if (orders.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '訂單不存在',
      });
    }

    // 取得付款資訊（取最新一筆付款記錄）
    // 使用實際的 orders.id 來查詢付款記錄
    const actualOrderId = orders[0].id;
    console.log('🔍 查詢付款資訊，使用 order_id:', actualOrderId);

    const [paymentRows] = await connection.execute(
      `SELECT payment_method, payment_status, trade_amount, payment_date, merchant_trade_no, ecpay_trade_no
       FROM payment_records
       WHERE order_id = ?
       ORDER BY payment_date DESC, id DESC
       LIMIT 1`,
      [actualOrderId],
    );

    console.log('🔍 付款記錄查詢結果:', paymentRows);

    // 取得物流資訊（取最新一筆物流記錄）
    const [logisticsRows] = await connection.execute(
      `SELECT type, store_id, store_name, store_telephone, tracking_number, status, created_at
       FROM logistics_info
       WHERE order_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [actualOrderId],
    );

    // 整理訂單資料結構
    const orderData = {
      id: orders[0].id,
      order_number: orders[0].id, // 暫時使用 id 作為訂單編號
      total_price: orders[0].total_price,
      payment_status: orders[0].payment_status,
      payment_method: paymentRows?.[0]?.payment_method || null,
      shipping_status: orders[0].shipping_status,
      recipient_name: orders[0].recipient_name,
      recipient_phone: orders[0].recipient_phone,
      shipping_address: orders[0].shipping_address,
      created_at: orders[0].created_at,
      logisticsInfo: logisticsRows?.length
        ? {
            type: logisticsRows[0].type,
            store_id: logisticsRows[0].store_id,
            store_name: logisticsRows[0].store_name,
            store_telephone: logisticsRows[0].store_telephone,
            tracking_number: logisticsRows[0].tracking_number,
            status: logisticsRows[0].status,
            created_at: logisticsRows[0].created_at,
          }
        : undefined,
      payment: paymentRows?.length
        ? {
            method: paymentRows[0].payment_method,
            status: paymentRows[0].payment_status,
            amount: paymentRows[0].trade_amount,
            paid_at: paymentRows[0].payment_date,
            merchant_trade_no: paymentRows[0].merchant_trade_no,
            ecpay_trade_no: paymentRows[0].ecpay_trade_no,
          }
        : undefined,
      items: orders.map((order) => ({
        vinyl_id: order.vinyl_id,
        vinyl_name: order.vinyl_name,
        artist: order.artist,
        image_id: order.image_id,
        image_path: order.image_path,
        image_url: order.image_url,
        quantity: order.quantity,
        unit_price: order.unit_price,
        item_total_price: order.item_total_price,
      })),
    };

    res.status(200).json({
      status: 'success',
      data: orderData,
    });
  } catch (error) {
    console.error('取得訂單詳情失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '取得訂單詳情失敗',
    });
  }
});

// 5. 取消訂單
router.patch('/:orderId/cancel', checkToken, async (req, res) => {
  try {
    const userAccount = req.decoded.account;
    const { orderId } = req.params;

    if (!userAccount) {
      return res.status(400).json({
        status: 'error',
        message: '使用者帳號資訊缺失',
      });
    }

    // 先根據帳號取得使用者ID
    const [userRows] = await connection.execute(
      'SELECT id FROM users WHERE account = ?',
      [userAccount],
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '使用者不存在',
      });
    }

    const userId = userRows[0].id;

    // 檢查訂單是否存在且屬於該使用者
    const [orderRows] = await connection.execute(
      'SELECT * FROM orders WHERE id = ? AND users_id = ?',
      [orderId, userId],
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '訂單不存在',
      });
    }

    const order = orderRows[0];

    // 檢查訂單狀態是否可以取消
    if (
      order.payment_status !== 'pending' &&
      order.payment_status !== 'confirmed'
    ) {
      return res.status(400).json({
        status: 'error',
        message: '此訂單狀態無法取消',
      });
    }

    // 開始資料庫交易 - 從連線池取得連線
    const conn = await connection.getConnection();

    try {
      await conn.beginTransaction();

      // 1. 更新訂單狀態為已取消
      await conn.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [
        'cancelled',
        orderId,
      ]);

      // 2. 恢復商品庫存
      const [orderItems] = await conn.execute(
        'SELECT vinyl_id, quantity FROM order_items WHERE order_id = ?',
        [orderId],
      );

      for (const item of orderItems) {
        await conn.execute('UPDATE vinyl SET stock = stock + ? WHERE id = ?', [
          item.quantity,
          item.vinyl_id,
        ]);
      }

      // 提交交易
      await conn.commit();

      // 釋放連線
      conn.release();

      res.status(200).json({
        status: 'success',
        message: '訂單已取消',
        data: { order_id: orderId, status: 'cancelled' },
      });
    } catch (error) {
      // 回滾交易
      await conn.rollback();
      // 釋放連線
      conn.release();
      throw error;
    }
  } catch (error) {
    console.error('取消訂單失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '取消訂單失敗',
    });
  }
});

// 5.5. 更新付款狀態 API - 前端自動更新付款成功狀態
router.patch('/:orderId/payment-status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_status } = req.body;

    console.log(`�� 更新訂單 ${orderId} 付款狀態為: ${payment_status}`);

    // 驗證付款狀態必填
    if (!payment_status) {
      return res.status(400).json({
        status: 'error',
        message: '付款狀態必填',
      });
    }

    // 驗證付款狀態是否為有效值
    const validStatuses = ['pending', 'success', 'failed', 'cancelled'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        status: 'error',
        message: `無效的付款狀態: ${payment_status}。有效值: ${validStatuses.join(
          ', ',
        )}`,
      });
    }

    // 更新 orders 表的付款狀態
    const [orderResult] = await connection.execute(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      [payment_status, orderId],
    );

    // 更新 payment_records 表的付款狀態
    const [paymentResult] = await connection.execute(
      'UPDATE payment_records SET payment_status = ? WHERE order_id = ?',
      [payment_status, orderId],
    );

    if (orderResult.affectedRows > 0) {
      console.log(`✅ 訂單 ${orderId} 付款狀態更新成功: ${payment_status}`);
      res.status(200).json({
        status: 'success',
        message: '付款狀態更新成功',
        data: { orderId, payment_status },
      });
    } else {
      console.log(`❌ 找不到訂單: ${orderId}`);
      res.status(404).json({
        status: 'error',
        message: '訂單不存在',
      });
    }
  } catch (error) {
    console.error('❌ 更新付款狀態失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '更新付款狀態失敗',
    });
  }
});

// 6. 更新訂單狀態 (後台管理員用 demo價值低，暫時不會用到)
// router.patch('/:orderId/status', checkToken, checkAdmin, async (req, res) => {
//   // 更新訂單狀態：待付款、已付款、已出貨、已完成等
// });

// 7. 後台管理專用：獲取所有訂單（包含詳細資訊）
router.get('/admin/all', async (req, res) => {
  try {
    // 獲取所有訂單詳細資訊，包含客戶資訊和訂單項目
    const sql = `
            SELECT
                -- 訂單基本資訊
                o.id,                           -- 訂單ID (主鍵)
                o.users_id,                     -- 下單用戶ID
                o.total_price,                  -- 訂單總金額
                o.points_used,                  -- 使用的點數
                o.points_got,                   -- 獲得的點數
                o.coupon_id,                    -- 使用的優惠券ID

                -- 訂單狀態資訊
                o.payment_status,               -- 付款狀態 (pending/confirmed/cancelled)
                o.shipping_status,              -- 物流狀態 (pending/processing/shipped/delivered)

                -- 收件人資訊
                o.recipient_name,               -- 收件人姓名
                o.recipient_phone,              -- 收件人電話
                o.shipping_address,             -- 收件地址

                -- 時間戳記
                o.created_at,                   -- 訂單建立時間
                o.updated_at,                   -- 訂單最後更新時間

                -- 客戶資訊 (從 users 表關聯取得)
                u.name as customer_name,        -- 客戶姓名
                u.email as customer_email,      -- 客戶電子郵件
                u.phone as customer_phone,      -- 客戶電話
                u.account as customer_account,  -- 客戶帳號

                -- 統計資訊
                COUNT(oi.id) as item_count      -- 訂單項目數量 (計算每個訂單包含多少商品)

            FROM orders o                       -- 主表：訂單表
            LEFT JOIN users u ON o.users_id = u.id                    -- 關聯用戶表，取得客戶詳細資訊
            LEFT JOIN order_items oi ON o.id = oi.order_id            -- 關聯訂單項目表，用於計算項目數量
            GROUP BY o.id                      -- 按訂單ID排序
            ORDER BY o.created_at DESC         -- 按建立時間降序排列，最新訂單在前
        `;

    const [orders] = await connection.execute(sql);

    // 格式化資料以符合前端需求
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      order_number: `ID編號${order.id}`,
      customer_name: order.customer_name || '未知客戶',
      customer_email: order.customer_email || '未提供',
      customer_phone: order.customer_phone || order.recipient_phone || '未提供',
      customer_account: order.customer_account || '未提供',
      total_price: order.total_price || 0,
      points_used: order.points_used || 0,
      points_got: order.points_got || 0,
      coupon_id: order.coupon_id,
      payment_status: order.payment_status || 'pending',
      shipping_status: order.shipping_status || 'pending',
      recipient_name: order.recipient_name || '未提供',
      recipient_phone: order.recipient_phone || '未提供',
      shipping_address: order.shipping_address || '未提供',
      item_count: order.item_count || 0,
      created_at: order.created_at,
      updated_at: order.updated_at,
      status: order.shipping_status || 'pending',
    }));

    res.status(200).json({
      status: 'success',
      data: formattedOrders,
      message: `已獲取所有訂單，共 ${formattedOrders.length} 筆訂單`,
      meta: {
        total: formattedOrders.length,
        pending: formattedOrders.filter((o) => o.status === 'pending').length,
        shipped: formattedOrders.filter((o) => o.status === 'shipped').length,
        delivered: formattedOrders.filter((o) => o.status === 'delivered')
          .length,
        cancelled: formattedOrders.filter((o) => o.status === 'cancelled')
          .length,
        total_revenue: formattedOrders.reduce(
          (sum, o) => sum + o.total_price,
          0,
        ),
      },
    });
  } catch (error) {
    console.error('獲取管理員訂單列表錯誤:', error);
    const statusCode = error.code ?? 500;
    const statusText = error.status ?? 'error';
    const message = error.message ?? '獲取訂單列表失敗，請洽管理人員';

    res.status(statusCode).json({
      status: statusText,
      message,
      code: error.code ? `ADMIN_ORDERS_${error.code}` : 'ADMIN_ORDERS_ERROR',
    });
  }
});

// 8. 後台管理專用：更新訂單資訊

export default router;
