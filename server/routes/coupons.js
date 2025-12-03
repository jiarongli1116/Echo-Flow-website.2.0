import express from 'express'
import multer from 'multer'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import connection from '../connect.js'

const upload = multer()
const secretKey = process.env.JWT_SECRET_KEY
const router = express.Router()

// 檢查 JWT Token 的中間件函數
function checkToken(req, res, next) {
    let token = req.get('Authorization')
    if (token && token.includes('Bearer ')) {
        token = token.slice(7)
        jwt.verify(token, secretKey, (error, decoded) => {
            if (error) {
                console.log(error)
                res.status(401).json({
                    status: 'error',
                    message: '登入驗證失效，請重新登入',
                })
                return
            }
            req.decoded = decoded
            next()
        })
    } else {
        res.status(401).json({
            status: 'error',
            message: '無登入驗證資料，請重新登入',
        })
    }
}

// ? 檢查使用者是否存在
export async function checkUser(account) {
    const sql = 'SELECT * FROM `users` WHERE `account` = ?;'
    const [result] = await connection.execute(sql, [account])
    const user = result[0]
    if (!user) {
        const err = new Error(`找不到 ${account} 使用者`)
        err.code = 404
        err.status = 'fail'
        throw err
    }
    return user
}

// ? 檢查優惠券是否存在
export async function checkCoupon(code) {
    const sql = `
        SELECT *
        FROM coupons
        WHERE code = ?
        AND is_valid = 1
    `

    const [result] = await connection.execute(sql, [code])
    const coupon = result[0]

    if (!coupon) {
        const err = new Error(`找不到 ${code} 優惠卷`)
        err.code = 400
        err.status = 'fail'
        throw err
    }

    return coupon
}

// ? 檢查使用者是否可使用此優惠券，且剩餘次數 > 0 或無限次數(-1)
export async function checkUserCoupon(user_account, coupon_code) {
    const sql = `
        SELECT remaining_uses, is_valid FROM user_coupons
        WHERE user_account = ?
            AND coupon_code = ?
            AND (remaining_uses > 0 OR remaining_uses = -1)
            AND is_valid = 1;
    `
    const [result] = await connection.execute(sql, [user_account, coupon_code])
    const user_coupon = result[0]
    if (!user_coupon) {
        const err = new Error('此帳號沒有這個優惠券或已無法使用')
        err.code = 400
        err.status = 'fail'
        throw err
    }
    return user_coupon
}

// ? 扣減 user_coupons 使用次數，剩餘次數為0時設 is_valid = 0
export async function decrementCouponUse(user_account, coupon_code) {
    const sql = `
        UPDATE user_coupons
        SET
            remaining_uses = CASE
                WHEN remaining_uses = -1 THEN -1               -- 無限次數，不變
                WHEN remaining_uses > 0 THEN remaining_uses - 1 -- 有限次數扣 1
                ELSE 0                                        -- 已經 0，保持 0
            END,
            is_valid = CASE
                WHEN remaining_uses > 0 THEN is_valid         -- 扣減前 >0，維持原樣
                WHEN remaining_uses = 1 THEN 0                -- 扣減後 0，設為 0
                ELSE is_valid
            END
        WHERE user_account = ? AND coupon_code = ? AND (remaining_uses > 0 OR remaining_uses = -1);
    `

    const [result] = await connection.execute(sql, [user_account, coupon_code])

    if (result.affectedRows === 0) {
        const err = new Error('此帳號沒有這個優惠券或已無法使用')
        err.code = 400
        err.status = 'fail'
        throw err
    }

    // 回傳更新後的值
    const [rows] = await connection.execute(
        'SELECT remaining_uses, is_valid FROM user_coupons WHERE user_account = ? AND coupon_code = ?',
        [user_account, coupon_code]
    )

    return rows[0] // { remaining_uses: ..., is_valid: ... }
}

