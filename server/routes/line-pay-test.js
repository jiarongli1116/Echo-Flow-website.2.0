/**
 * LINE Pay 付款路由
 *
 * 主要功能：
 * 1. 處理 LINE Pay 付款預約請求 (/reserve)
 * 2. 處理 LINE Pay 付款確認請求 (/confirm)
 * 3. 檢查付款狀態 (/check-payment-status)
 *
 * 防重複提交機制：
 * - 使用訂單ID快取防止短時間內重複提交
 * - 自動檢查訂單ID唯一性（本地快取 + 資料庫檢查）
 * - 自動重試機制處理 LINE Pay 錯誤碼 1172（重複訂單ID）
 * - 生成唯一訂單ID格式：LP{timestamp}{random}
 *
 * 錯誤處理：
 * - 針對 LINE Pay 錯誤碼 1172 實現自動重試
 * - 詳細的錯誤日誌記錄
 * - 自動清理錯誤訂單的快取
 */

import express from 'express'
const router = express.Router()
// 產生uuid用和hash字串用
import * as crypto from 'crypto'
// line pay使用npm套件
import { createLinePayClient } from 'line-pay-merchant'
// 資料庫連接
import connection from '../connect.js'

// ===== 防重複提交機制 =====
// 訂單ID快取，用於檢查短時間內的重複提交
// 格式: Map<orderId, {timestamp, amount}>
const orderIdCache = new Map()

// 快取過期時間（5分鐘）
const CACHE_EXPIRY_TIME = 5 * 60 * 1000

// 生成唯一訂單ID的函數
// 使用時間戳 + 隨機字串確保唯一性
const generateUniqueOrderId = () => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `LP${timestamp}${random}`.toUpperCase()
}

// 檢查訂單ID是否已存在於系統中
// 包含本地快取檢查和資料庫檢查
const checkOrderIdExists = async (orderId) => {
    try {
        // 1. 檢查本地快取（防止短時間內重複提交）
        if (orderIdCache.has(orderId)) {
            console.log('⚠️ 訂單ID存在於本地快取中:', orderId)
            return true
        }

        // 2. 檢查資料庫中是否有相同的 merchant_trade_no
        const [existingRecords] = await connection.execute(
            'SELECT id FROM payment_records WHERE merchant_trade_no = ? AND payment_method = "LINE_PAY"',
            [orderId]
        )

        if (existingRecords.length > 0) {
            console.log('⚠️ 訂單ID存在於資料庫中:', orderId)
            return true
        }

        return false
    } catch (error) {
        console.error('❌ 檢查訂單ID是否存在時發生錯誤:', error)
        // 發生錯誤時，為了安全起見，假設訂單ID已存在
        return true
    }
}

// 清理過期的快取項目
const cleanExpiredCache = () => {
    const now = Date.now()
    for (const [orderId, data] of orderIdCache.entries()) {
        if (now - data.timestamp > CACHE_EXPIRY_TIME) {
            orderIdCache.delete(orderId)
        }
    }
}

// 每分鐘清理一次過期快取
setInterval(cleanExpiredCache, 60 * 1000)

// 存取`.env`設定檔案使用
// import 'dotenv/config.js';

import config from '../config/server.config.js'
// import { isDev, successResponse, errorResponse } from '../lib/utils.js'
const isDev = true
const errorResponse = (res, message) => {
    return res.status(400).json({
        status: 'error',
        message,
    })
}
const successResponse = (res, data) => {
    return res.status(200).json({
        status: 'success',
        data,
    })
}

// 定義安全的私鑰字串
console.log('🔧 LINE Pay 配置:', {
    isDev,
    channelId: isDev ? config.linePay.development.channelId : config.linePay.production.channelId,
    channelSecret: isDev ? config.linePay.development.channelSecret : config.linePay.production.channelSecret,
    env: 'sandbox',
})

const linePayClient = createLinePayClient({
    channelId: isDev ? config.linePay.development.channelId : config.linePay.production.channelId,
    channelSecretKey: isDev ? config.linePay.development.channelSecret : config.linePay.production.channelSecret,
    env: 'sandbox', //process.env.NODE_ENV,暫時設定為sandbox
})

console.log('✅ LINE Pay 客戶端初始化完成')

