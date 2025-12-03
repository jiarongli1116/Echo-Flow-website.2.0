// client/components/Layout/Footer.js
import 'bootstrap-icons/font/bootstrap-icons.css'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Footer.module.css'

export default function Footer() {
    return (
        <footer className={`${styles.footer} bg-black text-white pt-5 pb-3`}>
            <div className="container">
                <div className="row">
                    {/* 客服服務 */}
                    <div className="col-12 col-sm-6 col-md-2 mb-4 mb-md-3 text-center text-md-start">
                        <h6 className={`fw-bold mb-3 ${styles.footerTitle}`}>客服服務</h6>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link href="#" className={`${styles.footerLink} text-decoration-none`}>
                                    會員常見問題
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link href="#" className={`${styles.footerLink} text-decoration-none`}>
                                    會員條款規範
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link href="#" className={`${styles.footerLink} text-decoration-none`}>
                                    購物流程說明
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link href="#" className={`${styles.footerLink} text-decoration-none`}>
                                    付款方式說明
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* 網站資訊 */}
                    <div className="col-12 col-sm-6 col-md-2 mb-4 mb-md-3 text-center text-md-start">
                        <h6 className={`fw-bold mb-3 ${styles.footerTitle}`}>網站資訊</h6>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link href="/Information#about" className={`${styles.footerLink} text-decoration-none`}>
                                    黑膠唱片介紹
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link
                                    href="/Information#contact"
                                    className={`${styles.footerLink} text-decoration-none`}
                                >
                                    關於我們
                                </Link>
                            </li>
                            <li className="mb-2">
                                <Link
                                    href="/Information#contact-form"
                                    className={`${styles.footerLink} text-decoration-none`}
                                >
                                    聯絡我們
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* 聯絡資訊 */}
                    <div className="col-12 col-md-4 mb-4 mb-md-3 text-center text-md-start">
                        <h6 className={`fw-bold mb-3 ${styles.footerTitle}`}>聯絡資訊</h6>
                        <p className="mb-2">Email: EchoFlow888@gmail.com</p>
                        <p className="fw-bold mb-2">公司資訊</p>
                        <p className="mb-0">ECHO&FLOW黑膠唱片行 統編：58585858</p>
                    </div>

                    {/* 社群 & Logo */}
                    <div className="col-12 col-md-3 mb-4 mb-md-3 d-flex flex-column align-items-center align-items-md-end ms-md-auto">
                        <p className="mb-3 mb-md-2">關注我們</p>
                        <div
                            className={`d-flex justify-content-center gap-4 gap-md-3 mb-4 mb-md-3 ${styles.footerSocial}`}
                        >
                            <Link href="#" className="text-white">
                                <i className={`bi bi-facebook fs-3 fs-md-4 ${styles.footerSocialIcon}`}></i>
                            </Link>
                            <Link href="#" className="text-white">
                                <i className={`bi bi-instagram fs-3 fs-md-4 ${styles.footerSocialIcon}`}></i>
                            </Link>
                            <Link href="#" className="text-white">
                                <i className={`bi bi-line fs-3 fs-md-4 ${styles.footerSocialIcon}`}></i>
                            </Link>
                        </div>
                        <Image src="/images/logo.svg" alt="Logo" width={200} height={40} className="img-fluid" />
                    </div>
                </div>

                {/* 底部版權 */}
                <div className="row">
                    <div className="col-12">
                        <div
                            className={`border-top border-light text-center py-3 small text-white-50 ${styles.footerCopyright}`}
                        >
                            <div className="text-center text-secondary small">
                                © 2025 Echo&Flow. All Rights Reserved.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
