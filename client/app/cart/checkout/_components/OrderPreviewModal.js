'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import styles from './PaymentConfirmModal.module.css';

export default function OrderPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  orderData,
  paymentMethod, // 'linepay' 或 'ecpay'
  checkoutItems,
  subtotal,
  couponDiscount,
  pointsDiscount,
  shippingFee,
  selectedAddress,
  store711,
  formData,
}) {
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

  const getPaymentMethodName = () => {
    switch (paymentMethod) {
      case 'linepay':
        return 'LINE Pay';
      case 'ecpay':
        return 'ECPay';
      default:
        return '付款';
    }
  };

  const getPaymentMethodIcon = () => {
    switch (paymentMethod) {
      case 'linepay':
        return '/images/payment/linepay.svg';
      case 'ecpay':
        return '/images/payment/ecpay.svg';
      default:
        return null;
    }
  };

  const getDeliveryInfo = () => {
    if (formData.deliveryMethod === '711' && store711.storename) {
      return {
        type: '7-11 門市取貨',
        name: store711.storename,
        address: store711.storeaddress,
        phone: null,
      };
    } else if (selectedAddress) {
      return {
        type: '宅配到府',
        name: selectedAddress.recipient_name,
        address: `${selectedAddress.zipcode || ''} ${
          selectedAddress.city || ''
        } ${selectedAddress.district || ''} ${
          selectedAddress.address || ''
        }`.trim(),
        phone: selectedAddress.recipient_phone,
      };
    } else {
      return {
        type: '宅配到府',
        name: formData.recipientName || formData.buyerName,
        address: `${formData.zipcode || ''} ${formData.city || ''} ${
          formData.district || ''
        } ${formData.address || ''}`.trim(),
        phone: formData.recipientPhone || formData.buyerPhone,
      };
    }
  };

  const deliveryInfo = getDeliveryInfo();
  const totalAmount = Math.max(
    0,
    subtotal - couponDiscount - pointsDiscount + shippingFee,
  );

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>確認訂單詳情</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* 付款方式 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>付款方式</h4>
            <div className={styles.paymentMethod}>
              {getPaymentMethodIcon() && (
                <Image
                  src={getPaymentMethodIcon()}
                  alt={getPaymentMethodName()}
                  width={80}
                  height={30}
                  unoptimized
                />
              )}
              <span className={styles.paymentMethodName}>
                {getPaymentMethodName()}
              </span>
            </div>
          </div>

          {/* 配送資訊 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>配送資訊</h4>
            <div className={styles.deliveryInfo}>
              <div className={styles.deliveryType}>{deliveryInfo.type}</div>
              <div className={styles.deliveryName}>{deliveryInfo.name}</div>
              <div className={styles.deliveryAddress}>
                {deliveryInfo.address}
              </div>
              {deliveryInfo.phone && (
                <div className={styles.deliveryPhone}>{deliveryInfo.phone}</div>
              )}
            </div>
          </div>

          {/* 商品清單 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>商品清單</h4>
            <div className={styles.itemsList}>
              {checkoutItems.map((item, index) => (
                <div key={index} className={styles.itemRow}>
                  <div className={styles.itemName}>
                    {item.name || item.vinyl_name}
                  </div>
                  <div className={styles.itemQuantity}>x{item.quantity}</div>
                  <div className={styles.itemPrice}>
                    NT${' '}
                    {(
                      (item.price || item.unit_price) * item.quantity
                    ).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 金額明細 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>金額明細</h4>
            <div className={styles.amountDetails}>
              <div className={styles.amountRow}>
                <span>商品小計</span>
                <span>NT$ {subtotal.toLocaleString()}</span>
              </div>
              <div className={styles.amountRow}>
                <span>運費</span>
                <span>NT$ {shippingFee.toLocaleString()}</span>
              </div>
              {couponDiscount > 0 && (
                <div className={styles.amountRow}>
                  <span>優惠券折扣</span>
                  <span className={styles.discount}>
                    -NT$ {couponDiscount.toLocaleString()}
                  </span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className={styles.amountRow}>
                  <span>點數折扣</span>
                  <span className={styles.discount}>
                    -NT$ {pointsDiscount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className={`${styles.amountRow} ${styles.totalRow}`}>
                <span>總計</span>
                <span>NT$ {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            取消
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            確認並建立訂單
          </button>
        </div>
      </div>
    </div>
  );
}
