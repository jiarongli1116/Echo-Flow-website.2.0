'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './Auth.module.css'

export default function SuccessMessage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isRegistered = searchParams.get('registered') === 'true'

    useEffect(() => {
        if (isRegistered) {
            // 5秒後自動跳轉到登入頁面
            const timer = setTimeout(() => {
                router.replace('/auth/login')
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [isRegistered, router])

    if (!isRegistered) return null

    return (
        <div className={`alert alert-success ${styles['success-alert']}`}>
            <div className="d-flex align-items-center">
                <i className="bi bi-check-circle-fill me-2"></i>
                <div>
                    <h6 className="mb-1">註冊成功！</h6>
                    <p className="mb-0">您的帳號已成功創建，3秒後將自動跳轉到登入頁面。</p>
                </div>
            </div>
            <button
                type="button"
                className="btn-close"
                onClick={() => router.replace('/auth/login')}
                aria-label="關閉"
            ></button>
        </div>
    )
}
