'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '../_components/AdminLayout'
import AdminContentSwitcher from '../_components/AdminContentSwitcher'

export default function UsersPage() {
    const [activeTab, setActiveTab] = useState('users')
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // 從後端 API 獲取用戶資料
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true)

                const response = await fetch('http://localhost:3005/api/users/admin/all', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()

                if (data.status === 'success') {
                    // 轉換 API 資料格式以符合前端組件需求
                    const formattedUsers = data.data.map((user) => ({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone || '未提供',
                        status: user.status, // 後端已經處理好狀態
                        joinDate: new Date(user.created_at).toLocaleDateString('zh-TW'),
                        orders: user.order_count || 0, // 使用後端提供的訂單數量
                        totalSpent: user.total_spent || 0, // 使用後端提供的總消費
                        account: user.account,
                        nickname: user.nickname,
                        birthday: user.birthday,
                        gender: user.gender,
                        img: user.img ? `http://localhost:3005/uploads/avatars/${user.img}` : null, // 構建完整的頭像 URL
                        level: user.level,
                        points: user.points,
                        email_verified: user.email_verified,
                        created_at: user.created_at,
                        updated_at: user.updated_at,
                    }))
                    setUsers(formattedUsers)
                } else {
                    throw new Error(data.message || '獲取用戶資料失敗')
                }
            } catch (err) {
                console.error('獲取用戶資料錯誤:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [])

    return (
        <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            <AdminContentSwitcher
                activeTab={activeTab}
                users={users}
                loading={loading}
                error={error}
                onUsersUpdate={setUsers}
            />
        </AdminLayout>
    )
}
