import React, { useState, useEffect } from 'react'
import styles from '../page.module.css'

const VolumeBar = () => {
    const [repeatCount, setRepeatCount] = useState(0)

    // SVG 相關參數
    const svgGap = 330

    useEffect(() => {
        // 函式：計算並設定重複次數
        const calculateRepeatCount = () => {
            // 直接使用視窗的寬度
            const containerWidth = window.innerWidth
            const count = Math.ceil(containerWidth / svgGap)
            setRepeatCount(count)
        }

        // 初始載入時執行
        calculateRepeatCount()

        // 監聽視窗大小改變，並重新計算
        window.addEventListener('resize', calculateRepeatCount)

        // 清理函式：在組件卸載時移除事件監聽
        return () => {
            window.removeEventListener('resize', calculateRepeatCount)
        }
    }, []) // 僅在組件掛載和卸載時執行

    // SVG 內部的程式碼，保持不變
    const svgContent = `
    <rect x="10" y="20" width="10" height="80" fill="#FFFFFF" />
    <rect x="30" y="70" width="10" height="30" fill="#FFFFFF" />
    <rect x="50" y="55" width="10" height="45" fill="#FFFFFF" />
    <rect x="70" y="30" width="10" height="70" fill="#FFFFFF" />
    <rect x="90" y="65" width="10" height="35" fill="#FFFFFF" />
    <rect x="110" y="65" width="10" height="35" fill="#FFFFFF" />
    <rect x="130" y="40" width="10" height="60" fill="#FFFFFF" />
    <rect x="150" y="50" width="10" height="50" fill="#FFFFFF" />
  `

    // 渲染固定數量的 SVG 列表
    const renderSvgs = (count) => {
        const svgs = []
        for (let i = 0; i < count; i++) {
            svgs.push(
                <div key={i} className={styles['svg-item-wrapper']}>
                    <svg viewBox="0 0 200 100" fill="none">
                        <g dangerouslySetInnerHTML={{ __html: svgContent }} />
                    </svg>
                </div>
            )
        }
        return svgs
    }

    return (
        <div className={styles['volume-bar-wrapper']}>
            {renderSvgs(repeatCount)}
        </div>
    )
}

export default VolumeBar