// 設定重新導向與失敗導向的網址
// const redirectUrls = {
//   confirmUrl: isDev
//     ? serverConfig.linePay.development.confirmUrl
//     : serverConfig.linePay.production.confirmUrl,
//   cancelUrl: isDev
//     ? serverConfig.linePay.development.cancelUrl
//     : serverConfig.linePay.production.cancelUrl,
// }

const redirectUrls = {
    confirmUrl: 'http://localhost:3005/api/linepay/confirm',
    cancelUrl: 'http://localhost:3000/cart/checkout',
}

// 回應line-pay交易網址到前端，由前端導向line pay付款頁面
// 資料格式參考 https://enylin.github.io/line-pay-merchant/api-reference/request.html#example
// http://localhost:3005/api/line-pay-test-only/reserve?amount=2500
router.get('/reserve', async (req, res) => {
    // 接收前端傳來的參數
    const rawAmount = req.query.amount
    const orderId = req.query.orderId

    // 將金額轉為數字，避免 SDK/LINE Pay 對字串金額報錯
    const amount = parseInt(rawAmount, 10)

    console.log('🔍 LINE Pay reserve 接收參數:', { rawAmount, amount, orderId })

    // ===== 參數驗證 =====
    // 驗證付款金額是否有效（必須為整數且 > 0）
    if (!Number.isFinite(amount) || amount <= 0) {
        console.log('❌ 無效的付款金額:', rawAmount)
        return errorResponse(res, '無效的付款金額')
    }

    // ===== 訂單ID處理 =====
    // 生成或驗證訂單ID，確保唯一性
    let finalOrderId = orderId

    if (!finalOrderId) {
        // 如果沒有提供訂單ID，生成一個新的唯一ID
        finalOrderId = generateUniqueOrderId()
        console.log('🆕 生成新的訂單ID:', finalOrderId)
    } else {
        // 檢查提供的訂單ID是否已存在於系統中
        const exists = await checkOrderIdExists(finalOrderId)
        if (exists) {
            console.log('⚠️ 訂單ID已存在，生成新的訂單ID')
            finalOrderId = generateUniqueOrderId()
            console.log('🆕 重新生成訂單ID:', finalOrderId)
        }
    }

    // ===== 防重複提交機制 =====
    // 將訂單ID加入快取，防止短時間內重複提交
    orderIdCache.set(finalOrderId, {
        timestamp: Date.now(),
        amount: amount, // 已為數字
    })

    // 設定快取過期時間（5分鐘後自動清理）
    setTimeout(() => {
        orderIdCache.delete(finalOrderId)
        console.log('🧹 清理過期快取:', finalOrderId)
    }, CACHE_EXPIRY_TIME)

    // 使用目前最新的v3版本的API，以下是資料的說明:
    // https://pay.line.me/jp/developers/apis/onlineApis?locale=zh_TW

    // packages[]	是包裝的集合，每個包裝可以包含多個商品，以下(Y)是必要的欄位
    //
    // packages[].id	String	50	Y	Package list的唯一ID
    // packages[].amount	Number		Y	一個Package中的商品總價=sum(products[].quantity * products[].price)
    // packages[].userFee	Number		N	手續費：在付款金額中含手續費時設定
    // packages[].name	String	100	N	Package名稱 （or Shop Name）

    // products[]	是商品的集合，包含多個商品，以下有(Y)是必要的欄位
    //
    // packages[].products[].id	String	50	N	商家商品ID
    // packages[].products[].name	String	4000	Y	商品名
    // packages[].products[].imageUrl	String	500	N	商品圖示的URL
    // packages[].products[].quantity	Number		Y	商品數量
    // packages[].products[].price	Number		Y	各商品付款金額
    // packages[].products[].originalPrice	Number		N	各商品原金額

    // ===== 建立訂單資料 =====
    // 要傳送給line pay的訂單資訊
    const order = {
        orderId: finalOrderId, // 使用驗證後的唯一訂單ID
        currency: 'TWD',
        amount: amount, // 數字
        packages: [
            {
                id: crypto.randomBytes(5).toString('hex'),
                amount: amount, // 數字
                name: 'ECHO&FLOW 商品訂單',
                products: [
                    {
                        id: crypto.randomBytes(5).toString('hex'),
                        name: '商品一批',
                        quantity: 1,
                        price: amount, // 數字
                    },
                ],
            },
        ],
        options: { display: { locale: 'zh_TW' } },
        redirectUrls, // 設定重新導向與失敗導向的網址
    }

    if (isDev) console.log('📦 訂單資料:', order)

    try {
        // ===== LINE Pay API 調用 =====
        console.log('🚀 準備發送 LINE Pay 請求:', {
            orderId: finalOrderId,
            amount: amount,
            currency: 'TWD',
        })

        let linePayResponse

        try {
            // 向 LINE Pay API 發送付款請求
            linePayResponse = await linePayClient.request.send({
                body: { ...order, redirectUrls },
            })

            console.log('📨 LINE Pay 回應:', {
                returnCode: linePayResponse.body.returnCode,
                returnMessage: linePayResponse.body.returnMessage,
                hasInfo: !!linePayResponse.body.info,
            })
        } catch (apiError) {
            // 處理 LINE Pay API 拋出的異常（如重複訂單ID）
            console.log('⚠️ LINE Pay API 拋出異常:', apiError.message)

            if (apiError.message.includes('Existing same orderId')) {
                console.log('🔄 檢測到重複訂單ID，嘗試自動重試...')

                // 生成新的唯一訂單ID
                const newOrderId = generateUniqueOrderId()
                console.log('🆕 重試使用新的訂單ID:', newOrderId)

                // 更新訂單資料
                order.orderId = newOrderId

                // 更新快取（移除舊的，加入新的）
                orderIdCache.delete(finalOrderId)
                orderIdCache.set(newOrderId, {
                    timestamp: Date.now(),
                    amount: amount,
                })

                // 重新發送請求到 LINE Pay
                linePayResponse = await linePayClient.request.send({
                    body: { ...order, redirectUrls },
                })

                console.log('✅ 重試成功，使用新訂單ID:', newOrderId)
                console.log('📨 重試後 LINE Pay 回應:', {
                    returnCode: linePayResponse.body.returnCode,
                    returnMessage: linePayResponse.body.returnMessage,
                    hasInfo: !!linePayResponse.body.info,
                })

                // 更新最終使用的訂單ID
                finalOrderId = newOrderId

                // 更新 session 中的訂單資料
                if (req.session.reservation) {
                    req.session.reservation.orderId = newOrderId
                    console.log('🔄 更新 session 中的訂單ID:', newOrderId)
                }

                // 創建付款記錄（因為重試成功）
                try {
                    // 從前端傳入的 orderId 參數獲取原始訂單ID
                    // 如果 orderId 是數字，直接使用；如果是字串，需要查詢對應的原始訂單ID
                    let originalOrderId

                    if (orderId && !isNaN(parseInt(orderId, 10))) {
                        // 如果 orderId 是數字格式，直接使用
                        originalOrderId = parseInt(orderId, 10)
                    } else {
                        // 如果是字串格式或沒有提供，嘗試從 session 中獲取
                        if (req.session.reservation && req.session.reservation.originalOrderId) {
                            originalOrderId = req.session.reservation.originalOrderId
                        } else {
                            console.log('⚠️ 無法確定原始訂單ID，跳過創建付款記錄')
                            return // 跳過創建付款記錄
                        }
                    }

                    await connection.execute(
                        `INSERT INTO payment_records (order_id, merchant_trade_no, ecpay_trade_no, payment_method, payment_status, trade_amount, payment_date)
              VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            originalOrderId,
                            newOrderId, // LINE Pay 訂單ID存入 merchant_trade_no
                            '', // ecpay_trade_no 留空（這是 ECPay 專用欄位）
                            'LINE_PAY',
                            'pending',
                            amount,
                        ]
                    )

                    console.log('✅ 創建付款記錄成功:', {
                        originalOrderId,
                        newOrderId,
                        amount,
                    })
                } catch (dbError) {
                    console.error('❌ 創建付款記錄失敗:', dbError)
                }
            } else {
                // 其他 API 錯誤，重新拋出
                throw apiError
            }
        }

        // ===== 錯誤處理和自動重試機制 =====
        // 檢查 LINE Pay API 回應是否成功
        // returnCode '0000' 表示成功，其他代碼表示各種錯誤
        if (linePayResponse.body.returnCode !== '0000') {
            console.error('❌ LINE Pay 錯誤:', linePayResponse.body)

            // 特殊處理：錯誤碼 1172 或錯誤訊息包含 "Existing same orderId" - 訂單 ID 已存在
            if (
                linePayResponse.body.returnCode === '1172' ||
                linePayResponse.body.returnMessage?.includes('Existing same orderId')
            ) {
                console.log('🔄 檢測到重複訂單ID，嘗試自動重試...')

                // 生成新的唯一訂單ID
                const newOrderId = generateUniqueOrderId()
                console.log('🆕 重試使用新的訂單ID:', newOrderId)

                // 更新訂單資料
                order.orderId = newOrderId

                // 更新快取（移除舊的，加入新的）
                orderIdCache.delete(finalOrderId)
                orderIdCache.set(newOrderId, {
                    timestamp: Date.now(),
                    amount: amount,
                })

                // 重新發送請求到 LINE Pay
                try {
                    linePayResponse = await linePayClient.request.send({
                        body: { ...order, redirectUrls },
                    })

                    // 檢查重試結果
                    if (linePayResponse.body.returnCode !== '0000') {
                        console.error('❌ 重試後仍然失敗:', linePayResponse.body)
                        return errorResponse(res, 'LINE Pay 處理失敗，請稍後再試')
                    }

                    console.log('✅ 重試成功，使用新訂單ID:', newOrderId)
                    // 更新最終使用的訂單ID
                    finalOrderId = newOrderId
                } catch (retryError) {
                    console.error('❌ 重試過程中發生錯誤:', retryError)
                    return errorResponse(res, 'LINE Pay 處理失敗，請稍後再試')
                }
            } else {
                // 處理其他 LINE Pay 錯誤（非重複訂單ID錯誤）
                console.error('❌ LINE Pay 其他錯誤:', linePayResponse.body.returnMessage)
                return errorResponse(res, linePayResponse.body.returnMessage || 'LINE Pay 處理失敗')
            }
        }

        // ===== 成功處理 =====
        // 成功時：建立付款預約記錄
        // 深拷貝一份訂單資料，避免後續修改影響原始資料
        const reservation = JSON.parse(JSON.stringify(order))

        // 確保使用最終的訂單ID（可能經過重試後更新）
        reservation.orderId = finalOrderId

        // 將 LINE Pay 回應的重要資訊加入預約記錄
        reservation.returnCode = linePayResponse.body.returnCode
        reservation.returnMessage = linePayResponse.body.returnMessage
        reservation.transactionId = linePayResponse.body.info.transactionId // 交易 ID，用於後續確認
        reservation.paymentAccessToken = linePayResponse.body.info.paymentAccessToken // 付款存取權杖

        // 儲存原始訂單ID（來自前端的數字訂單ID）
        // 這對於後續的 payment_records 創建很重要
        if (orderId && !isNaN(parseInt(orderId, 10))) {
            reservation.originalOrderId = parseInt(orderId, 10)
        }

        if (isDev) console.log('✅ 預計付款記錄(Reservation):', reservation)

        // ===== 創建付款記錄 =====
        // 在正常成功流程中也要創建付款記錄
        try {
            // 從前端傳入的 orderId 參數獲取原始訂單ID
            let originalOrderId

            if (orderId && !isNaN(parseInt(orderId, 10))) {
                // 如果 orderId 是數字格式，直接使用
                originalOrderId = parseInt(orderId, 10)
            } else {
                // 如果是字串格式或沒有提供，嘗試從 session 中獲取
                if (req.session.reservation && req.session.reservation.originalOrderId) {
                    originalOrderId = req.session.reservation.originalOrderId
                } else {
                    console.log('⚠️ 無法確定原始訂單ID，跳過創建付款記錄')
                    originalOrderId = null
                }
            }

            if (originalOrderId) {
                // 檢查是否已存在相同的付款記錄，避免重複創建
                const [existingRecords] = await connection.execute(
                    'SELECT id FROM payment_records WHERE order_id = ? AND payment_method = ? AND payment_status = ?',
                    [originalOrderId, 'LINE_PAY', 'pending']
                )

                if (existingRecords.length === 0) {
                    await connection.execute(
                        `INSERT INTO payment_records (order_id, merchant_trade_no, ecpay_trade_no, payment_method, payment_status, trade_amount, payment_date)
              VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            originalOrderId,
                            finalOrderId, // LINE Pay 訂單ID存入 merchant_trade_no
                            '', // ecpay_trade_no 留空（這是 ECPay 專用欄位）
                            'LINE_PAY',
                            'pending',
                            amount,
                        ]
                    )

                    console.log('✅ 創建付款記錄成功:', {
                        originalOrderId,
                        finalOrderId,
                        amount,
                    })
                } else {
                    console.log('⚠️ 付款記錄已存在，跳過創建:', {
                        originalOrderId,
                        existingRecords: existingRecords.length,
                    })
                }
            }
        } catch (dbError) {
            console.error('❌ 創建付款記錄失敗:', dbError)
            // 不影響 LINE Pay 流程，只記錄錯誤
        }

        // 將預約記錄儲存到 session 中
        // 注意：這裡是為了安全性，在實際應用中應該要存到資料庫妥善保管
        req.session.reservation = reservation

        // 重新導向到 LINE Pay 付款頁面
        // 用戶將在此頁面完成付款流程
        console.log('🚀 重新導向到 LINE Pay 付款頁面，訂單ID:', finalOrderId)
        res.redirect(linePayResponse.body.info.paymentUrl.web)

        // 導向到付款頁面， line pay回應後會帶有info.paymentUrl.web為付款網址
        // successResponse(res, {
        //   paymentUrl: linePayResponse.body.info.paymentUrl.web,
        // })
    } catch (error) {
        // ===== 異常錯誤處理 =====
        // 處理 LINE Pay API 呼叫過程中的異常錯誤
        // 例如網路連線問題、API 格式錯誤等
        console.error('❌ LINE Pay API 異常錯誤:', {
            error: error.message,
            stack: error.stack,
            orderId: finalOrderId,
            amount: amount,
            // 補充可能的第三方錯誤載體
            responseData: error?.response?.data,
            body: error?.body,
        })

        // 清理快取中的訂單ID（因為發生錯誤）
        if (finalOrderId) {
            orderIdCache.delete(finalOrderId)
            console.log('🧹 清理錯誤訂單的快取:', finalOrderId)
        }

        errorResponse(res, 'LINE Pay 服務暫時無法使用，請稍後再試')
    }
})

