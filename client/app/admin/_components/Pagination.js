'use client'

import { useState, useEffect } from 'react'
import styles from './AdminCommon.module.css'

export default function Pagination({
    totalItems = 0,
    itemsPerPage = 20,
    currentPage = 1,
    onPageChange = () => { },
    maxVisiblePages = 5,
    showFirstLast = true,
    showPrevNext = true,
}) {
    const [totalPages, setTotalPages] = useState(0)
    const [visiblePages, setVisiblePages] = useState([])

    // 計算總頁數
    useEffect(() => {
        const pages = Math.ceil(totalItems / itemsPerPage)
        setTotalPages(pages)
    }, [totalItems, itemsPerPage])

    // 計算可見頁碼
    useEffect(() => {
        if (totalPages <= maxVisiblePages) {
            // 如果總頁數少於最大可見頁數，顯示所有頁碼
            // 利用索引來生成連續的數字序列
            //  (_, i) => i + 1映射函數：
            // 第一個參數 _：代表陣列中的元素值
            // 第二個參數 i：代表陣列的索引（從 0 開始）
            setVisiblePages(Array.from({ length: totalPages }, (_, i) => i + 1))
        } else {
            // 計算可見頁碼範圍
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

            // 如果結束頁碼接近總頁數，調整開始頁碼
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1)
            }

            setVisiblePages(Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i))
        }
    }, [currentPage, totalPages, maxVisiblePages])

    // 處理頁碼點擊
    const handlePageClick = (page) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            onPageChange(page)
        }
    }

    // 處理上一頁
    const handlePrevPage = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1)
        }
    }

    // 處理下一頁
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1)
        }
    }

    // 處理首頁
    const handleFirstPage = () => {
        if (currentPage > 1) {
            onPageChange(1)
        }
    }

    // 處理末頁
    const handleLastPage = () => {
        if (currentPage < totalPages) {
            onPageChange(totalPages)
        }
    }

    // 如果沒有資料或只有一頁，不顯示分頁
    if (totalPages <= 1) {
        return null
    }

    return (
        <div className={styles.paginationContainer}>
            {/* 分頁按鈕 */}
            <div className={styles.paginationButtons}>
                {/* 首頁按鈕 */}
                {showFirstLast && (
                    <button
                        className={`${styles.paginationBtn} ${styles.paginationBtnSecondary}`}
                        onClick={handleFirstPage}
                        disabled={currentPage === 1}
                        title="首頁"
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 0H1.66667V10H0V0ZM2.91667 5L10 10V0L2.91667 5Z" fill="currentColor" />
                        </svg>
                    </button>
                )}

                {/* 上一頁按鈕 */}
                {showPrevNext && (
                    <button
                        className={`${styles.paginationBtn} ${styles.paginationBtnSecondary} ${styles.paginationBtnNav}`}
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        title="上一頁"
                    >
                        <svg width="25" height="25" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_4500_1561)">
                                <path
                                    d="M19.0876 12.175L17.9126 11L12.9126 16L17.9126 21L19.0876 19.825L15.2709 16L19.0876 12.175Z"
                                    fill="currentColor"
                                />
                            </g>
                            <defs>
                                <clipPath id="clip0_4500_1561">
                                    <rect width="32" height="32" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                    </button>
                )}

                {/* 頁碼按鈕 */}
                {visiblePages.map((page) => (
                    <button
                        key={page}
                        className={`${styles.paginationBtn} ${page === currentPage ? styles.paginationBtnActive : styles.paginationBtnSecondary
                            }`}
                        onClick={() => handlePageClick(page)}
                        title={`第 ${page} 頁`}
                    >
                        {page}
                    </button>
                ))}

                {/* 下一頁按鈕 */}
                {showPrevNext && (
                    <button
                        className={`${styles.paginationBtn} ${styles.paginationBtnSecondary} ${styles.paginationBtnNav}`}
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        title="下一頁"
                    >
                        <svg width="25" height="25" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_4500_1574)">
                                <path
                                    d="M14.0876 11L12.9126 12.175L16.7293 16L12.9126 19.825L14.0876 21L19.0876 16L14.0876 11Z"
                                    fill="currentColor"
                                />
                            </g>
                            <defs>
                                <clipPath id="clip0_4500_1574">
                                    <rect width="32" height="32" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                    </button>
                )}

                {/* 末頁按鈕 */}
                {showFirstLast && (
                    <button
                        className={`${styles.paginationBtn} ${styles.paginationBtnSecondary}`}
                        onClick={handleLastPage}
                        disabled={currentPage === totalPages}
                        title="末頁"
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 0H8.33333V10H10V0ZM7.08333 5L0 10V0L7.08333 5Z" fill="currentColor" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    )
}
