'use client'

import { useEffect } from 'react'
import UserPanelLayout from '@/app/users/panel/_components/UserPanelLayout'
import pageStyles from '../points.module.css'
import { usePoints } from '@/hooks/use-points'

export default function PointsHistoryPage() {
    const {
        pointsSummary,
        pointsHistory,
        loading,
        error,
        fetchPointsSummary,
        fetchPointsHistory,
        formatDate,
        formatPointsType,
    } = usePoints()

    // 安全檢查，確保資料是陣列
    const safePointsHistory = Array.isArray(pointsHistory) ? pointsHistory : []
    const safePointsSummary = pointsSummary || { totalPoints: 0 }

    // 移除重複的 useEffect，因為 usePoints hook 已經處理了初始化
    // 組件載入時獲取資料
    // useEffect(() => {
    //     fetchPointsSummary()
    //     fetchPointsHistory()
    // }, []) // 移除依賴項，避免無限循環

    // 載入狀態
    if (loading) {
        return (
            <UserPanelLayout pageTitle="紅利點數記錄">
                <div className={pageStyles.pointsContainer}>
                    <div className={pageStyles.loadingContainer}>
                        <div>載入中...</div>
                    </div>
                </div>
            </UserPanelLayout>
        )
    }

    // 錯誤狀態
    if (error) {
        return (
            <UserPanelLayout pageTitle="紅利點數記錄">
                <div className={pageStyles.pointsContainer}>
                    <div className={pageStyles.errorContainer}>
                        <div>錯誤: {error}</div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                            請檢查網路連接或重新登入
                        </div>
                    </div>
                </div>
            </UserPanelLayout>
        )
    }

    // 判斷點數類型的輔助函數
    const getPointsTypeClass = (pointsType) => {
        if (!pointsType) return pageStyles.pointsDefault

        if (pointsType === '獲得' || pointsType === '加點' || pointsType === '購買回饋') {
            return pageStyles.pointsGain
        } else if (pointsType === '使用' || pointsType === '扣點') {
            return pageStyles.pointsUse
        }
        return pageStyles.pointsDefault
    }

    // 格式化點數顯示
    const formatPointsDisplay = (points, pointsType) => {
        if (!pointsType) return (points || 0).toLocaleString()

        const pointsValue = (points || 0).toLocaleString()
        if (pointsType === '獲得' || pointsType === '加點' || pointsType === '購買回饋') {
            return `+${pointsValue}`
        } else if (pointsType === '使用' || pointsType === '扣點') {
            return `${pointsValue}`
        }
        return pointsValue
    }

    return (
        <UserPanelLayout pageTitle="紅利點數記錄">
            <div className={pageStyles.pointsContainer}>
                {/* 點數摘要信息 */}
                <div className={pageStyles.pointsSummary}>
                    <div className={pageStyles.pointsSummaryItem}>
                        <span className={pageStyles.pointsSummaryLabel}>可使用點數:</span>
                        <span className={pageStyles.pointsSummaryValue}>
                            {(pointsSummary.totalPoints || 0).toLocaleString()}點
                        </span>
                    </div>
                </div>

                {/* 點數記錄表格 */}
                <div className={pageStyles.pointsTableContainer}>
                    {pointsHistory.length === 0 ? (
                        <div className={pageStyles.emptyContainer}>
                            <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>尚無點數記錄</div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                                您還沒有任何點數記錄，趕快去購物或參加活動吧！
                            </div>
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    marginBottom: '1rem',
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    textAlign: 'right',
                                }}
                            >
                                近期 前 {pointsHistory.length} 筆記錄
                            </div>
                            <table className={pageStyles.pointsTable}>
                                <thead>
                                    <tr>
                                        <th>記錄日期</th>
                                        <th>點數類型</th>
                                        <th>說明</th>
                                        <th>點數</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pointsHistory.map((record) => (
                                        <tr key={record.id}>
                                            <td>{formatDate(record.sendDate || '')}</td>
                                            <td>{formatPointsType(record.points_type)}</td>
                                            <td>{record.description || '-'}</td>
                                            <td className={getPointsTypeClass(record.points_type)}>
                                                {formatPointsDisplay(record.points, record.points_type)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            </div>
        </UserPanelLayout>
    )
}