// 付款完成後，導回前端同一畫面，之後由伺服器向Line Pay伺服器確認交易結果
// 格式參考: https://enylin.github.io/line-pay-merchant/api-reference/confirm.html#example
router.get('/confirm', async (req, res) => {
    // 網址上需要有transactionId和orderId
    const transactionId = req.query.transactionId
    const orderId = req.query.orderId

    console.log('🔍 LINE Pay confirm 接收參數:', {
        transactionId,
        orderId,
        orderIdType: typeof orderId,
        query: req.query,
    })

    if (!transactionId) {
        console.log('❌ 缺少 transactionId')
        return errorResponse(res, '缺少交易編號')
    }

    if (!orderId) {
        console.log('❌ 缺少 orderId')
        return errorResponse(res, '缺少訂單編號')
    }

    // 處理不同格式的 orderId
    let numericOrderId
    let isStringOrderId = false

    // 檢查是否為字串格式的訂單ID（如 LP 開頭的）
    if (orderId.startsWith('LP')) {
        isStringOrderId = true
        console.log('🔍 檢測到字串格式訂單ID:', orderId)
        // 對於字串格式的訂單ID，我們需要從 session 中獲取對應的數字訂單ID
        // 或者使用字串ID直接查詢資料庫
    } else {
        // 嘗試轉換為數字
        numericOrderId = parseInt(orderId, 10)
        if (isNaN(numericOrderId)) {
            console.log('❌ orderId 不是有效數字或字串格式:', orderId)
            return errorResponse(res, '無效的訂單編號')
        }
    }

    console.log('🔍 處理後的 orderId:', {
        original: orderId,
        numeric: numericOrderId,
        isStringOrderId: isStringOrderId,
    })

    let reservationData = req.session.reservation

    if (!reservationData) {
        console.log('❌ Session 中沒有 reservation 資料，嘗試從資料庫查詢...')

        // 嘗試從資料庫查詢付款記錄
        try {
            let query, params

            if (isStringOrderId) {
                // 對於字串格式的訂單ID，查詢 merchant_trade_no 欄位
                query = 'SELECT * FROM payment_records WHERE merchant_trade_no = ? AND payment_method = ?'
                params = [orderId, 'LINE_PAY']
            } else {
                // 對於數字格式的訂單ID，查詢 order_id 欄位
                query = 'SELECT * FROM payment_records WHERE order_id = ? AND payment_method = ?'
                params = [numericOrderId, 'LINE_PAY']
            }

            const [records] = await connection.execute(query, params)

            if (records.length > 0) {
                const record = records[0]
                reservationData = {
                    orderId: isStringOrderId ? orderId : numericOrderId,
                    amount: record.trade_amount,
                    transactionId: record.merchant_trade_no,
                }
                console.log('✅ 從資料庫找到付款記錄:', reservationData)
            } else {
                console.log('❌ 資料庫中也沒有找到付款記錄')
                return errorResponse(res, '沒有已記錄的付款資料')
            }
        } catch (dbError) {
            console.error('❌ 查詢資料庫失敗:', dbError)
            return errorResponse(res, '查詢付款資料失敗')
        }
    } else {
        console.log('✅ 找到 session reservation 資料:', {
            orderId: reservationData.orderId,
            amount: reservationData.amount,
            transactionId: reservationData.transactionId,
        })
    }

    // 從 reservation 資料得到交易金額（轉為數字）
    const amount = Number(reservationData?.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
        console.log('❌ reservation 資料中的 amount 無效:', reservationData?.amount)
        return errorResponse(res, '無效的付款金額（確認階段）')
    }

    try {
        // 最後確認交易
        console.log('🚀 準備發送 LINE Pay confirm 請求:', {
            transactionId,
            amount,
            currency: 'TWD',
        })

        const linePayResponse = await linePayClient.confirm.send({
            transactionId: transactionId,
            body: {
                currency: 'TWD',
                amount: amount, // 數字
            },
        })

        console.log('📨 LINE Pay confirm 回應:', {
            returnCode: linePayResponse.body.returnCode,
            returnMessage: linePayResponse.body.returnMessage,
        })

        // linePayResponse.body回傳的資料
        if (isDev) console.log('line-pay confirm', linePayResponse)

        // 檢查交易是否成功
        if (linePayResponse.body.returnCode === '0000') {
            console.log('✅ LINE Pay 交易成功，transactionId:', transactionId)
            console.log('🔍 LINE Pay 回應完整資料:', linePayResponse.body)

            // 更新 payment_records 資料表中的 merchant_trade_no 和 payment_status
            try {
                console.log('🔄 準備更新付款記錄:', {
                    orderId,
                    transactionId,
                    amount,
                    numericOrderId,
                    isStringOrderId,
                })

                // 先測試資料庫連接
                console.log('🧪 測試資料庫連接...')
                const [testResult] = await connection.execute('SELECT 1 as test')
                console.log('✅ 資料庫連接正常:', testResult)

                let updatePaymentRecord
                let updateParams

                if (isStringOrderId) {
                    // 對於字串格式的訂單ID，使用 merchant_trade_no 欄位查詢
                    // 注意：不要覆蓋 merchant_trade_no，因為它已經是正確的 LINE Pay 訂單ID
                    updatePaymentRecord = `
            UPDATE payment_records
            SET payment_status = 'success',
                payment_date = NOW()
            WHERE merchant_trade_no = ? AND payment_method = 'LINE_PAY' AND payment_status = 'pending'
          `
                    updateParams = [orderId]
                } else {
                    // 對於數字格式的訂單ID，使用 order_id 欄位查詢
                    updatePaymentRecord = `
            UPDATE payment_records
            SET payment_status = 'success',
                payment_date = NOW()
            WHERE order_id = ? AND payment_method = 'LINE_PAY' AND payment_status = 'pending'
          `
                    updateParams = [numericOrderId]
                }

                console.log('🔄 執行更新 SQL:', updatePaymentRecord)
                console.log('🔄 更新參數:', updateParams)

                const [result] = await connection.execute(updatePaymentRecord, updateParams)

                console.log('📊 更新結果:', {
                    affectedRows: result.affectedRows,
                    changedRows: result.changedRows,
                })

                if (result.affectedRows === 0) {
                    console.log('⚠️ 沒有找到符合條件的付款記錄，嘗試查找現有記錄...')

                    let existingRecords
                    let allRecords
                    let allOrderRecords

                    if (isStringOrderId) {
                        // 對於字串格式的訂單ID，查詢 merchant_trade_no 欄位
                        ;[existingRecords] = await connection.execute(
                            'SELECT * FROM payment_records WHERE merchant_trade_no = ?',
                            [orderId]
                        )
                        ;[allRecords] = await connection.execute(
                            'SELECT * FROM payment_records WHERE merchant_trade_no = ? AND payment_method = ?',
                            [orderId, 'LINE_PAY']
                        )
                        ;[allOrderRecords] = await connection.execute(
                            'SELECT * FROM payment_records WHERE merchant_trade_no = ?',
                            [orderId]
                        )
                    } else {
                        // 對於數字格式的訂單ID，查詢 order_id 欄位
                        ;[existingRecords] = await connection.execute(
                            'SELECT * FROM payment_records WHERE order_id = ?',
                            [numericOrderId]
                        )
                        ;[allRecords] = await connection.execute(
                            'SELECT * FROM payment_records WHERE order_id = ? AND payment_method = ?',
                            [numericOrderId, 'LINE_PAY']
                        )
                        ;[allOrderRecords] = await connection.execute(
                            'SELECT * FROM payment_records WHERE order_id = ?',
                            [numericOrderId]
                        )
                    }

                    console.log('🔍 現有付款記錄:', existingRecords)
                    console.log('🔍 查詢 LINE_PAY 記錄:', allRecords)
                    console.log('🔍 所有該訂單的付款記錄:', allOrderRecords)
                }

                console.log('✅ 付款記錄已更新到資料庫:', {
                    orderId: isStringOrderId ? orderId : numericOrderId,
                    transactionId,
                    amount,
                })

                // 更新 orders 表的 payment_status
                try {
                    let actualOrderId

                    if (isStringOrderId) {
                        // 對於 LINE Pay 字串格式的訂單ID，需要先查詢對應的原始 order_id
                        console.log('🔍 查詢 LINE Pay 訂單ID 對應的原始訂單ID:', orderId)

                        const [orderRecords] = await connection.execute(
                            'SELECT order_id FROM payment_records WHERE merchant_trade_no = ? AND payment_method = ?',
                            [orderId, 'LINE_PAY']
                        )
                        console.log('🔍 payment_records 查詢結果:', orderRecords)

                        if (orderRecords.length > 0) {
                            actualOrderId = orderRecords[0].order_id
                            console.log('✅ 找到對應的原始訂單ID:', actualOrderId)
                        } else {
                            console.log('❌ 無法在 payment_records 中找到對應的記錄')
                            // 嘗試從 session 中獲取
                            if (req.session.reservation && req.session.reservation.originalOrderId) {
                                actualOrderId = req.session.reservation.originalOrderId
                                console.log('🔍 從 session 獲取原始訂單ID:', actualOrderId)
                            } else {
                                console.log('❌ session 中也沒有原始訂單ID，跳過更新 orders 表')
                                actualOrderId = null
                            }
                        }
                    } else {
                        // 對於數字格式的訂單ID，直接使用
                        actualOrderId = numericOrderId
                        console.log('🔍 使用數字格式訂單ID:', actualOrderId)
                    }

                    if (actualOrderId) {
                        // 先查詢 orders 表是否存在該記錄
                        const [orderCheck] = await connection.execute(
                            'SELECT id, payment_status FROM orders WHERE id = ?',
                            [actualOrderId]
                        )
                        console.log('🔍 更新前 orders 表查詢結果:', orderCheck)

                        if (orderCheck.length === 0) {
                            console.log('❌ orders 表中找不到 ID 為', actualOrderId, '的記錄')
                        } else {
                            const [orderUpdateResult] = await connection.execute(
                                'UPDATE orders SET payment_status = ? WHERE id = ?',
                                ['success', actualOrderId]
                            )

                            console.log('✅ 更新 orders 表執行結果:', {
                                orderId: actualOrderId,
                                affectedRows: orderUpdateResult.affectedRows,
                                changedRows: orderUpdateResult.changedRows,
                            })

                            if (orderUpdateResult.affectedRows === 0) {
                                console.log('⚠️ orders 表更新失敗，沒有影響任何記錄')
                            } else {
                                // 驗證更新結果
                                const [updatedOrderCheck] = await connection.execute(
                                    'SELECT id, payment_status FROM orders WHERE id = ?',
                                    [actualOrderId]
                                )
                                console.log('🔍 更新後 orders 表查詢結果:', updatedOrderCheck)
                            }
                        }
                    }
                } catch (orderUpdateError) {
                    console.error('❌ 更新 orders 表失敗:', orderUpdateError)
                }
            } catch (dbError) {
                console.error('❌ 更新付款記錄失敗:', dbError)
                // 不影響 LINE Pay 確認流程，只記錄錯誤
            }
        } else {
            console.log('❌ LINE Pay 交易失敗:', linePayResponse.body.returnMessage)
        }

        // 清除session中的reservation的資料
        if (req.session.reservation) delete req.session.reservation

        // 處理重導向的訂單ID
        let redirectOrderId = numericOrderId

        if (isStringOrderId) {
            // 對於字串格式的訂單ID，使用字串ID進行重導向
            // 因為前端 orders API 已經支援通過 merchant_trade_no 查詢
            console.log('🔍 使用字串格式的 LINE Pay 訂單ID 進行重導向:', orderId)
            redirectOrderId = orderId
        }

        // 重導向到成功頁面
        console.log('🚀 重導向到成功頁面，訂單ID:', redirectOrderId)
        console.log('🚀 重導向URL:', `http://localhost:3000/cart/checkout/success?orderId=${redirectOrderId}`)
        res.redirect(`http://localhost:3000/cart/checkout/success?orderId=${redirectOrderId}`)
    } catch (error) {
        console.error('❌ LINE Pay 確認交易失敗:', error)
        errorResponse(res, error)
    }
})

