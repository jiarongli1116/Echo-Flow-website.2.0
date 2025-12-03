'use client'

import { useState, useEffect } from 'react'
import styles from './UserModal.module.css'

export default function UserModal({
    isOpen = false,
    title = '訊息',
    message = '',
    type = 'info',
    confirmText = '確定',
    cancelText = '取消',
    onConfirm = () => {},
    onCancel = () => {},
    autoClose = 0,
    showCancel = false,
}) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen && autoClose > 0) {
            const timer = setTimeout(() => {
                handleConfirm()
            }, autoClose)
            return () => clearTimeout(timer)
        }
    }, [isOpen, autoClose])

    if (!isOpen) return null

    const handleConfirm = () => {
        setIsVisible(false)
        setTimeout(() => {
            onConfirm()
        }, 200) // 等待動畫完成
    }

    const handleCancel = () => {
        setIsVisible(false)
        setTimeout(() => {
            onCancel()
        }, 200) // 等待動畫完成
    }

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleConfirm()
        }
    }

    const getTypeClass = () => {
        switch (type) {
            case 'success':
                return styles.success
            case 'error':
                return styles.danger
            case 'warning':
                return styles.warning
            case 'info':
            default:
                return styles.info
        }
    }

    const getTypeIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M13 8L9 12L7 10M10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19Z"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )
            case 'error':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M12 8.4502V12.4502M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21ZM12.0498 15.4502V15.5502L11.9502 15.5498V15.4502H12.0498Z"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )
            case 'warning':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M12 9.00006V13.0001M4.37891 15.1999C3.46947 16.775 3.01489 17.5629 3.08281 18.2092C3.14206 18.7729 3.43792 19.2851 3.89648 19.6182C4.42204 20.0001 5.3309 20.0001 7.14853 20.0001H16.8515C18.6691 20.0001 19.5778 20.0001 20.1034 19.6182C20.5619 19.2851 20.8579 18.7729 20.9172 18.2092C20.9851 17.5629 20.5307 16.775 19.6212 15.1999L14.7715 6.79986C13.8621 5.22468 13.4071 4.43722 12.8135 4.17291C12.2957 3.94236 11.704 3.94236 11.1862 4.17291C10.5928 4.43711 10.1381 5.22458 9.22946 6.79845L4.37891 15.1999ZM12.0508 16.0001V16.1001L11.9502 16.1003V16.0001H12.0508Z"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )
            case 'info':
            default:
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M12 11V16M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21ZM12.0498 8V8.1L11.9502 8.1002V8H12.0498Z"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )
        }
    }

    return (
        <div className={`${styles.modalOverlay} ${isVisible ? styles.modalVisible : ''}`} onClick={handleBackdropClick}>
            <div className={`${styles.modalContainer} ${styles.messageModal} ${isVisible ? styles.modalSlideIn : ''}`}>
                <div className={`${styles.modalHeader} ${getTypeClass()}`}>
                    <div className={styles.modalIconContainer}>{getTypeIcon()}</div>
                    <h3 className={styles.modalTitle}>{title}</h3>
                </div>

                <div className={styles.modalBody}>
                    <p className={styles.modalMessage}>
                        {message.split('\n').map((line, index) => (
                            <span key={index}>
                                {line}
                                {index < message.split('\n').length - 1 && <br />}
                            </span>
                        ))}
                    </p>
                </div>

                <div className={styles.modalFooter}>
                    {showCancel && (
                        <button className={`${styles.modalBtn} ${styles.modalBtnSecondary}`} onClick={handleCancel}>
                            {cancelText}
                        </button>
                    )}
                    <button
                        className={`${styles.modalBtn} ${styles.modalBtnPrimary} ${getTypeClass()}`}
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
