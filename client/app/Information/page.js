'use client'

import { useEffect, useState } from 'react'
import styles from './Information.module.css'
import { API_CONFIG, buildApiUrl } from '../../config/api.js'
import ContactModal from './_components/ContactModal.js'

export default function TestPage() {
    // 表單狀態
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState(null) // 'success', 'error', null
    const [showModal, setShowModal] = useState(false)
    const [modalMessage, setModalMessage] = useState('')

    useEffect(() => {
        // 視差滾動效果
        const handleScroll = () => {
            const value = window.scrollY

            // 背景層 - 最慢
            const bg = document.getElementById('bg')
            if (bg) bg.style.transform = `translateY(${value * 0.3}px)`

            // 文字 - 向上移動
            const text = document.getElementById('text')
            if (text) text.style.bottom = `-${value}px`

            // 文青青年 - 高度變化
            const youth = document.getElementById('youth')
            if (youth) {
                const newHeight = window.innerHeight - value
                youth.style.height = `${Math.max(newHeight, 200)}px`
            }

            // 黑膠唱片機 - 滾動到第二區塊時從左邊滑入
            const recordPlayer = document.querySelector('.recordPlayer')
            const contentSection = document.getElementById('about')
            if (recordPlayer && contentSection) {
                const sectionTop = contentSection.getBoundingClientRect().top
                const windowHeight = window.innerHeight

                // 暫時禁用滾動動畫，直接顯示
                recordPlayer.style.opacity = '1'
                recordPlayer.style.transform = 'translateX(0%)'
                console.log('Record player found and set to visible')
            } else {
                console.log('Record player or content section not found')
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // 處理表單輸入變化
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
        // 清除之前的狀態
        if (submitStatus) {
            setSubmitStatus(null)
            setShowModal(false)
        }
    }

    // 處理表單提交
    const handleSubmit = async (e) => {
        e.preventDefault()

        // 基本驗證
        if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
            setSubmitStatus('error')
            setModalMessage('請填寫所有必填欄位')
            setShowModal(true)
            return
        }

        setIsSubmitting(true)
        setSubmitStatus(null)
        setShowModal(false)

        try {
            const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.MAIL.CONTACT), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            const result = await response.json()

            if (response.ok && result.status === 'success') {
                setSubmitStatus('success')
                setModalMessage('聯絡表單已成功送出，我們會盡快回覆您！')
                setShowModal(true)
                // 清空表單
                setFormData({
                    name: '',
                    email: '',
                    subject: '',
                    message: '',
                })
            } else {
                setSubmitStatus('error')
                setModalMessage(result.message || '發送失敗，請稍後再試')
                setShowModal(true)
                console.error('表單提交失敗:', result.message)
            }
        } catch (error) {
            setSubmitStatus('error')
            setModalMessage('發送失敗，請檢查網路連接或稍後再試')
            setShowModal(true)
            console.error('表單提交錯誤:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // 關閉彈跳視窗
    const closeModal = () => {
        setShowModal(false)
        setSubmitStatus(null)
        setModalMessage('')
    }

    return (
        <div className={styles.container}>
            {/* 視差背景區塊 */}
            <section id="top" className={styles.parallaxSection}>
                {/* 背景圖層 */}
                <img src="/images/vinyl-store-bg.jpg" id="bg" className={styles.backgroundLayer} alt="黑膠唱片店背景" />

                {/* 主標題 */}
                <h2 id="text" className={styles.mainTitle}>
                    ECHO & FLOW
                </h2>

                {/* 文青青年 */}
                <img src="/images/youth-character.png" id="youth" className={styles.youthCharacter} alt="文青青年" />

                {/* 向下箭頭 */}
                <button
                    className={styles.scrollIndicator}
                    onClick={() => {
                        const aboutSection = document.getElementById('about')
                        if (aboutSection) {
                            aboutSection.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                            })
                        }
                    }}
                >
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 8C12.5523 8 13 8.44772 13 9V12.5858L14.2929 11.2929C14.6834 10.9024 15.3166 10.9024 15.7071 11.2929C16.0976 11.6834 16.0976 12.3166 15.7071 12.7071L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16C11.7348 16 11.4804 15.8946 11.2929 15.7071L8.29289 12.7071C7.90237 12.3166 7.90237 11.6834 8.29289 11.2929C8.68342 10.9024 9.31658 10.9024 9.70711 11.2929L11 12.5858V9C11 8.44772 11.4477 8 12 8Z"
                            fill="white"
                        />
                    </svg>
                </button>
            </section>

            {/* 內容區塊 - 黑膠唱片介紹 */}
            <section id="about" className={styles.contentSection}>
                {/* 黑膠唱片機 */}
                <img src="/images/section1.png" className={styles.recordPlayer} alt="黑膠唱片機" />

                {/* 右側裝飾圖片 */}
                <img src="/images/section1-1.png" className={styles.rightDecoration} alt="黑膠唱片裝飾" />

                <h2 className={styles.sectionTitle}>歡迎來到黑膠世界</h2>
                <p className={styles.sectionText}>
                    在這個數位化的時代，我們依然相信黑膠唱片的溫暖與真實。每一張黑膠唱片都承載著音樂的靈魂，
                    每一次唱針與溝槽的相遇，都是對音樂最純粹的致敬。ECHO & FLOW 不僅是一家黑膠唱片店，
                    更是一個音樂愛好者的聚集地，一個讓心靈得到慰藉的避風港。
                    <br />
                    <br />
                    我們精心挑選來自世界各地的經典專輯，從爵士到搖滾，從古典到電子，
                    每一張唱片都經過我們的嚴格篩選。在這裡，您可以找到那些在數位平台上難以體驗的音樂細節，
                    感受音樂帶來的純粹感動。
                </p>

                {/* 黑膠唱片展示圖片 */}
                <div className={styles.vinylShowcase}>
                    <img src="/images/vinyl6.jpg" alt="精選黑膠唱片" className={styles.showcaseImage} />
                </div>
            </section>

            {/* 關於我們區塊 */}
            <section id="contact" className={styles.aboutSection}>
                <div className={styles.aboutLayout}>
                    {/* 左側文字區塊 */}
                    <div className={styles.aboutTextSection}>
                        <h2 className={styles.aboutTitle}>ABOUT US</h2>
                        <div className={styles.aboutTextContent}>
                            <p className={styles.aboutText}>
                                隨著黑膠音樂文化的復興，越來越多人重新追求音樂的純粹與溫度。ECHO & FLOW
                                的誕生，正是希望為這份美好的文化注入更多人情味與歸屬感。我們不只是販售黑膠唱片的電商平台，更是一個專屬於音樂愛好者的交流社群。
                            </p>
                            <p className={styles.aboutText}>
                                在這裡，資深收藏家可以分享珍藏的故事，新手也能找到入門的引路人，每個人都能在音樂中找到共鳴。透過整合
                                Spotify API
                                的完整曲目與試聽、排行榜、優惠活動，我們讓收藏體驗兼具便利與樂趣。平台同時提供會員等級制度、互動社群與多元支付配送，致力於讓每一次購買，都成為一次與音樂的深度連結。
                            </p>
                            <p className={styles.aboutText}>
                                ECHO & FLOW 相信，黑膠不只是聲音的載體，而是記憶、情感與文化的延續。
                            </p>
                        </div>
                    </div>

                    {/* 右側圖片網格 */}
                    <div className={styles.aboutImageGrid}>
                        <div className={styles.imageItem}>
                            <img src="/images/vinyl1.jpg" alt="黑膠唱片收藏1" />
                        </div>
                        <div className={styles.imageItem}>
                            <img src="/images/vinyl2.jpg" alt="黑膠唱片收藏2" />
                        </div>
                        <div className={styles.imageItem}>
                            <img src="/images/vinyl3.jpg" alt="黑膠唱片收藏3" />
                        </div>
                        <div className={styles.imageItem}>
                            <img src="/images/vinyl4.jpg" alt="黑膠唱片收藏4" />
                        </div>
                        <div className={styles.imageItem}>
                            <img src="/images/vinyl5.jpg" alt="黑膠唱片收藏5" />
                        </div>
                    </div>
                </div>
            </section>

            {/* 聯絡我們區塊 */}
            <section id="contact-form" className={styles.contactSection}>
                <div className={styles.contactLayout}>
                    <div className={styles.contactHeader}>
                        <h2 className={styles.contactTitle}>聯絡我們</h2>
                        <p className={styles.contactSubtitle}>與我們分享您的音樂故事</p>
                    </div>
                    <div className={styles.contactContent}>
                        {/* 左邊：聯絡資訊 */}
                        <div className={styles.contactTextSection}>
                            <div className={styles.contactInfo}>
                                <div className={styles.contactItem}>
                                    <div className={styles.contactDetails}>
                                        <h3>電子郵件</h3>
                                        <p>EchoFlow888@gmail.com</p>
                                    </div>
                                </div>
                                <div className={styles.contactItem}>
                                    <div className={styles.contactDetails}>
                                        <h3>電話</h3>
                                        <p>02-5858-8888</p>
                                    </div>
                                </div>
                                <div className={styles.contactItem}>
                                    <div className={styles.contactDetails}>
                                        <h3>地址</h3>
                                        <p>台北市信義區信義路8段8號</p>
                                    </div>
                                </div>
                                <div className={styles.contactItem}>
                                    <div className={styles.contactDetails}>
                                        <h3>營業時間</h3>
                                        <p>週一至週日 10:00 - 22:00</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 右邊：聯絡表單 */}
                        <div className={styles.contactFormSection}>
                            <form className={styles.contactForm} onSubmit={handleSubmit}>
                                <h3>聯絡表單</h3>

                                <div className={styles.formGroup}>
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="您的姓名"
                                        className={styles.formInput}
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="電子郵件"
                                        className={styles.formInput}
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <input
                                        type="text"
                                        name="subject"
                                        placeholder="主旨"
                                        className={styles.formInput}
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <textarea
                                        name="message"
                                        placeholder="您的訊息..."
                                        className={styles.formTextarea}
                                        rows="5"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={isSubmitting}
                                    style={{
                                        opacity: isSubmitting ? 0.7 : 1,
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {isSubmitting ? '發送中...' : '發送訊息'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* 聯絡表單模態框 */}
            <ContactModal
                isOpen={showModal}
                title={submitStatus === 'success' ? '發送成功' : '發送失敗'}
                message={modalMessage}
                type={submitStatus}
                confirmText="確認"
                onConfirm={closeModal}
            />

            {/* 舊的彈跳視窗代碼 - 已替換為 ContactModal */}
            {false && showModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10000,
                        animation: 'fadeIn 0.3s ease-out',
                    }}
                    onClick={closeModal}
                >
                    <div
                        style={{
                            backgroundColor: '#1a1a1a',
                            padding: '40px',
                            borderRadius: '15px',
                            maxWidth: '500px',
                            width: '90%',
                            textAlign: 'center',
                            border: '2px solid rgba(253, 209, 108, 0.3)',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                            animation: 'slideIn 0.3s ease-out',
                            position: 'relative',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 關閉按鈕 */}
                        <button
                            onClick={closeModal}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'none',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '24px',
                                cursor: 'pointer',
                                padding: '5px',
                                width: '35px',
                                height: '35px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent'
                            }}
                        >
                            ×
                        </button>

                        {/* 成功訊息 */}
                        {submitStatus === 'success' && (
                            <>
                                <div
                                    style={{
                                        fontSize: '60px',
                                        color: '#4CAF50',
                                        marginBottom: '20px',
                                        animation: 'bounceIn 0.6s ease-out',
                                    }}
                                >
                                    ✓
                                </div>
                                <h3
                                    style={{
                                        color: '#ffffff',
                                        fontSize: '24px',
                                        marginBottom: '15px',
                                        fontWeight: '600',
                                    }}
                                >
                                    發送成功！
                                </h3>
                                <p
                                    style={{
                                        color: '#e0e0e0',
                                        fontSize: '16px',
                                        lineHeight: '1.6',
                                        marginBottom: '30px',
                                    }}
                                >
                                    聯絡表單已成功送出，我們會盡快回覆您！
                                </p>
                            </>
                        )}

                        {/* 錯誤訊息 */}
                        {submitStatus === 'error' && (
                            <>
                                <div
                                    style={{
                                        fontSize: '60px',
                                        color: '#f44336',
                                        marginBottom: '20px',
                                        animation: 'shake 0.6s ease-out',
                                    }}
                                >
                                    ✗
                                </div>
                                <h3
                                    style={{
                                        color: '#ffffff',
                                        fontSize: '24px',
                                        marginBottom: '15px',
                                        fontWeight: '600',
                                    }}
                                >
                                    發送失敗
                                </h3>
                                <p
                                    style={{
                                        color: '#e0e0e0',
                                        fontSize: '16px',
                                        lineHeight: '1.6',
                                        marginBottom: '30px',
                                    }}
                                >
                                    發送失敗，請檢查所有欄位是否填寫完整，或稍後再試
                                </p>
                            </>
                        )}

                        {/* 確認按鈕 */}
                        <button
                            onClick={closeModal}
                            style={{
                                background: 'linear-gradient(135deg, #e6c068 0%, #fdd16c 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '12px 30px',
                                fontSize: '16px',
                                fontWeight: '600',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                letterSpacing: '0.02em',
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'linear-gradient(135deg, #cdab5b 0%, #ceab58 100%)'
                                e.target.style.transform = 'translateY(-2px)'
                                e.target.style.boxShadow = '0 8px 25px rgba(139, 111, 19, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'linear-gradient(135deg, #e6c068 0%, #fdd16c 100%)'
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = 'none'
                            }}
                        >
                            確認
                        </button>
                    </div>
                </div>
            )}

            {/* 動畫樣式 */}
            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @keyframes bounceIn {
                    0% {
                        opacity: 0;
                        transform: scale(0.3);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.1);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes shake {
                    0%,
                    100% {
                        transform: translateX(0);
                    }
                    10%,
                    30%,
                    50%,
                    70%,
                    90% {
                        transform: translateX(-5px);
                    }
                    20%,
                    40%,
                    60%,
                    80% {
                        transform: translateX(5px);
                    }
                }
            `}</style>
        </div>
    )
}
