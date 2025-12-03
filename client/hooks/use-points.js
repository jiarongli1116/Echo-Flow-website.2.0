'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './use-auth'

export const usePoints = () => {
    // 使用 useAuth 提供的統一 JWT 管理
    const { apiRequest } = useAuth()

    const [pointsSummary, setPointsSummary] = useState({
        totalPoints: 0,
    })
    const [pointsHistory, setPointsHistory] = useState([])
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // 使用 useRef 來追蹤是否已經初始化，避免重複調用
    const isInitializedRef = useRef(false)

    // 使用 useRef 來追蹤每個函數是否正在獲取數據，避免重複請求
    const isFetchingSummaryRef = useRef(false)
    const isFetchingHistoryRef = useRef(false)

    // 獲取點數摘要
    const fetchPointsSummary = useCallback(async () => {
        // 防止重複調用
        if (isFetchingSummaryRef.current) {
            return
        }

        isFetchingSummaryRef.current = true
        setLoading(true)
        setError(null)

        try {
            const response = await apiRequest('http://localhost:3005/api/points/summary')

            if (!response.ok) {
                throw new Error('獲取點數摘要失敗')
            }

            const result = await response.json()

            if (result.status === 'success') {
                setPointsSummary(result.data)
            } else {
                throw new Error(result.message || '獲取點數摘要失敗')
            }
        } catch (error) {
            console.error('獲取點數摘要錯誤:', error)
            setError(error.message)
        } finally {
            // 只有在沒有其他請求在進行時才設置 loading 為 false
            if (!isFetchingHistoryRef.current) {
                setLoading(false)
            }
            isFetchingSummaryRef.current = false
        }
    }, [apiRequest])

    // 獲取點數歷史記錄
    const fetchPointsHistory = useCallback(
        async (page = 1, limit = 10) => {
            // 防止重複調用
            if (isFetchingHistoryRef.current) {
                return
            }

            isFetchingHistoryRef.current = true
            setLoading(true)
            setError(null)

            try {
                const url = `http://localhost:3005/api/points/history?page=${page}&limit=${limit}`
                const response = await apiRequest(url)

                if (!response.ok) {
                    throw new Error('獲取點數歷史記錄失敗')
                }

                const result = await response.json()

                if (result.status === 'success') {
                    setPointsHistory(result.data.history)
                    setPagination(result.data.pagination)
                } else {
                    throw new Error(result.message || '獲取點數歷史記錄失敗')
                }
            } catch (error) {
                console.error('獲取點數歷史記錄錯誤:', error)
                setError(error.message)
            } finally {
                // 只有在沒有其他請求在進行時才設置 loading 為 false
                if (!isFetchingSummaryRef.current) {
                    setLoading(false)
                }
                isFetchingHistoryRef.current = false
            }
        },
        [apiRequest]
    )

    // 新增點數記錄（管理員功能）
    const addPoints = useCallback(
        async (pointsData) => {
            setLoading(true)
            setError(null)

            try {
                // 轉換點數類型為中文
                const typeMap = {
                    add: '獲得',
                    subtract: '使用',
                    adjust: '調整',
                }

                const adjustedData = {
                    ...pointsData,
                    pointsType: typeMap[pointsData.pointsType] || pointsData.pointsType,
                }

                const response = await apiRequest('http://localhost:3005/api/points/add', {
                    method: 'POST',
                    body: JSON.stringify(adjustedData),
                })

                if (!response.ok) {
                    throw new Error('新增點數記錄失敗')
                }

                const result = await response.json()

                if (result.status === 'success') {
                    // 重新獲取點數摘要和歷史記錄
                    await fetchPointsSummary()
                    await fetchPointsHistory()
                    return result.data
                } else {
                    throw new Error(result.message || '新增點數記錄失敗')
                }
            } catch (error) {
                console.error('新增點數記錄錯誤:', error)
                setError(error.message)
                throw error
            } finally {
                setLoading(false)
            }
        },
        [apiRequest, fetchPointsSummary, fetchPointsHistory]
    )

    // 扣除點數記錄（購物車使用）
    const deductPoints = useCallback(
        async (pointsData) => {
            setLoading(true)
            setError(null)

            try {
                const response = await apiRequest('http://localhost:3005/api/points/deduct', {
                    method: 'POST',
                    body: JSON.stringify(pointsData),
                })

                if (!response.ok) {
                    throw new Error('扣除點數記錄失敗')
                }

                const result = await response.json()

                if (result.status === 'success') {
                    // 重新獲取點數摘要和歷史記錄
                    await fetchPointsSummary()
                    await fetchPointsHistory()
                    return result.data
                } else {
                    throw new Error(result.message || '扣除點數記錄失敗')
                }
            } catch (error) {
                console.error('扣除點數記錄錯誤:', error)
                setError(error.message)
                throw error
            } finally {
                setLoading(false)
            }
        },
        [apiRequest, fetchPointsSummary, fetchPointsHistory]
    )

    // 檢查點數餘額（購物車使用）
    const checkBalance = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await apiRequest('http://localhost:3005/api/points/balance')

            if (!response.ok) {
                throw new Error('獲取點數餘額失敗')
            }

            const result = await response.json()

            if (result.status === 'success') {
                return result.data
            } else {
                throw new Error(result.message || '獲取點數餘額失敗')
            }
        } catch (error) {
            console.error('獲取點數餘額錯誤:', error)
            setError(error.message)
            throw error
        } finally {
            setLoading(false)
        }
    }, [apiRequest])

    // 格式化日期
    const formatDate = useCallback((dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('zh-TW')
    }, [])

    // 格式化點數類型
    const formatPointsType = useCallback((type) => {
        const typeMap = {
            獲得: '獲得',
            使用: '使用',
            調整: '調整',
            加點: '加點',
            扣點: '扣點',
            購買回饋: '獲得', // 將購買回饋統一顯示為獲得
        }
        return typeMap[type] || type
    }, [])

    // 初始化時獲取數據 - 只在組件掛載時執行一次
    useEffect(() => {
        // 防止重複調用
        if (isInitializedRef.current) {
            return
        }

        // 確保只在客戶端執行
        if (typeof window !== 'undefined') {
            fetchPointsSummary()
            fetchPointsHistory()
            isInitializedRef.current = true
        }
    }, []) // 移除依賴項，避免無限循環

    return {
        pointsSummary,
        pointsHistory,
        pagination,
        loading,
        error,
        fetchPointsSummary,
        fetchPointsHistory,
        addPoints,
        deductPoints,
        checkBalance,
        formatDate,
        formatPointsType,
    }
}
