'use client'

//確認對話框

import { useState } from 'react'
import styles from '../../_components/AdminCommon.module.css'

export default function ConfirmModal({
    isOpen = false,
    title = '確認操作',
    message = '您確定要停用該會員嗎？',
    confirmText = '確認',
    cancelText = '取消',
    type = 'info',
    onConfirm = () => {},
    onCancel = () => {},
}) {
    if (!isOpen) return null

    const handleConfirm = () => {
        onConfirm()
    }

    const handleCancel = () => {
        onCancel()
    }

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCancel()
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={handleBackdropClick}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
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
                    <button className={`${styles.modalBtn} ${styles.modalBtnSecondary}`} onClick={handleCancel}>
                        {cancelText}
                    </button>
                    <button
                        className={`${styles.modalBtn} ${styles.modalBtnPrimary} ${
                            type === 'danger' ? styles.danger : ''
                        }`}
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
