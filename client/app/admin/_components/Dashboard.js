'use client'
//後台管理介面

import { useState, useEffect } from 'react'
import styles from './Dashboard.module.css'

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProducts: 0,
        totalCoupons: 0,
    })

    const [recentActivities, setRecentActivities] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        // 獲取真實數據
        const fetchStats = async () => {
            try {
                setIsLoading(true)
                setError(null)
                
                // 並行獲取所有統計數據
                const [usersResponse, productsResponse, couponsResponse] = await Promise.all([
                    fetch('http://localhost:3005/api/users/admin/count'),
                    fetch('http://localhost:3005/api/products/admin/count'),
                    fetch('http://localhost:3005/api/coupons/admin/count')
                ])

                const [usersData, productsData, couponsData] = await Promise.all([
                    usersResponse.json(),
                    productsResponse.json(),
                    couponsResponse.json()
                ])

                // 更新統計數據
                setStats({
                    totalUsers: usersData.status === 'success' ? usersData.data.total : 0,
                    totalProducts: productsData.status === 'success' ? productsData.data.total : 0,
                    totalCoupons: couponsData.status === 'success' ? couponsData.data.total : 0,
                })
            } catch (error) {
                console.error('獲取統計數據失敗:', error)
                setError('無法載入統計數據，請檢查網路連線')
                // 如果API失敗，使用預設值
                setStats({
                    totalUsers: 0,
                    totalProducts: 0,
                    totalCoupons: 0,
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchStats()

        // 模擬最近活動（可以後續改為真實數據）
        setRecentActivities([
            { id: 1, type: 'user', message: '新用戶註冊', time: '2分鐘前', user: '張小明' },
            { id: 2, type: 'product', message: '商品更新', time: '10分鐘前', user: '王大明' },
            { id: 3, type: 'coupon', message: '優惠券發放', time: '15分鐘前', user: '陳小芳' },
        ])
    }, [])

    const StatCard = ({ title, value, color, isLoading }) => (
        <div className={`${styles.statCard} ${styles[color]}`}>
            <div className={styles.statContent}>
                <h3 className={styles.statValue}>
                    {isLoading ? '載入中...' : value.toLocaleString()}
                </h3>
                <p className={styles.statTitle}>{title}</p>
            </div>
        </div>
    )

    return (
        <div className={styles.dashboard}>
            <div className={styles.dashboardHeader}>
                <h2 className={styles.dashboardTitle}>後臺管理介面</h2>
                <p className={styles.dashboardSubtitle}>歡迎回到管理後台</p>
            </div>

            {/* 統計卡片 */}
            <div className={styles.statsGrid}>
                <StatCard title="總會員數" value={stats.totalUsers} color="primary" isLoading={isLoading} />
                <StatCard title="商品總數" value={stats.totalProducts} color="success" isLoading={isLoading} />
                <StatCard title="優惠券數量" value={stats.totalCoupons} color="warning" isLoading={isLoading} />
            </div>

            {/* 錯誤訊息 */}
            {error && (
                <div className={styles.errorMessage}>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>重新載入</button>
                </div>
            )}

            {/* 最近活動 */}
            <div className={styles.recentActivity}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>最近活動</h3>
                    <button className={styles.viewAllBtn}>查看全部</button>
                </div>

                <div className={styles.activityList}>
                    {recentActivities.map((activity) => (
                        <div key={activity.id} className={styles.activityItem}>
                            <div className={styles.activityContent}>
                                <p className={styles.activityMessage}>{activity.message}</p>
                                <p className={styles.activityUser}>{activity.user}</p>
                            </div>
                            <div className={styles.activityTime}>{activity.time}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 快速操作 */}
            <div className={styles.quickActions}>
                <h3 className={styles.sectionTitle}>快速操作</h3>
                <div className={styles.actionGrid}>
                    <button className={styles.actionBtn}>
                        <span className={styles.actionLabel}>新增商品</span>
                    </button>
                    <button className={styles.actionBtn}>
                        <span className={styles.actionLabel}>新增優惠券</span>
                    </button>
                    <button className={styles.actionBtn}>
                        <span className={styles.actionLabel}>查看報表</span>
                    </button>
                    <button className={styles.actionBtn}>
                        <span className={styles.actionLabel}>系統設定</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