// 檢查交易用(查詢LINE Pay付款請求的狀態。商家應隔一段時間後直接檢查付款狀態)
router.get('/check-payment-status', async (req, res) => {
    const transactionId = req.query.transactionId

    try {
        const linePayResponse = await linePayClient.checkPaymentStatus.send({
            transactionId: transactionId,
            params: {},
        })

        // 範例:
        // {
        //   "body": {
        //     "returnCode": "0000",
        //     "returnMessage": "reserved transaction."
        //   },
        //   "comments": {}
        // }

        successResponse(res, { data: linePayResponse.body })
    } catch (error) {
        errorResponse(res, error)
    }
})

// 測試路由：手動更新付款記錄
router.get('/test-update/:orderId/:transactionId', async (req, res) => {
    const orderId = parseInt(req.params.orderId, 10)
    const transactionId = req.params.transactionId

    console.log('🧪 測試更新付款記錄:', { orderId, transactionId })

    try {
        // 先查詢現有記錄
        const [existingRecords] = await connection.execute('SELECT * FROM payment_records WHERE order_id = ?', [
            orderId,
        ])

        console.log('🔍 現有記錄:', existingRecords)

        // 更新記錄
        const updatePaymentRecord = `
      UPDATE payment_records
      SET merchant_trade_no = ?,
          payment_status = 'success',
          payment_date = NOW()
      WHERE order_id = ? AND payment_method = 'LINE_PAY'
    `

        const [result] = await connection.execute(updatePaymentRecord, [transactionId, orderId])

        console.log('📊 更新結果:', {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows,
        })

        // 查詢更新後的記錄
        const [updatedRecords] = await connection.execute('SELECT * FROM payment_records WHERE order_id = ?', [orderId])

        console.log('🔍 更新後記錄:', updatedRecords)

        res.json({
            success: true,
            message: '測試更新完成',
            result: {
                affectedRows: result.affectedRows,
                changedRows: result.changedRows,
                updatedRecords,
            },
        })
    } catch (error) {
        console.error('❌ 測試更新失敗:', error)
        res.status(500).json({
            success: false,
            error: error.message,
        })
    }
})

export default router
