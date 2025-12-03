'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import UserPanelLayout from '@/app/users/panel/_components/UserPanelLayout';
import { useOrder } from '@/hooks/use-order';
import styles from '../orders.module.css';

export default function OrderDetailPage({ params }) {
  const router = useRouter();
  const { order, loading, error, fetchOrderDetail } = useOrder();
  const [orderDetail, setOrderDetail] = useState(null);

  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);

  useEffect(() => {
    if (resolvedParams.id) {
      fetchOrderDetail(resolvedParams.id)
        .then((data) => {
          setOrderDetail(data);
        })
        .catch((err) => {
          console.error('載入訂單詳情失敗:', err);
        });
    }
  }, [resolvedParams.id, fetchOrderDetail]);

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 狀態標籤組件
  const StatusChip = ({ order }) => {
    const getStatusInfo = () => {
      if (order.shipping_status === 'processing') {
        return { text: '待出貨', className: styles.statusInfo };
      }
      if (order.shipping_status === 'shipped') {
        return {
          text: '已出貨',
          className: `${styles.statusInfo} ${styles.shipped}`,
        };
      }
      return { text: '待出貨', className: styles.statusInfo };
    };

    const statusInfo = getStatusInfo();
    return <span className={statusInfo.className}>{statusInfo.text}</span>;
  };

  // 載入狀態
  if (loading) {
    return (
      <UserPanelLayout pageTitle='訂單詳情'>
        <div
          className='d-flex justify-content-center align-items-center'
          style={{ minHeight: '400px' }}
        >
          <div className='text-center'>
            <div className='spinner-border text-primary mb-3' role='status'>
              <span className='visually-hidden'>載入中...</span>
            </div>
            <p>載入訂單詳情中...</p>
          </div>
        </div>
      </UserPanelLayout>
    );
  }

  // 錯誤狀態
  if (error || !orderDetail) {
    return (
      <UserPanelLayout pageTitle='訂單詳情'>
        <div className='alert alert-danger' role='alert'>
          <i className='fas fa-exclamation-triangle me-2'></i>
          載入訂單詳情時發生錯誤：{error || '訂單不存在'}
        </div>
        <div className='text-center mt-3'>
          <button className='btn btn-secondary' onClick={() => router.back()}>
            返回訂單列表
          </button>
        </div>
      </UserPanelLayout>
    );
  }

  return (
    <UserPanelLayout pageTitle='訂單詳情'>
      <div className='container-fluid'>
        {/* 返回按鈕 */}
        <div className='mb-3'>
          <button
            className='btn btn-outline-secondary'
            onClick={() => router.back()}
          >
            <i className='fas fa-arrow-left me-2'></i>
            返回訂單列表
          </button>
        </div>

        {/* 訂單基本資訊 */}
        <div className='card mb-4'>
          <div className='card-header'>
            <div className='row align-items-center'>
              <div className='col'>
                <h5 className='mb-0'>訂單編號：{orderDetail.id}</h5>
              </div>
              <div className='col-auto'>
                <StatusChip order={orderDetail} />
              </div>
            </div>
          </div>
          <div className='card-body'>
            <div className='row'>
              <div className='col-md-6'>
                <h6>訂單資訊</h6>
                <p>
                  <strong>訂購日期：</strong>
                  {formatDate(orderDetail.created_at)}
                </p>
                <p>
                  <strong>付款狀態：</strong>
                  {orderDetail.payment_status}
                </p>
                <p>
                  <strong>物流狀態：</strong>
                  {orderDetail.shipping_status}
                </p>
                {orderDetail.payment && (
                  <p>
                    <strong>付款方式：</strong>
                    {orderDetail.payment.method}
                  </p>
                )}
              </div>
              <div className='col-md-6'>
                <h6>收件資訊</h6>
                <p>
                  <strong>收件人：</strong>
                  {orderDetail.recipient_name}
                </p>
                <p>
                  <strong>連絡電話：</strong>
                  {orderDetail.recipient_phone}
                </p>
                <p>
                  <strong>配送方式：</strong>
                  {orderDetail.logisticsInfo?.type === '711'
                    ? '7-ELEVEN 取貨'
                    : orderDetail.logisticsInfo?.type === 'home'
                    ? '宅配寄送'
                    : '一般配送'}
                  {orderDetail.logisticsInfo?.type === '711' &&
                    orderDetail.logisticsInfo?.store_name && (
                      <span> - {orderDetail.logisticsInfo.store_name}</span>
                    )}
                </p>
                <p>
                  <strong>收件地址：</strong>
                  {orderDetail.shipping_address}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 訂單項目 */}
        {orderDetail.items && orderDetail.items.length > 0 && (
          <div className='card mb-4'>
            <div className='card-header'>
              <h5 className='mb-0'>訂單項目</h5>
            </div>
            <div className='card-body'>
              <div className='table-responsive'>
                <table className='table table-hover'>
                  <thead>
                    <tr>
                      <th>商品</th>
                      <th>單價</th>
                      <th>數量</th>
                      <th>小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetail.items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <div className='d-flex align-items-center'>
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.vinyl_name}
                                className='me-3'
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            <div>
                              <div className='fw-bold'>{item.vinyl_name}</div>
                              <div className='text-muted small'>
                                {item.artist}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>${item.unit_price?.toLocaleString()}元</td>
                        <td>{item.quantity}</td>
                        <td>${item.item_total_price?.toLocaleString()}元</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 價格摘要 */}
        <div className='card mb-4'>
          <div className='card-header'>
            <h5 className='mb-0'>價格摘要</h5>
          </div>
          <div className='card-body'>
            <div className='row justify-content-end'>
              <div className='col-md-6'>
                <div className='d-flex justify-content-between mb-2'>
                  <span>訂單總金額：</span>
                  <span>${orderDetail.total_price?.toLocaleString()}元</span>
                </div>
                {orderDetail.points_used > 0 && (
                  <div className='d-flex justify-content-between mb-2'>
                    <span>使用點數：</span>
                    <span className='text-danger'>
                      -{orderDetail.points_used}點
                    </span>
                  </div>
                )}
                {orderDetail.points_got > 0 && (
                  <div className='d-flex justify-content-between mb-2'>
                    <span>獲得點數：</span>
                    <span className='text-success'>
                      +{orderDetail.points_got}點
                    </span>
                  </div>
                )}
                <hr />
                <div className='d-flex justify-content-between'>
                  <strong>實付總金額：</strong>
                  <strong className='text-primary'>
                    ${orderDetail.total_price?.toLocaleString()}元
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 付款資訊 */}
        {orderDetail.payment && (
          <div className='card mb-4'>
            <div className='card-header'>
              <h5 className='mb-0'>付款資訊</h5>
            </div>
            <div className='card-body'>
              <div className='row'>
                <div className='col-md-6'>
                  <p>
                    <strong>付款方式：</strong>
                    {orderDetail.payment.method}
                  </p>
                  <p>
                    <strong>付款狀態：</strong>
                    {orderDetail.payment.status}
                  </p>
                  <p>
                    <strong>付款金額：</strong>$
                    {orderDetail.payment.amount?.toLocaleString()}元
                  </p>
                </div>
                <div className='col-md-6'>
                  {orderDetail.payment.paid_at && (
                    <p>
                      <strong>付款時間：</strong>
                      {formatDate(orderDetail.payment.paid_at)}
                    </p>
                  )}
                  {orderDetail.payment.merchant_trade_no && (
                    <p>
                      <strong>交易編號：</strong>
                      {orderDetail.payment.merchant_trade_no}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 物流資訊 */}
        {orderDetail.logisticsInfo && (
          <div className='card'>
            <div className='card-header'>
              <h5 className='mb-0'>物流資訊</h5>
            </div>
            <div className='card-body'>
              <div className='row'>
                <div className='col-md-6'>
                  <p>
                    <strong>配送方式：</strong>
                    {orderDetail.logisticsInfo.type === '711'
                      ? '7-ELEVEN 取貨'
                      : orderDetail.logisticsInfo.type === 'home'
                      ? '宅配寄送'
                      : orderDetail.logisticsInfo.type}
                    {orderDetail.logisticsInfo.type === '711' &&
                      orderDetail.logisticsInfo.store_name && (
                        <span> - {orderDetail.logisticsInfo.store_name}</span>
                      )}
                  </p>
                  <p>
                    <strong>物流狀態：</strong>
                    {orderDetail.logisticsInfo.status}
                  </p>
                </div>
                <div className='col-md-6'>
                  {orderDetail.logisticsInfo.tracking_number && (
                    <p>
                      <strong>追蹤號碼：</strong>
                      {orderDetail.logisticsInfo.tracking_number}
                    </p>
                  )}
                  {orderDetail.logisticsInfo.store_name && (
                    <p>
                      <strong>門市名稱：</strong>
                      {orderDetail.logisticsInfo.store_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserPanelLayout>
  );
}