// ? 減 coupons 可領取次數
export async function decrementCouponQty(code) {
    const sql = `
        UPDATE coupons
        SET
            total_quantity = CASE
                WHEN total_quantity = -1 THEN -1               -- 無限數量，不變
                WHEN total_quantity > 0 THEN total_quantity - 1      -- 有限數量，扣 1
                ELSE 0                                   -- 已經 0，保持 0
            END,
            status = CASE
                WHEN total_quantity = -1 THEN status           -- 無限數量，不變
                WHEN total_quantity - 1 <= 0 THEN 'inactive'   -- 扣減後 = 0 → 停用
                ELSE status
            END
        WHERE  code = ?
            AND (total_quantity > 0 OR total_quantity = -1)
            AND status = 'active'
            AND is_valid = 1
    `

    const [result] = await connection.execute(sql, [code]) // 檢查是否成功更新了任何一筆資料

    if (result.affectedRows === 0) {
        const err = new Error('此優惠券已發放完畢')
        err.code = 400
        err.status = 'fail'
        throw err
    }

    return { message: '優惠券數量已成功扣減' }
}

router.get('/test', async (req, res) => {
    try {
        const sql = `
                   SELECT code FROM coupons
                `

        let [coupons] = await connection.execute(sql)

        console.log(coupons.length)

        console.log(`共 ${coupons.length} 張優惠卷`)

        res.status(200).json({
            status: 'success',
            data: coupons,
            message: `共 ${coupons.length} 優惠卷`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 後台新增優惠卷
router.post('/admin/add', async (req, res) => {
    try {
        const {
            name,
            code,
            content,
            start_at,
            end_at,
            validity_days,
            status,
            total_quantity,
            usage_limit,
            min_spend,
            min_items,
            discount_type,
            discount_value,
            target_type,
            target_value,
        } = req.body

        console.log(code)

        // 檢查必填欄位
        if (!name || !code || !end_at) {
            const err = new Error('請提供完整的使用者資訊 (標題、代碼、有效日期為必填)')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 檢查優惠碼存在
        const checkCodeSql = `
            SELECT * 
            FROM coupons
            WHERE code = ? 
        `

        const [codeResult] = await connection.execute(checkCodeSql, [code])
        const coupon = codeResult[0]
        if (coupon) {
            const err = new Error('優惠代碼已存在')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        let sql
        // 建立 SQL 語法 - user_coupons
        sql = `INSERT INTO coupons (name, code, content, start_at, end_at, validity_days,
                status, total_quantity, usage_limit, min_spend, min_items, discount_type, discount_value, target_type, target_value) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

        const result = await connection.execute(sql, [
            name,
            code,
            content,
            start_at,
            end_at,
            validity_days,
            status,
            total_quantity,
            usage_limit,
            min_spend,
            min_items,
            discount_type,
            discount_value,
            target_type,
            target_value,
        ])

        console.log(`新增 ${code} 成功`)

        res.status(201).json({
            status: 'success',
            data: {},
            message: `新增 ${code} 成功`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '新增優惠卷失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 後臺取得Code優惠卷
router.get('/admin/edit/:code', async (req, res) => {
    try {
        const code = req.params.code
        console.log(code)

        if (!code) {
            const err = new Error('請提供優惠券 CODE')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 檢查優惠碼存在
        const coupon = await checkCoupon(code)

        console.log(`取得 ${code} 資料成功`)

        res.status(201).json({
            status: 'success',
            data: coupon,
            message: `取得 ${code} 資料成功`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '取得優惠卷失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 後臺修改優惠卷
router.post('/admin/edit/:code', async (req, res) => {
    try {
        const {
            name,
            code,
            content,
            start_at,
            end_at,
            validity_days,
            status,
            total_quantity,
            usage_limit,
            min_spend,
            min_items,
            discount_type,
            discount_value,
            target_type,
            target_value,
        } = req.body

        console.log(code)

        // 檢查必填欄位
        if (!name || !code) {
            const err = new Error('請提供完整的使用者資訊 (名稱、代碼為必填)')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 檢查優惠碼存在
        const coupon = await checkCoupon(code)

        // 建立 SQL 語法 - UPDATE
        const sql = `
            UPDATE coupons
            SET
                name = ?,
                content = ?,
                start_at = ?,
                end_at = ?,
                validity_days = ?,
                status = ?,
                total_quantity = ?,
                usage_limit = ?,
                min_spend = ?,
                min_items = ?,
                discount_type = ?,
                discount_value = ?,
                target_type = ?,
                target_value = ?
            WHERE code = ?
        `

        await connection.execute(sql, [
            name,
            content,
            start_at,
            end_at,
            validity_days,
            status,
            total_quantity,
            usage_limit,
            min_spend,
            min_items,
            discount_type,
            discount_value,
            target_type,
            target_value,
            code, // 注意：這裡的 code 是 WHERE 條件
        ])

        console.log(`修改 ${name} 成功`)

        res.status(201).json({
            status: 'success',
            data: {},
            message: `修改 ${name} 成功`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '新增優惠卷失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 後臺啟/停用所選優惠卷
router.post('/admin/status/all', async (req, res) => {
    try {
        const { codes, status } = req.body

        // 1. 檢查 codes 陣列和 status 是否提供
        if (!Array.isArray(codes) || codes.length === 0 || !status) {
            return res.status(400).json({
                status: 'fail',
                message: '請提供要更新的優惠代碼陣列和狀態',
            })
        }

        // 2. 查詢實際存在的優惠碼
        const placeholders = codes.map(() => '?').join(', ')
        const findExistingSql = `
            SELECT code, status 
            FROM coupons
            WHERE code IN (${placeholders});
        `
        const [existingCoupons] = await connection.execute(findExistingSql, codes)

        // 分類優惠碼
        const existingCodes = existingCoupons.map((coupon) => coupon.code)
        const unchangedCodes = existingCoupons.filter((coupon) => coupon.status === status).map((coupon) => coupon.code)
        const updatableCodes = existingCoupons.filter((coupon) => coupon.status !== status).map((coupon) => coupon.code)
        const notFoundCodes = codes.filter((code) => !existingCodes.includes(code))

        let updatedCount = 0
        if (updatableCodes.length > 0) {
            // 執行批量更新
            const updatePlaceholders = updatableCodes.map(() => '?').join(', ')
            const updateSql = `
                UPDATE coupons
                SET status = ?
                WHERE code IN (${updatePlaceholders});
            `
            const [result] = await connection.execute(updateSql, [status, ...updatableCodes])
            updatedCount = result.affectedRows
        }

        // 整合並回傳資訊
        const totalCodes = codes.length
        const unchangedCount = unchangedCodes.length
        const notFoundCount = notFoundCodes.length

        const message = `總共 ${totalCodes} 張優惠券：成功更新 ${updatedCount} 張`
        console.log(message)

        res.status(200).json({
            status: 'success',
            message: message,
            data: {
                total_codes: totalCodes,
                updated_count: updatedCount,
                unchanged_count: unchangedCount,
                not_found_count: notFoundCount,
                not_found_codes: notFoundCodes, // 如果需要，也可以回傳詳細列表
            },
        })
    } catch (error) {
        // 捕獲錯誤
        console.error(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '批量更新優惠券狀態失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 後臺下架所選優惠卷
router.post('/admin/valid/all', async (req, res) => {
    try {
        const { codes } = req.body

        // 檢查優惠碼是否提供
        if (!Array.isArray(codes) || codes.length === 0) {
            return res.status(400).json({
                status: 'fail',
                message: '請提供要更新的優惠代碼陣列',
            })
        }

        // 2. 建立批量更新的 SQL 語法
        const placeholders = codes.map(() => '?').join(', ')
        const validSql = `
            UPDATE coupons
            SET is_valid = 0
            WHERE code IN (${placeholders});
        `

        // 3. 執行批量下架
        const [result] = await connection.execute(validSql, codes)
        const affectedRows = result.affectedRows

        console.log(`成功下架 ${affectedRows} 張優惠券`)

        res.status(200).json({
            status: 'success',
            message: `成功下架 ${affectedRows} 張優惠券`,
            data: { updated_count: affectedRows },
        })
    } catch (error) {
        // 捕獲錯誤
        console.error(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '優惠卷下架失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 後臺啟/停用優惠卷
router.post('/admin/status', async (req, res) => {
    try {
        const { code } = req.body

        // 檢查優惠碼是否提供
        if (!code) {
            const err = new Error('請提供優惠代碼')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 查詢當前狀態
        const checkSql = `
            SELECT name,status 
            FROM coupons
            WHERE code = ? 
        `
        const [checkResult] = await connection.execute(checkSql, [code])
        const coupon = checkResult[0]

        // 如果找不到優惠券，回傳錯誤
        if (!coupon) {
            const err = new Error('優惠代碼不存在')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        // 根據當前狀態決定新的狀態
        const newStatus = coupon.status === 'active' ? 'inactive' : 'active'

        // 建立更新 SQL 語法
        const updateSql = `
            UPDATE coupons
            SET status = ?
            WHERE code = ?
        `
        let StatusName
        if (newStatus == 'active') {
            StatusName = '發放中'
        } else {
            StatusName = '停止發放'
        }

        await connection.execute(updateSql, [newStatus, code])

        console.log(`更新優惠碼 ${code} 的狀態為 ${newStatus} 成功`)

        res.status(200).json({
            status: 'success',
            message: `優惠碼 ${coupon.name} 的狀態
            已成功切換為 ${StatusName}`,
            data: { newStatus },
        })
    } catch (error) {
        // 捕獲錯誤
        console.error(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '更新優惠卷狀態失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 後臺上/下架優惠卷
router.post('/admin/valid', async (req, res) => {
    try {
        const { code } = req.body

        // 檢查優惠碼是否提供
        if (!code) {
            const err = new Error('請提供優惠代碼')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        const coupon = await checkCoupon(code)

        // 建立更新 SQL 語法
        const validSql = `
            UPDATE coupons
            SET is_valid = 0
            WHERE code = ?
        `

        await connection.execute(validSql, [code])

        // const newStatus = 0 // 下架狀態為 0

        console.log(`下架優惠碼 ${code} 成功`)

        res.status(200).json({
            status: 'success',
            message: `下架優惠碼 ${code} 成功`,
            // data: { newStatus },
        })
    } catch (error) {
        // 捕獲錯誤
        console.error(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '優惠卷下架失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 獲取頁面優惠卷
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 12
        const offset = (page - 1) * limit
        const tg_type = req.query.tg_type || 'a'
        const tg_class = req.query.tg_class || 'a'
        const account = req.query.account || ''

        // 動態建構 WHERE 條件
        let whereConditions = []
        let queryParams = []

        if (tg_type != 'a') {
            if (tg_type === 'fixed' || tg_type === 'percent' || tg_type === 'free_shipping') {
                whereConditions.push('c.discount_type = ?')
                queryParams.push(tg_type)
            }
            if (tg_type === 'limit') {
                whereConditions.push('c.total_quantity > 0')
            }
        }

        if (tg_class != 'a') {
            whereConditions.push('c.target_value = ?')
            queryParams.push(tg_class)
        }

        const whereClause = whereConditions.length > 0 ? ` AND ${whereConditions.join(' AND ')}` : ''

        const sql = `
                   SELECT
                        c.id,
                        uc.user_account,
                        c.name,
                        c.code,
                        c.end_at,
                        c.total_quantity,
                        c.usage_limit,
                        c.discount_type,
                        c.discount_value,
                        c.target_type,
                        c.target_value,
                        CASE WHEN uc.user_account IS NULL THEN 0 ELSE 1 END AS has_coupon
                    FROM coupons c
                    LEFT JOIN user_coupons uc
                        ON c.code = uc.coupon_code
                        AND uc.user_account = ?
                    WHERE c.target_type IN ('all', 'product')
                    AND NOW() BETWEEN c.start_at AND c.end_at
                    AND c.is_valid = 1
                    AND c.status = 'active'
                    ${whereClause}
                    ORDER BY c.id
                    LIMIT ? OFFSET ?;
                `

        // 查總數 (沒有 LIMIT/OFFSET)
        const countSql = `
            SELECT COUNT(*) AS total
            FROM coupons c
            WHERE c.target_type IN ('all', 'product')
                AND NOW() BETWEEN c.start_at AND c.end_at
                AND c.status = 'active'
                AND c.is_valid = 1
                ${whereClause};
            `

        let [coupons] = await connection.execute(sql, [account, ...queryParams, limit, offset])
        const [countRows] = await connection.execute(countSql, queryParams)

        const total = countRows[0].total
        const totalPages = Math.ceil(total / limit)

        console.log(`共 ${total} 張優惠卷`)
        console.log(`共 ${totalPages} 頁優惠卷`)

        res.status(200).json({
            status: 'success',
            data: coupons,
            message: `共 ${coupons.length} 優惠卷`,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 使用者獲得所有篩選優惠卷
router.post('/:account/all', checkToken, async (req, res) => {
    try {
        const account = req.params.account
        console.log(account)
        const tg_type = req.query.tg_type || 'a'
        const tg_class = req.query.tg_class || 'a'

        const user = await checkUser(account)

        // 動態建構 WHERE 條件
        let whereConditions = []
        let queryParams = []

        if (tg_type != 'a') {
            if (tg_type === 'fixed' || tg_type === 'percent' || tg_type === 'free_shipping') {
                whereConditions.push('c.discount_type = ?')
                queryParams.push(tg_type)
            }
            if (tg_type === 'limit') {
                whereConditions.push('c.total_quantity > 0')
            }
        }

        if (tg_class != 'a') {
            whereConditions.push('c.target_value = ?')
            queryParams.push(tg_class)
        }

        const whereClause = whereConditions.length > 0 ? ` AND ${whereConditions.join(' AND ')}` : ''

        // 獲得頁面優惠卷
        const sql = `
                    SELECT
                        uc.user_account,
                        c.*,
                        CASE WHEN uc.coupon_code IS NULL THEN 0 ELSE 1 END AS has_coupon
                    FROM coupons c
                    LEFT JOIN user_coupons uc
                        ON c.code = uc.coupon_code
                    AND uc.user_account = ?
                    WHERE c.target_type IN ('all', 'product')
                    AND NOW() BETWEEN c.start_at AND c.end_at
                    AND c.status = 'active'
                    AND c.is_valid = 1
                    ${whereClause};
                `

        let [coupons] = await connection.execute(sql, [account, ...queryParams])

        // 如果沒有可領取的優惠券
        if (!coupons.length) {
            const err = new Error('沒有可領取的優惠券')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        // 領取優惠券
        const insertSQL = `
            INSERT INTO user_coupons
                (user_account, coupon_code, remaining_uses, expires_at, calculation)
            VALUES (?, ?, ?, ?, ?)
        `

        let inserted = []

        for (let coupon of coupons) {
            if (coupon.has_coupon) continue // 已領取 → 跳過

            let expiresAt
            if (coupon.validity_days > 0) {
                // validity_days 優先
                const now = new Date()
                now.setDate(now.getDate() + coupon.validity_days)
                expiresAt = now
            } else {
                // 否則使用 end_at
                expiresAt = coupon.end_at
            }

            const decrementQty = await decrementCouponQty(coupon.code)

            // 計算 calculation
            let calculation =
                coupon.discount_type === 'percent'
                    ? `*0.${coupon.discount_value}` // 注意這裡改為反引號 ``
                    : `-${coupon.discount_value}` // 注意這裡改為反引號 ``

            // 插入 user_coupons
            await connection.execute(insertSQL, [account, coupon.code, coupon.usage_limit, expiresAt, calculation])

            inserted.push(coupon) // 收集成功新增的優惠券
        }
        if (inserted.length == 0) {
            const err = new Error('已領取過所有優惠券')
            err.code = 404
            err.status = 'fail'
            throw err
        }
        console.log(`${account} 獲得 ${inserted.length} 張優惠卷`)

        res.status(201).json({
            status: 'success',
            data: inserted,
            message: `${account} 獲得 ${inserted.length} 張優惠卷`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '使用者新增優惠卷失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 使用者新增優惠卷
router.post('/:account/:code', async (req, res) => {
    try {
        const account = req.params.account
        const code = req.params.code

        console.log(account)
        console.log(code)

        // > 檢查 account 有沒有優惠卷
        const sqlCheck1 = 'SELECT * FROM `user_coupons` WHERE `user_account` = ? and coupon_code = ?;'
        let user_coupons = await connection.execute(sqlCheck1, [account, code]).then(([result]) => {
            return result[0]
        })
        if (user_coupons) {
            const err = new Error('此帳號已領取')
            err.code = 409
            err.status = 'fail'
            throw err
        }

        const user = await checkUser(account)
        const coupon = await checkCoupon(code)
        const decrementQty = await decrementCouponQty(code)
        let sql
        // 建立 SQL 語法 - user_coupons
        sql = `INSERT INTO user_coupons (user_account, coupon_code, remaining_uses, expires_at, calculation) VALUES (?, ?, ?, ? ,?)`

        let calculation
        if (coupon.discount_type == 'percent') {
            calculation = '*0.' + coupon.discount_value
        } else {
            calculation = '-' + coupon.discount_value
        }

        // ! 檢查coupon.validity_days
        let expiresAt
        if (coupon.validity_days > 0) {
            // validity_days 優先
            const now = new Date()
            now.setDate(now.getDate() + coupon.validity_days)
            expiresAt = now
        } else {
            // 否則使用 end_at
            expiresAt = coupon.end_at
        }

        const result = await connection.execute(sql, [
            user.account,
            coupon.code,
            coupon.usage_limit,
            expiresAt,
            calculation,
        ])

        console.log(`${account} 獲得 ${coupon.name}`)

        res.status(201).json({
            status: 'success',
            data: coupon,
            message: `${account} 獲得 ${coupon.name}`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '使用者新增優惠卷失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

//宋做的修改：購物車獲取使用者可用優惠卷
// ! 根據優惠券代碼獲取詳細資訊 (不需要認證，因為只是獲取公開的優惠券資訊)
router.get('/details', async (req, res) => {
    try {
        const codes = req.query.codes
        if (!codes) {
            const err = new Error('請提供優惠券代碼')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        const codeList = codes.split(',').map((code) => code.trim())
        const placeholders = codeList.map(() => '?').join(',')

        const sql = `
            SELECT
                id,
                name,
                code,
                content,
                discount_type,
                discount_value,
                min_spend,
                min_items,
                target_type,
                target_value,
                start_at,
                end_at,
                status,
                is_valid
            FROM coupons
            WHERE code IN (${placeholders})
            AND is_valid = 1
        `

        const [coupons] = await connection.execute(sql, codeList)

        res.status(200).json({
            status: 'success',
            data: coupons,
            message: `成功獲取 ${coupons.length} 張優惠券詳細資訊`,
        })
    } catch (error) {
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '獲取優惠券詳細資訊失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 獲取使用者區塊的優惠卷
router.get('/:account', checkToken, async (req, res) => {
    try {
        const account = req.params.account
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 4
        const offset = (page - 1) * limit
        const user_type = req.query.user_type || 'a'

        console.log(account)
        console.log(user_type)

        if (!account) {
            const err = new Error('請提供使用者 ID')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        const user = await checkUser(account)

        let sql, countSql, params

        if (user_type === 'used') {
            // 已使用優惠券的查詢
            sql = `
                SELECT
                    c.name,
                    c.content,
                    c.code,
                    c.min_spend,
                    c.min_items,
                    c.target_type,
                    c.target_value,
                    c.discount_type,
                    c.discount_value,
                    cu.order_id,
                    cu.used_at
                FROM coupon_usages AS cu
                JOIN coupons AS c ON cu.coupon_code = c.code
                WHERE cu.user_account = ?
                AND cu.used_at > NOW() - INTERVAL 90 DAY
                ORDER BY cu.used_at DESC
                LIMIT ? OFFSET ?;
            `
            countSql = `
                SELECT COUNT(*) AS total
                FROM coupon_usages
                WHERE user_account = ? AND used_at > NOW() - INTERVAL 90 DAY;
            `
            params = [account, limit, offset]
        } else {
            // 處理未使用的（Active 或 Expired）優惠券
            let whereConditions = []

            // ! Expired 過期
            if (user_type === 'Expired') {
                whereConditions.push('uc.expires_at < NOW()')
                whereConditions.push('uc.expires_at >= NOW() - INTERVAL 90 DAY')
            } else {
                // 預設為有效的優惠券 (Active)
                whereConditions.push('NOW() < uc.expires_at')
            }

            const whereClause = whereConditions.length > 0 ? ` AND ${whereConditions.join(' AND ')}` : ''

            sql = `
                SELECT
                    c.name,
                    c.code,
                    c.content,
                    c.min_spend,
                    c.min_items,
                    c.target_type,
                    c.target_value,
                    c.discount_type,
                    c.discount_value,
                    uc.remaining_uses,
                    uc.claimed_at,
                    uc.expires_at
                FROM user_coupons as uc
                JOIN coupons AS c ON uc.coupon_code = c.code
                WHERE uc.user_account = ?
                AND (uc.remaining_uses > 0 OR uc.remaining_uses = -1)
                AND uc.is_valid = 1
                ${whereClause}
                ORDER BY uc.expires_at ASC
                LIMIT ? OFFSET ?;
            `
            countSql = `
                SELECT COUNT(*) AS total
                FROM user_coupons as uc
                WHERE uc.user_account = ?
                AND (uc.remaining_uses > 0 OR uc.remaining_uses = -1)
                AND uc.is_valid = 1
                ${whereClause};
            `
            params = [account, limit, offset]
        }

        let [coupons] = await connection.execute(sql, params)
        const [countRows] = await connection.execute(countSql, [account])

        const total = countRows[0].total
        const totalPages = Math.ceil(total / limit)

        console.log(`共 ${total} 張優惠卷`)
        console.log(`共 ${totalPages} 頁優惠卷`)
        console.log(`${account} 有 ${coupons.length} 張 ${user_type}優惠卷`)

        res.status(200).json({
            status: 'success',
            data: coupons,
            message: `${account} 有 ${coupons.length} 張 ${user_type}優惠卷`,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 購物車獲取使用者可用優惠卷 缺少coupon資料
router.get('/active/:account', checkToken, async (req, res) => {
    try {
        const account = req.params.account

        console.log(account)

        if (!account) {
            const err = new Error('請提供使用者 ID')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        const user = await checkUser(account)

        let sql = `
                SELECT * FROM user_coupons
                WHERE user_account = ?
                AND
                    (remaining_uses > 0 OR remaining_uses = -1)
                AND
                    Now() < expires_at
                AND
                    is_valid = 1
                ORDER BY expires_at ASC;
            `

        let [coupons] = await connection.execute(sql, [account])

        console.log(`${account} 有 ${coupons.length} 張 可使用優惠卷`)

        res.status(200).json({
            status: 'success',
            data: coupons,
            message: `${account} 有 ${coupons.length} 張 可使用優惠卷`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

//  ! 紀錄優惠卷使用
router.post('/:account/:code/:cart', checkToken, async (req, res) => {
    try {
        const account = req.params.account
        const code = req.params.code
        const cart = req.params.cart

        console.log(account, code, cart)

        /// 依序檢查
        const user = await checkUser(account)
        const coupon = await checkCoupon(code)
        const userCoupon = await checkUserCoupon(account, code)

        // ! 檢查 購物車是否符合優惠卷

        // ! 檢查 account否為使用者

        // 扣除剩餘使用次數
        await decrementCouponUse(account, code)

        // 建立 SQL 語法 - user_coupons
        const sql = `INSERT INTO coupon_usages (id,coupon_code,user_account,order_id) VALUES (?, ?, ?, ?)`

        function getRandom8Digits() {
            return Math.floor(10000000 + Math.random() * 90000000)
        }
        let id = code + getRandom8Digits()

        await connection.execute(sql, [id, code, account, cart])

        console.log(`${account} 使用 ${code}`)

        res.status(201).json({
            status: 'success',
            data: {},
            message: `${account} 使用 ${code}`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '使用者新增優惠卷失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ! 後台管理專用：獲取所有優惠券
router.get('/admin/all', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const offset = (page - 1) * limit

        // 搜尋參數
        const search = req.query.search || ''
        const searchType = req.query.searchType || 'all' // 'all', 'name', 'code', 'content'

        // 篩選參數
        const status = req.query.status || 'all' // 'all', 'active', 'inactive'
        const discountType = req.query.discountType || 'all' // 'all', 'fixed', 'percent', 'free_shipping'
        const targetType = req.query.targetType || 'all' // 'all', 'all', 'product'
        const targetValue = req.query.targetValue || 'all' // 'all', 'a', 'b', 'c'

        // 排序參數
        const sortBy = req.query.sortBy || 'id' // 'id', 'name', 'code', 'created_at', 'start_at', 'end_at'
        const sortOrder = req.query.sortOrder || 'DESC' // 'ASC' 或 'DESC'

        // 動態建構 WHERE 條件
        let whereConditions = []
        let queryParams = []

        // 搜尋條件
        if (search) {
            if (searchType === 'all') {
                whereConditions.push('(c.name LIKE ? OR c.code LIKE ? OR c.content LIKE ?)')
                queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
            } else if (searchType === 'name') {
                whereConditions.push('c.name LIKE ?')
                queryParams.push(`%${search}%`)
            } else if (searchType === 'code') {
                whereConditions.push('c.code LIKE ?')
                queryParams.push(`%${search}%`)
            } else if (searchType === 'content') {
                whereConditions.push('c.content LIKE ?')
                queryParams.push(`%${search}%`)
            }
        }

        // 狀態篩選
        if (status !== 'all') {
            whereConditions.push('c.status = ?')
            queryParams.push(status)
        }

        // 折扣類型篩選
        if (discountType !== 'all') {
            whereConditions.push('c.discount_type = ?')
            queryParams.push(discountType)
        }

        // 目標類型篩選
        if (targetType !== 'all') {
            whereConditions.push('c.target_type = ?')
            queryParams.push(targetType)
        }

        // 目標值篩選
        if (targetValue !== 'all') {
            whereConditions.push('c.target_value = ?')
            queryParams.push(targetValue)
        }

        const whereClause = whereConditions.length > 0 ? ` AND ${whereConditions.join(' AND ')}` : ''

        // 排序條件
        const validSortColumns = [
            'id',
            'name',
            'code',
            'created_at',
            'start_at',
            'end_at',
            'total_quantity',
            'usage_limit',
        ]
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'id'
        const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

        // 主要查詢 SQL
        const sql = `
            SELECT
                c.id,
                c.name,
                c.code,
                c.content,
                c.discount_type,
                c.discount_value,
                c.target_type,
                c.target_value,
                c.min_spend,
                c.total_quantity,
                c.usage_limit,
                c.validity_days,
                c.start_at,
                c.end_at,
                c.status,
                c.is_valid,
                c.created_at,
                c.updated_at,
                -- 統計資訊
                COALESCE(usage_stats.used_count, 0) as used_count,
                COALESCE(user_stats.user_count, 0) as user_count
            FROM coupons c
            LEFT JOIN (
                SELECT
                    coupon_code,
                    COUNT(*) as used_count
                FROM coupon_usages
                GROUP BY coupon_code
            ) usage_stats ON c.code = usage_stats.coupon_code
            LEFT JOIN (
                SELECT
                    coupon_code,
                    COUNT(*) as user_count
                FROM user_coupons
                GROUP BY coupon_code
            ) user_stats ON c.code = user_stats.coupon_code
            WHERE 1=1 ${whereClause}
            AND c.is_valid = 1
            ORDER BY c.${sortColumn} ${orderDirection}
            LIMIT ? OFFSET ?
        `

        // 計算總數的 SQL
        const countSql = `
            SELECT COUNT(*) AS total
            FROM coupons c
            WHERE 1=1 ${whereClause}
            AND c.is_valid = 1
        `

        // 執行查詢
        const [coupons] = await connection.execute(sql, [...queryParams, limit, offset])
        const [countRows] = await connection.execute(countSql, queryParams)

        const total = countRows[0].total
        const totalPages = Math.ceil(total / limit)

        // 格式化資料以符合前端需求
        const formattedCoupons = coupons.map((coupon) => ({
            id: coupon.id,
            name: coupon.name,
            code: coupon.code,
            content: coupon.content,
            discountType: coupon.discount_type,
            discountValue: coupon.discount_value,
            targetType: coupon.target_type,
            targetValue: coupon.target_value,
            minSpend: coupon.min_spend,
            totalQuantity: coupon.total_quantity,
            usageLimit: coupon.usage_limit,
            validityDays: coupon.validity_days,
            startAt: coupon.start_at,
            endAt: coupon.end_at,
            status: coupon.status,
            isValid: coupon.is_valid,
            createdAt: coupon.created_at,
            updatedAt: coupon.updated_at,
            usedCount: coupon.used_count,
            userCount: coupon.user_count,
            // 計算剩餘數量
            remainingQuantity:
                coupon.total_quantity === -1 ? -1 : Math.max(0, coupon.total_quantity - coupon.used_count),
            // 計算使用率
            usageRate:
                coupon.total_quantity === -1
                    ? 0
                    : coupon.total_quantity === 0
                    ? 0
                    : Math.round((coupon.used_count / coupon.total_quantity) * 100),
        }))

        console.log(`後台管理：共 ${total} 張優惠券`)
        console.log(`後台管理：共 ${totalPages} 頁優惠券`)

        res.status(200).json({
            status: 'success',
            data: formattedCoupons,
            message: `成功獲取 ${formattedCoupons.length} 張優惠券`,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
            filters: {
                search,
                searchType,
                status,
                discountType,
                targetType,
                targetValue,
                sortBy,
                sortOrder,
            },
        })
    } catch (error) {
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '後台管理獲取優惠券失敗'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 後台管理專用：獲取優惠券總數
router.get('/admin/count', async (req, res) => {
    try {
        const sql = 'SELECT COUNT(*) as total FROM coupons WHERE is_valid = 1'
        const [result] = await connection.execute(sql)
        const total = result[0].total

        res.status(200).json({
            status: 'success',
            data: { total },
            message: `總優惠券數：${total} 張`,
        })
    } catch (error) {
        console.error('獲取優惠券總數錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '獲取優惠券總數失敗',
        })
    }
})

export default router
