'use client'

//條件佈局組件
// 控制
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/Layout/Header'
import Footer from '@/components/Layout/Footer'

export default function ConditionalLayout({ children }) {
    const pathname = usePathname()
    const isAdminPage = pathname.startsWith('/admin')

    useEffect(() => {
        if (isAdminPage) {
            document.body.classList.add('admin-page')
        } else {
            document.body.classList.remove('admin-page')
        }

        // 清理函數
        return () => {
            document.body.classList.remove('admin-page')
        }
    }, [isAdminPage])

    if (isAdminPage) {
        return <div className="admin-page">{children}</div>
    }

    return (
        <>
            <Header />
            <main className="main-content">{children}</main>
            <Footer />
        </>
    )
}
