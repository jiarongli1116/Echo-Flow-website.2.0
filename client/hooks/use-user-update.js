'use client'

import { useState, useCallback } from 'react'

const API_BASE_URL = 'http://localhost:3005/api'
const UPLOAD_BASE_URL = 'http://localhost:3005/uploads'

export const useUserUpdate = () => {
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // 獲取頭像 URL
    const getAvatarUrl = (filename) => {
        if (!filename || filename === 'null') {
            return '/images/default-avatar.svg'
        }

        // 如果是完整的 URL（如 Google 頭像），直接返回
        if (filename.startsWith('http://') || filename.startsWith('https://')) {
            return filename
        }

        // 如果是本地檔案名，構建完整的 URL
        return `${UPLOAD_BASE_URL}/avatars/${filename}`
    }

    // 更新用戶基本資料
    const updateUserProfile = async (userId, updateData) => {
        setIsSaving(true)

        try {
            const token = localStorage.getItem('reactLoginToken')
            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            })

            const result = await response.json()

            if (result.status === 'success') {
                return {
                    success: true,
                    data: {
                        ...result.data,
                        changedFields: Object.keys(updateData), // 添加變更的欄位資訊
                    },
                    message: '更新成功',
                }
            } else {
                return {
                    success: false,
                    message: result.message || '更新失敗',
                }
            }
        } catch (error) {
            console.error('更新用戶資料錯誤:', error)
            return {
                success: false,
                message: '更新失敗，請稍後再試',
            }
        } finally {
            setIsSaving(false)
        }
    }

    // 上傳用戶頭像
    const uploadUserAvatar = async (userId, file) => {
        setIsUploading(true)

        try {
            const formData = new FormData()
            formData.append('avatar', file)

            const token = localStorage.getItem('reactLoginToken')
            const response = await fetch(`${API_BASE_URL}/users/${userId}/avatar`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            })

            const result = await response.json()

            if (result.status === 'success') {
                return {
                    success: true,
                    data: result.data,
                    message: '頭像更新成功',
                }
            } else {
                return {
                    success: false,
                    message: result.message || '頭像更新失敗',
                }
            }
        } catch (error) {
            console.error('頭像上傳錯誤:', error)
            return {
                success: false,
                message: '頭像上傳失敗，請稍後再試',
            }
        } finally {
            setIsUploading(false)
        }
    }

    // 驗證檔案
    const validateFile = (file) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
        const maxSize = 5 * 1024 * 1024 // 5MB

        if (!allowedTypes.includes(file.type)) {
            return {
                isValid: false,
                message: '請選擇有效的圖片檔案 (JPG, PNG, GIF)',
            }
        }

        if (file.size > maxSize) {
            return {
                isValid: false,
                message: '圖片檔案大小不能超過 5MB',
            }
        }

        return {
            isValid: true,
            message: '',
        }
    }

    return {
        updateUserProfile,
        uploadUserAvatar,
        validateFile,
        getAvatarUrl,
        isSaving,
        isUploading,
    }
}

// 新增：計算用戶累積消費金額的 hook
export const useAccumulatedAmount = () => {
    const [accumulatedAmount, setAccumulatedAmount] = useState(0)
    const [membershipLevel, setMembershipLevel] = useState('一般會員')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    // 計算用戶的累積消費金額
    //異步函數，處理 API 調用
    const calculateAccumulatedAmount = useCallback(async (userId) => {
        if (!userId) {
            setError('用戶ID不能為空')
            return
        }

        // 狀態初始化
        setIsLoading(true) // 開始載入
        setError(null) // 重置錯誤

        try {
            const token = localStorage.getItem('reactLoginToken')
            if (!token) {
                setError('未找到登入憑證')
                return
            }

            // 調用後端 API 來計算累積金額
            // API_BASE_URL：後端 API 的基礎 URL（http://localhost:3001/api）
            // /users/${userId}：特定用戶的路徑
            // /accumulated-amount：累積金額的端點
            const response = await fetch(`${API_BASE_URL}/users/${userId}/accumulated-amount`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            const result = await response.json()

            if (result.status === 'success') {
                setAccumulatedAmount(result.data.accumulatedAmount || 0)
                setMembershipLevel(result.data.membershipLevel || '一般會員')
            } else {
                setError(result.message || '計算累積金額失敗')
            }
        } catch (error) {
            console.error('計算累積金額錯誤:', error)
            setError('計算累積金額時發生錯誤')
        } finally {
            setIsLoading(false)
        }
    }, [])

    // 手動刷新累積金額
    const refreshAccumulatedAmount = (userId) => {
        if (userId) {
            calculateAccumulatedAmount(userId)
        }
    }

    return {
        accumulatedAmount,
        membershipLevel,
        isLoading,
        error,
        calculateAccumulatedAmount,
        refreshAccumulatedAmount,
    }
}
