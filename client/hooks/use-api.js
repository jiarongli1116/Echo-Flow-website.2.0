'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useAuth } from './use-auth'

export const useApi = () => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const { apiRequest } = useAuth()

    // 使用 useRef 來存儲穩定的 apiRequest 引用
    const apiRequestRef = useRef(apiRequest)

    // 更新 ref 當 apiRequest 改變時
    useEffect(() => {
        apiRequestRef.current = apiRequest
    }, [apiRequest])

    // 處理 API 響應的通用函數 - 優化版本，避免 response.clone()
    const handleResponse = useCallback(async (response, context = '') => {
        if (!response.ok) {
            let errorMessage = `${context}失敗`

            // 嘗試解析錯誤響應，但不使用 clone()
            try {
                // 檢查響應的 Content-Type
                const contentType = response.headers.get('content-type')

                if (contentType && contentType.includes('application/json')) {
                    // 如果是 JSON 格式，直接解析
                    const errorData = await response.json()
                    errorMessage = errorData.message || errorMessage
                } else if (contentType && contentType.includes('text/html')) {
                    // 如果是 HTML 格式，可能是認證問題
                    errorMessage = '服務器返回了 HTML 頁面，可能是認證問題'
                } else {
                    // 其他格式，使用狀態碼和狀態文本
                    errorMessage = `服務器錯誤: ${response.status} ${response.statusText}`
                }
            } catch (parseError) {
                // 如果解析失敗，使用狀態碼信息
                console.warn('無法解析錯誤響應:', parseError)
                errorMessage = `服務器錯誤: ${response.status} ${response.statusText}`
            }

            throw new Error(errorMessage)
        }

        // 成功響應的處理
        try {
            const contentType = response.headers.get('content-type')

            if (contentType && contentType.includes('application/json')) {
                return await response.json()
            } else if (contentType && contentType.includes('text/plain')) {
                return await response.text()
            } else {
                // 默認嘗試 JSON 解析
                return await response.json()
            }
        } catch (parseError) {
            console.error('響應解析錯誤:', parseError)

            // 根據響應類型提供更詳細的錯誤信息
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('text/html')) {
                throw new Error('服務器返回了 HTML 頁面，可能是認證問題')
            } else {
                throw new Error('服務器返回的數據格式不正確')
            }
        }
    }, [])

    // 封裝常用的 HTTP 方法 - 使用 useCallback 优化
    const api = useMemo(
        () => ({
            // GET 請求
            get: async (url, options = {}) => {
                setLoading(true)
                setError(null)
                try {
                    const response = await apiRequestRef.current(url, { ...options, method: 'GET' })
                    return await handleResponse(response, '獲取數據')
                } catch (err) {
                    setError(err.message)
                    throw err
                } finally {
                    setLoading(false)
                }
            },

            // POST 請求
            post: async (url, data, options = {}) => {
                setLoading(true)
                setError(null)
                try {
                    const response = await apiRequestRef.current(url, {
                        ...options,
                        method: 'POST',
                        body: JSON.stringify(data),
                    })
                    return await handleResponse(response, '創建數據')
                } catch (err) {
                    setError(err.message)
                    throw err
                } finally {
                    setLoading(false)
                }
            },

            // PUT 請求
            put: async (url, data, options = {}) => {
                setLoading(true)
                setError(null)
                try {
                    const response = await apiRequestRef.current(url, {
                        ...options,
                        method: 'PUT',
                        body: JSON.stringify(data),
                    })
                    return await handleResponse(response, '更新數據')
                } catch (err) {
                    setError(err.message)
                    throw err
                } finally {
                    setLoading(false)
                }
            },

            // DELETE 請求
            delete: async (url, options = {}) => {
                setLoading(true)
                setError(null)
                try {
                    const response = await apiRequestRef.current(url, { ...options, method: 'DELETE' })
                    return await handleResponse(response, '刪除數據')
                } catch (err) {
                    setError(err.message)
                    throw err
                } finally {
                    setLoading(false)
                }
            },

            // PATCH 請求
            patch: async (url, data, options = {}) => {
                setLoading(true)
                setError(null)
                try {
                    const response = await apiRequestRef.current(url, {
                        ...options,
                        method: 'PATCH',
                        body: JSON.stringify(data),
                    })
                    return await handleResponse(response, '部分更新數據')
                } catch (err) {
                    setError(err.message)
                    throw err
                } finally {
                    setLoading(false)
                }
            },
        }),
        [handleResponse]
    )

    // 使用 useMemo 优化返回值，避免每次渲染都创建新对象
    const returnValue = useMemo(
        () => ({
            api,
            loading,
            error,
            clearError: () => setError(null),
        }),
        [api, loading, error]
    )

    return returnValue
}
