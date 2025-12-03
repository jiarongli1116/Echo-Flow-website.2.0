'use client';
import { toast, Slide } from 'react-toastify';
import Link from 'next/link';
import { useState } from 'react';
import styles from './CartOverviewToast.module.css';

// 渲染商品圖片：優先使用本地路徑 (pathname)，再回退到 URL
const renderProductImage = (item) => {
  if (!item) return '/images/logo.svg';

  // 優先使用本地路徑 (pathname)
  if (item.pathname) return item.pathname;

  // 回退到 image_path (如果有的話)
  if (item.image_path) return item.image_path;

  // 最後才使用 URL
  if (item.image_url) return item.image_url;

  // 如果都沒有，根據 vinyl_id 生成本地路徑
  if (item.vinyl_id) return `/product_img/vinyl_id_${item.vinyl_id}.jpg`;

  // 最終回退到預設圖片
  return '/images/logo.svg';
};

// 優化的圖片組件，提供更好的載入體驗
const OptimizedImage = ({ src, alt, fallbackSrc = '/images/logo.svg' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLoad = () => {
    setImageLoaded(true);
  };

  const handleError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  return (
    <div className={styles.imageContainer}>
      {!imageLoaded && (
        <div className={styles.imagePlaceholder}>
          <i className='fas fa-image'></i>
        </div>
      )}
      <img
        src={imageError ? fallbackSrc : src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
        }}
        loading='eager' // 優先載入
      />
    </div>
  );
};

const CartOverviewToast = ({ items, totalPrice, itemCount }) => {
  const handleGoToCart = () => {
    toast.dismiss(); // 關閉 toast
    window.location.href = '/cart';
  };

  const handleClose = () => {
    toast.dismiss(); // 關閉 toast
  };

  return (
    <div className={styles.cartOverview}>
      {/* 自定義關閉按鈕 */}
      <button
        className={`${styles.customCloseBtn}`}
        onClick={handleClose}
        aria-label='關閉'
      >
        <i className='fas fa-times'></i>
      </button>

      <div className={styles.header}>
        <h6 className={styles.title}>購物車</h6>
      </div>

      <div className={styles.itemsList}>
        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <div className={styles.emptyCartIcon}>
              <img
                src='/images/logo2.png'
                alt='Echo Flow Logo'
                className={styles.emptyCartLogo}
              />
            </div>
            <div className={styles.emptyCartMessage}>尚未加入商品</div>
            <div className={styles.emptyCartSubMessage}>
              快去選購您喜愛的黑膠唱片吧！
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemImage}>
                <OptimizedImage
                  src={renderProductImage(item)}
                  alt={item.name}
                  fallbackSrc='/images/logo.svg'
                />
              </div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemDetails}>
                  <span className={styles.quantity}>數量: {item.quantity}</span>
                  <span className={styles.price}>
                    NT$ {item.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className={styles.footer}>
          <div className={styles.totalPrice}>
            <span className={styles.totalLabel}>總計:</span>
            <span className={styles.totalAmount}>
              NT$ {totalPrice.toLocaleString()}
            </span>
          </div>

          <button
            className={`btn-block ${styles.goToCartBtn}`}
            onClick={handleGoToCart}
          >
            <i className='fas fa-arrow-right me-2'></i>
            前往購物車
          </button>
        </div>
      )}
    </div>
  );
};

export const showCartOverview = (items, totalPrice, itemCount) => {
  // 先關閉所有現有的 toast，避免多個 toast 同時顯示
  toast.dismiss();

  toast(
    <CartOverviewToast
      items={items}
      totalPrice={totalPrice}
      itemCount={itemCount}
    />,
    {
      containerId: 'global-toast-container', // 指定使用全域容器
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: true,
      closeOnClick: false,
      closeButton: false, // 隱藏原生關閉按鈕
      pauseOnHover: true,
      draggable: true,
      className: 'cart-overview-toast',
      transition: Slide,
      style: {
        marginTop: '55px', // 距離頂部
        marginRight: '20px', // 距離右邊
      },
    },
  );
};

export default CartOverviewToast;
