import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth' // 宋做的修改：引入 useAuth 以使用統一的 JWT 管理

export const useOrder = () => {
    // 宋做的修改：使用 useAuth 提供的 JWT 方法，避免重複實現
    // 這樣可以確保所有 hook 使用相同的 token 管理邏輯
    const { getToken, apiRequest, isAuth, isInitialized } = useAuth()

    // 訂單狀態管理
    const [order, setOrder] = useState(null)
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'syncing' | 'synced' | 'error'

    // 新增：結帳狀態
    const [submitting, setSubmitting] = useState(false)

    // 分頁狀態
    const [pagination, setPagination] = useState({
        current_page: 1,
        total_pages: 0,
        total_orders: 0,
        limit: 10,
    })

    // 宋做的修改：移除重複的 JWT 處理邏輯，因為 useAuth 已經提供
    // 刪除：getToken, refreshToken 函數
    // 這些方法現在統一由 useAuth 提供，避免重複實現和潛在的競態條件

    // 🚀 新增：地址格式化函數 - 解決 711 門市地址和宅配地址格式問題
    const formatShippingAddress = (addressData, deliveryMethod) => {
        if (deliveryMethod === '711') {
            // 711 門市地址：直接使用 storeaddress，移除 null 值
            const address = addressData.addressLine || ''
            // 移除 "null" 字串和多余空格，解決 "null null null 苗栗縣西湖鄉金獅村2鄰金獅26-2號" 問題
            return address
                .replace(/\bnull\b/g, '') // 移除 "null" 字串
                .replace(/\s+/g, ' ') // 將多個空格替換為單個空格
                .trim() // 移除首尾空格
        } else {
            // 宅配地址：組合郵遞區號、縣市、區域、地址，移除多餘空格
            const parts = [addressData.zipcode, addressData.city, addressData.district, addressData.addressLine].filter(
                (part) => part && part !== 'null' && part.trim() !== ''
            ) // 過濾掉空值和 null

            return parts.join('') // 直接連接，不添加空格，解決 "512彰化縣永靖鄉大同路28號" 格式
        }
    }

    // 建立訂單摘要 (從購物車點擊立即結帳按鈕觸發)
    const createOrderSummary = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setSyncStatus('syncing')

            // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
            // 這樣可以自動處理 token 刷新和 401 錯誤
            const response = await apiRequest('http://localhost:3005/api/orders', {
                method: 'POST',
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || '建立訂單摘要失敗')
            }

            const data = await response.json()

            if (data.status === 'success') {
                setOrder(data.data)
                setSyncStatus('synced')
                return data.data
            } else {
                throw new Error(data.message || '建立訂單摘要失敗')
            }
        } catch (error) {
            console.error('建立訂單摘要失敗:', error)
            setError(error.message)
            setSyncStatus('error')
            throw error
        } finally {
            setLoading(false)
        }
    }, [apiRequest]) // 宋做的修改：添加依賴項，確保 hook 正確更新

    // 資料完整性驗證函數
    const validateCheckoutData = (checkoutData) => {
        const errors = []

        // 驗證購物車項目
        if (!checkoutData.cartItems || checkoutData.cartItems.length === 0) {
            errors.push('購物車不得為空')
            return errors
        }

        // 驗證每筆商品資料
        checkoutData.cartItems.forEach((item, index) => {
            if (!item.id && !item.vinyl_id) {
                errors.push(`第 ${index + 1} 筆商品缺少 id`)
            }
            if (!item.name && !item.vinyl_name) {
                errors.push(`第 ${index + 1} 筆商品缺少 name`)
            }
            if (item.price === undefined && item.unit_price === undefined) {
                errors.push(`第 ${index + 1} 筆商品缺少 price`)
            }
            if (!item.qty && !item.quantity) {
                errors.push(`第 ${index + 1} 筆商品缺少 qty`)
            } else if ((item.qty || item.quantity) <= 0) {
                errors.push(`第 ${index + 1} 筆商品數量必須大於 0`)
            }
            if (item.subtotal === undefined) {
                errors.push(`第 ${index + 1} 筆商品缺少 subtotal`)
            }
        })

        // 驗證金額資料
        const { totals } = checkoutData
        if (!totals) {
            errors.push('缺少 totals 資料')
            return errors
        }

        const requiredTotalFields = ['itemsSubtotal', 'shippingFee', 'discountTotal', 'payableTotal']
        requiredTotalFields.forEach((field) => {
            if (typeof totals[field] !== 'number' || isNaN(totals[field])) {
                errors.push(`totals.${field} 必須為有效數字`)
            }
        })

        if (totals.payableTotal < 0) {
            errors.push('payableTotal 不可為負數')
        }

        // 驗證地址資料
        const { shippingAddress } = checkoutData
        if (!shippingAddress) {
            errors.push('缺少 shippingAddress 資料')
            return errors
        }

        // 🚀 新增：根據配送方式決定必填欄位
        const deliveryMethod = checkoutData.deliveryMethod

        if (deliveryMethod === '711') {
            // 7-11 門市取貨：只需要門市名稱和地址
            const required711Fields = ['fullName', 'addressLine']
            required711Fields.forEach((field) => {
                if (!shippingAddress[field]) {
                    errors.push(`shippingAddress.${field} 必填`)
                }
            })
        } else {
            // 宅配到府：需要完整地址資訊
            const requiredHomeFields = ['fullName', 'mobile', 'zipcode', 'city', 'district', 'addressLine']
            requiredHomeFields.forEach((field) => {
                if (!shippingAddress[field]) {
                    errors.push(`shippingAddress.${field} 必填`)
                }
            })
        }

        // 驗證收件人資料（如果與收貨地址不同）
        if (checkoutData.recipient) {
            if (deliveryMethod === '711') {
                // 7-11 門市取貨：收件人只需要姓名和電話
                const required711RecipientFields = ['fullName', 'mobile']
                required711RecipientFields.forEach((field) => {
                    if (!checkoutData.recipient[field]) {
                        errors.push(`recipient.${field} 必填`)
                    }
                })
            } else {
                // 宅配到府：收件人需要完整資訊
                const requiredHomeRecipientFields = ['fullName', 'mobile', 'zipcode', 'city', 'district', 'addressLine']
                requiredHomeRecipientFields.forEach((field) => {
                    if (!checkoutData.recipient[field]) {
                        errors.push(`recipient.${field} 必填`)
                    }
                })
            }
        }

        // 驗證使用者資料
        const { user } = checkoutData
        if (!user) {
            errors.push('缺少 user 資料')
            return errors
        }

        if (!user.memberId && !user.email) {
            errors.push('user 至少需有 memberId 或 email')
        }

        return errors
    }

    // 組裝 mock 付款資料
    const buildMockPayment = (amount) => {
        return {
            provider: 'mock',
            method: 'CREDIT_CARD',
            // 與後端慣例一致：使用小寫狀態
            status: 'pending',
            amount: amount,
            currency: 'TWD',
            cardLast4: '4242',
            txnRef: null,
            preparedAt: new Date().toISOString(),
        }
    }

    // 組裝送單資料 - 根據資料庫結構調整
    const buildCheckoutBody = (checkoutData) => {
        // 處理商品項目資料 - 對應 order_items 表結構
        const items = checkoutData.cartItems.map((item) => ({
            vinyl_id: item.id || item.vinyl_id, // 對應 order_items.vinyl_id
            quantity: item.qty || item.quantity, // 對應 order_items.quantity
            unit_price: item.price || item.unit_price, // 對應 order_items.unit_price
            // 額外資訊用於前端顯示
            name: item.name || item.vinyl_name,
            subtotal: item.subtotal,
        }))

        // 處理收件人資料 - 對應 orders 表結構
        const recipient = checkoutData.recipient || {
            fullName: checkoutData.shippingAddress.fullName,
            mobile: checkoutData.shippingAddress.mobile,
            zipcode: checkoutData.shippingAddress.zipcode,
            city: checkoutData.shippingAddress.city,
            district: checkoutData.shippingAddress.district,
            addressLine: checkoutData.shippingAddress.addressLine,
        }

        // 處理地址資料 - 對應 orders.shipping_address
        const shippingAddress = {
            fullName: checkoutData.shippingAddress.fullName,
            mobile: checkoutData.shippingAddress.mobile,
            zipcode: checkoutData.shippingAddress.zipcode,
            city: checkoutData.shippingAddress.city,
            district: checkoutData.shippingAddress.district,
            addressLine: checkoutData.shippingAddress.addressLine,
        }

        // 🚀 修改：使用新的地址格式化函數，解決地址格式問題
        const formattedAddress = formatShippingAddress(shippingAddress, checkoutData.deliveryMethod)

        // 組裝完整送單資料 - 對應資料庫欄位
        return {
            // 對應 orders 表
            user_id: checkoutData.user.memberId,
            total_price: checkoutData.totals.payableTotal,
            points_used: checkoutData.usedPoints || 0,
            // 🚀 型別保護：coupon_id 需為數字，若為 "code-applied" 等非數字則傳 null 以避免後端/DB 錯誤
            coupon_id: (() => {
                const raw = checkoutData.coupon?.id ?? checkoutData.coupon?.coupon_id ?? checkoutData.selectedCoupon
                const n = Number(raw)
                return Number.isFinite(n) ? n : null
            })(),
            payment_status: 'pending', // 固定為 pending
            shipping_status: 'processing', // 固定為 processing 後端會再確認一次
            recipient_name: recipient.fullName,
            recipient_phone: recipient.mobile,
            shipping_address: formattedAddress, // 🚀 使用格式化後的地址

            // 對應 order_items 表
            items: items,

            // 🚀 新增：物流資訊 - 對應 logistics_info 表
            logisticsInfo: checkoutData.logisticsInfo || null,

            // 🚀 新增：付款方式 - 對應 payment_records 表
            payment_method: checkoutData.payment_method,

            // 額外資訊用於前端處理
            totals: checkoutData.totals,
            payment: buildMockPayment(checkoutData.totals.payableTotal),
        }
    }

    // 結帳函數
    const checkoutOrder = useCallback(
        async (checkoutData) => {
            try {
                setSubmitting(true)
                setError(null)

                console.log('🔍 開始驗證結帳資料...', checkoutData)

                // 資料完整性驗證
                const validationErrors = validateCheckoutData(checkoutData)
                if (validationErrors.length > 0) {
                    const errorMessage = validationErrors.join('\n')
                    console.error('❌ 資料驗證失敗:', errorMessage)
                    setError(errorMessage)
                    throw new Error(errorMessage)
                }

                console.log('✅ 資料驗證通過，開始組裝送單資料...')

                // 組裝送單資料
                const requestBody = buildCheckoutBody(checkoutData)
                console.log('📦 送單資料組裝完成:', requestBody)

                // 呼叫後端 API
                // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
                const response = await apiRequest('http://localhost:3005/api/orders/checkout', {
                    method: 'POST',
                    body: JSON.stringify(requestBody),
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    const errorMessage = errorData.message || `Checkout 失敗 (HTTP ${response.status})`
                    console.error('❌ 結帳失敗:', errorMessage)
                    setError(errorMessage)
                    throw new Error(errorMessage)
                }

                const data = await response.json()
                console.log('✅ 結帳成功:', data)

                if (data.status === 'success') {
                    // 檢查回傳資料是否包含必要欄位
                    if (!data.data.orderId && !data.data.orderNo) {
                        console.warn('⚠️ 後端回傳資料缺少 orderId 或 orderNo')
                    }

                    // 與後端回傳格式對齊（大小寫不敏感），避免誤報
                    const paymentStatus = String(data.data.payment?.status || '').toLowerCase()
                    if (paymentStatus !== 'pending') {
                        console.warn('⚠️ 後端回傳的付款狀態非預期（應為 pending）:', data.data.payment?.status)
                    }

                    return data.data
                } else {
                    throw new Error(data.message || '結帳失敗')
                }
            } catch (error) {
                console.error('❌ 結帳過程發生錯誤:', error)
                setError(error.message)
                throw error
            } finally {
                setSubmitting(false)
            }
        },
        [apiRequest]
    ) // 宋做的修改：添加依賴項

    // 取得使用者訂單列表
    const fetchOrders = useCallback(
        async (page = 1, limit = 10, search = '', status = '') => {
            try {
                setLoading(true)
                setError(null)
                setSyncStatus('syncing')

                // 建立查詢參數
                const params = new URLSearchParams({
                    page: page.toString(),
                    limit: limit.toString(),
                })

                if (search && search.trim()) {
                    params.append('search', search.trim())
                }

                if (status && status !== 'all') {
                    params.append('status', status)
                }

                // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
                const response = await apiRequest(`http://localhost:3005/api/orders?${params.toString()}`, {
                    method: 'GET',
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || '取得訂單列表失敗')
                }

                const data = await response.json()

                if (data.status === 'success') {
                    setOrders(data.data.orders)
                    setPagination(data.data.pagination)
                    setSyncStatus('synced')
                    return data.data
                } else {
                    throw new Error(data.message || '取得訂單列表失敗')
                }
            } catch (error) {
                console.error('取得訂單列表失敗:', error)
                setError(error.message)
                setSyncStatus('error')
                throw error
            } finally {
                setLoading(false)
            }
        },
        [apiRequest]
    ) // 宋做的修改：添加依賴項

    // 取得單一訂單詳情
    const fetchOrderDetail = useCallback(
        async (orderId) => {
            try {
                setLoading(true)
                setError(null)
                setSyncStatus('syncing')

                // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
                const response = await apiRequest(`http://localhost:3005/api/orders/${orderId}`, {
                    method: 'GET',
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || '取得訂單詳情失敗')
                }

                const data = await response.json()

                if (data.status === 'success') {
                    setOrder(data.data)
                    setSyncStatus('synced')
                    return data.data
                } else {
                    throw new Error(data.message || '取得訂單詳情失敗')
                }
            } catch (error) {
                console.error('取得訂單詳情失敗:', error)
                setError(error.message)
                setSyncStatus('error')
                throw error
            } finally {
                setLoading(false)
            }
        },
        [apiRequest]
    ) // 宋做的修改：添加依賴項

    // 取消訂單
    const cancelOrder = useCallback(
        async (orderId) => {
            try {
                setLoading(true)
                setError(null)
                setSyncStatus('syncing')

                // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
                const response = await apiRequest(`http://localhost:3005/api/orders/${orderId}/cancel`, {
                    method: 'PATCH',
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || '取消訂單失敗')
                }

                const data = await response.json()

                if (data.status === 'success') {
                    // 更新本地訂單狀態
                    setOrders((prevOrders) =>
                        prevOrders.map((order) =>
                            order.id === orderId ? { ...order, payment_status: 'cancelled' } : order
                        )
                    )

                    // 如果當前查看的是被取消的訂單，也更新它
                    if (order && order.id === orderId) {
                        setOrder((prevOrder) => ({
                            ...prevOrder,
                            payment_status: 'cancelled',
                        }))
                    }

                    setSyncStatus('synced')
                    return data.data
                } else {
                    throw new Error(data.message || '取消訂單失敗')
                }
            } catch (error) {
                console.error('取消訂單失敗:', error)
                setError(error.message)
                setSyncStatus('error')
                throw error
            } finally {
                setLoading(false)
            }
        },
        [order, apiRequest] // 宋做的修改：添加依賴項
    )

    // 清除錯誤
    const clearError = useCallback(() => {
        setError(null)
        setSyncStatus('idle')
    }, [])

    // 更新付款狀態方法 - 前端自動更新付款成功狀態
    const updatePaymentStatus = useCallback(
        async (orderId, paymentStatus) => {
            try {
                setLoading(true)
                clearError()

                console.log(`�� 更新訂單 ${orderId} 付款狀態為: ${paymentStatus}`)

                const response = await apiRequest(`http://localhost:3005/api/orders/${orderId}/payment-status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ payment_status: paymentStatus }),
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || '更新付款狀態失敗')
                }

                const result = await response.json()
                console.log('✅ 付款狀態更新成功:', result)

                // 重新獲取訂單詳情以更新本地狀態
                await fetchOrderDetail(orderId)

                return result
            } catch (error) {
                console.error('❌ 更新付款狀態失敗:', error)
                setError(error.message)
                throw error
            } finally {
                setLoading(false)
            }
        },
        [apiRequest, fetchOrderDetail, clearError]
    )

    // 重新同步
    const retrySync = useCallback(() => {
        setError(null)
        setSyncStatus('idle')
        if (orders.length > 0) {
            fetchOrders(pagination.current_page, pagination.limit)
        }
    }, [orders.length, pagination.current_page, pagination.limit, fetchOrders])

    // 初始化時載入訂單列表：需已初始化且已登入
    useEffect(() => {
        if (isInitialized && isAuth) {
            fetchOrders(1, 10)
        }
    }, [fetchOrders, isInitialized, isAuth])

    return {
        // 狀態
        order,
        orders,
        loading,
        error,
        syncStatus,
        pagination,
        submitting, // 新增：結帳提交狀態

        // 方法
        createOrderSummary,
        checkoutOrder,
        fetchOrders,
        fetchOrderDetail,
        cancelOrder,
        clearError,
        updatePaymentStatus,
        retrySync,

        // 工具方法
        // 宋做的修改：移除重複的 JWT 方法，因為 useAuth 已經提供
        // getToken, // 移除，因為 useAuth 提供
        // refreshToken, // 移除，因為 useAuth 提供
    }
}
