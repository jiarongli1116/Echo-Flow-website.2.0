'use client'

import { useState, useEffect } from 'react'
import UserPanelLayout from '@/app/users/panel/_components/UserPanelLayout'
import styles from '@/app/users/panel/_components/UserPanel.module.css'
import { GeneralMemberIcon, VIPIcon, VinylCollectorIcon } from '@/components/icons/Icons'
import ProtectedRoute from '@/components/Layout/ProtectedRoute'
import { useAuth } from '@/hooks/use-auth'
import { useUserUpdate, useAccumulatedAmount } from '@/hooks/use-user-update' // 添加 useAccumulatedAmount
import { useUserStats } from '@/hooks/use-user-stats' // 添加 useUserStats

export default function UserPanelPage() {
    const [isMobile, setIsMobile] = useState(false)
    const { user, updateUser } = useAuth() // 添加 updateUser 來更新用戶狀態
    const [avatarKey, setAvatarKey] = useState(0) // 添加強制重新渲染的 key
    const { getAvatarUrl } = useUserUpdate() // 添加 getAvatarUrl 函數
    const {
        accumulatedAmount,
        membershipLevel: apiMembershipLevel,
        isLoading: isAmountLoading,
        error: amountError,
        calculateAccumulatedAmount,
    } = useAccumulatedAmount() // 添加累積金額 hook

    const {
        stats: userStats,
        isLoading: isStatsLoading,
        error: statsError,
        fetchUserStats,
    } = useUserStats() // 添加用戶統計數據 hook

    useEffect(() => {
        // 當用戶狀態變化時，強制更新頭像
        if (user?.img) {
            setAvatarKey((prev) => prev + 1)
        }
    }, [user]) // 移除 avatarKey 依賴，避免無限循環

    // 當用戶登入後，計算累積金額和獲取統計數據
    useEffect(() => {
        if (user?.id) {
            calculateAccumulatedAmount(user.id)
            fetchUserStats(user.id)
        }
    }, [user?.id, calculateAccumulatedAmount, fetchUserStats])

    // 添加手動刷新用戶狀態的函數
    const refreshUserStatus = async () => {
        try {
            const token = localStorage.getItem('reactLoginToken')
            if (!token) {
                return
            }

            const response = await fetch('http://localhost:3005/api/users/status', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            if (response.ok) {
                const result = await response.json()

                if (result.status === 'success' && result.data && result.data.user) {
                    // 更新用戶狀態到 useAuth hook
                    updateUser(result.data.user)

                    // 強制更新頭像
                    setAvatarKey((prev) => prev + 1)
                }
            }
        } catch (error) {
            console.error('刷新用戶狀態失敗:', error)
        }
    }

    // 頁面載入時自動刷新用戶狀態，確保資料是最新的
    useEffect(() => {
        // 無論 user 是否存在，都嘗試刷新用戶狀態
        refreshUserStatus()
    }, []) // 只在頁面載入時執行一次

    // 當用戶狀態變化時，如果頭像有變化，強制更新
    useEffect(() => {
        if (user?.img) {
            setAvatarKey((prev) => prev + 1)
        }
    }, [user?.img]) // 只監聽 user.img 的變化

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        checkScreenSize()
        window.addEventListener('resize', checkScreenSize)

        return () => window.removeEventListener('resize', checkScreenSize)
    }, [])

    // 計算會員等級和進度條寬度
    const getMembershipLevel = (amount) => {
        if (amount >= 16000) return '黑膠收藏家'
        if (amount >= 8000) return 'VIP會員'
        return '一般會員'
    }

    const getProgressWidth = (amount) => {
        if (amount >= 16000) return 100 // 黑膠收藏家，進度條滿格
        if (amount >= 8000) {
            // VIP會員階段：8000-16000之間，進度條從50%到100%
            return 50 + ((amount - 8000) / 8000) * 50
        }
        // 一般會員階段：0-8000之間，進度條從0%到50%
        return Math.min((amount / 8000) * 50, 50)
    }

    // 使用真實的用戶資料
    const userData = {
        name: user?.name,
        avatar: getAvatarUrl(user?.img) || '/images/default-avatar.svg',
        membershipLevel: apiMembershipLevel || getMembershipLevel(accumulatedAmount || 0),
        membershipPeriod: user?.membershipPeriod || '無資訊',
        accumulatedAmount: accumulatedAmount || 0,
        points: userStats.points || 0,
        coupons: userStats.coupons || 0,
        processingOrders: userStats.processingOrders || 0,
        completedOrders: userStats.completedOrders || 0,
    }

    // 桌面版布局
    const DesktopLayout = () => (
        <>
            {/* 用戶信息卡片 */}
            <div className={styles.userInfoCard}>
                <div className={styles.userAvatarSection}>
                    <div className={styles.avatarContainer}>
                        <img
                            key={avatarKey} // 添加 key 以強制重新渲染
                            src={userData.avatar}
                            alt={userData.name}
                            className={styles.userAvatar}
                            onError={(e) => {
                                e.target.src = '/images/default-avatar.svg'
                            }}
                        />
                    </div>
                    <h5 className={styles.userName}>{userData.name}</h5>
                </div>

                <div className={styles.userDetails}>
                    <div className={styles.membershipInfo}>
                        <h6 className={styles.membershipTitle}>
                            {userData.membershipLevel === '黑膠收藏家' ? (
                                <VinylCollectorIcon />
                            ) : userData.membershipLevel === 'VIP會員' ? (
                                <VIPIcon />
                            ) : (
                                <GeneralMemberIcon />
                            )}
                            <span>{userData.membershipLevel}</span>
                        </h6>
                        <p className={styles.membershipPeriod}>會員有效時間: {userData.membershipPeriod}</p>
                    </div>

                    <div className={styles.membershipProgress}>
                        <div className={styles.progressLabels}>
                            <span className={styles.progressLabel}>
                                <div style={{ opacity: 1 }}>
                                    <GeneralMemberIcon fill="#E6C068" />
                                </div>
                                一般會員
                            </span>
                            <span className={styles.progressLabel}>
                                <div style={{ opacity: userData.accumulatedAmount >= 8000 ? 1 : 0.3 }}>
                                    <VIPIcon fill={userData.accumulatedAmount >= 8000 ? '#E6C068' : '#9CA3AF'} />
                                </div>
                                VIP會員
                            </span>
                            <span className={styles.progressLabel}>
                                <div style={{ opacity: userData.accumulatedAmount >= 16000 ? 1 : 0.3 }}>
                                    <VinylCollectorIcon
                                        fill={userData.accumulatedAmount >= 16000 ? '#E6C068' : '#9CA3AF'}
                                    />
                                </div>
                                黑膠收藏家
                            </span>
                        </div>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${getProgressWidth(userData.accumulatedAmount)}%` }}
                            ></div>
                        </div>
                        <p className={styles.progressText}>
                            會員等級累積金額:{' '}
                            {isAmountLoading ? (
                                <span>計算中...</span>
                            ) : amountError ? (
                                <span style={{ color: '#ef4444' }}>載入失敗: {amountError}</span>
                            ) : (
                                `NT$ ${userData.accumulatedAmount.toLocaleString()} 元`
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* 統計數據卡片 */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <p className={styles.statTitle}>紅利點數</p>
                    <div className={styles.statContent}>
                        {isStatsLoading ? (
                            <span className={styles.statValue}>載入中...</span>
                        ) : statsError ? (
                            <span className={styles.statValue} style={{ color: '#ef4444' }}>載入失敗</span>
                        ) : (
                            <>
                                <span className={styles.statValue}>{userData.points}</span>
                                <span className={styles.statUnit}>點</span>
                            </>
                        )}
                    </div>
                </div>

                <div className={styles.statCard}>
                    <p className={styles.statTitle}>優惠券</p>
                    <div className={styles.statContent}>
                        {isStatsLoading ? (
                            <span className={styles.statValue}>載入中...</span>
                        ) : statsError ? (
                            <span className={styles.statValue} style={{ color: '#ef4444' }}>載入失敗</span>
                        ) : (
                            <>
                                <span className={styles.statValue}>{userData.coupons}</span>
                                <span className={styles.statUnit}>張</span>
                            </>
                        )}
                    </div>
                </div>

                <div className={styles.statCard}>
                    <p className={styles.statTitle}>處理中訂單</p>
                    <div className={styles.statContent}>
                        {isStatsLoading ? (
                            <span className={styles.statValue}>載入中...</span>
                        ) : statsError ? (
                            <span className={styles.statValue} style={{ color: '#ef4444' }}>載入失敗</span>
                        ) : (
                            <>
                                <span className={styles.statValue}>{userData.processingOrders}</span>
                                <span className={styles.statUnit}>筆</span>
                            </>
                        )}
                    </div>
                </div>

                <div className={styles.statCard}>
                    <p className={styles.statTitle}>已完成訂單</p>
                    <div className={styles.statContent}>
                        {isStatsLoading ? (
                            <span className={styles.statValue}>載入中...</span>
                        ) : statsError ? (
                            <span className={styles.statValue} style={{ color: '#ef4444' }}>載入失敗</span>
                        ) : (
                            <>
                                <span className={styles.statValue}>{userData.completedOrders}</span>
                                <span className={styles.statUnit}>筆</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )

    // 手機版布局
    const MobileLayout = () => (
        <>
            {/* 用戶信息卡片 - 手機版 */}
            <div className={styles.mobileUserInfoCard}>
                {/* 頭像和徽章區域 */}
                <div className={styles.mobileAvatarSection}>
                    <div className={styles.mobileAvatarContainer}>
                        <img
                            key={avatarKey}
                            src={userData.avatar}
                            alt={userData.name}
                            className={styles.mobileUserAvatar}
                            onError={(e) => {
                                e.target.src = '/images/default-avatar.svg'
                            }}
                        />
                    </div>
                    <div className={styles.mobileNameAndTitle}>
                        <h3 className={styles.mobileUserName}>{userData.name}</h3>
                        <h4 className={styles.mobileMembershipTitle}>
                            {userData.membershipLevel === '黑膠收藏家' ? (
                                <VinylCollectorIcon />
                            ) : userData.membershipLevel === 'VIP會員' ? (
                                <VIPIcon />
                            ) : (
                                <GeneralMemberIcon />
                            )}
                            <span>{userData.membershipLevel}</span>
                        </h4>
                    </div>
                </div>

                {/* 會員信息區域 */}
                <div className={styles.mobileMembershipInfo}>
                    <p className={styles.mobileMembershipPeriod}>會員有效時間: {userData.membershipPeriod}</p>
                </div>

                {/* 進度條區域 */}
                <div className={styles.mobileProgressSection}>
                    <div className={styles.mobileProgressLabels}>
                        <span className={styles.mobileProgressLabel}>
                            <GeneralMemberIcon fill="#E6C068" />
                            一般會員
                        </span>
                        <span className={styles.mobileProgressLabel}>
                            <VIPIcon fill={userData.accumulatedAmount >= 8000 ? '#E6C068' : '#9CA3AF'} />
                            VIP會員
                        </span>
                        <span className={styles.mobileProgressLabel}>
                            <VinylCollectorIcon fill={userData.accumulatedAmount >= 16000 ? '#E6C068' : '#9CA3AF'} />
                            黑膠收藏家
                        </span>
                    </div>
                    <div className={styles.mobileProgressBar}>
                        <div
                            className={styles.mobileProgressFill}
                            style={{ width: `${getProgressWidth(userData.accumulatedAmount)}%` }}
                        ></div>
                    </div>
                    <p className={styles.mobileProgressText}>
                        會員等級累積金額:{' '}
                        {isAmountLoading ? (
                            <span>計算中...</span>
                        ) : amountError ? (
                            <span style={{ color: '#ef4444' }}>載入失敗: {amountError}</span>
                        ) : (
                            `NT$ ${userData.accumulatedAmount.toLocaleString()} 元`
                        )}
                    </p>
                </div>
            </div>

            {/* 統計數據卡片 - 手機版 2x2 網格 */}
            <div className={styles.mobileStatsGrid}>
                <div className={styles.mobileStatCard}>
                    <p className={styles.mobileStatTitle}>紅利點數</p>
                    {isStatsLoading ? (
                        <span className={styles.mobileStatValue}>載入中...</span>
                    ) : statsError ? (
                        <span className={styles.mobileStatValue} style={{ color: '#ef4444' }}>載入失敗</span>
                    ) : (
                        <span className={styles.mobileStatValue}>{userData.points}點</span>
                    )}
                </div>

                <div className={styles.mobileStatCard}>
                    <p className={styles.mobileStatTitle}>優惠券</p>
                    {isStatsLoading ? (
                        <span className={styles.mobileStatValue}>載入中...</span>
                    ) : statsError ? (
                        <span className={styles.mobileStatValue} style={{ color: '#ef4444' }}>載入失敗</span>
                    ) : (
                        <span className={styles.mobileStatValue}>{userData.coupons}張</span>
                    )}
                </div>

                <div className={styles.mobileStatCard}>
                    <p className={styles.mobileStatTitle}>處理中訂單</p>
                    {isStatsLoading ? (
                        <span className={styles.mobileStatValue}>載入中...</span>
                    ) : statsError ? (
                        <span className={styles.mobileStatValue} style={{ color: '#ef4444' }}>載入失敗</span>
                    ) : (
                        <span className={styles.mobileStatValue}>{userData.processingOrders}筆</span>
                    )}
                </div>

                <div className={styles.mobileStatCard}>
                    <p className={styles.mobileStatTitle}>已完成訂單</p>
                    {isStatsLoading ? (
                        <span className={styles.mobileStatValue}>載入中...</span>
                    ) : statsError ? (
                        <span className={styles.mobileStatValue} style={{ color: '#ef4444' }}>載入失敗</span>
                    ) : (
                        <span className={styles.mobileStatValue}>{userData.completedOrders}筆</span>
                    )}
                </div>
            </div>
        </>
    )

    return (
        <ProtectedRoute>
            <UserPanelLayout pageTitle="會員中心">{isMobile ? <MobileLayout /> : <DesktopLayout />}</UserPanelLayout>
        </ProtectedRoute>
    )
}
