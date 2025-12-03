// client/components/Layout/SearchCard.js
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon } from '@/components/icons/Icons'
import { useProducts } from '@/hooks/use-product'
import styles from './SearchCard.module.css'

export default function SearchCard({ isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchType, setSearchType] = useState('name')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [searchHistory, setSearchHistory] = useState([])
    const [currentSearchQuery, setCurrentSearchQuery] = useState('')

    const inputRef = useRef(null)
    const resultsRef = useRef(null)
    const searchTimeoutRef = useRef(null)
    const router = useRouter()
    const { products } = useProducts()

    // 當搜尋卡片打開時，聚焦到輸入框
    useEffect(() => {
        if (isOpen && inputRef.current) {
            // 打開時清除搜尋狀態
            setSearchQuery('')
            setSearchResults([])
            setShowResults(false)
            setCurrentSearchQuery('')
            // 清除 timeout
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
            inputRef.current.focus()
        } else if (!isOpen) {
            // 關閉時清除搜尋狀態
            setSearchQuery('')
            setSearchResults([])
            setShowResults(false)
            setCurrentSearchQuery('')
            // 清除 timeout
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [isOpen])

    // 組件卸載時清理 timeout
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [])

    // 載入搜尋歷史
    useEffect(() => {
        const history = localStorage.getItem('searchHistory')
        if (history) {
            setSearchHistory(JSON.parse(history))
        }
    }, [])

    // 搜尋結果狀態管理
    const [searchData, setSearchData] = useState([])

    // 處理搜尋
    const handleSearch = async (query = searchQuery, type = searchType, showResults = true) => {
        if (!query.trim()) {
            setSearchResults([])
            setShowResults(false)
            setCurrentSearchQuery('')
            return
        }

        setCurrentSearchQuery(query.trim())
        setIsSearching(true)
        try {
            // 直接使用 fetch API 進行關鍵字搜尋
            const API = `http://localhost:3005/api/products?page=1&limit=8&qtype=${type}&search=${encodeURIComponent(
                query.trim()
            )}`
            const res = await fetch(API)
            const result = await res.json()

            if (result.status === 'success') {
                // 去重處理：根據商品 ID 去重
                const uniqueResults = result.data.filter(
                    (product, index, self) => index === self.findIndex((p) => p.id === product.id)
                )

                setSearchData(uniqueResults)
                setSearchResults(uniqueResults)

                // 只有當 showResults 為 true 時才顯示結果
                if (showResults) {
                    setShowResults(true)
                }
            } else {
                setSearchData([])
                setSearchResults([])
                if (showResults) {
                    setShowResults(true)
                }
            }

            // 保存到搜尋歷史
            const newHistory = [query.trim(), ...searchHistory.filter((item) => item !== query.trim())].slice(0, 5)
            setSearchHistory(newHistory)
            localStorage.setItem('searchHistory', JSON.stringify(newHistory))
        } catch (error) {
            console.error('搜尋失敗:', error)
            setSearchData([])
            setSearchResults([])
            setShowResults(false)
        } finally {
            setIsSearching(false)
        }
    }

    // 處理輸入變化
    const handleInputChange = (e) => {
        const value = e.target.value
        setSearchQuery(value)

        // 清除之前的 timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        if (value.trim()) {
            // 延遲搜尋，但不顯示結果
            searchTimeoutRef.current = setTimeout(() => {
                handleSearch(value, searchType, false)
            }, 300)
        } else {
            setSearchResults([])
            setShowResults(false)
        }
    }

    // 處理搜尋類型變化
    const handleSearchTypeChange = (e) => {
        const type = e.target.value
        setSearchType(type)
        if (searchQuery.trim()) {
            handleSearch(searchQuery, type, false) // 不顯示搜尋結果
        }
    }

    // 處理搜尋結果點擊
    const handleResultClick = (product) => {
        if (product.id) {
            router.push(`/products/${product.id}`)
            setShowResults(false)
            onClose()
        } else {
            console.error('商品 ID 不存在:', product)
        }
    }

    // 處理搜尋歷史點擊
    const handleHistoryClick = (query) => {
        setSearchQuery(query)
        handleSearch(query)
    }

    // 清除搜尋歷史
    const clearSearchHistory = () => {
        setSearchHistory([])
        localStorage.removeItem('searchHistory')
    }

    // 處理鍵盤事件
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const currentValue = e.target.value
            handleSearch(currentValue, searchType, true) // 顯示搜尋結果
        } else if (e.key === 'Escape') {
            setShowResults(false)
            onClose()
        }
    }

    // 點擊外部關閉結果
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (resultsRef.current && !resultsRef.current.contains(event.target)) {
                setShowResults(false)
            }
        }

        if (showResults) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showResults])

    // 點擊外部關閉整個搜尋卡片（手機版）
    useEffect(() => {
        const handleClickOutsideCard = (event) => {
            const searchCard = document.querySelector(`.${styles.searchCard}`)
            if (searchCard && !searchCard.contains(event.target)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutsideCard)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutsideCard)
        }
    }, [isOpen, onClose])

    return (
        <div className={`${styles.searchCard} ${isOpen ? styles.searchCardOpen : ''}`}>
            <div className={styles.searchCardContent}>
                <div className="input-group" ref={resultsRef}>
                    <select
                        className={`form-select ${styles.searchTypeSelect}`}
                        value={searchType}
                        onChange={handleSearchTypeChange}
                    >
                        <option value="name">商品名稱</option>
                        <option value="artist">藝術家</option>
                    </select>
                    <input
                        ref={inputRef}
                        type="text"
                        className={`form-control ${styles.searchInput}`}
                        placeholder="搜尋商品..."
                        value={searchQuery}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                </div>

                {/* 搜尋結果下拉選單 */}
                {showResults && (
                    <div className={styles.searchResults}>
                        {isSearching ? (
                            <div className={styles.searchLoading}>
                                <div className="spinner-border spinner-border-sm" role="status">
                                    <span className="visually-hidden">搜尋中...</span>
                                </div>
                                <span>搜尋中...</span>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <>
                                <div className={styles.searchResultsHeader}>
                                    <span>搜尋結果 ({searchResults.length})</span>
                                </div>
                                {searchResults.map((product) => (
                                    <div
                                        key={product.id}
                                        className={styles.searchResultItem}
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleResultClick(product)
                                        }}
                                        title={`點擊查看 ${product.name} 詳情`}
                                    >
                                        <img
                                            src={product.pathname || '/images/vinyl1.jpg'}
                                            alt={product.name}
                                            className={styles.searchResultImage}
                                            onError={(e) => {
                                                e.target.src = '/images/vinyl1.jpg'
                                            }}
                                        />
                                        <div className={styles.searchResultInfo}>
                                            <div className={styles.searchResultName}>{product.name}</div>
                                            <div className={styles.searchResultArtist}>{product.artist}</div>
                                            <div className={styles.searchResultPrice}>NT$ {product.price}</div>
                                        </div>
                                    </div>
                                ))}
                                {searchQuery && (
                                    <div
                                        className={styles.searchViewAll}
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            router.push(
                                                `/products?search=${encodeURIComponent(
                                                    searchQuery
                                                )}&qtype=${searchType}`
                                            )
                                            onClose()
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            router.push(
                                                `/products?search=${encodeURIComponent(
                                                    searchQuery
                                                )}&qtype=${searchType}`
                                            )
                                            onClose()
                                        }}
                                        title="點擊查看所有搜尋結果"
                                    >
                                        查看所有結果
                                    </div>
                                )}
                            </>
                        ) : searchQuery ? (
                            <div className={styles.searchNoResults}>找不到相關商品</div>
                        ) : searchHistory.length > 0 ? (
                            <>
                                <div className={styles.searchResultsHeader}>
                                    <span>搜尋歷史</span>
                                    <button
                                        className={styles.clearHistoryBtn}
                                        onClick={clearSearchHistory}
                                        title="清除搜尋歷史"
                                    >
                                        清除
                                    </button>
                                </div>
                                {searchHistory.map((query, index) => (
                                    <div
                                        key={index}
                                        className={styles.searchHistoryItem}
                                        onClick={() => handleHistoryClick(query)}
                                    >
                                        <SearchIcon width={16} height={16} fill="currentColor" />
                                        <span>{query}</span>
                                    </div>
                                ))}
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    )
}
