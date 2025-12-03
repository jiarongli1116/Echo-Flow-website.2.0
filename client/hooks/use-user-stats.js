'use client'

import { useState, useCallback } from 'react'

const API_BASE_URL = 'http://localhost:3005/api'

export const useUserStats = () => {
    const [stats, setStats] = useState({
        points: 0,
        coupons: 0,
        processingOrders: 0,
        completedOrders: 0,
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    // 獲取用戶統計數據
    const fetchUserStats = useCallback(async (userId) => {
        if (!userId) {
            setError('用戶ID不能為空')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('reactLoginToken')
            if (!token) {
                setError('未找到登入憑證')
                return
            }

            const response = await fetch(`${API_BASE_URL}/users/${userId}/stats`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            const result = await response.json()

            if (result.status === 'success') {
                setStats(result.data)
            } else {
                setError(result.message || '獲取統計數據失敗')
            }
        } catch (error) {
            console.error('獲取用戶統計數據錯誤:', error)
            setError('獲取統計數據時發生錯誤')
        } finally {
            setIsLoading(false)
        }
    }, [])

    // 手動刷新統計數據
    const refreshStats = (userId) => {
        if (userId) {
            fetchUserStats(userId)
        }
    }

    return {
        stats,
        isLoading,
        error,
        fetchUserStats,
        refreshStats,
    }
}
