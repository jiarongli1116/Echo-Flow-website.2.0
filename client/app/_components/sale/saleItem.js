'use client'

import React, { useState, useEffect, useRef } from 'react'
import styles from '../page.module.css'
import { useCart } from '@/hooks/use-cart'
import Item from './item'

export default function SaleItem({ data, title, getBookmark }) {
    const specialItemsRef = useRef(null)
    const [visibleItems, setVisibleItems] = useState(0)
    const [isScrolling, setIsScrolling] = useState(false)

    const itemWidth = 250
    const gapWidth = 17.5

    // 計算可見的項目數量
    const calculateVisibleItems = () => {
        if (!specialItemsRef.current) return

        const containerWidth = specialItemsRef.current.clientWidth

        // 檢查特定的寬度
        if (containerWidth >= 1320) {
            setVisibleItems(5) // 當寬度大於或等於 1320px 時，固定為 5
        } else {
            // 其他情況下，進行動態計算
            const calculatedItems = Math.floor(
                containerWidth / (itemWidth + gapWidth)
            )
            setVisibleItems(calculatedItems)
        }
    }

    // 在元件載入時和視窗大小改變時重新計算
    useEffect(() => {
        calculateVisibleItems()
        window.addEventListener('resize', calculateVisibleItems)

        // 清理事件監聽器
        return () => {
            window.removeEventListener('resize', calculateVisibleItems)
        }
    }, []) // 空陣列代表只在元件載入和卸載時執行

    const handleScrollRight = () => {
        if (specialItemsRef.current && !isScrolling) {
            // <-- 檢查狀態
            setIsScrolling(true) // <-- 設為 true
            const scrollAmount = visibleItems * (itemWidth + gapWidth)
            specialItemsRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth',
            })

            // 在動畫完成後重設狀態
            setTimeout(() => {
                setIsScrolling(false)
            }, 1000) // <-- 根據滾動速度調整這個時間
        }
    }

    // 處理向左滾動的點擊事件
    const handleScrollLeft = () => {
        if (specialItemsRef.current && !isScrolling) {
            // <-- 檢查狀態
            setIsScrolling(true) // <-- 設為 true
            const scrollAmount = visibleItems * (itemWidth + gapWidth)
            specialItemsRef.current.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth',
            })

            // 在動畫完成後重設狀態
            setTimeout(() => {
                setIsScrolling(false)
            }, 700) // <-- 根據滾動速度調整這個時間
        }
    }

    return (
        <>
            <div className={styles.specialTitle}>
                <h3 className="m-0">{title}</h3>
                <div className={`${styles.specialPageBtn} ${styles.alc}`}>
                    <i
                        className="fa-solid fa-arrow-left"
                        onClick={handleScrollLeft}
                    ></i>
                    <i
                        className="fa-solid fa-arrow-right"
                        onClick={handleScrollRight}
                    ></i>
                </div>
            </div>

            <div className={styles.specialItems} ref={specialItemsRef}>
                {data &&
                    data.map((e) => {
                        return (
                            <Item key={e.id} e={e} getBookmark={getBookmark} />
                        )
                    })}
            </div>
        </>
    )
}
