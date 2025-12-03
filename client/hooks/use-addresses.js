import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApi } from './use-api'
import { buildApiUrl, API_CONFIG } from '@/config/api'

export const useAddresses = () => {
    const [addresses, setAddresses] = useState([])
    const { api, loading, error, clearError } = useApi()

    // 使用 useRef 來存儲穩定的 api 引用
    const apiRef = useRef(api)

    // 使用 useRef 來存儲穩定的函數引用，避免循環依賴
    const stableFunctionsRef = useRef({})

    // 使用 useRef 來追蹤是否已經初始化，避免重複調用
    const isInitializedRef = useRef(false)

    // 使用 useRef 來追蹤是否正在獲取數據，避免重複請求
    const isFetchingRef = useRef(false)

    // 更新 apiRef 當 api 改變時
    useEffect(() => {
        apiRef.current = api
    }, [api])

    // 統一的數據結構處理函數 - 移到 useRef 中，避免重新創建
    const extractData = useCallback((response, fieldName = 'address') => {
        if (response.data && response.data[fieldName]) {
            return response.data[fieldName]
        } else if (response.data) {
            return response.data
        } else if (Array.isArray(response)) {
            return response
        } else {
            console.error('無法解析數據結構:', response)
            return null
        }
    }, [])

    // 統一的錯誤處理函數 - 移到 useRef 中，避免重新創建
    const handleError = useCallback((error, operation) => {
        console.error(`${operation}錯誤:`, error)

        // 如果是認證錯誤，重定向到登入頁面
        if (error.message.includes('登入已過期') || error.message.includes('未找到登入憑證')) {
            window.location.href = '/auth/login'
        }

        throw error
    }, [])

    // 更新地址列表中的預設狀態
    const updateDefaultStatus = useCallback((addressId, isDefault) => {
        setAddresses((prev) =>
            prev.map((addr) => ({
                ...addr,
                isDefault: addr.id === addressId ? isDefault : false,
            }))
        )
    }, [])

    // 獲取地址列表 - 使用 useCallback 並移除 api 依賴
    const fetchAddresses = useCallback(async () => {
        // 防止重複調用
        if (isInitializedRef.current || isFetchingRef.current) {
            return
        }

        // 標記為正在獲取數據
        isFetchingRef.current = true

        try {
            const data = await apiRef.current.get(buildApiUrl(API_CONFIG.ENDPOINTS.ADDRESSES.LIST))
            const extractedData = stableFunctionsRef.current.extractData(data, 'addresses')

            if (extractedData) {
                setAddresses(extractedData)
            } else {
                setAddresses([])
            }

            // 標記為已初始化
            isInitializedRef.current = true
        } catch (err) {
            stableFunctionsRef.current.handleError(err, '獲取地址列表')
        } finally {
            // 標記為不再獲取數據
            isFetchingRef.current = false
        }
    }, []) // 移除 api 依賴

    // 新增地址
    const addAddress = useCallback(
        async (addressData) => {
            try {
                const response = await apiRef.current.post(
                    buildApiUrl(API_CONFIG.ENDPOINTS.ADDRESSES.CREATE),
                    addressData
                )

                const newAddress = stableFunctionsRef.current.extractData(response)
                if (!newAddress) {
                    throw new Error('新增地址失敗：無法解析響應數據')
                }

                // 如果新增的是預設地址，將其他地址設為非預設
                if (newAddress.isDefault) {
                    updateDefaultStatus(newAddress.id, true)
                    setAddresses((prev) => [...prev, newAddress])
                } else {
                    setAddresses((prev) => [...prev, newAddress])
                }

                return newAddress
            } catch (err) {
                stableFunctionsRef.current.handleError(err, '新增地址')
            }
        },
        [updateDefaultStatus]
    )

    // 編輯地址
    const updateAddress = useCallback(
        async (id, addressData) => {
            try {
                const response = await apiRef.current.put(
                    buildApiUrl(API_CONFIG.ENDPOINTS.ADDRESSES.UPDATE(id)),
                    addressData
                )

                const updatedAddress = stableFunctionsRef.current.extractData(response)
                if (!updatedAddress) {
                    throw new Error('更新地址失敗：無法解析響應數據')
                }

                // 更新地址列表中的地址
                setAddresses((prev) => prev.map((addr) => (addr.id === id ? updatedAddress : addr)))

                // 如果更新的是預設地址，將其他地址設為非預設
                if (updatedAddress.isDefault) {
                    updateDefaultStatus(id, true)
                }

                return updatedAddress
            } catch (err) {
                stableFunctionsRef.current.handleError(err, '更新地址')
            }
        },
        [updateDefaultStatus]
    )

    // 刪除地址
    const deleteAddress = useCallback(async (id) => {
        try {
            await apiRef.current.delete(buildApiUrl(API_CONFIG.ENDPOINTS.ADDRESSES.DELETE(id)))
            setAddresses((prev) => prev.filter((addr) => addr.id !== id))
        } catch (err) {
            stableFunctionsRef.current.handleError(err, '刪除地址')
        }
    }, [])

    // 設定預設地址
    const setDefaultAddress = useCallback(
        async (id) => {
            try {
                await apiRef.current.put(buildApiUrl(API_CONFIG.ENDPOINTS.ADDRESSES.SET_DEFAULT(id)))
                updateDefaultStatus(id, true)
            } catch (err) {
                stableFunctionsRef.current.handleError(err, '設定預設地址')
            }
        },
        [updateDefaultStatus]
    )

    // 獲取單個地址詳情
    const getAddressById = useCallback(
        (id) => {
            return addresses.find((addr) => addr.id === id)
        },
        [addresses]
    )

    // 獲取預設地址
    const getDefaultAddress = useCallback(() => {
        return addresses.find((addr) => addr.isDefault)
    }, [addresses])

    // 檢查是否有地址
    const hasAddresses = useCallback(() => {
        return addresses.length > 0
    }, [addresses])

    // 獲取地址數量
    const getAddressCount = useCallback(() => {
        return addresses.length
    }, [addresses])

    // 將穩定的函數存儲到 ref 中
    useEffect(() => {
        stableFunctionsRef.current = {
            extractData,
            handleError,
        }
    }, [extractData, handleError])

    // 初始化時獲取地址列表 - 只在組件掛載時執行一次
    useEffect(() => {
        // 確保只在客戶端執行
        if (typeof window !== 'undefined') {
            fetchAddresses()
        }
    }, []) // 空依賴數組，只在組件掛載時執行

    // 使用 useMemo 优化返回的对象，避免每次渲染都创建新对象
    const returnValue = useMemo(
        () => ({
            // 狀態
            addresses,
            loading,
            error,

            // 操作方法
            fetchAddresses,
            addAddress,
            updateAddress,
            deleteAddress,
            setDefaultAddress,

            // 實用方法
            getAddressById,
            getDefaultAddress,
            hasAddresses,
            getAddressCount,

            // 工具方法
            clearError,
        }),
        [
            addresses,
            loading,
            error,
            fetchAddresses,
            addAddress,
            updateAddress,
            deleteAddress,
            setDefaultAddress,
            getAddressById,
            getDefaultAddress,
            hasAddresses,
            getAddressCount,
            clearError,
        ]
    )

    return returnValue
}
