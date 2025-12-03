'use client'

import { useState, useEffect, useMemo } from 'react'

export function usePagination(data = [], itemsPerPage = 20, dependencies = []) {
    const [currentPage, setCurrentPage] = useState(1)

    // 計算分頁相關數據
    const paginationData = useMemo(() => {
        const totalItems = data.length
        const totalPages = Math.ceil(totalItems / itemsPerPage)
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const currentPageData = data.slice(startIndex, endIndex)

        return {
            totalItems,
            totalPages,
            startIndex,
            endIndex,
            currentPageData,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1,
            isFirstPage: currentPage === 1,
            isLastPage: currentPage === totalPages,
        }
    }, [data, currentPage, itemsPerPage])

    // 當依賴改變時重置到第一頁
    useEffect(() => {
        setCurrentPage(1)
    }, dependencies)

    // 處理頁碼變更
    const handlePageChange = (page) => {
        if (page >= 1 && page <= paginationData.totalPages) {
            setCurrentPage(page)
            // 滾動到頂部
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    //'smooth'：平滑滾動動畫
    //'auto'：瞬間跳轉（預設值）
    //'instant'：瞬間跳轉（等同於 auto）

    // 跳轉到第一頁
    const goToFirstPage = () => {
        handlePageChange(1)
    }

    // 跳轉到最後一頁
    const goToLastPage = () => {
        handlePageChange(paginationData.totalPages)
    }

    // 跳轉到上一頁
    const goToPrevPage = () => {
        handlePageChange(currentPage - 1)
    }

    // 跳轉到下一頁
    const goToNextPage = () => {
        handlePageChange(currentPage + 1)
    }

    return {
        // 當前頁碼
        currentPage,
        // 分頁數據
        ...paginationData,
        // 分頁方法
        handlePageChange,
        goToFirstPage,
        goToLastPage,
        goToPrevPage,
        goToNextPage,
        // 設定當前頁碼
        setCurrentPage,
    }
}
