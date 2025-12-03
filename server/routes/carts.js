import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import connection from '../connect.js';

const upload = multer();
const secretKey = process.env.JWT_SECRET_KEY;
const router = express.Router();

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

// 1. 取得使用者的購物車
router.get('/', checkToken, async (req, res) => {
  try {
    // 直接從 token 獲取使用者ID，無需額外查詢
    const userId = req.decoded.id;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: '使用者ID資訊缺失',
      });
    }

    // 先檢查使用者是否有購物車，沒有則建立
    let [cartRows] = await connection.execute(
      'SELECT * FROM carts WHERE users_id = ?',
      [userId],
    );

    let cartId;
    if (cartRows.length === 0) {
      // 建立新購物車
      const [result] = await connection.execute(
        'INSERT INTO carts (users_id) VALUES (?)',
        [userId],
      );
      cartId = result.insertId;
    } else {
      cartId = cartRows[0].id;
    }

    // 取得購物車項目（包含商品資訊）
    const [items] = await connection.execute(
      `
      SELECT
        ci.id,
        ci.cart_id,
        ci.vinyl_id,
        ci.quantity,
        ci.is_checked,
        ci.created_at,
        v.name as vinyl_name,
        v.artist,
        v.image_id,
        vi.pathname AS image_path,
        vi.url AS image_url,
        v.stock,
        v.price,
        v.sale_price,
        v.main_category_id,  -- 新增：主分類ID (1-6)
        v.sub_category_id,   -- 新增：次分類ID
        CASE
          WHEN v.sale_price > 0 THEN  v.price
          ELSE v.price
        END as final_price,
        (CASE
          WHEN v.sale_price > 0 THEN v.price
          ELSE v.price
        END * ci.quantity) as total_price
      FROM cart_items ci
      LEFT JOIN vinyl v ON ci.vinyl_id = v.id
      LEFT JOIN vinyl_images vi ON v.id = vi.vinyl_id
      WHERE ci.cart_id = ?
    `,
      [cartId],
    );

    // 調試：檢查返回的資料
    console.log('購物車項目資料:');
    items.forEach((item, index) => {
      console.log(`項目 ${index + 1}:`, {
        id: item.id,
        vinyl_id: item.vinyl_id,
        name: item.vinyl_name,
        main_category_id: item.main_category_id,
        sub_category_id: item.sub_category_id,
        artist: item.artist,
      });
    });

    // 計算總價和總數量
    const totalPrice = items.reduce((sum, item) => {
      const price = item.final_price;
      return sum + price * item.quantity;
    }, 0);

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    res.status(200).json({
      status: 'success',
      data: {
        cart_id: cartId,
        user_id: userId,
        items: items,
        total_items: items.length,
        total_quantity: totalQuantity,
        total_price: totalPrice,
      },
    });
  } catch (error) {
    console.error('取得購物車失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '取得購物車失敗',
    });
  }
});

// 2. 新增商品到購物車
router.post('/items', checkToken, async (req, res) => {
  try {
    // 直接從 token 獲取使用者ID
    const userId = req.decoded.id;
    const { vinyl_id, quantity = 1 } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: '使用者ID資訊缺失',
      });
    }

    if (!vinyl_id) {
      return res.status(400).json({
        status: 'error',
        message: '請提供商品ID',
      });
    }

    // 檢查商品是否存在
    const [vinylRows] = await connection.execute(
      'SELECT * FROM vinyl WHERE id = ? AND is_valid = 1',
      [vinyl_id],
    );

    if (vinylRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '商品不存在或已下架',
      });
    }

    const vinyl = vinylRows[0];

    // 檢查庫存
    if (vinyl.stock < quantity) {
      return res.status(400).json({
        status: 'error',
        message: `庫存不足，目前庫存: ${vinyl.stock}`,
      });
    }

    // 取得或建立購物車
    let [cartRows] = await connection.execute(
      'SELECT * FROM carts WHERE users_id = ?',
      [userId],
    );

    let cartId;
    if (cartRows.length === 0) {
      const [result] = await connection.execute(
        'INSERT INTO carts (users_id) VALUES (?)',
        [userId],
      );
      cartId = result.insertId;
    } else {
      cartId = cartRows[0].id;
    }

    // 檢查購物車是否已有此商品
    const [existingItems] = await connection.execute(
      'SELECT * FROM cart_items WHERE cart_id = ? AND vinyl_id = ?',
      [cartId, vinyl_id],
    );

    if (existingItems.length > 0) {
      // 檢查更新後的總數量是否會超過庫存
      const newQuantity = existingItems[0].quantity + quantity;
      if (newQuantity > vinyl.stock) {
        return res.status(400).json({
          status: 'error',
          message: `購物車中此商品數量 (${existingItems[0].quantity}) + 新增數量 (${quantity}) = ${newQuantity}，超過庫存量 (${vinyl.stock})`,
        });
      }

      // 更新數量
      await connection.execute(
        'UPDATE cart_items SET quantity = ? WHERE id = ?',
        [newQuantity, existingItems[0].id],
      );

      res.status(200).json({
        status: 'success',
        message: '購物車商品數量已更新',
        data: { quantity: newQuantity },
      });
    } else {
      // 新增商品
      const [result] = await connection.execute(
        'INSERT INTO cart_items (cart_id, vinyl_id, quantity, is_checked) VALUES (?, ?, ?, 1)',
        [cartId, vinyl_id, quantity],
      );

      res.status(201).json({
        status: 'success',
        message: '商品已加入購物車',
        data: {
          id: result.insertId,
          cart_id: cartId,
          vinyl_id,
          quantity,
          is_checked: 1,
        },
      });
    }
  } catch (error) {
    console.error('新增購物車項目失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '新增購物車項目失敗',
    });
  }
});

