import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import multer from 'multer'
import connection from '../connect.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import serverConfig from '../config/server.config.js'
import { sendOtpMail, sendForgotPasswordOtpMail } from '../lib/mail.js'
import { generateTOTP, verifyTOTP, generateRandomOTP, generateHash, isOTPExpired, canResendOTP } from '../lib/otp.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const secretKey = process.env.JWT_SECRET_KEY
const router = express.Router()

// 檢查 JWT Token 的中間件函數
function checkToken(req, res, next) {
    try {
        let token = req.get('Authorization')

        // 檢查 token 是否存在
        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: '無登入驗證資料，請重新登入',
                code: 'NO_TOKEN',
            })
        }

        if (!token.includes('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'Token 格式錯誤，請重新登入',
                code: 'INVALID_TOKEN_FORMAT',
            })
        }

        token = token.slice(7)

        // 檢查 token 是否為空或過短
        if (!token || token.length < 10) {
            return res.status(401).json({
                status: 'error',
                message: 'Token 無效，請重新登入',
                code: 'EMPTY_TOKEN',
            })
        }

        // 檢查 secretKey 是否存在
        if (!secretKey) {
            console.error('Token 檢查失敗: JWT_SECRET_KEY 未設定')
            return res.status(500).json({
                status: 'error',
                message: '系統配置錯誤，請洽管理人員',
                code: 'TOKEN_SYSTEM_ERROR',
            })
        }

        jwt.verify(token, secretKey, (error, decoded) => {
            if (error) {
                // 根據不同錯誤類型返回對應的錯誤訊息
                let errorMessage = '登入驗證失效，請重新登入'
                let errorCode = 'TOKEN_INVALID'

                if (error.name === 'TokenExpiredError') {
                    errorMessage = '登入已過期，請重新登入'
                    errorCode = 'TOKEN_EXPIRED'
                } else if (error.name === 'JsonWebTokenError') {
                    errorMessage = '登入憑證無效，請重新登入'
                    errorCode = 'TOKEN_MALFORMED'
                }

                return res.status(401).json({
                    status: 'error',
                    message: errorMessage,
                    code: errorCode,
                })
            }

            // 檢查 decoded 內容是否完整
            if (!decoded || !decoded.account || !decoded.id) {
                return res.status(401).json({
                    status: 'error',
                    message: '登入憑證資料不完整，請重新登入',
                    code: 'TOKEN_INCOMPLETE',
                })
            }

            req.decoded = decoded
            next()
        })
    } catch (error) {
        console.error('Token 檢查未預期錯誤:', error)
        return res.status(500).json({
            status: 'error',
            message: 'Token 驗證系統錯誤，請稍後再試',
            code: 'TOKEN_SYSTEM_ERROR',
        })
    }
}

// 新增：系統狀態檢查路由（用於除錯）
router.get('/system-status', async (req, res) => {
    try {
        const status = {
            timestamp: new Date().toISOString(),
            jwt_secret_key: secretKey ? '已設定' : '未設定',
            database_connection: 'unknown',
            environment: process.env.NODE_ENV || 'development',
        }

        // 檢查資料庫連線
        try {
            await connection.execute('SELECT 1')
            status.database_connection = '正常'
        } catch (dbError) {
            status.database_connection = `錯誤: ${dbError.message}`
        }

        res.status(200).json({
            status: 'success',
            message: '系統狀態檢查完成',
            data: status,
        })
    } catch (error) {
        console.error('系統狀態檢查錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '系統狀態檢查失敗',
            code: 'SYSTEM_STATUS_ERROR',
        })
    }
})

// 新增：簡化版狀態檢查路由（用於診斷）
router.post('/status-simple', checkToken, async (req, res) => {
    try {
        const { account, id } = req.decoded

        if (!account || !id) {
            return res.status(401).json({
                status: 'error',
                message: '登入憑證資料不完整，請重新登入',
                code: 'STATUS_SIMPLE_DECODED_INCOMPLETE',
            })
        }

        // 簡單回應，不進行資料庫查詢
        res.status(200).json({
            status: 'success',
            message: '簡化版狀態檢查成功',
            data: {
                account,
                id,
                timestamp: new Date().toISOString(),
                message: 'Token 驗證成功，但跳過資料庫查詢',
            },
        })
    } catch (error) {
        console.error('簡化版狀態檢查錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '簡化版狀態檢查失敗',
            error: error.message,
        })
    }
})

