'use client';

import { useEffect } from 'react';
import styles from './PaymentConfirmModal.module.css';

export default function EcPayConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  orderData,
}) {
  // 防止背景滾動
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.paymentModalOverlay}>
      <div className={styles.paymentModalContent}>
        <div className={styles.paymentModalHeader}>
          <h3 className={styles.paymentModalTitle}>確認跳轉到 ECPay 付款</h3>
        </div>
        <div className={styles.paymentModalBody}>
          <div className={styles.paymentSection}>
            <h4 className={styles.paymentSectionTitle}>訂單資訊</h4>
            <div className={styles.orderInfo}>
              <p>訂單已建立完成！</p>
              <p className={styles.orderId}>
                訂單編號：{orderData?.orderId} (orders.id)
              </p>
              <p className={styles.orderAmount}>
                付款金額：NT$ {orderData?.totalAmount?.toLocaleString()}
              </p>
            </div>
          </div>

          <div className={styles.paymentSection}>
            <h4 className={styles.paymentSectionTitle}>付款方式</h4>
            <div className={styles.paymentInfo}>
              <p>即將跳轉到 ECPay 進行付款，是否繼續？</p>
            </div>
          </div>
        </div>

        <div className={styles.paymentModalFooter}>
          <button
            className={styles.paymentConfirmBtn}
            onClick={onConfirm}
            type='button'
          >
            確認跳轉
          </button>
        </div>
      </div>
    </div>
  );
}
