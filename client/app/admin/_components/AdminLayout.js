'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import styles from './AdminLayout.module.css'

export default function AdminLayout({ children, activeTab, setActiveTab }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    const menuItems = [
        { id: 'dashboard', label: '總管理頁面', path: '/admin' },
        { id: 'users', label: '會員管理', path: '/admin/users' },
        { id: 'products', label: '商品管理', path: '/admin/products' },
        { id: 'coupons', label: '優惠券管理', path: '/admin/coupons' },
    ]

    const handleNavigation = (item) => {
        router.push(item.path)
    }

    return (
        <div className={styles.adminContainer}>
            {/* 側邊欄 */}
            <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        {sidebarCollapsed ? (
                            <Image
                                src="/images/logo2.png"
                                alt="Logo"
                                width={32}
                                height={32}
                                className={styles.logoImage}
                            />
                        ) : (
                            <Image
                                src="/images/logo.svg"
                                alt="Admin Panel"
                                width={200}
                                height={50}
                                className={styles.logoImage}
                            />
                        )}
                    </div>
                    <button className={styles.toggleBtn} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                        {sidebarCollapsed ? '→' : '←'}
                    </button>
                </div>

                <nav className={styles.nav}>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
                            onClick={() => handleNavigation(item)}
                        >
                            {!sidebarCollapsed && <span className={styles.navLabel}>{item.label}</span>}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* 主要內容區域 */}
            <main className={styles.mainContent}>
                {/* 頂部導航 */}
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>
                            {menuItems.find((item) => item.path === pathname)?.label || '後臺管理'}
                        </h1>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>管理員</span>
                            <div className={styles.userAvatar}>E</div>
                        </div>
                    </div>
                </header>

                {/* 內容區域 */}
                <div className={styles.contentArea}>{children}</div>
            </main>
        </div>
    )
}
