'use client';

import { useEffect, useState } from 'react';
import styles from './PaymentConfirmModal.module.css';

export default function LinePayConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  orderData,
}) {
  // 追蹤是否正在提交中，防止用戶重複點擊確認按鈕
  // 這可以避免 LINE Pay 的 "Existing same orderId" 錯誤
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 防止背景滾動 - 當 Modal 開啟時鎖定背景頁面滾動
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 重置提交狀態當 modal 關閉時
  // 確保下次開啟 Modal 時按鈕狀態是正常的
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  /**
   * 處理確認跳轉到 LINE Pay 的邏輯
   * 包含防重複提交機制和錯誤處理
   */
  const handleConfirm = async () => {
    // 如果正在提交中，直接返回，防止重複提交
    // 這可以避免 LINE Pay 返回 "Existing same orderId" 錯誤
    if (isSubmitting) return;

    // 設置提交狀態為 true，禁用按鈕並顯示載入狀態
    setIsSubmitting(true);

    try {
      // 執行父組件傳入的 onConfirm 函數
      // 這通常會觸發跳轉到 LINE Pay 付款頁面
      await onConfirm();
    } catch (error) {
      // 如果跳轉失敗，記錄錯誤並重置提交狀態
      // 讓用戶可以重新嘗試
      console.error('LINE Pay 跳轉失敗:', error);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.paymentModalOverlay}>
      <div className={styles.paymentModalContent}>
        <div className={styles.paymentModalHeader}>
          <h3 className={styles.paymentModalTitle}>確認跳轉到 LINE Pay 付款</h3>
        </div>
        <div className={styles.paymentModalBody}>
          <div className={styles.paymentSection}>
            <h4 className={styles.paymentSectionTitle}>訂單資訊</h4>
            <div className={styles.orderInfo}>
              <p>訂單已建立完成！</p>
              <p className={styles.orderId}>訂單編號：{orderData?.orderId}</p>
              <p className={styles.orderAmount}>
                付款金額：NT$ {orderData?.totalAmount?.toLocaleString()}
              </p>
            </div>
          </div>

          <div className={styles.paymentSection}>
            <h4 className={styles.paymentSectionTitle}>付款方式</h4>
            <div className={styles.paymentInfo}>
              <p>即將跳轉到 LINE Pay 進行付款，是否繼續？</p>
            </div>
          </div>
        </div>

        <div className={styles.paymentModalFooter}>
          <button
            className={styles.paymentConfirmBtn}
            onClick={handleConfirm}
            disabled={isSubmitting} // 提交中時禁用按鈕，防止重複點擊
            type='button'
          >
            {/* 根據提交狀態顯示不同的按鈕文字 */}
            {isSubmitting ? '跳轉中...' : '確認跳轉'}
          </button>
        </div>
      </div>
    </div>
  );
}
