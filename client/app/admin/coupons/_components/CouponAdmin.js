'use client'

import { useState, useEffect } from 'react'
import styles from '../../_components/AdminCommon.module.css'
import Pagination from '../../_components/Pagination'
import Link from 'next/link'

export default function CouponAdmin({
    coupons = [],
    loading = false,
    error = null,
    onCouponsUpdate,
    onChangeStatus,
    onValid,
    onAllStatus,
    onAllValid,
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [showAddModal, setShowAddModal] = useState(false)
    const [selectedCoupons, setSelectedCoupons] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    // 直接使用傳入的 coupons 資料
    const currentCoupons = coupons

    const filteredCoupons = currentCoupons.filter((coupon) => {
        const matchesSearch =
            coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            coupon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (coupon.content &&
                coupon.content.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesType = filterType === 'all' || coupon.type === filterType
        const matchesStatus =
            filterStatus === 'all' || coupon.status === filterStatus
        return matchesSearch && matchesType && matchesStatus
    })

    // 分頁處理
    const totalItems = filteredCoupons.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedCoupons = filteredCoupons.slice(startIndex, endIndex)

    // 處理分頁變更
    const handlePageChange = (page) => {
        setCurrentPage(page)
        setSelectedCoupons([]) // 清空選擇
    }

    const handleSelectCoupon = (couponId) => {
        setSelectedCoupons((prev) =>
            prev.includes(couponId)
                ? prev.filter((id) => id !== couponId)
                : [...prev, couponId]
        )
    }

    const handleSelectAll = () => {
        setSelectedCoupons(
            selectedCoupons.length === paginatedCoupons.length
                ? []
                : paginatedCoupons.map((coupon) => coupon.code)
        )
    }

    // 處理批量啟用的函式
    const handleAllActive = () => {
        // 您應該在這裡添加確認對話框
        console.log(selectedCoupons)

        if (confirm(`確定啟用這 ${selectedCoupons.length} 張優惠券嗎？`)) {
            onAllStatus(selectedCoupons, 'active')

            console.log(`啟用這 ${selectedCoupons.length} 張優惠券`)
            setSelectedCoupons([]) // 操作完成後重設選擇狀態
        }
    }

    // 處理批量停用的函式
    const handleAllInactive = () => {
        if (confirm(`確定停用這 ${selectedCoupons.length} 張優惠券嗎？`)) {
            onAllStatus(selectedCoupons, 'inactive')

            console.log(`停用這 ${selectedCoupons.length} 張優惠券`)
            setSelectedCoupons([])
        }
    }

    // 處理批量刪除的函式
    const handleAllValid = () => {
        if (confirm(`確定下架這 ${selectedCoupons.length} 張優惠券嗎？`)) {
            onAllValid(selectedCoupons)
            console.log(`刪除這 ${selectedCoupons.length} 張優惠券`)
            setSelectedCoupons([])
        }
    }

    const formatValue = (coupon) => {
        if (coupon.type === 'percentage') {
            return coupon.value % 10 === 0
                ? `${coupon.value / 10}折`
                : `${coupon.value}折`
        } else if (coupon.type === 'free_shipping') {
            return '免運費'
        } else {
            return `NT$ ${coupon.value}`
        }
    }

    const getUsagePercentage = (coupon) => {
        // 總發放數量
        const totalQuantity =
            coupon.totalQuantity === null ? 0 : coupon.totalQuantity

        // 已發放數量
        const userCount = coupon.userCount === null ? 0 : coupon.userCount

        // 如果總發放數量為 0(發放完畢) 則百分比為 100
        if (totalQuantity == 0 && userCount > 0) {
            return 100
        }
        // 如果領取數量為0，則顯示為 0
        if (userCount === 0) {
            return 0
        }
        // 如果總發放數量為無限，則顯示為 50%
        if (totalQuantity === -1) {
            return 50
        }

        // 計算已發放數量佔總發放數量的百分比
        return Math.round((userCount / (totalQuantity + userCount)) * 100)
    }

    function checkValid(code, name) {
        if (confirm(`確定下架 ${name} 嗎?`)) {
            // 只有在使用者點擊「確定」後，這行程式碼才會被執行
            onValid(code)
        }
    }

    const CouponRow = ({ coupon }) => {
        const targetMap = {
            1: '古典',
            2: '爵士',
            3: '西洋',
            4: '華語',
            5: '日韓',
            6: '原聲帶',
        }
        const totalQuantity = coupon.totalQuantity
        const userCount = coupon.userCount === null ? 0 : coupon.userCount

        return (
            <tr className={styles.dataRow}>
                <td>
                    <input
                        type="checkbox"
                        checked={selectedCoupons.includes(coupon.code)}
                        onChange={() => handleSelectCoupon(coupon.code)}
                        className={styles.checkbox}
                    />
                </td>

                <td>
                    <div className={styles.couponInfo}>
                        <div className={styles.couponCode}>{coupon.code}</div>
                        <div className={styles.couponName}>{coupon.name}</div>
                    </div>
                </td>

                <td>
                    {coupon.targetType === 'member'
                        ? '會員'
                        : coupon.targetType === 'all'
                        ? '全品項'
                        : targetMap[coupon.targetValue]}
                </td>

                <td>
                    <span
                        className={`${styles.discountType} ${
                            styles[coupon.type]
                        }`}
                    >
                        {coupon.type === 'free_shipping'
                            ? '免運'
                            : coupon.type === 'percentage'
                            ? '百分比'
                            : '固定金額'}
                    </span>
                </td>

                <td className={styles.discountValue}>{formatValue(coupon)}</td>

                <td>
                    {coupon.minAmount == 0
                        ? '無限制'
                        : 'NT$ ' + coupon.minAmount.toLocaleString()}
                </td>

                <td>
                    <div className={styles.dateRange}>
                        <div>{coupon.startDate}~</div>
                        <div>{coupon.endDate}</div>
                    </div>
                </td>

                <td>
                    <div className={styles.usageInfo}>
                        <div className={styles.usageCount}>
                            {coupon.userCount} /{' '}
                            {coupon.totalQuantity === -1
                                ? '∞'
                                : totalQuantity + userCount}
                        </div>
                        <div className={styles.usageBar}>
                            <div
                                className={styles.usageProgress}
                                style={{
                                    width: `${getUsagePercentage(coupon)}%`,
                                }}
                            ></div>
                        </div>
                    </div>
                </td>

                <td>
                    <span
                        className={`${styles.status} ${styles[coupon.status]}`}
                    >
                        {coupon.status === 'active' ? '發放中' : '停止發放'}
                    </span>
                </td>

                <td>
                    <div className={styles.actions}>
                        <button
                            className={styles.actionBtn}
                            onClick={() => onChangeStatus(coupon.code)}
                        >
                            {coupon.status === 'active' ? '停用' : '啟用'}
                        </button>
                        <Link
                            href={`/admin/coupons/${coupon.code}`}
                            className={styles.actionBtn}
                        >
                            編輯
                        </Link>
                        <button
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => checkValid(coupon.code, coupon.name)}
                        >
                            下架
                        </button>
                    </div>
                </td>
            </tr>
        )
    }

    // 載入狀態
    if (loading) {
        return (
            <div className={styles.adminContainer}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>優惠券管理</h2>
                        <p className={styles.subtitle}>
                            管理所有優惠券和促銷活動
                        </p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className={styles.loading}>載入中...</div>
                </div>
            </div>
        )
    }

    // 錯誤狀態
    if (error) {
        return (
            <div className={styles.adminContainer}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>優惠券管理</h2>
                        <p className={styles.subtitle}>
                            管理所有優惠券和促銷活動
                        </p>
                    </div>
                </div>
                <div
                    style={{
                        textAlign: 'center',
                        padding: '2rem',
                        color: 'red',
                    }}
                >
                    <p>載入失敗: {error}</p>
                    <button onClick={() => window.location.reload()}>
                        重新載入
                    </button>
                </div>
            </div>
        )
    }

    // 沒有資料狀態
    if (!loading && !error && currentCoupons.length === 0) {
        return (
            <div className={styles.adminContainer}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>優惠券管理</h2>
                        <p className={styles.subtitle}>
                            管理所有優惠券和促銷活動
                        </p>
                    </div>
                    <div className={styles.headerRight}>
                        <button
                            className={styles.addBtn}
                            onClick={() => setShowAddModal(true)}
                        >
                            新增優惠券
                        </button>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>目前沒有任何優惠券</p>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.adminContainer}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h2 className={styles.title}>優惠券管理</h2>
                    <p className={styles.subtitle}>
                        所有優惠券 共{currentCoupons.length} 張優惠券
                    </p>
                </div>
                <div className={styles.headerRight}>
                    <Link className={styles.addBtn} href={'/admin/coupons/add'}>
                        新增優惠券
                    </Link>
                </div>
            </div>

            {/* 搜尋和篩選 */}
            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="搜尋優惠券代碼或名稱..."
                        value={searchTerm}
                        onChange={(e) => {
                            setCurrentPage(1)
                            setSearchTerm(e.target.value)
                        }}
                        className={styles.searchInput}
                    />
                </div>

                <select
                    value={filterType}
                    onChange={(e) => {
                        setCurrentPage(1)
                        setFilterType(e.target.value)
                    }}
                    className={styles.filterSelect}
                >
                    <option value="all">全部類型</option>
                    <option value="percentage">百分比折扣</option>
                    <option value="fixed">固定金額</option>
                    <option value="free_shipping">免運券</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => {
                        setCurrentPage(1)
                        setFilterStatus(e.target.value)
                    }}
                    className={styles.filterSelect}
                >
                    <option value="all">全部狀態</option>
                    <option value="active">啟用中</option>
                    <option value="expired">停止發放</option>
                </select>
            </div>

            {/* 批量操作 */}
            {selectedCoupons.length > 0 && (
                <div className={styles.bulkActions}>
                    <span className={styles.selectedCount}>
                        已選擇 {selectedCoupons.length} 張優惠券
                    </span>
                    <div className={styles.bulkButtons}>
                        <button
                            className={styles.bulkBtn}
                            onClick={handleAllActive}
                        >
                            批量啟用
                        </button>
                        <button
                            className={styles.bulkBtn}
                            onClick={handleAllInactive}
                        >
                            批量停用
                        </button>
                        <button
                            className={`${styles.bulkBtn} ${styles.danger}`}
                            onClick={handleAllValid}
                        >
                            批量下架
                        </button>
                    </div>
                </div>
            )}

            {/* 優惠券表格 */}
            <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedCoupons.length ===
                                            paginatedCoupons.length &&
                                        paginatedCoupons.length > 0
                                    }
                                    onChange={handleSelectAll}
                                    className={styles.checkbox}
                                />
                            </th>
                            <th>優惠券名稱</th>
                            <th>種類</th>
                            <th>類型</th>
                            <th>折扣值</th>
                            <th>最低消費</th>
                            <th>活動期間</th>
                            <th>領取進度</th>
                            <th>狀態</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCoupons.map((coupon) => (
                            <CouponRow key={coupon.id} coupon={coupon} />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 分頁 */}
            {totalPages > 1 && (
                <Pagination
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    maxVisiblePages={5}
                    showFirstLast={true}
                    showPrevNext={true}
                />
            )}
        </div>
    )
}
