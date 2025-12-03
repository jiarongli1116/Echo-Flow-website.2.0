'use client'

import React, { useState, useEffect } from 'react'
import styles from '../page.module.css'
import RankItem from './item'

export default function RankCircle({
    rank,
    getBookmark,
    songPlay,
    setShowPlayer,
    setSongPlay,
}) {
    const [select, setSelect] = useState(0)
    const [listTransformY, setListTransformY] = useState(0)

    const handleItemSelect = (index) => {
        setSelect(index)
    }

    // 將常數定義在組件頂部，方便管理
    const itemHeight = 80 + 27.5 * 2 // 每個 item 高度
    const visibleCount = 7 // 畫面內顯示的項目數
    const centralItemIndex = 3 // select 應位於第 4 個位置，索引為 3

    useEffect(() => {
        // 總共有多少個項目可以被滾動
        const totalItems = rank.length

        // --- 處理邊界條件 ---
        // 1. 頂部邊界：當 select 在前 4 個項目時 (索引 0, 1, 2, 3)，列表不滾動
        if (select <= centralItemIndex) {
            setListTransformY(0)
            return
        }

        // 2. 底部邊界：計算列表停止滾動的索引
        // 讓最後 7 個項目完整顯示在畫面中
        const lastScrollableIndex =
            totalItems - (visibleCount - centralItemIndex)
        if (select >= lastScrollableIndex) {
            // 計算最後一個可滾動的 Y 座標
            const lastY = -(totalItems - visibleCount) * itemHeight
            setListTransformY(lastY)
            return
        }

        // --- 處理中間滾動 ---
        // 3. 中間區域：將選中的項目置中
        const newTransformY = -(select - centralItemIndex) * itemHeight
        setListTransformY(newTransformY)
    }, [select, itemHeight, visibleCount, centralItemIndex, rank.length])

    const selectedItem = rank[select]

    return (
        <>
            <div
                className={`${styles.circle} ${styles.textLight} d-none d-xxl-flex`}
            >
                <div className={`${styles.alc} ${styles.circlePos}`}>
                    <div className={`${styles.img} ${styles.bgBlack900}`}>
                        {selectedItem && (
                            <img
                                src={selectedItem.pathname}
                                alt={selectedItem.name}
                            />
                        )}
                    </div>
                    <div
                        className={`${styles.circle0} ${styles.circle1}`}
                    ></div>
                    <div
                        className={`${styles.circle0} ${styles.circle2}`}
                    ></div>
                    <div
                        className={`${styles.circle0} ${styles.circle3}`}
                    ></div>
                    <div
                        className={`${styles.circle0} ${styles.circle4}`}
                    ></div>
                    <div
                        className={`${styles.circle0} ${styles.circle5}`}
                    ></div>

                    <div className={styles['noise-box']}></div>
                </div>

                <div className={styles.circleView}>
                    <div
                        className={`${styles.rankList}`}
                        style={{ transform: `translateY(${listTransformY}px)` }}
                    >
                        {rank.map((e, i) => {
                            // 將 select 的位置轉換為可見區域中的相對位置
                            let visibleIndex = i
                            if (select >= 3 && select <= rank.length - 4) {
                                visibleIndex = i - (select - 3)
                            } else if (select >= rank.length - 3) {
                                visibleIndex = i - (rank.length - 7)
                            }

                            // 計算當前項目在可見區域中與中心項目的距離
                            const visibleDistance = Math.abs(visibleIndex - 3)

                            // 判斷是否需要突出
                            // 當距離小於或等於 2 時，項目需要突出。
                            const shouldShift = visibleDistance <= 2

                            // 定義水平位移的值
                            let shiftX = 0
                            if (shouldShift) {
                                if (visibleDistance === 0) {
                                    shiftX = -120 // 位於中心
                                } else if (visibleDistance === 1) {
                                    shiftX = -90 // 位於中心上下各一格
                                } else if (visibleDistance === 2) {
                                    shiftX = -50 // 位於中心上下各二格
                                }
                            }

                            return (
                                <RankItem
                                    e={e}
                                    i={i}
                                    getBookmark={getBookmark}
                                    shiftX={shiftX}
                                    select={select}
                                    handleItemSelect={handleItemSelect}
                                    key={i}
                                    songPlay={songPlay}
                                    setShowPlayer={setShowPlayer}
                                    setSongPlay={setSongPlay}
                                />
                            )
                        })}
                    </div>
                </div>
            </div>
        </>
    )
}
