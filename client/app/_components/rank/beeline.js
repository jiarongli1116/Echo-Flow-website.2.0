'use client'

import React, { useState, useEffect } from 'react'
import styles from '../page.module.css'
import RankItem from './item'

export default function RankBeeline({
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

    const itemHeight = 105 // 每個 item 高度 (80 + padding/margin) 依你的設計調整
    const visibleCount = 5 // 容器一次能看到幾個
    const maxIndex = rank.length - visibleCount

    useEffect(() => {
        // 我們希望將選中的項目置於可見區域的中間
        // visibleCount / 2 是中心項目的索引
        const centerIndex = Math.floor(visibleCount / 2)

        // 如果選中的項目在或早於中心索引，我們不需要向下滾動。
        if (select < centerIndex) {
            setListTransformY(0)
            return
        }

        // 如果選中的項目在最後一組可見項目中，在結束前停止滾動。
        const lastScrollableIndex = rank.length - centerIndex - 1
        if (select >= lastScrollableIndex) {
            const lastY = -(rank.length - visibleCount) * itemHeight
            setListTransformY(lastY)
            return
        }

        // 對於列表中間的項目，將選中的項目置中。
        const newY = -(select - centerIndex) * itemHeight
        setListTransformY(newY)
    }, [select, itemHeight, visibleCount, rank.length])

    return (
        <>
            <div
                className="overflow-hidden"
                style={{ height: `${itemHeight * visibleCount}px` }}
            >
                <div
                    className={`${styles.beeline} d-flex d-xxl-none flex-column`}
                    style={{
                        transform: `translateY(${listTransformY}px)`,
                        transition: 'transform 0.3s ease',
                    }}
                >
                    {rank.map((e, i) => {
                        return (
                            <RankItem
                                select={select}
                                e={e}
                                i={i}
                                getBookmark={getBookmark}
                                handleItemSelect={handleItemSelect}
                                key={e.id}
                                songPlay={songPlay}
                                setShowPlayer={setShowPlayer}
                                setSongPlay={setSongPlay}
                            />
                        )
                    })}
                </div>
            </div>
        </>
    )
}
