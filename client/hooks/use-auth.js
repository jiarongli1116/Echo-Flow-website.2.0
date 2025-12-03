'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useContext, createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'

// 創建認證上下文
const AuthContext = createContext(null)
AuthContext.displayName = 'AuthContext'

// 固定的定義
const APP_KEY = 'reactLoginToken'
const API_BASE_URL = 'http://localhost:3005'
const LOGIN_ROUTE = '/auth/login'
const PROTECTED_ROUTES = ['/users', '/cart', '/ship']

// 錯誤消息
const ERROR_MESSAGES = {
    NO_TOKEN: '未找到登入憑證，請重新登入',
    LOGIN_EXPIRED: '登入已過期，請重新登入',
    LOGIN_FAILED: '登入失敗，請稍後再試',
    LOGOUT_ERROR: '登出時發生錯誤',
    USER_LIST_ERROR: '使用者列表取得錯誤',
    TOKEN_VALIDATION_FAILED: 'Token 驗證失敗',
    TOKEN_VALIDATION_ERROR: 'Token 驗證錯誤',
}

// API 端點
const API_ENDPOINTS = {
    LOGIN: `${API_BASE_URL}/api/users/login`,
    LOGOUT: `${API_BASE_URL}/api/users/logout`,
    STATUS: `${API_BASE_URL}/api/users/status`,
    USERS: `${API_BASE_URL}/api/users`,
}

// 安全的 localStorage 操作
const safeLocalStorage = {
    getItem: (key) => {
        if (typeof window === 'undefined') return null
        try {
            return localStorage.getItem(key)
        } catch (error) {
            console.error('localStorage.getItem 錯誤:', error)
            return null
        }
    },
    setItem: (key, value) => {
        if (typeof window === 'undefined') return
        try {
            localStorage.setItem(key, value)
        } catch (error) {
            console.error('localStorage.setItem 錯誤:', error)
        }
    },
    removeItem: (key) => {
        if (typeof window === 'undefined') return
        try {
            localStorage.removeItem(key)
        } catch (error) {
            console.error('localStorage.removeItem 錯誤:', error)
        }
    },
}

