'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login')
    }
  }, [user, isLoading, router])

  // 如果正在載入，顯示載入狀態
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
      </div>
    )
  }

  // 如果沒有用戶，不渲染內容（會被重定向）
  if (!user) {
    return null
  }

  // 如果有用戶，渲染受保護的內容
  return children
}
