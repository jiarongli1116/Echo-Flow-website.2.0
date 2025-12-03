'use client'

import AuthCarousel from '../_components/AuthCarousel'
import RegisterForm from '../_components/RegisterForm'
import styles from '../_components/Auth.module.css'

export default function RegisterPage() {
    // 輪播圖資料
    const carouselImages = [
        { src: '/images/login-banner1.png', alt: '註冊橫幅1' },
        { src: '/images/login-banner2.png', alt: '註冊橫幅2' },
        { src: '/images/login-banner3.png', alt: '註冊橫幅3' }
    ]
    
    return (
        <div className={styles['auth-page']}>
            {/* Main */}
            <main className="container-fluid p-0">
                <div className="row g-0">
                    {/* Left Carousel */}
                    <div className="col-md-6 d-none d-md-flex">
                        <AuthCarousel 
                            carouselId="registerCarousel"
                            images={carouselImages}
                        />
                    </div>

                    {/* Right Form */}
                    <div className="col-md-6 d-flex align-items-center justify-content-center p-5">
                        <RegisterForm />
                    </div>
                </div>
            </main>
        </div>
    )
}
