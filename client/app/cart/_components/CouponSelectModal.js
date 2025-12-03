'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './CouponSelectModal.module.css';

export default function CouponSelectModal({
  isOpen,
  onClose,
  availableCoupons,
  onSelectCoupon,
  loading = false,
}) {
  const [selectedCouponId, setSelectedCouponId] = useState('');

  const handleCouponSelect = (couponId) => {
    setSelectedCouponId(couponId);
  };

  const handleUseCoupon = () => {
    if (selectedCouponId) {
      onSelectCoupon(selectedCouponId);
      setSelectedCouponId('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedCouponId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>選擇優惠券</h3>
          <div className={styles.headerActions}>
            <Link href='/coupons' className={styles.couponCenterLink}>
              前往領券中心&gt;
            </Link>
            <button className={styles.closeButton} onClick={handleClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>載入優惠券中...</p>
            </div>
          ) : availableCoupons.length === 0 ? (
            <div className={styles.emptyState}>
              <p>目前沒有可用的優惠券</p>
              <Link href='/coupons' className={styles.goToCouponsBtn}>
                前往領取優惠券
              </Link>
            </div>
          ) : (
            <div className={styles.couponList}>
              {availableCoupons
                .filter(
                  (coupon) =>
                    coupon.is_valid === 1 && coupon.status === 'active',
                )
                .map((coupon) => (
                  <div
                    key={coupon.id}
                    className={`${styles.couponItem} ${
                      selectedCouponId === coupon.id ? styles.selected : ''
                    }`}
                    onClick={() => handleCouponSelect(coupon.id)}
                  >
                    <div className={styles.couponInfo}>
                      <div className={styles.couponType}>
                        <span className={styles.typeIcon}>
                          {coupon.discount_type === 'percent' ? '' : ''}
                        </span>
                        <span className={styles.typeText}>
                          {coupon.discount_type === 'percent'
                            ? '折扣券'
                            : '現金券'}
                        </span>
                      </div>

                      <div className={styles.couponDescription}>
                        {coupon.content ||
                          `${coupon.name} - 滿${coupon.min_spend}可用`}
                      </div>

                      <div className={styles.couponRestrictions}>
                        {coupon.target_type === 'member' && (
                          <span className={styles.restrictionTag}>
                            會員限定
                          </span>
                        )}
                        {coupon.usage_limit && (
                          <span className={styles.restrictionTag}>
                            限用{coupon.usage_limit}次
                          </span>
                        )}
                        {coupon.min_spend > 0 && (
                          <span className={styles.restrictionTag}>
                            滿${coupon.min_spend}可用
                          </span>
                        )}
                      </div>

                      <div className={styles.couponCode}>
                        代碼:{' '}
                        <span className={styles.codeText}>{coupon.code}</span>
                      </div>
                    </div>

                    <button
                      className={`${styles.useButton} ${
                        selectedCouponId === coupon.id
                          ? styles.useButtonActive
                          : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCouponSelect(coupon.id);
                        handleUseCoupon();
                      }}
                      disabled={loading}
                    >
                      立即使用
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
