'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../../_components/cart.module.css';
import successStyles from './_components/success.module.css';
import CollapsibleCard from './_components/CollapsibleCard';
import CheckoutProgress from '@/app/cart/_components/CheckoutProgress/CheckoutProgress';
import { useOrder } from '@/hooks/use-order';

export default function CartCheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { order, fetchOrderDetail, updatePaymentStatus, loading, error } =
    useOrder();

  // 使用 useRef 追蹤是否已經更新過付款狀態，避免重複更新
  const hasUpdatedPaymentStatus = useRef(false);

  useEffect(() => {
    console.log('🔍 useEffect 觸發 - orderId:', orderId);
    console.log(
      '🔍 useEffect 觸發 - hasUpdatedPaymentStatus.current:',
      hasUpdatedPaymentStatus.current,
    );

    if (orderId && !hasUpdatedPaymentStatus.current) {
      console.log('🔍 開始獲取訂單詳情...');
      fetchOrderDetail(orderId)
        .then((orderData) => {
          console.log('🔍 fetchOrderDetail 成功，返回資料:', orderData);

          // 直接使用返回的 orderData 檢查付款狀態
          console.log(
            '🔍 調試 - orderData.payment_status:',
            orderData?.payment_status,
          );
          console.log(
            '🔍 調試 - orderData.payment?.status:',
            orderData?.payment?.status,
          );
          console.log(
            '🔍 調試 - hasUpdatedPaymentStatus.current:',
            hasUpdatedPaymentStatus.current,
          );

          // 自動更新付款狀態：如果付款狀態還是 pending，自動更新為 success
          if (
            orderData?.payment_status === 'pending' ||
            orderData?.payment?.status === 'pending'
          ) {
            console.log('🔄 檢測到付款成功，自動更新付款狀態...');
            hasUpdatedPaymentStatus.current = true; // 標記為已更新
            updatePaymentStatus(orderId, 'success')
              .then(() => {
                console.log('✅ 自動更新付款狀態成功');
                // 重新獲取訂單詳情
                fetchOrderDetail(orderId);
              })
              .catch((error) => {
                console.error('❌ 自動更新付款狀態失敗:', error);
                hasUpdatedPaymentStatus.current = false; // 更新失敗時重置標記
              });
          } else {
            console.log('ℹ️ 付款狀態不是 pending，跳過自動更新');
            console.log(
              'ℹ️ 當前付款狀態:',
              orderData?.payment_status || orderData?.payment?.status,
            );
          }
        })
        .catch((error) => {
          console.error('❌ 獲取訂單詳情失敗:', error);
        });
    } else {
      console.log(
        'ℹ️ 跳過獲取訂單詳情 - orderId:',
        orderId,
        'hasUpdatedPaymentStatus.current:',
        hasUpdatedPaymentStatus.current,
      );
    }
  }, [orderId, fetchOrderDetail, updatePaymentStatus]); // 移除 order 依賴

  // 渲染商品圖片：優先使用本地路徑，再回退到 URL
  const renderProductImage = (item) => {
    if (!item) return '/images/logo.svg';

    // 優先使用本地路徑 (image_path 或 pathname)
    if (item.image_path) return item.image_path;
    if (item.pathname) return item.pathname;

    // 最後才使用 URL
    if (item.image_url) return item.image_url;

    // 如果都沒有，根據 vinyl_id 生成本地路徑
    if (item.vinyl_id) return `/product_img/vinyl_id_${item.vinyl_id}.jpg`;

    // 最終回退到預設圖片
    return '/images/logo.svg';
  };

  // 配送資訊顯示：home 顯示「宅配」，711 顯示「711超商配送 + 門市名」
  const renderLogisticsInfo = (ord) => {
    const info = ord?.logisticsInfo;
    if (!info) return '-';
    const type = (info.type || '').toLowerCase();
    if (type === 'home') return '宅配';
    if (type === '711')
      return `711超商配送${info.store_name ? ` ${info.store_name}` : ''}`;
    return info.store_name || type || info.status || '-';
  };

  return (
    <div className='cart-page'>
      <div className='container py-4'>
        {/* 結帳進度條 */}
        <CheckoutProgress currentStep={3} />

        {/* 成功頁面：抬頭卡片區塊 */}
        <div className={`${styles.successMaxWidth} mx-auto`}>
          <div
            className={`text-center mb-4 p-4 p-md-5 bg-white ${successStyles.successHeaderCard}`}
          >
            <div className='mb-3'>
              <i
                className={`bi bi-check-circle-fill text-success ${successStyles.successStatusIcon}`}
              ></i>
            </div>

            {/* 標題與說明文字 */}
            <div className='mb-3'>
              <h1 className={`mb-2 ${successStyles.successPageTitle}`}>
                訂單完成
              </h1>
              <p className={`mb-0 ${successStyles.successPageSubtitle}`}>
                感謝您的購買！
              </p>
            </div>

            {/* 訂單編號 */}
            {(order?.orderNo || order?.id || orderId) && (
              <div className='mb-4'>
                <span className={`text-dark ${successStyles.orderNumberLabel}`}>
                  訂單編號：
                </span>
                <span className='ms-1 fw-normal text-body'>
                  {order?.orderNo || order?.id || orderId}
                </span>
              </div>
            )}

            {/* 快速支付交易編號顯示 */}
            {/* {order?.payment?.merchant_trade_no && (
              <div className='mb-4'>
                <span className={`text-dark ${successStyles.orderNumberLabel}`}>
                  快速支付交易編號：
                </span>
                <span className='ms-1 fw-normal text-body'>
                  {order.payment.merchant_trade_no}
                </span>
              </div>
            )} */}

            {/* 操作按鈕 */}
            <div className='d-flex flex-column flex-sm-row gap-3 justify-content-center w-100'>
              <Link
                href='/'
                className={`btn btn-block ${successStyles.btnHome} ${successStyles.actionButtonFont}`}
              >
                回到首頁
              </Link>
              <Link
                href='/users/panel/orders'
                className={`btn btn-block ${successStyles.btnOrders} ${successStyles.actionButtonFont}`}
              >
                查看訂單
              </Link>
            </div>
          </div>

          {/* 載入與錯誤狀態 */}
          {loading && (
            <div className='d-flex justify-content-center my-3'>
              <div className='spinner-border text-secondary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
            </div>
          )}
          {error && (
            <div className='alert alert-danger my-3' role='alert'>
              {error}
            </div>
          )}

          {/* 訂單詳情卡片群組 */}
          <div className='d-flex flex-column gap-3'>
            {/* 訂單資訊卡片 */}
            <CollapsibleCard
              title='訂單資訊'
              icon=''
              className={styles.infoCard}
            >
              <div className='row g-3'>
                <div className='col-12 col-md-6 col-lg-3'>
                  <div
                    className={`text-muted small mb-1 ${successStyles.infoCardText}`}
                  >
                    訂單日期
                  </div>
                  <div className={successStyles.infoCardText}>
                    {order?.created_at || order?.createdAt || '-'}
                  </div>
                </div>
                <div className='col-12 col-md-6 col-lg-3'>
                  <div
                    className={`text-muted small mb-1 ${successStyles.infoCardText}`}
                  >
                    訂單狀態
                  </div>
                  <div
                    className={`${styles.orderGreen} ${successStyles.infoCardText}`}
                  >
                    {order?.shipping_status === 'processing'
                      ? '處理中'
                      : order?.shipping_status === 'shipped'
                      ? '已出貨'
                      : order?.shipping_status || order?.status || '-'}
                  </div>
                </div>
                <div className='col-12 col-md-6 col-lg-3'>
                  <div
                    className={`text-muted small mb-1 ${successStyles.infoCardText}`}
                  >
                    付款方式
                  </div>
                  <div className={successStyles.infoCardText}>
                    {(order?.payment?.method ||
                      order?.payment?.payment_method ||
                      order?.payment_method) === 'ECPAY'
                      ? '綠界金流'
                      : (order?.payment?.method ||
                          order?.payment?.payment_method ||
                          order?.payment_method) === 'LINE_PAY'
                      ? 'LINE Pay'
                      : (order?.payment?.method ||
                          order?.payment?.payment_method ||
                          order?.payment_method) === 'CREDIT_CARD'
                      ? '信用卡'
                      : order?.payment?.method ||
                        order?.payment?.payment_method ||
                        order?.payment_method ||
                        '-'}
                  </div>
                </div>
                <div className='col-12 col-md-6 col-lg-3'>
                  <div
                    className={`text-muted small mb-1 ${successStyles.infoCardText}`}
                  >
                    付款狀態
                  </div>
                  <div
                    className={`${styles.orderOrange} ${successStyles.infoCardText}`}
                  >
                    {(order?.payment?.status ||
                      order?.payment?.payment_status ||
                      order?.payment_status) === 'success'
                      ? '已付款'
                      : (order?.payment?.status ||
                          order?.payment?.payment_status ||
                          order?.payment_status) === 'pending'
                      ? '待付款'
                      : order?.payment?.status ||
                        order?.payment?.payment_status ||
                        order?.payment_status ||
                        '-'}
                  </div>
                </div>

                {/* 🚀 新增：點數回饋顯示 */}
                {order?.points_reward?.points_got > 0 && (
                  <div className='col-12 col-md-6 col-lg-3'>
                    <div
                      className={`text-muted small mb-1 ${successStyles.infoCardText}`}
                    >
                      獲得點數
                    </div>
                    <div
                      className={`${successStyles.infoCardText}`}
                      style={{ color: '#28a745', fontWeight: '600' }}
                    >
                      <span style={{ marginRight: '4px' }}>⭐</span>
                      {order.points_reward.points_got} 點
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleCard>

            {/* 收件人資訊卡片 */}
            <CollapsibleCard
              title='收件人資訊'
              icon=''
              className={styles.infoCard}
            >
              <div className='d-flex flex-column gap-3'>
                <div className='d-flex align-items-center gap-4'>
                  <div className={styles.labelCol}>收件人</div>
                  <div className={styles.valueCol}>
                    {order?.recipient_name || '-'}
                  </div>
                </div>
                <div className='d-flex align-items-center gap-4'>
                  <div className={styles.labelCol}>手機號碼</div>
                  <div className={styles.valueCol}>
                    {order?.recipient_phone || '-'}
                  </div>
                </div>
                <div className='d-flex align-items-center gap-4'>
                  <div className={styles.labelCol}>地址</div>
                  <div className={styles.valueCol}>
                    {order?.shipping_address || '-'}
                  </div>
                </div>
                <div className='d-flex align-items-center gap-4'>
                  <div className={styles.labelCol}>配送資訊</div>
                  <div className={styles.valueCol}>
                    {renderLogisticsInfo(order)}
                  </div>
                </div>
              </div>
            </CollapsibleCard>

            {/* 購買商品卡片 */}
            <CollapsibleCard
              title='購買商品'
              icon=''
              className={styles.infoCard}
            >
              <div className='d-flex flex-column gap-3'>
                {order?.items && order.items.length > 0 ? (
                  order.items.map((it, idx) => (
                    <div className='d-flex align-items-center gap-3' key={idx}>
                      <img
                        src={renderProductImage(it)}
                        alt={
                          it.vinyl_name ||
                          it.name ||
                          `商品 #${it.vinyl_id || idx + 1}`
                        }
                        className={`${successStyles.productThumbnail}`}
                        onError={(e) => {
                          e.currentTarget.src = '/images/logo.svg';
                        }}
                      />
                      <div className='d-flex align-items-center justify-content-between flex-grow-1'>
                        <div
                          className={`me-3 ${successStyles.productInfoText}`}
                        >
                          {it.vinyl_name ||
                            it.name ||
                            `商品 #${it.vinyl_id || idx + 1}`}
                        </div>
                        <div className={successStyles.productInfoText}>
                          NT$
                          {(
                            it.unit_price ||
                            it.price ||
                            0
                          ).toLocaleString()} × {it.quantity || it.qty || 1}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-muted'>尚無可顯示的商品項目</div>
                )}
              </div>
            </CollapsibleCard>
          </div>
        </div>
      </div>
    </div>
  );
}