// 獲取所有使用者
router.get('/', async (req, res) => {
    try {
        const sql = 'SELECT * FROM `users`;'
        let [users] = await connection.execute(sql)

        res.status(200).json({
            status: 'success',
            data: users,
            message: '已獲取所有使用者名單',
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

// 模糊搜尋使用者名單
router.get('/search', async (req, res) => {
    try {
        const key = req.query.key
        if (!key) {
            const err = new Error('請提供搜尋關鍵字')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 搜尋使用者 (根據帳號、郵箱、姓名、暱稱或頭像)
        const sql = `
        SELECT id, account, email, name, nickname, img, level, points, created_at 
        FROM users 
        WHERE account LIKE ? 
           OR email LIKE ? 
           OR name LIKE ? 
           OR nickname LIKE ?
           OR img LIKE ?
           OR level LIKE ?
        LIMIT 20 
      `
        //LIMIT 20最多只返回 20 筆 搜尋結果

        const searchPattern = `%${key}%`
        const [users] = await connection.execute(sql, [
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
        ])

        res.status(200).json({
            status: 'success',
            data: {
                key,
                users,
                count: users.length,
            },
            message: `搜尋到 ${users.length} 個使用者`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '搜尋失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 獲取特定的使用者
router.get('/:id', async (req, res) => {
    try {
        const account = req.params.id
        if (!account) {
            const err = new Error('請提供使用者 ID')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        const sqlCheck1 = 'SELECT * FROM `users` WHERE `account` = ?;'
        let user = await connection.execute(sqlCheck1, [account]).then(([result]) => {
            return result[0]
        })
        if (!user) {
            const err = new Error('找不到使用者')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        const { id, password, ...data } = user

        res.status(200).json({
            status: 'success',
            data,
            message: '查詢成功',
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

// 新增一個使用者
router.post('/', async (req, res) => {
    try {
        // 取得表單中的欄位內容
        const { name, nickname, account, password, email, phone, birthday, gender } = req.body

        // 檢查必填欄位（email 改為非必填）
        if (!name || !account || !password) {
            const err = new Error('請提供完整的使用者資訊 (姓名、帳號、密碼為必填)')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 聯絡信箱：若未提供則使用 account
        const contactEmail = email || account

        // 檢查 account 有沒有使用過
        const sqlCheck1 = 'SELECT * FROM `users` WHERE `account` = ?;'
        let user = await connection.execute(sqlCheck1, [account]).then(([result]) => {
            return result[0]
        })
        if (user) {
            const err = new Error('此帳號已被使用')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 檢查 email 有沒有使用過（使用 contactEmail）
        const sqlCheck2 = 'SELECT * FROM `users` WHERE `email` = ?;'
        user = await connection.execute(sqlCheck2, [contactEmail]).then(([result]) => {
            return result[0]
        })
        if (user) {
            const err = new Error('此信箱已被使用')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 生成預設頭像檔名
        const img = getDefaultAvatar()
        // 把密碼加密
        const hashedPassword = await bcrypt.hash(password, 10)

        const sql = `
        INSERT INTO users (
          name, nickname, account, password, email, phone, 
          birthday, gender, img, level, points, email_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

        await connection.execute(sql, [
            name, // 姓名 (必填)
            nickname || null, // 暱稱 (選填)
            account, // 帳號 (必填)
            hashedPassword, // 加密密碼 (必填)
            contactEmail, // 聯絡信箱（可選，預設使用 account）
            phone || null, // 手機號碼 (選填)
            birthday || null, // 生日 (選填)
            gender || null, // 性別 (選填)
            img, // 頭像
            '一般會員', // 預設會員等級
            0, // 預設點數
            1, // 已驗證的email（流程已先驗證帳號）
        ])

        res.status(201).json({
            status: 'success',
            data: {},
            message: '新增使用者成功',
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '註冊失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 創建 SMTP 傳輸器
const createTransporter = () => {
    const { smtp } = serverConfig

    if (smtp.provider === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
        })
    } else if (smtp.provider === 'ethereal') {
        return nodemailer.createTransport({
            host: smtp.host,
            port: 587,
            secure: false,
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
        })
    }

    throw new Error(`不支援的 SMTP 提供者: ${smtp.provider}`)
}

// 驗證碼存儲（生產環境應該使用 Redis）
const verificationCodes = new Map()

// 發送驗證碼到信箱
router.post('/send-verification', async (req, res) => {
    try {
        const { email, name } = req.body

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: '請提供信箱地址',
            })
        }

        // 檢查信箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: '請提供正確的信箱格式',
            })
        }

        // 檢查帳號是否已被使用
        const sqlCheck = 'SELECT * FROM `users` WHERE `account` = ?;'
        const [existingUsers] = await connection.execute(sqlCheck, [email])

        if (existingUsers.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: '此帳號已被使用',
            })
        }

        // 生成6位數驗證碼
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

        try {
            // 發送註冊驗證碼郵件（集中 mail.js）
            await sendOtpMail(email, verificationCode, name || email)

            // 儲存驗證碼（10分鐘後過期）
            verificationCodes.set(email, {
                code: verificationCode,
                timestamp: Date.now(),
                attempts: 0,
            })

            // 10分鐘後自動清除驗證碼
            setTimeout(() => {
                verificationCodes.delete(email)
            }, 10 * 60 * 1000)

            console.log(`驗證碼已發送到 ${email}: ${verificationCode}`)

            res.json({
                status: 'success',
                message: '驗證碼已發送到您的信箱',
                data: {
                    email: email,
                },
            })
        } catch (emailError) {
            console.error('郵件發送失敗:', emailError)
            return res.status(500).json({
                status: 'error',
                message: '郵件發送失敗，請稍後再試',
            })
        }
    } catch (error) {
        console.error('發送驗證碼錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '發送驗證碼失敗，請稍後再試',
        })
    }
})

// 驗證信箱驗證碼
router.post('/verify-email', async (req, res) => {
    try {
        const { email, verificationCode } = req.body

        if (!email || !verificationCode) {
            return res.status(400).json({
                status: 'error',
                message: '請提供信箱和驗證碼',
            })
        }

        // 檢查驗證碼是否存在
        const storedData = verificationCodes.get(email)
        if (!storedData) {
            return res.status(400).json({
                status: 'error',
                message: '驗證碼已過期或不存在，請重新發送',
            })
        }

        // 檢查驗證碼是否正確
        if (storedData.code !== verificationCode) {
            // 增加嘗試次數
            storedData.attempts += 1
            verificationCodes.set(email, storedData)

            // 如果嘗試次數超過5次，清除驗證碼
            if (storedData.attempts >= 5) {
                verificationCodes.delete(email)
                return res.status(400).json({
                    status: 'error',
                    message: '驗證失敗次數過多，請重新發送驗證碼',
                })
            }

            return res.status(400).json({
                status: 'error',
                message: '驗證碼錯誤，請重新輸入',
            })
        }

        // 驗證成功，清除驗證碼
        verificationCodes.delete(email)

        console.log(`驗證碼驗證成功: ${email} - ${verificationCode}`)

        res.json({
            status: 'success',
            message: '信箱驗證成功',
            data: {
                email: email,
                verified: true,
            },
        })
    } catch (error) {
        console.error('驗證碼驗證錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '驗證失敗，請稍後再試',
        })
    }
})

// 更新(特定 ID 的)使用者
router.put('/:id', checkToken, async (req, res) => {
    try {
        // 取得表單中的欄位內容
        const userId = req.params.id
        const { password, name, nickname, email, phone, birthday, gender, img, level, points } = req.body

        // 檢查至少要有一個欄位有資料
        if (!password && !name && !nickname && !email && !phone && !birthday && !gender && !img && !level && !points) {
            const err = new Error('請至少提供一個要更新的資料')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 先取得使用者資訊（用於顯示）
        const getUserSql = 'SELECT name, account FROM users WHERE id = ?'
        const [userResult] = await connection.execute(getUserSql, [userId])
        const userName = userResult[0]?.name || '未知使用者'
        const userAccount = userResult[0]?.account || '未知帳號'

        let updateFields = [] // 用陣列來記錄要更新的欄位
        let values = [] // 用陣列來記錄要更新的欄位的值
        let changedFields = [] // 記錄實際變更的欄位名稱

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10)
            updateFields.push('password = ?')
            values.push(hashedPassword)
            changedFields.push('密碼')
        }

        if (name) {
            updateFields.push('name = ?')
            values.push(name)
            changedFields.push('姓名')
        }

        if (nickname !== undefined) {
            updateFields.push('nickname = ?')
            values.push(nickname)
            changedFields.push('暱稱')
        }

        if (email) {
            // 檢查 email 是否已被其他使用者使用
            const sqlCheck = 'SELECT * FROM users WHERE email = ? AND id != ?'
            const [existingUser] = await connection.execute(sqlCheck, [email, userId])
            if (existingUser.length > 0) {
                const err = new Error('此信箱已被其他使用者使用')
                err.code = 400
                err.status = 'fail'
                throw err
            }
            updateFields.push('email = ?')
            values.push(email)
            changedFields.push('信箱')
        }

        if (phone) {
            updateFields.push('phone = ?')
            values.push(phone)
            changedFields.push('手機號碼')
        }

        if (birthday) {
            updateFields.push('birthday = ?')
            values.push(birthday)
            changedFields.push('生日')
        }

        if (gender) {
            updateFields.push('gender = ?')
            values.push(gender)
            changedFields.push('性別')
        }

        if (img) {
            updateFields.push('img = ?')
            values.push(img)
            changedFields.push('頭像')
        }

        if (level) {
            updateFields.push('level = ?')
            values.push(level)
            changedFields.push('等級')
        }

        if (points !== undefined) {
            updateFields.push('points = ?')
            values.push(points)
            changedFields.push('點數')
        }

        // 自動更新 updated_at 欄位
        updateFields.push('updated_at = CURRENT_TIMESTAMP')
        values.push(userId)

        // 更新資訊
        console.log(`使用者 ${userName} 更新了: ${changedFields.join('、')}`)

        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`
        const [result] = await connection.execute(sql, values)

        if (result.affectedRows === 0) {
            const err = new Error('找不到要更新的使用者或更新失敗')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        res.status(200).json({
            status: 'success',
            message: '使用者資料更新成功',
            data: {
                updatedFields: changedFields,
                affectedRows: result.affectedRows,
            },
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '更新失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 刪除(特定帳號的)使用者
router.delete('/:account', checkToken, async (req, res) => {
    try {
        const { account } = req.params

        // 檢查是否為本人操作
        if (req.decoded.account !== account) {
            const err = new Error('你沒有權限刪除此帳號')
            err.code = 403
            err.status = 'fail'
            throw err
        }

        // 先檢查使用者是否存在
        const checkUser = 'SELECT id, name, email, level FROM users WHERE account = ?'
        const [existingUser] = await connection.execute(checkUser, [account])

        if (existingUser.length === 0) {
            const err = new Error('找不到要刪除的使用者')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        // 記錄要刪除的使用者資訊（用於日誌）
        const userToDelete = existingUser[0]
        console.log(`準備刪除使用者: ${userToDelete.name} (${account})`)

        // 執行刪除操作
        const result = await connection.execute('DELETE FROM users WHERE account = ?', [account])

        console.log('刪除結果:', result)

        // 檢查刪除是否成功
        if (result.affectedRows === 0) {
            const err = new Error('刪除失敗，請洽管理人員')
            err.code = 500
            err.status = 'fail'
            throw err
        }

        // 刪除成功回應
        res.status(200).json({
            status: 'success',
            message: '帳號已成功註銷',
            data: {
                deletedUser: {
                    account: account,
                    name: userToDelete.name,
                    email: userToDelete.email,
                    level: userToDelete.level,
                },
                deletedAt: new Date().toISOString(),
                affectedRows: result.affectedRows,
            },
        })

        // 記錄刪除成功日誌
        console.log(`使用者 ${userToDelete.name} (${account}) 已成功刪除`)
    } catch (error) {
        // 補獲錯誤
        console.log('刪除使用者錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '刪除失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 使用者登入
router.post('/login', async (req, res) => {
    try {
        const { account, password } = req.body

        // 優化：檢查必填欄位
        if (!account || !password) {
            const err = new Error('請提供帳號和密碼')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 優化：檢查帳號格式
        if (typeof account !== 'string' || account.trim().length === 0) {
            const err = new Error('帳號格式錯誤')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        const sqlCheck1 = 'SELECT * FROM `users` WHERE `account` = ?;'
        let user = await connection.execute(sqlCheck1, [account.trim()]).then(([result]) => {
            return result[0]
        })

        if (!user) {
            const err = new Error('帳號或密碼錯誤')
            err.code = 400
            err.status = 'error'
            throw err
        }

        // 優化：檢查使用者狀態 - 檢查 deleted_at 欄位而不是 level
        if (user.deleted_at !== null) {
            const err = new Error('帳號已被停用')
            err.code = 403
            err.status = 'error'
            throw err
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            const err = new Error('帳號或密碼錯誤')
            err.code = 400
            err.status = 'error'
            throw err
        }

        // 優化：生成 token 時添加更多資訊
        const token = jwt.sign(
            {
                id: user.id,
                account: user.account,
                email: user.email,
                name: user.name,
                level: user.level,
                points: user.points,
                loginTime: new Date().toISOString(),
            },
            secretKey,
            { expiresIn: '24h' }
        )

        const newUser = {
            id: user.id,
            account: user.account,
            name: user.name,
            nickname: user.nickname,
            email: user.email,
            phone: user.phone,
            birthday: user.birthday,
            gender: user.gender,
            img: user.img,
            level: user.level,
            points: user.points,
            email_verified: user.email_verified,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }

        res.status(200).json({
            status: 'success',
            message: '登入成功',
            data: {
                token,
                user: newUser,
                loginInfo: {
                    loginTime: new Date().toISOString(),
                    tokenExpiresIn: '24h',
                },
            },
        })
    } catch (error) {
        // 優化：更詳細的錯誤處理
        console.log('登入錯誤:', error)
        const statusCode = error.code ?? 400
        const statusText = error.status ?? 'error'
        const message = error.message ?? '登入失敗，請洽管理人員'

        res.status(statusCode).json({
            status: statusText,
            message,
            code: error.code ? `LOGIN_${error.code}` : 'LOGIN_ERROR',
        })
    }
})

// Google 登入
router.post('/google-login', async (req, res) => {
    try {
        const { providerId, displayName, email, uid, photoURL } = req.body

        // 優化：檢查從前端來的資料
        if (!providerId || !uid || !email) {
            const err = new Error('缺少 Google 登入必要資料')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 優化：檢查 email 格式
        if (typeof email !== 'string' || !email.includes('@')) {
            const err = new Error('Email 格式錯誤')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        const googleUid = uid

        // 查詢資料庫是否有同 account 的會員資料
        const accountUserSql = 'SELECT * FROM `users` WHERE `account` = ?;'
        let accountUser = await connection.execute(accountUserSql, [email]).then(([result]) => {
            return result[0]
        })

        // 查詢資料庫是否有同 googleUid 的資料
        const googleUidUserSql = 'SELECT * FROM `users` WHERE `google_uid` = ?;'
        let googleUidUser = await connection.execute(googleUidUserSql, [googleUid]).then(([result]) => {
            return result[0]
        })

        // 最後要加到 JWT 的會員資料
        let user = null

        // 特殊流程: google登入時查詢到已經有同樣gmail的資料，這時要先進行更新(連結)後再登入
        // 有accountUser，但沒有googleUidUser  ==> 進行更新googleUid和圖片 ==> 登入
        if (!googleUidUser && accountUser) {
            // 優化：檢查帳號狀態 - 檢查 deleted_at 欄位
            if (accountUser.deleted_at !== null) {
                const err = new Error('此帳號已被停用')
                err.code = 403
                err.status = 'fail'
                throw err
            }

            // 檢查用戶是否已有自定義頭像（不是預設頭像且不是 Google 頭像）
            const hasCustomAvatar =
                accountUser.img &&
                accountUser.img !== '/images/default-avatar.svg' &&
                !accountUser.img.includes('googleusercontent.com') &&
                !accountUser.img.includes('lh3.googleusercontent.com')

            if (hasCustomAvatar) {
                // 用戶已有自定義頭像，只更新 google_uid 和 email_verified，不覆蓋頭像
                console.log(`用戶 ${accountUser.id} 已有自定義頭像，保留原有頭像: ${accountUser.img}`)
                const updateSql = 'UPDATE `users` SET `google_uid` = ?, `email_verified` = 1 WHERE `account` = ?;'
                await connection.execute(updateSql, [googleUid, email])
                user = accountUser
                user.google_uid = googleUid
                user.email_verified = 1
                // 保持原有頭像
            } else {
                // 用戶沒有自定義頭像，更新為 Google 頭像並設置 email_verified
                console.log(`用戶 ${accountUser.id} 沒有自定義頭像，更新為 Google 頭像: ${photoURL}`)
                const updateSql =
                    'UPDATE `users` SET `google_uid` = ?, `img` = ?, `email_verified` = 1 WHERE `account` = ?;'
                await connection.execute(updateSql, [googleUid, photoURL, email])
                user = accountUser
                user.google_uid = googleUid
                user.img = photoURL
                user.email_verified = 1
            }
        }

        // 兩者都有存在(代表是有已存在的會員) -> 登入
        if (googleUidUser && accountUser) {
            // 優化：檢查帳號狀態 - 檢查 deleted_at 欄位
            if (googleUidUser.deleted_at !== null) {
                const err = new Error('此帳號已被停用')
                err.code = 403
                err.status = 'fail'
                throw err
            }
            user = googleUidUser

            // 檢查用戶是否已有自定義頭像，只有在沒有自定義頭像時才更新為 Google 頭像
            const hasCustomAvatar =
                user.img &&
                user.img !== '/images/default-avatar.svg' &&
                !user.img.includes('googleusercontent.com') &&
                !user.img.includes('lh3.googleusercontent.com')

            // 檢查是否需要更新頭像或 email_verified
            let needsUpdate = false
            let updateFields = []
            let updateValues = []

            if (!hasCustomAvatar && photoURL && photoURL !== user.img) {
                console.log(`用戶 ${user.id} 沒有自定義頭像，更新為 Google 頭像: ${photoURL}`)
                updateFields.push('`img` = ?')
                updateValues.push(photoURL)
                user.img = photoURL
                needsUpdate = true
            } else if (hasCustomAvatar) {
                console.log(`用戶 ${user.id} 已有自定義頭像，保留: ${user.img}`)
            }

            // 確保 email_verified 為 1（Google 登入代表信箱已驗證）
            if (user.email_verified !== 1) {
                console.log(`用戶 ${user.id} 更新 email_verified 為 1`)
                updateFields.push('`email_verified` = ?')
                updateValues.push(1)
                user.email_verified = 1
                needsUpdate = true
            }

            // 執行更新
            if (needsUpdate) {
                updateValues.push(user.id)
                const updateSql = `UPDATE \`users\` SET ${updateFields.join(', ')} WHERE \`id\` = ?;`
                await connection.execute(updateSql, updateValues)
            }
        }

        // 兩者都不存在 -> 建立一個新會員資料(無帳號與密碼) -> 登入
        if (!googleUidUser && !accountUser) {
            const newUser = {
                // 用Google抓到的email當帳號(因為帳號就是email)
                account: email,
                name: displayName || 'Google 用戶',
                // 用亂數產生密碼(因為密碼是必要的，這裡不會用到)，長度20
                password: crypto.randomBytes(10).toString('hex'),
                email: email,
                google_uid: googleUid,
                img: photoURL, // 保持 Google 頭像 URL 完整
                level: '一般會員',
                points: 0,
            }

            // 新增會員資料
            const insertSql = `
                INSERT INTO users (
                    account, name, password, email, google_uid, img, level, points, email_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `

            const [result] = await connection.execute(insertSql, [
                newUser.account,
                newUser.name,
                newUser.password,
                newUser.email,
                newUser.google_uid,
                newUser.img,
                newUser.level,
                newUser.points,
                1, // Google 登入自動驗證信箱
            ])

            // 獲取新增的使用者資料
            const getUserSql = 'SELECT * FROM `users` WHERE `id` = ?;'
            user = await connection.execute(getUserSql, [result.insertId]).then(([result]) => {
                return result[0]
            })
        }

        // 優化：生成 JWT token 時添加更多資訊
        const token = jwt.sign(
            {
                id: user.id,
                account: user.account,
                email: user.email,
                name: user.name,
                level: user.level,
                points: user.points,
                loginTime: new Date().toISOString(),
                provider: 'google',
            },
            secretKey,
            { expiresIn: '24h' }
        )

        // 準備回應的使用者資料
        const userData = {
            id: user.id,
            account: user.account,
            name: user.name,
            nickname: user.nickname,
            email: user.email,
            phone: user.phone,
            birthday: user.birthday,
            gender: user.gender,
            img: user.img,
            level: user.level,
            points: user.points,
            email_verified: user.email_verified,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }

        // 調試：檢查頭像 URL
        console.log('Google 登入成功 - 用戶 ID:', user.id)
        console.log('Google 登入成功 - 用戶頭像:', user.img)
        console.log('Google 登入成功 - 準備發送的用戶資料:', userData)

        res.status(200).json({
            status: 'success',
            message: 'Google 登入成功',
            data: {
                token,
                user: userData,
                loginInfo: {
                    loginTime: new Date().toISOString(),
                    tokenExpiresIn: '24h',
                    provider: 'google',
                },
            },
        })
    } catch (error) {
        // 優化：更詳細的錯誤處理
        console.log('Google 登入錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? 'Google 登入失敗，請洽管理人員'

        res.status(statusCode).json({
            status: statusText,
            message,
            code: error.code ? `GOOGLE_LOGIN_${error.code}` : 'GOOGLE_LOGIN_ERROR',
        })
    }
})

// 使用者登出
router.post('/logout', checkToken, async (req, res) => {
    try {
        const { account, id } = req.decoded

        // 優化：檢查使用者是否存在
        const sqlCheck =
            'SELECT id, account, name, email, level, deleted_at FROM `users` WHERE `account` = ? AND `id` = ?;'
        let user = await connection.execute(sqlCheck, [account, id]).then(([result]) => {
            return result[0]
        })

        if (!user) {
            const err = new Error('使用者不存在，登出失敗')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        // 優化：檢查使用者狀態 - 檢查 deleted_at 欄位
        if (user.deleted_at !== null) {
            const err = new Error('帳號已被停用')
            err.code = 403
            err.status = 'fail'
            throw err
        }

        // 記錄登出活動（可選）
        console.log(`使用者 ${user.name} (${user.account}) 已登出`)

        // 優化：生成過期的 token（實際上不需要，因為前端會丟棄 token）
        const expiredToken = jwt.sign(
            {
                account: user.account,
                email: user.email,
                name: user.name,
                action: 'logged_out',
                timestamp: new Date().toISOString(),
            },
            secretKey,
            { expiresIn: '-10s' }
        )

        res.status(200).json({
            status: 'success',
            message: '登出成功',
            data: {
                message: 'Token 已失效',
                user: {
                    account: user.account,
                    name: user.name,
                    email: user.email,
                    level: user.level,
                },
                logoutInfo: {
                    logoutTime: new Date().toISOString(),
                    tokenInvalidated: true,
                    sessionEnded: true,
                },
            },
        })
    } catch (error) {
        // 優化：更詳細的錯誤處理
        console.log('登出錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '登出失敗，請洽管理人員'

        res.status(statusCode).json({
            status: statusText,
            message,
            code: error.code ? `LOGOUT_${error.code}` : 'LOGOUT_ERROR',
        })
    }
})

// 檢查登入狀態
router.post('/status', checkToken, async (req, res) => {
    try {
        const { account, id } = req.decoded

        // 檢查 decoded 資料完整性
        if (!account || !id) {
            return res.status(401).json({
                status: 'error',
                message: '登入憑證資料不完整，請重新登入',
                code: 'STATUS_DECODED_INCOMPLETE',
            })
        }

        // 檢查資料庫連線
        try {
            await connection.execute('SELECT 1')
        } catch (dbError) {
            console.error('資料庫連線錯誤:', dbError)
            return res.status(503).json({
                status: 'error',
                message: '資料庫連線失敗，請稍後再試',
                code: 'STATUS_DB_CONNECTION_ERROR',
            })
        }

        // 檢查使用者是否存在並獲取完整資訊
        let user
        try {
            const sqlCheck =
                'SELECT id, account, name, nickname, email, phone, birthday, gender, img, level, points, email_verified, created_at, updated_at, deleted_at FROM `users` WHERE `account` = ? AND `id` = ?;'
            const [result] = await connection.execute(sqlCheck, [account, id])
            user = result[0]
        } catch (queryError) {
            console.error('資料庫查詢錯誤:', queryError)
            return res.status(500).json({
                status: 'error',
                message: '資料庫查詢失敗，請稍後再試',
                code: 'STATUS_DB_QUERY_ERROR',
            })
        }

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: '使用者不存在，請重新登入',
                code: 'STATUS_USER_NOT_FOUND',
            })
        }

        // 檢查使用者狀態是否正常 - 檢查 deleted_at 欄位
        if (user.deleted_at !== null) {
            return res.status(403).json({
                status: 'fail',
                message: '帳號已被停用',
                code: 'STATUS_ACCOUNT_DISABLED',
            })
        }

        // 生成新的 token（延長登入時間）
        let newToken
        try {
            newToken = jwt.sign(
                {
                    id: user.id,
                    account: user.account,
                    email: user.email,
                    name: user.name,
                    level: user.level,
                    points: user.points,
                },
                secretKey,
                { expiresIn: '24h' }
            )
        } catch (tokenError) {
            console.error('Token 生成錯誤:', tokenError)
            return res.status(500).json({
                status: 'error',
                message: 'Token 生成失敗，請稍後再試',
                code: 'STATUS_TOKEN_GENERATION_ERROR',
            })
        }

        // 準備使用者資料（不包含敏感資訊）
        const userData = {
            id: user.id,
            account: user.account,
            name: user.name,
            nickname: user.nickname,
            email: user.email,
            phone: user.phone,
            birthday: user.birthday,
            gender: user.gender,
            img: user.img,
            level: user.level,
            points: user.points,
            email_verified: user.email_verified,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }

        res.status(200).json({
            status: 'success',
            message: '處於登入狀態',
            data: {
                token: newToken,
                user: userData,
                loginStatus: {
                    isLoggedIn: true,
                    lastCheck: new Date().toISOString(),
                    tokenExpiresIn: '24h',
                    tokenRefreshed: true,
                },
            },
        })
    } catch (error) {
        // 錯誤處理
        console.error('Status 檢查未預期錯誤:', error)

        let statusCode = 500
        let errorMessage = '身份驗證錯誤，請洽管理人員'
        let errorCode = 'STATUS_UNEXPECTED_ERROR'

        if (error.code) {
            statusCode = error.code
            errorMessage = error.message
            errorCode = `STATUS_${error.code}`
        }

        res.status(statusCode).json({
            status: 'error',
            message: errorMessage,
            code: errorCode,
        })
    }
})

// 優化：主動刷新 Token 路由
router.post('/refresh-token', checkToken, async (req, res) => {
    try {
        const { account, id } = req.decoded

        // 檢查使用者是否存在
        const sqlCheck = 'SELECT id, account, name, level, deleted_at FROM `users` WHERE `account` = ? AND `id` = ?;'
        let user = await connection.execute(sqlCheck, [account, id]).then(([result]) => {
            return result[0]
        })

        if (!user) {
            const err = new Error('使用者不存在，請重新登入')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        // 檢查使用者狀態 - 檢查 deleted_at 欄位
        if (user.deleted_at !== null) {
            const err = new Error('帳號已被停用')
            err.code = 403
            err.status = 'fail'
            throw err
        }

        // 生成新的 token
        const newToken = jwt.sign(
            {
                id: user.id,
                account: user.account,
                level: user.level,
                refreshTime: new Date().toISOString(),
            },
            secretKey,
            { expiresIn: '24h' }
        )

        res.status(200).json({
            status: 'success',
            message: 'Token 刷新成功',
            data: {
                token: newToken,
                refreshInfo: {
                    refreshTime: new Date().toISOString(),
                    tokenExpiresIn: '24h',
                    refreshed: true,
                },
            },
        })
    } catch (error) {
        console.log('Token 刷新錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? 'Token 刷新失敗'

        res.status(statusCode).json({
            status: statusText,
            message,
            code: error.code ? `REFRESH_${error.code}` : 'REFRESH_ERROR',
        })
    }
})

// 驗證目前密碼
router.post('/verify-password', checkToken, async (req, res) => {
    try {
        // 從 JSON 請求體中獲取密碼
        const { currentPassword } = req.body
        const { account, id } = req.decoded

        // 優化：檢查必填欄位
        if (!currentPassword) {
            const err = new Error('請提供目前密碼')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 優化：檢查密碼格式
        if (typeof currentPassword !== 'string' || currentPassword.trim().length === 0) {
            const err = new Error('密碼格式錯誤')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 獲取使用者資訊（包含密碼）
        const sqlCheck =
            'SELECT id, account, password, level, deleted_at FROM `users` WHERE `account` = ? AND `id` = ?;'
        let user = await connection.execute(sqlCheck, [account, id]).then(([result]) => {
            return result[0]
        })

        if (!user) {
            const err = new Error('使用者不存在')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        // 優化：檢查使用者狀態 - 檢查 deleted_at 欄位
        if (user.deleted_at !== null) {
            const err = new Error('帳號已被停用')
            err.code = 403
            err.status = 'fail'
            throw err
        }

        // 驗證目前密碼
        const isMatch = await bcrypt.compare(currentPassword.trim(), user.password)
        if (!isMatch) {
            const err = new Error('目前密碼錯誤')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        res.status(200).json({
            status: 'success',
            message: '密碼驗證成功',
            data: {
                verified: true,
                verificationTime: new Date().toISOString(),
            },
        })
    } catch (error) {
        // 優化：更詳細的錯誤處理
        console.log('密碼驗證錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '密碼驗證失敗'

        res.status(statusCode).json({
            status: statusText,
            message,
            code: error.code ? `PASSWORD_VERIFY_${error.code}` : 'PASSWORD_VERIFY_ERROR',
        })
    }
})

// 生成預設頭像檔名
function getDefaultAvatar() {
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, '0')
    return `default${timestamp}${random}.jpg`
}

// 頭像上傳路由
router.post('/:id/avatar', checkToken, async (req, res) => {
    try {
        const userId = req.params.id

        // 檢查是否為本人操作
        // 先查詢使用者資料以獲取 account
        const userSql = 'SELECT account FROM users WHERE id = ?'
        const [userResult] = await connection.execute(userSql, [userId])

        if (userResult.length === 0) {
            const err = new Error('找不到指定的使用者')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        if (req.decoded.account !== userResult[0].account && !req.decoded.isAdmin) {
            const err = new Error('你沒有權限上傳此帳號的頭像')
            err.code = 403
            err.status = 'fail'
            throw err
        }

        // 使用 multer 處理檔案上傳
        const uploadMiddleware = multer({
            storage: multer.diskStorage({
                destination: function (req, file, cb) {
                    // 確保上傳目錄存在
                    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars')
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true })
                    }
                    cb(null, uploadDir)
                },
                filename: function (req, file, cb) {
                    // 生成非常簡短的唯一檔名 (限制在25字符以內)
                    const timestamp = Date.now().toString().slice(-8) // 取後8位
                    const random = Math.floor(Math.random() * 999)
                        .toString()
                        .padStart(3, '0')
                    const ext = path.extname(file.originalname).toLowerCase()
                    cb(null, `av${timestamp}${random}${ext}`)
                },
            }),
            limits: {
                fileSize: 5 * 1024 * 1024, // 限制 5MB
            },
            fileFilter: function (req, file, cb) {
                // 只允許圖片檔案
                if (file.mimetype.startsWith('image/')) {
                    cb(null, true)
                } else {
                    cb(new Error('只允許上傳圖片檔案'), false)
                }
            },
        }).single('avatar')

        uploadMiddleware(req, res, async (err) => {
            if (err) {
                console.error('檔案上傳錯誤:', err)
                return res.status(400).json({
                    status: 'fail',
                    message: err.message || '檔案上傳失敗',
                })
            }

            if (!req.file) {
                return res.status(400).json({
                    status: 'fail',
                    message: '請選擇要上傳的圖片檔案',
                })
            }

            try {
                // 更新資料庫中的頭像路徑 - 只存儲檔名
                const avatarUrl = `/uploads/avatars/${req.file.filename}`

                const sql = 'UPDATE users SET img = ? WHERE id = ?'
                const [result] = await connection.execute(sql, [req.file.filename, userId])

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        status: 'fail',
                        message: '找不到要更新的使用者',
                    })
                }

                res.status(200).json({
                    status: 'success',
                    message: '頭像更新成功',
                    data: {
                        avatarUrl: avatarUrl,
                        filename: req.file.filename,
                    },
                })
            } catch (dbError) {
                console.error('資料庫更新錯誤:', dbError)
                // 如果資料庫更新失敗，刪除已上傳的檔案
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path)
                }

                res.status(500).json({
                    status: 'fail',
                    message: '頭像更新失敗，請稍後再試',
                })
            }
        })
    } catch (error) {
        console.error('頭像上傳錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '頭像上傳失敗，請稍後再試'

        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// ==================== 忘記密碼相關路由 ====================

// 產生 OTP 並發送郵件
router.post('/forgot-password/otp', async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: '請提供電子郵件地址',
            })
        }

        // 檢查用戶是否存在
        const [users] = await connection.execute('SELECT id, name, account FROM users WHERE email = ?', [email])

        if (users.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: '找不到此電子郵件地址的用戶',
            })
        }

        const user = users[0]

        // 檢查是否可以重新發送 OTP
        const [existingOtps] = await connection.execute(
            'SELECT created_at FROM otp WHERE email = ? ORDER BY created_at DESC LIMIT 1',
            [email]
        )

        if (existingOtps.length > 0) {
            const lastCreatedAt = existingOtps[0].created_at
            if (!canResendOTP(lastCreatedAt)) {
                const now = Date.now()
                const lastCreated = new Date(lastCreatedAt).getTime()
                const diffInSeconds = Math.floor((now - lastCreated) / 1000)
                const remainingTime = 60 - diffInSeconds

                return res.status(429).json({
                    status: 'error',
                    message: `請等待 ${remainingTime} 秒後再重新發送`,
                    remainingTime,
                })
            }
        }

        // 產生 OTP
        const otp = generateRandomOTP()
        const expiredAt = new Date(Date.now() + serverConfig.otp.expire)
        const hash = generateHash(email, otp)

        // 儲存 OTP 到資料庫
        await connection.execute('INSERT INTO otp (email, token, hash, expired_at) VALUES (?, ?, ?, ?)', [
            email,
            otp,
            hash,
            expiredAt,
        ])

        // 發送 OTP 郵件
        await sendForgotPasswordOtpMail(email, otp, user.name || user.account)

        res.json({
            status: 'success',
            message: '驗證碼已發送到您的電子郵件',
            data: {
                email,
                hash,
                expiredAt,
            },
        })
    } catch (error) {
        console.error('產生 OTP 錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '發送驗證碼失敗，請稍後再試',
        })
    }
})

// 驗證 OTP 是否正確
router.post('/forgot-password/verify-otp', async (req, res) => {
    try {
        const { email, otp, hash } = req.body

        if (!email || !otp || !hash) {
            return res.status(400).json({
                status: 'error',
                message: '請提供所有必要資訊',
            })
        }

        // 查找 OTP 記錄
        const [otpRecords] = await connection.execute(
            'SELECT * FROM otp WHERE email = ? AND hash = ? ORDER BY created_at DESC LIMIT 1',
            [email, hash]
        )

        if (otpRecords.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: '驗證碼不存在或已過期',
            })
        }

        const otpRecord = otpRecords[0]

        // 檢查是否已使用
        if (otpRecord.used) {
            return res.status(400).json({
                status: 'error',
                message: '驗證碼已被使用',
            })
        }

        // 檢查是否過期
        if (isOTPExpired(otpRecord.expired_at)) {
            return res.status(400).json({
                status: 'error',
                message: '驗證碼已過期',
            })
        }

        // 驗證 OTP
        if (otpRecord.token !== otp) {
            // 增加嘗試次數
            await connection.execute('UPDATE otp SET attempts = attempts + 1 WHERE id = ?', [otpRecord.id])

            return res.status(400).json({
                status: 'error',
                message: '驗證碼錯誤',
            })
        }

        res.json({
            status: 'success',
            message: '驗證碼正確',
        })
    } catch (error) {
        console.error('驗證 OTP 錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '驗證失敗，請稍後再試',
        })
    }
})

// 驗證 OTP 並重設密碼
router.post('/forgot-password/reset', async (req, res) => {
    try {
        const { email, otp, newPassword, hash } = req.body

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                status: 'error',
                message: '請提供所有必要資訊',
            })
        }

        // 驗證 OTP
        const [otpRecords] = await connection.execute(
            'SELECT * FROM otp WHERE email = ? AND token = ? AND hash = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
            [email, otp, hash]
        )

        if (otpRecords.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '驗證碼無效或已使用',
            })
        }

        const otpRecord = otpRecords[0]

        // 檢查 OTP 是否過期
        if (isOTPExpired(otpRecord.expired_at)) {
            return res.status(400).json({
                status: 'error',
                message: '驗證碼已過期，請重新申請',
            })
        }

        // 檢查 OTP 嘗試次數
        if (otpRecord.attempts >= 3) {
            return res.status(400).json({
                status: 'error',
                message: '驗證碼嘗試次數過多，請重新申請',
            })
        }

        // 驗證 OTP（直接比較，不使用 TOTP）
        if (otpRecord.token !== otp) {
            // 增加嘗試次數
            await connection.execute('UPDATE otp SET attempts = attempts + 1 WHERE id = ?', [otpRecord.id])

            return res.status(400).json({
                status: 'error',
                message: '驗證碼錯誤',
            })
        }

        // 加密新密碼
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // 更新用戶密碼
        await connection.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email])

        // 標記 OTP 為已使用
        await connection.execute('UPDATE otp SET used = 1 WHERE id = ?', [otpRecord.id])

        res.json({
            status: 'success',
            message: '密碼重設成功',
        })
    } catch (error) {
        console.error('重設密碼錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '重設密碼失敗，請稍後再試',
        })
    }
})

// 檢查 hash 是否有效
router.post('/forgot-password/check-hash', async (req, res) => {
    try {
        const { email, hash } = req.body

        if (!email || !hash) {
            return res.status(400).json({
                status: 'error',
                message: '請提供必要資訊',
            })
        }

        // 檢查 hash 是否存在且未過期
        const [otpRecords] = await connection.execute(
            'SELECT * FROM otp WHERE email = ? AND hash = ? AND used = 0 AND expired_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, hash]
        )

        if (otpRecords.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '連結無效或已過期',
            })
        }

        res.json({
            status: 'success',
            message: '連結有效',
            data: {
                email,
                expiredAt: otpRecords[0].expired_at,
            },
        })
    } catch (error) {
        console.error('檢查 hash 錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '檢查連結失敗',
        })
    }
})

// 重設密碼（透過 hash，不用 email）
router.post('/forgot-password/reset-hash', async (req, res) => {
    try {
        const { hash, newPassword } = req.body

        if (!hash || !newPassword) {
            return res.status(400).json({
                status: 'error',
                message: '請提供必要資訊',
            })
        }

        // 檢查 hash 是否存在且未過期
        const [otpRecords] = await connection.execute(
            'SELECT * FROM otp WHERE hash = ? AND used = 0 AND expired_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [hash]
        )

        if (otpRecords.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '連結無效或已過期',
            })
        }

        const otpRecord = otpRecords[0]

        // 加密新密碼
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // 更新用戶密碼
        await connection.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, otpRecord.email])

        // 標記 OTP 為已使用
        await connection.execute('UPDATE otp SET used = 1 WHERE id = ?', [otpRecord.id])

        res.json({
            status: 'success',
            message: '密碼重設成功',
        })
    } catch (error) {
        console.error('重設密碼錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '重設密碼失敗，請稍後再試',
        })
    }
})

// 計算用戶累積消費金額
router.get('/:userId/accumulated-amount', checkToken, async (req, res) => {
    try {
        const { userId } = req.params

        // 驗證用戶ID是否為數字
        if (!userId || isNaN(userId)) {
            return res.status(400).json({
                status: 'error',
                message: '無效的用戶ID',
            })
        }

        // 檢查請求的用戶ID是否與登入用戶匹配
        if (parseInt(userId) !== req.decoded.id) {
            return res.status(403).json({
                status: 'error',
                message: '無權限查看其他用戶的資料',
            })
        }

        // 查詢該用戶所有已完成的訂單總金額
        const [orders] = await connection.execute(
            `SELECT total_price, points_used, payment_status, shipping_status 
             FROM orders 
             WHERE users_id = ? AND payment_status = 'success' AND is_deleted = 0`,
            [userId]
        )

        // 計算累積金額（總金額，不包含使用的點數）
        let totalAccumulated = 0
        orders.forEach((order) => {
            // 累積金額就是訂單的總價格
            totalAccumulated += order.total_price
        })

        // 根據累積金額計算會員等級
        let newLevel = '一般會員'
        if (totalAccumulated >= 16000) {
            newLevel = '黑膠收藏家'
        } else if (totalAccumulated >= 8000) {
            newLevel = 'VIP會員'
        }

        // 檢查是否需要更新會員等級
        const [currentUser] = await connection.execute('SELECT level FROM users WHERE id = ?', [userId])

        if (currentUser.length > 0 && currentUser[0].level !== newLevel) {
            // 更新會員等級
            await connection.execute('UPDATE users SET level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
                newLevel,
                userId,
            ])
            console.log(`🔄 用戶 ${userId} 會員等級已更新: ${currentUser[0].level} → ${newLevel}`)
        }

        res.json({
            status: 'success',
            message: '累積金額計算成功',
            data: {
                accumulatedAmount: totalAccumulated,
                orderCount: orders.length,
                membershipLevel: newLevel,
            },
        })
    } catch (error) {
        console.error('計算累積金額錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '計算累積金額失敗，請稍後再試',
        })
    }
})

// 後台管理專用：獲取所有會員名單（包含詳細資訊）
router.get('/admin/all', async (req, res) => {
    try {
        // 獲取所有會員詳細資訊，包含訂單統計
        const sql = `
            SELECT 
                u.id,
                u.account,
                u.name,
                u.nickname,
                u.email,
                u.phone,
                u.birthday,
                u.gender,
                u.img,
                u.level,
                u.points,
                u.email_verified,
                u.created_at,
                u.updated_at,
                u.deleted_at,
                COALESCE(order_stats.order_count, 0) as order_count,
                COALESCE(order_stats.total_spent, 0) as total_spent
            FROM users u
            LEFT JOIN (
                SELECT 
                    users_id,
                    COUNT(*) as order_count,
                    SUM(total_price) as total_spent
                FROM orders 
                WHERE payment_status = 'success'
                GROUP BY users_id
            ) order_stats ON u.id = order_stats.users_id
            ORDER BY u.created_at DESC
        `

        const [users] = await connection.execute(sql)

        // 格式化資料以符合前端需求
        const formattedUsers = users.map((user) => ({
            id: user.id,
            account: user.account,
            name: user.name,
            nickname: user.nickname,
            email: user.email,
            phone: user.phone || '未提供',
            birthday: user.birthday,
            gender: user.gender,
            img: user.img,
            level: user.level,
            points: user.points,
            email_verified: user.email_verified,
            created_at: user.created_at,
            updated_at: user.updated_at,
            deleted_at: user.deleted_at,
            // 額外的統計資訊
            order_count: user.order_count,
            total_spent: user.total_spent,
            // 狀態判斷：根據 deleted_at 欄位判斷是否為停用狀態
            status: user.deleted_at ? 'inactive' : 'active',
        }))

        res.status(200).json({
            status: 'success',
            data: formattedUsers,
            message: `已獲取所有會員名單，共 ${formattedUsers.length} 位會員`,
            meta: {
                total: formattedUsers.length,
                active: formattedUsers.filter((u) => u.status === 'active').length,
                inactive: formattedUsers.filter((u) => u.status === 'inactive').length,
                total_orders: formattedUsers.reduce((sum, u) => sum + u.order_count, 0),
                total_revenue: formattedUsers.reduce((sum, u) => sum + u.total_spent, 0),
            },
        })
    } catch (error) {
        console.error('獲取管理員會員名單錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '獲取會員名單失敗，請洽管理人員'

        res.status(statusCode).json({
            status: statusText,
            message,
            code: error.code ? `ADMIN_USERS_${error.code}` : 'ADMIN_USERS_ERROR',
        })
    }
})

// 後臺管理專用：軟刪除
router.put('/admin/delete/:id', async (req, res) => {
    try {
        const { id } = req.params

        // 驗證 ID 是否為有效數字
        if (!id || isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({
                status: 'error',
                message: '無效的使用者 ID',
                code: 'INVALID_USER_ID',
            })
        }

        // 檢查使用者是否存在且未被刪除
        const checkUserSql = 'SELECT id, name, account, deleted_at FROM users WHERE id = ?'
        const [userResult] = await connection.execute(checkUserSql, [id])

        if (userResult.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: '找不到指定的使用者',
                code: 'USER_NOT_FOUND',
            })
        }

        const user = userResult[0]

        // 檢查使用者是否已經被軟刪除
        if (user.deleted_at !== null) {
            return res.status(400).json({
                status: 'error',
                message: '該使用者已被刪除',
                code: 'USER_ALREADY_DELETED',
            })
        }

        // 執行軟刪除：設置 deleted_at 為當前時間
        const deleteSql = 'UPDATE users SET deleted_at = NOW() WHERE id = ?'
        await connection.execute(deleteSql, [id])

        // 回傳成功訊息
        res.status(200).json({
            status: 'success',
            message: `使用者「${user.name}」(${user.account}) 已成功刪除`,
            data: {
                id: user.id,
                name: user.name,
                account: user.account,
                deleted_at: new Date().toISOString(),
            },
        })
    } catch (error) {
        console.error('軟刪除使用者時發生錯誤:', error)

        // 根據錯誤類型回傳適當的錯誤訊息
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                status: 'error',
                message: '資料庫表格不存在，請檢查資料庫結構',
                code: 'DATABASE_TABLE_ERROR',
            })
        }

        res.status(500).json({
            status: 'error',
            message: '刪除使用者時發生伺服器錯誤',
            code: 'SERVER_ERROR',
        })
    }
})

// 後臺管理專用：啟用使用者（恢復軟刪除）
router.put('/admin/activate/:id', async (req, res) => {
    try {
        const { id } = req.params

        // 驗證 ID 是否為有效數字
        if (!id || isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({
                status: 'error',
                message: '無效的使用者 ID',
                code: 'INVALID_USER_ID',
            })
        }

        // 檢查使用者是否存在
        const checkUserSql = 'SELECT id, name, account, deleted_at FROM users WHERE id = ?'
        const [userResult] = await connection.execute(checkUserSql, [id])

        if (userResult.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: '找不到指定的使用者',
                code: 'USER_NOT_FOUND',
            })
        }

        const user = userResult[0]

        // 檢查使用者是否已經被啟用
        if (user.deleted_at === null) {
            return res.status(400).json({
                status: 'error',
                message: '該使用者已經啟用',
                code: 'USER_ALREADY_ACTIVE',
            })
        }

        // 執行啟用：將 deleted_at 設置為 NULL
        const activateSql = 'UPDATE users SET deleted_at = NULL WHERE id = ?'
        await connection.execute(activateSql, [id])

        // 回傳成功訊息
        res.status(200).json({
            status: 'success',
            message: `使用者「${user.name}」(${user.account}) 已成功啟用`,
            data: {
                id: user.id,
                name: user.name,
                account: user.account,
                deleted_at: null,
            },
        })
    } catch (error) {
        console.error('啟用使用者時發生錯誤:', error)

        // 根據錯誤類型回傳適當的錯誤訊息
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                status: 'error',
                message: '資料庫表格不存在，請檢查資料庫結構',
                code: 'DATABASE_TABLE_ERROR',
            })
        }

        res.status(500).json({
            status: 'error',
            message: '啟用使用者時發生伺服器錯誤',
            code: 'SERVER_ERROR',
        })
    }
})

// 後臺管理專用：更新使用者資料
router.put('/admin/update/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { name, nickname, email, phone, birthday, gender, status } = req.body

        // 驗證 ID 是否為有效數字
        if (!id || isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({
                status: 'error',
                message: '無效的使用者 ID',
                code: 'INVALID_USER_ID',
            })
        }

        // 檢查使用者是否存在
        const checkUserSql = 'SELECT id, name, account FROM users WHERE id = ?'
        const [userResult] = await connection.execute(checkUserSql, [id])

        if (userResult.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: '找不到指定的使用者',
                code: 'USER_NOT_FOUND',
            })
        }

        const user = userResult[0]
        let updateFields = []
        let values = []
        let changedFields = []

        // 更新姓名
        if (name !== undefined) {
            updateFields.push('name = ?')
            values.push(name)
            changedFields.push('姓名')
        }

        // 更新暱稱
        if (nickname !== undefined) {
            updateFields.push('nickname = ?')
            values.push(nickname)
            changedFields.push('暱稱')
        }

        // 更新信箱
        if (email !== undefined) {
            // 檢查 email 是否已被其他使用者使用
            const sqlCheck = 'SELECT * FROM users WHERE email = ? AND id != ?'
            const [existingUser] = await connection.execute(sqlCheck, [email, id])
            if (existingUser.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: '此信箱已被其他使用者使用',
                    code: 'EMAIL_ALREADY_EXISTS',
                })
            }
            updateFields.push('email = ?')
            values.push(email)
            changedFields.push('信箱')
        }

        // 更新手機號碼
        if (phone !== undefined) {
            updateFields.push('phone = ?')
            values.push(phone)
            changedFields.push('手機號碼')
        }

        // 更新生日
        if (birthday !== undefined) {
            updateFields.push('birthday = ?')
            values.push(birthday)
            changedFields.push('生日')
        }

        // 更新性別
        if (gender !== undefined) {
            updateFields.push('gender = ?')
            values.push(gender)
            changedFields.push('性別')
        }

        // 移除會員等級和點數更新，這些欄位不可修改

        // 更新狀態
        if (status !== undefined) {
            updateFields.push('status = ?')
            values.push(status)
            changedFields.push('狀態')
        }

        // 如果沒有要更新的欄位
        if (updateFields.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '請至少提供一個要更新的資料',
                code: 'NO_UPDATE_FIELDS',
            })
        }

        // 自動更新 updated_at 欄位
        updateFields.push('updated_at = CURRENT_TIMESTAMP')
        values.push(id)

        // 執行更新
        console.log(`管理員更新使用者 ${user.name} 的資料: ${changedFields.join('、')}`)

        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`
        const [result] = await connection.execute(sql, values)

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'error',
                message: '更新失敗',
                code: 'UPDATE_FAILED',
            })
        }

        // 回傳成功訊息
        res.status(200).json({
            status: 'success',
            message: `使用者「${user.name}」的資料已成功更新`,
            data: {
                id: user.id,
                name: user.name,
                account: user.account,
                updatedFields: changedFields,
                affectedRows: result.affectedRows,
            },
        })
    } catch (error) {
        console.error('管理員更新使用者資料時發生錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '更新使用者資料時發生伺服器錯誤',
            code: 'SERVER_ERROR',
        })
    }
})

// 後台管理專用：獲取會員總數
router.get('/admin/count', async (req, res) => {
    try {
        const sql = 'SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL'
        const [result] = await connection.execute(sql)
        const total = result[0].total

        res.status(200).json({
            status: 'success',
            data: { total },
            message: `總會員數：${total} 位`
        })
    } catch (error) {
        console.error('獲取會員總數錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '獲取會員總數失敗'
        })
    }
})

// 獲取用戶統計數據（優惠券數量、訂單統計等）
router.get('/:userId/stats', checkToken, async (req, res) => {
    try {
        const { userId } = req.params

        // 驗證用戶ID是否為數字
        if (!userId || isNaN(userId)) {
            return res.status(400).json({
                status: 'error',
                message: '無效的用戶ID',
            })
        }

        // 檢查請求的用戶ID是否與登入用戶匹配
        if (parseInt(userId) !== req.decoded.id) {
            return res.status(403).json({
                status: 'error',
                message: '無權限查看其他用戶的資料',
            })
        }

        // 獲取用戶基本資料（包含點數）
        const [userRows] = await connection.execute(
            'SELECT points FROM users WHERE id = ?',
            [userId]
        )

        if (userRows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: '用戶不存在',
            })
        }

        const user = userRows[0]

        // 獲取優惠券數量（用戶擁有的有效優惠券）
        const [couponRows] = await connection.execute(
            `SELECT COUNT(*) as coupon_count
             FROM user_coupons uc
             JOIN coupons c ON uc.coupon_code = c.code
             WHERE uc.user_account = (SELECT account FROM users WHERE id = ?)
             AND c.is_valid = 1
             AND NOW() < uc.expires_at
             AND (uc.remaining_uses > 0 OR uc.remaining_uses = -1)
             AND uc.is_valid = 1`,
            [userId]
        )

        // 獲取訂單統計
        const [orderStats] = await connection.execute(
            `SELECT 
                SUM(CASE WHEN payment_status = 'success' AND shipping_status IN ('pending', 'processing') THEN 1 ELSE 0 END) as processing_orders,
                SUM(CASE WHEN payment_status = 'success' AND shipping_status = 'delivered' THEN 1 ELSE 0 END) as completed_orders
             FROM orders 
             WHERE users_id = ? AND is_deleted = 0`,
            [userId]
        )

        const stats = {
            points: user.points || 0,
            coupons: couponRows[0]?.coupon_count || 0,
            processingOrders: orderStats[0]?.processing_orders || 0,
            completedOrders: orderStats[0]?.completed_orders || 0,
        }

        res.json({
            status: 'success',
            message: '統計數據獲取成功',
            data: stats,
        })
    } catch (error) {
        console.error('獲取用戶統計數據錯誤:', error)
        res.status(500).json({
            status: 'error',
            message: '獲取統計數據失敗，請稍後再試',
        })
    }
})

export default router
