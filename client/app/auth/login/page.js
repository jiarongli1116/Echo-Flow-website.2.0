'use client'

import AuthCarousel from '../_components/AuthCarousel'
import LoginForm from '../_components/LoginForm'
import SuccessMessage from '../_components/SuccessMessage'
import styles from '../_components/Auth.module.css'

export default function LoginPage() {
    // 輪播圖資料
    const carouselImages = [
        { src: '/images/login-banner1.png', alt: '登入橫幅1' },
        { src: '/images/login-banner2.png', alt: '登入橫幅2' },
        { src: '/images/login-banner3.png', alt: '登入橫幅3' },
    ]

    return (
        <div className={styles['auth-page']}>
            {/* Main */}
            <main className="container-fluid p-0">
                <div className="row g-0">
                    {/* Left Image */}
                    <div className="col-md-6 d-none d-md-flex">
                        <AuthCarousel carouselId="heroCarousel" images={carouselImages} />
                    </div>

                    {/* Right Form */}
                    <div className="col-md-6 d-flex align-items-center justify-content-center p-5">
                        <div className="w-100">
                            <SuccessMessage />
                            <LoginForm />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
