// API 配置文件
export const API_CONFIG = {
    // 基礎 URL
    BASE_URL:
        process.env.NODE_ENV === 'production' ? 'https://your-production-domain.com/api' : 'http://localhost:3005/api',

    // API 端點
    ENDPOINTS: {
        // 用戶相關
        USERS: {
            REGISTER: '/users/register',
            SEND_VERIFICATION: '/users/send-verification',
            VERIFY_EMAIL: '/users/verify-email',
            RESEND_VERIFICATION: '/users/resend-verification',
            LOGIN: '/users/login',
            LOGOUT: '/users/logout',
            STATUS: '/users/status',
            PROFILE: '/users/profile',
            UPDATE: '/users/update',
            PASSWORD: '/users/password',
        },

        // 地址相關
        ADDRESSES: {
            LIST: '/addresses',
            CREATE: '/addresses',
            UPDATE: (id) => `/addresses/${id}`,
            DELETE: (id) => `/addresses/${id}`,
            SET_DEFAULT: (id) => `/addresses/${id}/default`,
        },

        // 訂單相關
        ORDERS: {
            LIST: '/orders',
            CREATE: '/orders',
            DETAILS: (id) => `/orders/${id}`,
            UPDATE_STATUS: (id) => `/orders/${id}/status`,
            DELETE: (id) => `/orders/${id}`,
        },

        // 購物車相關
        CART: {
            GET: '/carts',
            ADD: '/carts',
            UPDATE: (id) => `/carts/${id}`,
            DELETE: (id) => `/carts/${id}`,
            CLEAR: '/carts/clear',
        },

        // 優惠券相關
        COUPONS: {
            LIST: '/coupons',
            APPLY: '/coupons/apply',
            VALIDATE: '/coupons/validate',
        },

        // 點數相關
        POINTS: {
            BALANCE: '/points/balance',
            HISTORY: '/points/history',
            EARN: '/points/earn',
            SPEND: '/points/spend',
        },

        // 論壇相關
        FORUMS: {
            ARTICLES: '/forums/articles',
            CREATE: '/forums/articles',
            DETAILS: (id) => `/forums/articles/${id}`,
            UPDATE: (id) => `/forums/articles/${id}`,
            DELETE: (id) => `/forums/articles/${id}`,
            COMMENTS: (id) => `/forums/articles/${id}/comments`,
        },

        // 產品相關
        PRODUCTS: {
            LIST: '/products',
            DETAILS: (id) => `/products/${id}`,
            SEARCH: '/products/search',
            CATEGORIES: '/products/categories',
        },

        // 郵件相關
        MAIL: {
            SEND_OTP: '/mail',
            CONTACT: '/mail/contact',
        },
    },

    // 請求配置
    REQUEST_CONFIG: {
        TIMEOUT: 10000, // 10 秒
        RETRY_ATTEMPTS: 1, // 重試次數
        RETRY_DELAY: 1000, // 重試延遲（毫秒）
    },

    // 錯誤消息
    ERROR_MESSAGES: {
        NETWORK_ERROR: '網絡連接錯誤，請檢查網絡連接',
        TIMEOUT_ERROR: '請求超時，請稍後再試',
        UNAUTHORIZED: '登入已過期，請重新登入',
        FORBIDDEN: '沒有權限執行此操作',
        NOT_FOUND: '請求的資源不存在',
        SERVER_ERROR: '服務器錯誤，請稍後再試',
        VALIDATION_ERROR: '輸入數據驗證失敗',
    },
}

// 構建完整的 API URL
export const buildApiUrl = (endpoint) => {
    if (typeof endpoint === 'function') {
        throw new Error('endpoint 不能是函數，請先調用它')
    }
    return `${API_CONFIG.BASE_URL}${endpoint}`
}

// 構建帶參數的 API URL
export const buildApiUrlWithParams = (endpoint, params = {}) => {
    let url = buildApiUrl(endpoint)

    if (Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, value)
            }
        })
        url += `?${searchParams.toString()}`
    }

    return url
}
