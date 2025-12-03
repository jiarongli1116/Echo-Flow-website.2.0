'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './AddressSelector.module.css';

export default function AddressSelector({
  isOpen,
  onClose,
  addresses = [],
  onSelectAddress,
  currentAddress = null,
  loading = false,
}) {
  const [selectedAddressId, setSelectedAddressId] = useState(
    currentAddress?.id || null,
  );

  // 當 currentAddress 改變時更新選中狀態
  useEffect(() => {
    setSelectedAddressId(currentAddress?.id || null);
  }, [currentAddress]);

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

  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId);
  };

  const handleUseAddress = (addressId) => {
    const selectedAddress = addresses.find((addr) => addr.id === addressId);
    if (selectedAddress) {
      onSelectAddress(selectedAddress);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedAddressId(currentAddress?.id || null);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>選擇地址</h3>
          <div className={styles.headerActions}>
            <Link
              href='/users/panel/addresses'
              className={styles.addressCenterLink}
            >
              管理地址&gt;
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
              <p>載入地址中...</p>
            </div>
          ) : addresses.length === 0 ? (
            <div className={styles.emptyState}>
              <p>您還沒有儲存任何地址</p>
              <Link
                href='/users/panel/addresses'
                className={styles.goToAddressesBtn}
              >
                前往新增地址
              </Link>
            </div>
          ) : (
            <div className={styles.addressList}>
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`${styles.addressItem} ${
                    selectedAddressId === address.id ? styles.selected : ''
                  }`}
                  onClick={() => handleUseAddress(address.id)}
                >
                  <div className={styles.addressInfo}>
                    <div className={styles.addressHeader}>
                      <div className={styles.addressName}>
                        {address.recipient_name}
                        {address.isDefault ? (
                          <span className={styles.defaultBadge}>預設</span>
                        ) : (
                          <span className={styles.tag}>備用</span>
                        )}
                      </div>
                      <div className={styles.addressPhone}>
                        {address.recipient_phone}
                      </div>
                    </div>

                    <div className={styles.addressDetails}>
                      {`${address.zipcode || ''} ${address.city || ''} ${
                        address.district || ''
                      } ${address.address || ''}`.trim()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
