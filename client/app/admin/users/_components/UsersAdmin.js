'use client'

import { useState, useEffect } from 'react'
import styles from '../../_components/AdminCommon.module.css'
import ConfirmModal from './ConfirmModal'
import MessageModal from '../../_components/MessageModal'
import Pagination from '../../_components/Pagination'
import { usePagination } from '../../_hooks/usePagination'
import { UserEditModal } from './UserEditModal'

export default function UserManagement({ users = [], loading = false, error = null, onUsersUpdate }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [selectedUsers, setSelectedUsers] = useState([])
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null,
        user: null,
    })
    const [messageModal, setMessageModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null,
    })
    const [isDeleting, setIsDeleting] = useState(false)
    const [isBulkProcessing, setIsBulkProcessing] = useState(false)
    const [editModal, setEditModal] = useState({
        isOpen: false,
        user: null,
    })

    // 直接使用傳入的 users 資料
    const currentUsers = users

    const filteredUsers = currentUsers.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = filterStatus === 'all' || user.status === filterStatus
        return matchesSearch && matchesStatus
    })

    // 使用分頁 Hook
    const {
        currentPage,
        totalItems,
        currentPageData: currentPageUsers,
        handlePageChange,
    } = usePagination(filteredUsers, 20, [searchTerm, filterStatus])

    const handleSelectUser = (userId) => {
        setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
    }

    const handleSelectAll = () => {
        setSelectedUsers(selectedUsers.length === filteredUsers.length ? [] : filteredUsers.map((user) => user.id))
    }

    const handleStatusChange = (userId, newStatus) => {
        if (onUsersUpdate) {
            const updatedUsers = users.map((user) => (user.id === userId ? { ...user, status: newStatus } : user))
            onUsersUpdate(updatedUsers)
        }
    }

    // 軟刪除使用者
    const handleSoftDelete = async (user) => {
        try {
            setIsDeleting(true)

            const response = await fetch(`http://localhost:3005/api/users/admin/delete/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const data = await response.json()

            if (response.ok && data.status === 'success') {
                // 更新本地狀態，將使用者標記為已刪除
                if (onUsersUpdate) {
                    const updatedUsers = users.map((u) =>
                        u.id === user.id ? { ...u, status: 'inactive', deleted_at: data.data.deleted_at } : u
                    )
                    onUsersUpdate(updatedUsers)
                }

                // 顯示成功訊息
                showMessageModal('操作成功', `使用者「${user.name}」已成功停用`, 'success')
            } else {
                throw new Error(data.message || '停用使用者失敗')
            }
        } catch (error) {
            console.error('停用使用者時發生錯誤:', error)
            showMessageModal('操作失敗', `停用使用者失敗: ${error.message}`, 'error')
        } finally {
            setIsDeleting(false)
            setConfirmModal({ ...confirmModal, isOpen: false })
        }
    }

    // 啟用使用者
    const handleActivateUser = async (user) => {
        try {
            setIsDeleting(true)

            const response = await fetch(`http://localhost:3005/api/users/admin/activate/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const data = await response.json()

            if (response.ok && data.status === 'success') {
                // 更新本地狀態，將使用者標記為啟用
                if (onUsersUpdate) {
                    const updatedUsers = users.map((u) =>
                        u.id === user.id ? { ...u, status: 'active', deleted_at: null } : u
                    )
                    onUsersUpdate(updatedUsers)
                }

                // 顯示成功訊息
                showMessageModal('操作成功', `使用者「${user.name}」已成功啟用`, 'success')
            } else {
                throw new Error(data.message || '啟用使用者失敗')
            }
        } catch (error) {
            console.error('啟用使用者時發生錯誤:', error)
            showMessageModal('操作失敗', `啟用使用者失敗: ${error.message}`, 'error')
        } finally {
            setIsDeleting(false)
            setConfirmModal({ ...confirmModal, isOpen: false })
        }
    }

    // 顯示確認對話框
    const showConfirmModal = (user, action) => {
        if (action === 'delete') {
            setConfirmModal({
                isOpen: true,
                title: '確認停用使用者',
                message: `您確定要停用使用者「${user.name}」嗎？\n\n停用後該使用者將無法登入系統，但資料仍會保留。`,
                type: 'warning',
                onConfirm: () => handleSoftDelete(user),
                user: user,
            })
        } else if (action === 'activate') {
            setConfirmModal({
                isOpen: true,
                title: '確認啟用使用者',
                message: `您確定要啟用使用者「${user.name}」嗎？`,
                type: 'info',
                onConfirm: () => handleActivateUser(user),
                user: user,
            })
        }
    }

    // 關閉確認對話框
    const closeConfirmModal = () => {
        setConfirmModal({ ...confirmModal, isOpen: false })
    }

    // 顯示訊息對話框
    const showMessageModal = (title, message, type = 'info', autoClose = 0, onConfirmAction = null) => {
        setMessageModal({
            isOpen: true,
            title,
            message,
            type,
            onConfirm: () => {
                setMessageModal({ ...messageModal, isOpen: false })
                if (onConfirmAction) {
                    onConfirmAction()
                }
            },
        })
    }

    // 關閉訊息對話框
    const closeMessageModal = () => {
        setMessageModal({ ...messageModal, isOpen: false })
    }

    // 開啟編輯模態框
    const handleEditUser = (user) => {
        setEditModal({
            isOpen: true,
            user: user,
        })
    }

    // 關閉編輯模態框
    const closeEditModal = () => {
        setEditModal({
            isOpen: false,
            user: null,
        })
    }

    // 批量啟用用戶
    const handleBulkActivate = async () => {
        if (selectedUsers.length === 0) return

        try {
            setIsBulkProcessing(true)

            // 並行處理所有選中的用戶
            const promises = selectedUsers.map(async (userId) => {
                const response = await fetch(`http://localhost:3005/api/users/admin/activate/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                return { userId, response: await response.json(), ok: response.ok }
            })

            const results = await Promise.all(promises)
            const successCount = results.filter((result) => result.ok && result.response.status === 'success').length
            const failCount = results.length - successCount

            // 更新本地狀態
            if (onUsersUpdate && successCount > 0) {
                const updatedUsers = users.map((user) => {
                    if (selectedUsers.includes(user.id)) {
                        const result = results.find((r) => r.userId === user.id)
                        if (result && result.ok && result.response.status === 'success') {
                            return { ...user, status: 'active', deleted_at: null }
                        }
                    }
                    return user
                })
                onUsersUpdate(updatedUsers)
            }

            // 清空選中狀態
            setSelectedUsers([])

            // 顯示結果訊息
            if (failCount === 0) {
                showMessageModal('批量操作成功', `已成功啟用 ${successCount} 位會員`, 'success')
            } else {
                showMessageModal('批量操作完成', `成功啟用 ${successCount} 位會員，${failCount} 位操作失敗`, 'warning')
            }
        } catch (error) {
            console.error('批量啟用用戶時發生錯誤:', error)
            showMessageModal('批量操作失敗', `批量啟用失敗: ${error.message}`, 'error')
        } finally {
            setIsBulkProcessing(false)
        }
    }

    // 批量停用用戶
    const handleBulkDeactivate = async () => {
        if (selectedUsers.length === 0) return

        try {
            setIsBulkProcessing(true)

            // 並行處理所有選中的用戶
            const promises = selectedUsers.map(async (userId) => {
                const response = await fetch(`http://localhost:3005/api/users/admin/delete/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                return { userId, response: await response.json(), ok: response.ok }
            })

            const results = await Promise.all(promises)
            const successCount = results.filter((result) => result.ok && result.response.status === 'success').length
            const failCount = results.length - successCount

            // 更新本地狀態
            if (onUsersUpdate && successCount > 0) {
                const updatedUsers = users.map((user) => {
                    if (selectedUsers.includes(user.id)) {
                        const result = results.find((r) => r.userId === user.id)
                        if (result && result.ok && result.response.status === 'success') {
                            return { ...user, status: 'inactive', deleted_at: result.response.data.deleted_at }
                        }
                    }
                    return user
                })
                onUsersUpdate(updatedUsers)
            }

            // 清空選中狀態
            setSelectedUsers([])

            // 顯示結果訊息
            if (failCount === 0) {
                showMessageModal('批量操作成功', `已成功停用 ${successCount} 位會員`, 'success')
            } else {
                showMessageModal('批量操作完成', `成功停用 ${successCount} 位會員，${failCount} 位操作失敗`, 'warning')
            }
        } catch (error) {
            console.error('批量停用用戶時發生錯誤:', error)
            showMessageModal('批量操作失敗', `批量停用失敗: ${error.message}`, 'error')
        } finally {
            setIsBulkProcessing(false)
        }
    }

    // 儲存用戶編輯
    const handleSaveUser = async (userId, updateData) => {
        try {
            const response = await fetch(`http://localhost:3005/api/users/admin/update/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            })

            const data = await response.json()

            if (response.ok && data.status === 'success') {
                // 更新本地狀態
                if (onUsersUpdate) {
                    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, ...data.data } : u))
                    onUsersUpdate(updatedUsers)
                }

                return {
                    success: true,
                    data: data.data,
                    message: '更新成功',
                }
            } else {
                throw new Error(data.message || '更新失敗')
            }
        } catch (error) {
            console.error('更新用戶資料錯誤:', error)
            return {
                success: false,
                message: error.message || '更新失敗，請稍後再試',
            }
        }
    }

    const UserRow = ({ user }) => (
        <tr className={styles.dataRow}>
            <td>
                <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className={styles.checkbox}
                />
            </td>
            <td>
                <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                        {user.img ? (
                            <img
                                src={user.img}
                                alt={user.name}
                                className={styles.avatarImage}
                                onError={(e) => {
                                    // 如果圖片載入失敗，顯示文字頭像
                                    e.target.style.display = 'none'
                                    e.target.nextSibling.style.display = 'flex'
                                }}
                            />
                        ) : null}
                        <div className={styles.avatarText} style={{ display: user.img ? 'none' : 'flex' }}>
                            {user.name.charAt(0)}
                        </div>
                    </div>
                    <div>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                    </div>
                </div>
            </td>
            <td>{user.level}</td>
            <td>
                <span className={`${styles.status} ${styles[user.status]}`}>
                    {user.status === 'active' ? '啟用' : '停用'}
                </span>
            </td>
            <td>{user.joinDate}</td>
            <td>{user.orders}</td>
            <td>NT$ {user.totalSpent.toLocaleString()}</td>
            <td>
                <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={() => handleEditUser(user)}>
                        編輯
                    </button>
                    <button
                        className={`${styles.actionBtn} ${user.status === 'inactive' ? styles.success : styles.danger}`}
                        onClick={() => showConfirmModal(user, user.status === 'inactive' ? 'activate' : 'delete')}
                        disabled={isDeleting}
                    >
                        {isDeleting && confirmModal.user?.id === user.id
                            ? user.status === 'inactive'
                                ? '啟用中...'
                                : '停用中...'
                            : user.status === 'inactive'
                            ? '啟用'
                            : '停用'}
                    </button>
                </div>
            </td>
        </tr>
    )

    // 載入狀態
    if (loading) {
        return (
            <div className={styles.userManagement}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>會員管理</h2>
                        <p className={styles.subtitle}>管理所有註冊會員</p>
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
            <div className={styles.userManagement}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>會員管理</h2>
                        <p className={styles.subtitle}>管理所有註冊會員</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
                    <p>載入失敗: {error}</p>
                    <button
                        className={styles.actionBtn}
                        onClick={() =>
                            showMessageModal(
                                '重新載入頁面',
                                '您確定要重新載入頁面嗎？這將刷新所有資料。',
                                'warning',
                                0,
                                () => window.location.reload()
                            )
                        }
                    >
                        重新載入
                    </button>
                </div>
            </div>
        )
    }

    // 沒有資料狀態
    if (!loading && !error && currentUsers.length === 0) {
        return (
            <div className={styles.userManagement}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>會員管理</h2>
                        <p className={styles.subtitle}>管理所有註冊會員</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>目前沒有任何會員資料</p>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.adminContainer}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h2 className={styles.title}>會員管理</h2>
                    <p className={styles.subtitle}>
                        所有註冊會員 共{currentUsers.length} 位會員
                        {totalItems !== currentUsers.length && ` (篩選後 ${totalItems} 位)`}
                    </p>
                </div>
            </div>

            {/* 搜尋和篩選 */}
            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="搜尋會員姓名或信箱..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="all">全部狀態</option>
                    <option value="active">啟用</option>
                    <option value="inactive">停用</option>
                </select>
            </div>

            {/* 批量操作 */}
            {selectedUsers.length > 0 && (
                <div className={styles.bulkActions}>
                    <span className={styles.selectedCount}>已選擇 {selectedUsers.length} 位會員</span>
                    <div className={styles.bulkButtons}>
                        <button className={styles.bulkBtn} onClick={handleBulkActivate} disabled={isBulkProcessing}>
                            {isBulkProcessing ? '處理中...' : '批量啟用'}
                        </button>
                        <button
                            className={`${styles.bulkBtn} ${styles.danger}`}
                            onClick={handleBulkDeactivate}
                            disabled={isBulkProcessing}
                        >
                            {isBulkProcessing ? '處理中...' : '批量停用'}
                        </button>
                    </div>
                </div>
            )}

            {/* 會員表格 */}
            <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                    onChange={handleSelectAll}
                                    className={styles.checkbox}
                                />
                            </th>
                            <th>會員資訊</th>
                            <th>會員等級</th>
                            <th>狀態</th>
                            <th>註冊日期</th>
                            <th>訂單數</th>
                            <th>總消費</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentPageUsers.map((user) => (
                            <UserRow key={user.id} user={user} />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 分頁元件 */}
            <Pagination
                totalItems={totalItems}
                itemsPerPage={20}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                maxVisiblePages={5}
                showFirstLast={true}
                showPrevNext={true}
            />

            {/* 確認對話框 */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={
                    isDeleting
                        ? confirmModal.user?.status === 'inactive'
                            ? '啟用中...'
                            : '停用中...'
                        : confirmModal.user?.status === 'inactive'
                        ? '確定啟用'
                        : '確定停用'
                }
                cancelText="取消"
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
            />

            {/* 訊息對話框 */}
            <MessageModal
                isOpen={messageModal.isOpen}
                title={messageModal.title}
                message={messageModal.message}
                type={messageModal.type}
                confirmText="確定"
                onConfirm={closeMessageModal}
            />

            {/* 編輯用戶模態框 */}
            <UserEditModal
                isOpen={editModal.isOpen}
                user={editModal.user}
                onClose={closeEditModal}
                onSave={handleSaveUser}
            />
        </div>
    )
}
