'use client';

import { useEffect } from 'react';
import styles from './ErrorModal.module.css';

export default function ErrorModal({
  isOpen,
  onClose,
  title = '很抱歉，發生錯誤',
  message,
  type = 'error', // 'error', 'warning', 'info', 'success'
  showCloseButton = true,
  autoClose = false,
  autoCloseDelay = 3000,
}) {
  // 自動關閉功能
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  // ESC 鍵關閉
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // 防止背景滾動
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return '⚠️';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'error':
        return styles.errorType;
      case 'warning':
        return styles.warningType;
      case 'info':
        return styles.infoType;
      case 'success':
        return styles.successType;
      default:
        return styles.errorType;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={`${styles.modalHeader} ${getTypeClass()}`}>
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <span className={styles.typeIcon}>{getTypeIcon()}</span>
              <h3 className={styles.modalTitle}>{title}</h3>
            </div>
            {showCloseButton && (
              <button className={styles.closeButton} onClick={onClose}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          <div className={styles.messageContainer}>
            <p className={styles.messageText}>{message}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button
            className={`${styles.confirmButton} ${getTypeClass()}`}
            onClick={onClose}
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
}