export function AuthProvider({ children }) {
    // 狀態管理
    const [user, setUser] = useState(null)
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isInitialized, setIsInitialized] = useState(false)

    // Next.js hooks
    const router = useRouter()
    const pathname = usePathname()

    // 獲取 JWT Token 的方法
    const getToken = useCallback(() => {
        return safeLocalStorage.getItem(APP_KEY)
    }, [])

    // 設置 JWT Token 的方法
    const setToken = useCallback((token) => {
        if (token) {
            safeLocalStorage.setItem(APP_KEY, token)
        } else {
            safeLocalStorage.removeItem(APP_KEY)
        }
    }, [])

    // 檢查用戶是否已登入
    const isLoggedIn = useCallback(() => {
        const token = getToken()
        return Boolean(token)
    }, [getToken])

    // 統一的 API 請求方法，包含自動 Token 刷新邏輯和優雅的錯誤處理
    const apiRequest = useCallback(
        async (url, options = {}) => {
            const token = getToken()

            if (!token) {
                // 檢查是否為受保護的路由，如果是則重定向到登入頁面
                if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
                    router.push(LOGIN_ROUTE)
                    return null
                }
                // 如果不是受保護的路由，返回 null 而不是拋出錯誤
                return null
            }

            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    ...options.headers,
                },
                ...options,
            }

            let response = await fetch(url, defaultOptions)

            // 宋做的修改：僅在原請求回應為 401（未授權）時才嘗試刷新 Token，避免誤清除 token
            if (response.status === 401) {
                try {
                    console.log('Token 已過期，嘗試刷新...')

                    const refreshResponse = await fetch(API_ENDPOINTS.STATUS, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    })

                    if (refreshResponse.ok) {
                        const data = await refreshResponse.json()

                        if (data.data && data.data.token) {
                            // 宋做的修改：刷新成功後，更新本地 token，並以新 token 重試原請求
                            setToken(data.data.token)
                            console.log('Token 刷新成功')

                            // 使用新 token 重試原請求
                            const retryOptions = {
                                ...defaultOptions,
                                headers: {
                                    ...defaultOptions.headers,
                                    Authorization: `Bearer ${data.data.token}`,
                                },
                            }
                            response = await fetch(url, retryOptions)
                        } else {
                            // 宋做的修改：未取得新 token，視為未授權（清除 token 並提示需重新登入）
                            setToken(null)
                            setUser(null)
                            throw new Error(ERROR_MESSAGES.LOGIN_EXPIRED)
                        }
                    } else if (refreshResponse.status === 401) {
                        // 宋做的修改：僅在刷新請求也回 401 時，才清除 token，避免非授權以外的錯誤造成誤登出
                        setToken(null)
                        setUser(null)
                        throw new Error(ERROR_MESSAGES.LOGIN_EXPIRED)
                    } else {
                        // 宋做的修改：非 401 的錯誤（如 5xx/網路問題）不清除 token，回傳可恢復訊息供上層處理
                        throw new Error('服務暫時不可用，請稍後重試')
                    }
                } catch (refreshError) {
                    console.error('Token 刷新失敗:', refreshError)
                    // 宋做的修改：非 401 的刷新失敗不清除 token，交由上層依需求提示重試
                    if (refreshError?.message === ERROR_MESSAGES.LOGIN_EXPIRED) {
                        throw refreshError
                    }
                    throw new Error('服務暫時不可用，請稍後重試')
                }
            }

            return response
        },
        [getToken, setToken, pathname, router]
    )

    // 用戶登入方法
    const login = useCallback(
        async (account, password) => {
            if (!account || !password) {
                return {
                    success: false,
                    message: '請輸入帳號和密碼',
                }
            }

            console.log(`正在登入: ${account}`)
            setError(null)

            try {
                const response = await fetch(API_ENDPOINTS.LOGIN, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        account: account.trim(),
                        password: password,
                    }),
                })

                const result = await response.json()
                console.log('登入結果:', result)

                if (result.status === 'success' && result.data) {
                    const { token, user: userData } = result.data

                    if (token && userData) {
                        setToken(token)
                        setUser(userData)
                        console.log('登入成功:', userData)
                        return { success: true, user: userData }
                    } else {
                        return {
                            success: false,
                            message: '登入響應格式錯誤',
                        }
                    }
                } else {
                    const errorMessage = result.message || '登入失敗'
                    setError(errorMessage)
                    return { success: false, message: errorMessage }
                }
            } catch (error) {
                console.error('登入過程中發生錯誤:', error)
                const errorMessage = error.message || ERROR_MESSAGES.LOGIN_FAILED
                setError(errorMessage)
                return { success: false, message: errorMessage }
            }
        },
        [setToken]
    )

    // 用戶登出方法
    const logout = useCallback(async () => {
        console.log('正在登出...')
        setError(null)

        try {
            const token = getToken()

            if (!token) {
                // 即使沒有 token，也要清除本地狀態
                setUser(null)
                setToken(null)
                return { success: true }
            }

            const response = await fetch(API_ENDPOINTS.LOGOUT, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            const result = await response.json()

            if (result.status === 'success') {
                console.log('登出成功')
            } else {
                console.warn('登出 API 返回錯誤:', result.message)
            }

            // 無論 API 是否成功，都要清除本地狀態
            setUser(null)
            setToken(null)
            return { success: true }
        } catch (error) {
            console.error('登出過程中發生錯誤:', error)

            // 即使發生錯誤，也要清除本地狀態
            setUser(null)
            setToken(null)
            return { success: true }
        }
    }, [getToken, setToken])

    // 獲取用戶列表
    const list = useCallback(async () => {
        console.log('正在獲取用戶列表...')
        setError(null)

        try {
            const response = await fetch(API_ENDPOINTS.USERS)
            const result = await response.json()

            if (result.status === 'success' && result.data) {
                setUsers(result.data)
                console.log('用戶列表獲取成功')
                return { success: true, users: result.data }
            } else {
                const errorMessage = result.message || '獲取用戶列表失敗'
                setError(errorMessage)
                setUsers([])
                return { success: false, message: errorMessage }
            }
        } catch (error) {
            console.error('獲取用戶列表時發生錯誤:', error)
            const errorMessage = error.message || ERROR_MESSAGES.USER_LIST_ERROR
            setError(errorMessage)
            setUsers([])
            return { success: false, message: errorMessage }
        }
    }, [])

    // 更新用戶信息
    const updateUser = useCallback((updatedUserData) => {
        if (updatedUserData && typeof updatedUserData === 'object') {
            setUser((prevUser) => ({
                ...prevUser,
                ...updatedUserData,
            }))
            console.log('用戶信息已更新')
        }
    }, [])

    // 清除錯誤信息
    const clearError = useCallback(() => {
        setError(null)
    }, [])

    // 檢查路由保護 - 只在客戶端執行
    useEffect(() => {
        // 確保只在客戶端執行，且已經初始化完成
        if (typeof window === 'undefined' || !isInitialized) return

        if (!isLoading && !user && PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
            console.log('訪問受保護路由，重定向到登入頁面')
            router.replace(LOGIN_ROUTE)
        }
    }, [isLoading, user, pathname, router, isInitialized])

    // 宋做的修改：初始化時檢查 token 狀態，僅在 401 未授權時才移除 token，其他錯誤保留 token 以避免誤登出（只在客戶端執行）
    useEffect(() => {
        // 確保只在客戶端執行
        if (typeof window === 'undefined') {
            setIsLoading(false)
            setIsInitialized(true)
            return
        }

        const checkTokenStatus = async () => {
            const token = getToken()

            if (!token) {
                setUser(null)
                setIsLoading(false)
                setIsInitialized(true)
                return
            }

            try {
                console.log('正在驗證 token...')

                const response = await fetch(API_ENDPOINTS.STATUS, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                })

                const statusCode = response.status
                let result
                try {
                    result = await response.json()
                } catch (_) {
                    result = { status: 'error', message: '解析狀態回應失敗' }
                }

                if (response.ok && result.status === 'success' && result.data) {
                    const { user: userData, token: newToken } = result.data

                    if (userData) {
                        setUser(userData)
                        console.log('Token 驗證成功，用戶已登入')

                        // 如果返回了新的 token，則更新
                        if (newToken && newToken !== token) {
                            setToken(newToken)
                            console.log('Token 已更新')
                        }
                    } else {
                        throw new Error('Token 驗證成功但未返回用戶信息')
                    }
                } else {
                    console.warn('Token 驗證失敗:', result?.message)
                    setUser(null)
                    // 宋做的修改：僅在 401 未授權時清除 token，其餘（如 5xx/網路/格式）保留 token，避免暫時性錯誤導致誤登出
                    if (statusCode === 401) setToken(null)
                }
            } catch (error) {
                console.error('Token 驗證過程中發生錯誤:', error)
                setUser(null)
                // 宋做的修改：網路或暫時性錯誤不移除 token，等待後續請求或手動重試
            } finally {
                setIsLoading(false)
                setIsInitialized(true)
            }
        }

        checkTokenStatus()
    }, []) // 移除依賴項

    // 計算屬性
    const isAuthenticated = useMemo(() => Boolean(user), [user])
    const currentUser = useMemo(() => user, [user])
    const currentUsers = useMemo(() => users, [users])

    // 上下文值
    const contextValue = useMemo(
        () => ({
            // 狀態
            user: currentUser,
            users: currentUsers,
            isLoading,
            error,
            isAuth: isAuthenticated,
            isInitialized,

            // 方法
            login,
            logout,
            list,
            updateUser,
            clearError,

            // JWT 相關方法
            getToken,
            isLoggedIn,
            apiRequest,
        }),
        [
            currentUser,
            currentUsers,
            isLoading,
            error,
            isAuthenticated,
            isInitialized,
            login,
            logout,
            list,
            updateUser,
            clearError,
            getToken,
            isLoggedIn,
            apiRequest,
        ]
    )

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

// 自定義 Hook
export const useAuth = () => {
    const context = useContext(AuthContext)

    if (context === null) {
        throw new Error('useAuth 必須在 AuthProvider 內部使用')
    }

    return context
}