// 3. 更新購物車商品數量
//itemId 是 "data":{"items":[{id},...]} 的 id，不是 cart_id
router.post('/items/:itemId', checkToken, async (req, res) => {
  try {
    // 直接從 token 獲取使用者ID
    const userId = req.decoded.id;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: '使用者ID資訊缺失',
      });
    }

    const { quantity, is_checked } = req.body;

    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({
        status: 'error',
        message: '數量不能為負數',
      });
    }

    // 檢查購物車項目是否屬於當前使用者
    const [items] = await connection.execute(
      `
      SELECT ci.* FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = ? AND c.users_id = ?
    `,
      [itemId, userId],
    );

    if (items.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '購物車項目不存在',
      });
    }

    if (quantity === 0) {
      // 數量為 0 時刪除項目
      await connection.execute('DELETE FROM cart_items WHERE id = ?', [itemId]);

      res.status(200).json({
        status: 'success',
        message: '商品已從購物車移除',
      });
    } else {
      // 更新數量和勾選狀態
      const updateFields = [];
      const updateValues = [];

      if (quantity !== undefined) {
        // 檢查商品庫存
        const [vinylRows] = await connection.execute(
          'SELECT stock FROM vinyl WHERE id = ?',
          [items[0].vinyl_id],
        );

        if (vinylRows.length === 0) {
          return res.status(404).json({
            status: 'error',
            message: '商品不存在',
          });
        }

        const currentStock = vinylRows[0].stock;

        if (currentStock < quantity) {
          return res.status(400).json({
            status: 'error',
            message: `庫存不足，目前庫存: ${currentStock}`,
            data: {
              current_stock: currentStock,
              requested_quantity: quantity,
            },
          });
        }

        updateFields.push('quantity = ?');
        updateValues.push(quantity);
      }

      if (is_checked !== undefined) {
        // 前端傳入 is_checked 為 true 或 false，這邊將 is_checked 轉換為 1 或 0
        const checkedValue = is_checked ? 1 : 0;
        updateFields.push('is_checked = ?');
        updateValues.push(checkedValue);
      }

      if (updateFields.length > 0) {
        updateValues.push(itemId);
        await connection.execute(
          `UPDATE cart_items SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues,
        );

        res.status(200).json({
          status: 'success',
          message: '購物車項目已更新',
          data: {
            quantity,
            is_checked:
              is_checked !== undefined ? (is_checked ? 1 : 0) : undefined,
          },
        });
      } else {
        res.status(400).json({
          status: 'error',
          message: '請提供要更新的欄位',
        });
      }
    }
  } catch (error) {
    console.error('更新購物車項目失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '更新購物車項目失敗',
    });
  }
});

// 4. 刪除購物車商品
router.delete('/items/:itemId', checkToken, async (req, res) => {
  try {
    // 直接從 token 獲取使用者ID
    const userId = req.decoded.id;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: '使用者ID資訊缺失',
      });
    }

    // 檢查購物車項目是否屬於當前使用者
    const [items] = await connection.execute(
      `
      SELECT ci.* FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = ? AND c.users_id = ?
    `,
      [itemId, userId],
    );

    if (items.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '購物車項目不存在',
      });
    }

    await connection.execute('DELETE FROM cart_items WHERE id = ?', [itemId]);

    res.status(200).json({
      status: 'success',
      message: '商品已從購物車移除',
    });
  } catch (error) {
    console.error('刪除購物車項目失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '刪除購物車項目失敗',
    });
  }
});

// 5. 刪除購物車所有項目
router.delete('/items', checkToken, async (req, res) => {
  try {
    // 直接從 token 獲取使用者ID
    const userId = req.decoded.id;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: '使用者ID資訊缺失',
      });
    }

    // 取得使用者的購物車ID
    const [cartRows] = await connection.execute(
      'SELECT id FROM carts WHERE users_id = ?',
      [userId],
    );

    if (cartRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '購物車不存在',
      });
    }

    const cartId = cartRows[0].id;

    // 刪除所有購物車項目
    await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [
      cartId,
    ]);

    res.status(200).json({
      status: 'success',
      message: '購物車已清空',
    });
  } catch (error) {
    console.error('清空購物車失敗:', error);
    res.status(500).json({
      status: 'error',
      message: '清空購物車失敗',
    });
  }
});

// 6. 套用優惠券
// 優惠券功能尚未實作，先註解掉
// router.get('/apply-coupon', checkToken, async (req, res) => {
//   try {
//     // 直接從 token 獲取使用者ID
//     const userId = req.decoded.id;
//     const { coupon_code } = req.query;

//     if (!userId) {
//       return res.status(400).json({
//         status: 'error',
//         message: '使用者ID資訊缺失',
//       });
//     }

//     // 檢查優惠券是否存在
//     const [couponRows] = await connection.execute(
//       'SELECT * FROM coupons WHERE code = ? AND is_valid = 1',
//       [coupon_code],
//     );

//     if (couponRows.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: '優惠券不存在或已失效',
//       });
//     }

//     const coupon = couponRows[0];

//     // 檢查優惠券是否適用於當前購物車
//     const [cartRows] = await connection.execute(
//       'SELECT * FROM carts WHERE users_id = ?',
//       [userId],
//     );

//     if (cartRows.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: '購物車不存在',
//       });
//     }

//     const cartId = cartRows[0].id;

//     // 檢查購物車項目是否屬於當前使用者
//     const [items] = await connection.execute(
//       'SELECT * FROM cart_items WHERE cart_id = ? AND users_id = ?',
//       [cartId, userId],
//     );

//     if (items.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: '購物車項目不存在',
//       });
//     }

//     res.status(200).json({
//       status: 'success',
//       message: '優惠券已套用',
//     });
//   } catch (error) {
//     console.error('套用優惠券失敗:', error);
//   }
// });

// 7. 取得購物車統計資訊
// 與GET /api/carts 重複功能，但GET /api/carts 有包含購物車項目，這邊只取得統計資訊
// router.get('/summary', checkToken, async (req, res) => {
//   try {
//     // 直接從 token 獲取使用者ID
//     const userId = req.decoded.id;

//     if (!userId) {
//       return res.status(400).json({
//         status: 'error',
//         message: '使用者ID資訊缺失',
//       });
//     }

//     const [summary] = await connection.execute(
//       `
//       SELECT
//         COUNT(ci.id) as total_items,
//         SUM(ci.quantity) as total_quantity,
//         SUM(
//           CASE
//             WHEN v.sale_price > 0 THEN v.sale_price * ci.quantity
//             ELSE v.price * ci.quantity
//           END
//         ) as total_price
//       FROM cart_items ci
//       JOIN carts c ON ci.cart_id = c.id
//       LEFT JOIN vinyl v ON ci.vinyl_id = v.id
//       WHERE c.users_id = ?
//     `,
//       [userId],
//     );

//     res.status(200).json({
//       status: 'success',
//       data: {
//         total_items: summary[0].total_items || 0,
//         total_quantity: summary[0].total_quantity || 0,
//         total_price: summary[0].total_price || 0,
//       },
//     });
//   } catch (error) {
//     console.error('取得購物車統計失敗:', error);
//     res.status(500).json({
//       status: 'error',
//       message: '取得購物車統計失敗',
//     });
//   }
// });

// 8. 切換購物車項目勾選狀態
//與 POST /api/carts/items/:itemId 重複功能，但 POST /api/carts/items/:itemId 是更新數量和勾選狀態，這邊只更新勾選狀態
// router.patch('/items/:itemId/toggle', checkToken, async (req, res) => {
//   try {
//     // 直接從 token 獲取使用者ID
//     const userId = req.decoded.id;
//     const { itemId } = req.params;

//     if (!userId) {
//       return res.status(400).json({
//         status: 'error',
//         message: '使用者ID資訊缺失',
//       });
//     }

//     // 檢查購物車項目是否屬於當前使用者
//     const [items] = await connection.execute(
//       `
//       SELECT ci.* FROM cart_items ci
//       JOIN carts c ON ci.cart_id = c.id
//       WHERE ci.id = ? AND c.users_id = ?
//     `,
//       [itemId, userId],
//     );

//     if (items.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: '購物車項目不存在',
//       });
//     }

//     const currentChecked = items[0].is_checked;
//     const newChecked = currentChecked ? 0 : 1;

//     await connection.execute(
//       'UPDATE cart_items SET is_checked = ? WHERE id = ?',
//       [newChecked, itemId],
//     );

//     res.status(200).json({
//       status: 'success',
//       message: '商品勾選狀態已更新',
//       data: { is_checked: newChecked },
//     });
//   } catch (error) {
//     console.error('切換商品勾選狀態失敗:', error);
//     res.status(500).json({
//       status: 'error',
//       message: '切換商品勾選狀態失敗',
//     });
//   }
// });

export default router;
