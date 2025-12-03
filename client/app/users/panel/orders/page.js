'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import UserPanelLayout from '@/app/users/panel/_components/UserPanelLayout';
import styles from './orders.module.css';
import Pagination from '@/components/product/Pagination';
import { useOrder } from '@/hooks/use-order';

export default function UserOrdersPage() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { orders, loading, error, pagination, fetchOrders } = useOrder();

  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState(''); // 搜尋關鍵字
  const [searchInput, setSearchInput] = useState(''); // 搜尋輸入框的值

  // 從 URL 參數獲取當前頁面
  useEffect(() => {
    const page = parseInt(searchParams.get('page')) || 1;
    setCurrentPage(page);
  }, [searchParams]);

  // 載入訂單資料
  useEffect(() => {
    const hasSearch = searchTerm.trim();
    const hasStatusFilter = activeTab !== 'all';

    if (hasSearch || hasStatusFilter) {
      // 如果有搜尋條件或狀態篩選，搜尋所有資料
      const status = hasStatusFilter ? activeTab : '';
      fetchOrders(1, 1000, searchTerm.trim(), status);
    } else {
      // 沒有篩選條件，正常分頁載入
      fetchOrders(currentPage, 10);
    }
  }, [currentPage, fetchOrders, searchTerm, activeTab]);

  // 切換訂單展開狀態
  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // 執行搜尋
  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
    setCurrentPage(1); // 搜尋時回到第1頁
  };

  // 清除搜尋
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // 處理 Enter 鍵搜尋
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 訂單資料（搜尋和標籤篩選已在後端處理）
  const filteredOrders = orders;

  // 計算篩選後的分頁資訊
  const getFilteredPagination = () => {
    // 如果有搜尋條件或狀態篩選，使用後端回傳的分頁資訊
    if (searchTerm.trim() || activeTab !== 'all') {
      return pagination;
    }

    return pagination; // 如果沒有任何篩選，使用原始分頁資訊
  };

  const filteredPagination = getFilteredPagination();

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
      // 預設狀態為待出貨
      return { text: '待出貨', className: styles.statusInfo };
    };

    const statusInfo = getStatusInfo();
    return <span className={statusInfo.className}>{statusInfo.text}</span>;
  };

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

  // 商品行組件
  const ProductRow = ({ item }) => (
    <div className={`border ${styles.productRow}`}>
      {/* Desktop Layout */}
      <div
        className={`d-none d-lg-flex align-items-center gap-3 py-3 ${styles.productRowDesktop}`}
      >
        <div className='ms-3'>
          <img
            src={renderProductImage(item)}
            alt={item.vinyl_name}
            className={`${styles.productImage}`}
            onError={(e) => {
              e.target.src = '/images/logo.svg';
            }}
          />
        </div>
        <div className='flex-grow-1'>
          <div className={`${styles.productCode}`}>
            商品編號 {item.vinyl_id}
          </div>
          <div className={`${styles.productName}`}>{item.vinyl_name}</div>
          <div className={`${styles.productArtist}`}>{item.artist}</div>
        </div>
        <div className={`text-center ${styles.priceColumn}`}>
          ${item.unit_price?.toLocaleString()} 元
        </div>
        <div className={`text-center ${styles.quantityColumn}`}>
          x{item.quantity}
        </div>
        <div className={`text-center ${styles.totalColumn}`}>
          ${item.item_total_price?.toLocaleString()}元
        </div>
      </div>

      {/* Mobile Layout */}
      <div className={`d-lg-none p-3 ${styles.productRowMobile}`}>
        <div className='d-flex gap-3'>
          <img
            src={renderProductImage(item)}
            alt={item.vinyl_name}
            className={`${styles.productImageMobile}`}
            onError={(e) => {
              e.target.src = '/images/logo.svg';
            }}
          />
          <div className='flex-grow-1'>
            <div className={`${styles.productCode}`}>
              商品編號 {item.vinyl_id}
            </div>
            <div className={`${styles.productNameMobile}`}>
              {item.vinyl_name}
            </div>
            <div className={`${styles.productArtist}`}>{item.artist}</div>
            <div className='d-flex justify-content-between align-items-center mt-2'>
              <span className={`${styles.productPriceMobile}`}>
                ${item.unit_price?.toLocaleString()} 元
              </span>
              <span className={`${styles.productQuantityMobile}`}>
                x{item.quantity}
              </span>
              <span className={`${styles.productTotalMobile}`}>
                ${item.item_total_price?.toLocaleString()}元
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 訂單卡片組件
  const OrderCard = ({ order }) => {
    const isExpanded = expandedOrders.has(order.id);

    return (
      <div className={`card mb-4 ${styles.orderCard}`}>
        {/* 訂單標題 */}
        <div className={`card-header ${styles.orderHeader}`}>
          <div className='row align-items-center mb-2'>
            <div className='col-12 col-sm-5'>
              <span className={`${styles.orderNumber}`}>
                訂單編號：{order.id}
              </span>
            </div>
            <div className='col-12 col-sm-5'>
              <span className={`${styles.orderDate}`}>
                訂購日期：{formatDate(order.created_at)}
              </span>
            </div>
            <div className='col-12 col-sm-2 d-flex justify-content-end'>
              <StatusChip order={order} />
            </div>
          </div>

          {/* 訂單詳細資訊 */}
          <div className={`row ${styles.orderDetails}`}>
            <div className='col-12 col-sm-6 col-lg-3'>
              <div className={`${styles.detailItem}`}>
                付款方式：{' '}
                {order.payment.payment_method === 'ECPAY'
                  ? '綠界金流'
                  : order.payment.payment_method === 'LINE_PAY'
                  ? 'LINE Pay'
                  : order.payment.payment_method === 'CREDIT_CARD'
                  ? '信用卡'
                  : order.payment.payment_method}
              </div>
            </div>
            <div className='col-12 col-sm-6 col-lg-3'>
              <div className={`${styles.detailItem}`}>
                付款狀態：{' '}
                <span
                  className={`badge ${
                    order.payment?.payment_status === 'success'
                      ? 'bg-success'
                      : order.payment?.payment_status === 'pending'
                      ? 'bg-warning'
                      : 'bg-danger'
                  } text-white ms-1`}
                >
                  {order.payment?.payment_status === 'success'
                    ? '已付款'
                    : order.payment?.payment_status === 'pending'
                    ? '待付款'
                    : order.payment?.payment_status || '-'}
                </span>
              </div>
            </div>
            <div className='col-12 col-sm-6 col-lg-3'>
              <div className={`${styles.detailItem}`}>
                收件人：{order.recipient_name}
              </div>
            </div>
            <div className='col-12 col-sm-6 col-lg-3'>
              <div className={`${styles.detailItem}`}>
                聯絡電話：{order.recipient_phone}
              </div>
            </div>
          </div>
          <div className={`row ${styles.orderDetails}`}>
            <div className='col-12 col-sm-6'>
              <div className={`${styles.detailItem}`}>
                配送方式：
                {order.logistics?.type === '711'
                  ? '7-ELEVEN 取貨'
                  : order.logistics?.type === 'home'
                  ? '宅配寄送'
                  : '一般配送'}
                {order.logistics?.type === '711' &&
                  order.logistics?.store_name && (
                    <span> - {order.logistics.store_name}</span>
                  )}
              </div>
            </div>
            <div className='col-12 col-sm-6'>
              <div className={`${styles.detailItem}`}>
                收件地址：{order.shipping_address}
              </div>
            </div>
          </div>
        </div>

        {/* 訂單內容 */}
        <div className='card-body'>
          {/* 商品明細 */}
          <div className={styles.productsContainer}>
            {isExpanded ? (
              <>
                {order.items && order.items.length > 0 ? (
                  <>
                    {order.items.map((item, index) => (
                      <div key={item.id || index}>
                        <ProductRow item={item} />
                        {index < order.items.length - 1 && (
                          <div className={`${styles.productSeparator}`}></div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className='text-center py-3'>
                    <p className='text-muted'>暫無商品資訊</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {order.items && order.items.length > 0 ? (
                  <>
                    <ProductRow item={order.items[0]} />
                    {order.items.length > 1 && (
                      <div className='text-center py-2'>
                        <small className='text-muted'>
                          還有 {order.items.length - 1} 項商品...
                        </small>
                      </div>
                    )}
                    <div className={`${styles.productSeparator}`}></div>
                  </>
                ) : (
                  <div className='text-center py-3'>
                    <p className='text-muted'>暫無商品資訊</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 價格摘要 */}
          {isExpanded && (
            <div
              className={`d-flex flex-column align-items-end ${styles.priceSummary}`}
            >
              {/* 購買商品總價 */}
              <div
                className={`d-flex justify-content-between ${styles.priceRow}`}
              >
                <span className={`${styles.priceLabel}`}>購買商品總價</span>
                <span className={`${styles.priceValue}`}>
                  $
                  {order.items
                    ?.reduce(
                      (sum, item) => sum + item.unit_price * item.quantity,
                      0,
                    )
                    ?.toLocaleString()}
                  元
                </span>
              </div>

              {/* 運費 */}
              <div
                className={`d-flex justify-content-between ${styles.priceRow}`}
              >
                <span className={`${styles.priceLabel}`}>運費</span>
                <span className={`${styles.priceValue}`}>+${100}元</span>
              </div>

              {/* 優惠券折扣 */}
              {order.coupon_id && (
                <div
                  className={`d-flex justify-content-between ${styles.priceRow}`}
                >
                  <span className={`${styles.priceLabel}`}>優惠券折扣</span>
                  <span className={`${styles.priceValue} text-success`}>
                    -$
                    {(
                      order.items?.reduce(
                        (sum, item) => sum + item.unit_price * item.quantity,
                        0,
                      ) +
                      100 -
                      order.points_used -
                      order.total_price
                    )?.toLocaleString()}
                    元
                  </span>
                </div>
              )}

              {/* 使用點數 */}
              {order.points_used > 0 && (
                <div
                  className={`d-flex justify-content-between ${styles.priceRow}`}
                >
                  <span className={`${styles.priceLabel}`}>使用點數</span>
                  <span className={`${styles.priceValue} text-success`}>
                    -{order.points_used}點
                  </span>
                </div>
              )}

              <div className={`${styles.priceSeparator}`}></div>
              <div
                className={`d-flex justify-content-between py-3 ${styles.totalRow}`}
              >
                <span className={`${styles.totalLabel}`}>實付總金額</span>
                <span className={`${styles.totalValue}`}>
                  ${order.total_price?.toLocaleString()}元
                </span>
              </div>
            </div>
          )}

          {/* 展開/收合按鈕 */}
          <div className='d-flex justify-content-center py-2'>
            <button
              onClick={() => toggleOrderExpansion(order.id)}
              className={`btn btn-link ${styles.toggleButton}`}
            >
              <span>{isExpanded ? '收合資訊' : '查看更多'}</span>
              <i
                className={`fas ${
                  isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'
                } ms-2`}
              ></i>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 處理 hydration 問題
  useEffect(() => {
    setMounted(true);
  }, []);

  // 防止 hydration 不匹配
  if (!mounted) {
    return (
      <UserPanelLayout pageTitle='訂單資訊'>
        <div
          className='d-flex justify-content-center align-items-center'
          style={{ minHeight: '400px' }}
        >
          <div className='text-center'>
            <div className='spinner-border text-primary mb-3' role='status'>
              <span className='visually-hidden'>載入中...</span>
            </div>
            <p>載入中...</p>
          </div>
        </div>
      </UserPanelLayout>
    );
  }

  // 載入狀態
  if (loading) {
    return (
      <UserPanelLayout pageTitle='訂單資訊'>
        <div
          className='d-flex justify-content-center align-items-center'
          style={{ minHeight: '400px' }}
        >
          <div className='text-center'>
            <div className='spinner-border text-primary mb-3' role='status'>
              <span className='visually-hidden'>載入中...</span>
            </div>
            <p>載入訂單資料中...</p>
          </div>
        </div>
      </UserPanelLayout>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <UserPanelLayout pageTitle='訂單資訊'>
        <div className='alert alert-danger' role='alert'>
          <i className='fas fa-exclamation-triangle me-2'></i>
          載入訂單資料時發生錯誤：{error}
        </div>
      </UserPanelLayout>
    );
  }

  return (
    <UserPanelLayout pageTitle='訂單資訊'>
      <div className='container-fluid'>
        {/* 標籤頁 */}
        <div className='card mb-3'>
          <div className='card-body p-0'>
            <ul className='nav nav-tabs nav-fill' role='tablist'>
              {[
                { key: 'all', label: '全部訂單' },
                { key: 'processing', label: '待出貨' },
                { key: 'shipped', label: '已出貨' },
              ].map((tab) => (
                <li className='nav-item' key={tab.key}>
                  <button
                    className={`nav-link ${
                      activeTab === tab.key ? 'active' : ''
                    } ${styles.tabButton}`}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setCurrentPage(1); // 切換標籤時回到第1頁
                      // 更新URL參數
                      const params = new URLSearchParams(
                        window.location.search,
                      );
                      params.set('page', '1');
                      router.replace(`${pathname}?${params.toString()}`);
                    }}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 搜尋列 */}
        <div className={`card mb-3 ${styles.searchCard}`}>
          <div className='card-body'>
            <div className='row align-items-center'>
              <div className='col-12'>
                <div className='d-flex align-items-center gap-2'>
                  <div className='position-relative flex-grow-1'>
                    <input
                      type='text'
                      placeholder='搜尋訂單編號或商品名稱...'
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className={`form-control ${styles.searchInput}`}
                    />
                    {(searchTerm || searchInput) && (
                      <button
                        onClick={handleClearSearch}
                        className={`btn btn-sm position-absolute ${styles.clearButton}`}
                      >
                        <i className='fas fa-times'></i>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSearch}
                    className={`btn ${styles.searchButton}`}
                    disabled={loading}
                  >
                    <i className='fas fa-search'></i>
                  </button>
                </div>
              </div>
            </div>

            {/* 搜尋結果提示 */}
            {searchTerm && (
              <div className='mt-3'>
                <small className='text-muted'>
                  找到 {filteredOrders.length} 筆相關訂單資訊
                </small>
              </div>
            )}
          </div>
        </div>

        {/* 訂單列表 */}
        <div className={styles.ordersContainer}>
          {filteredOrders.length === 0 ? (
            <div className='text-center py-5'>
              <i className='fas fa-box-open fa-3x text-muted mb-3'></i>
              <h5 className='text-muted'>
                {searchTerm ? '找不到符合條件的訂單' : '目前沒有訂單'}
              </h5>
              <p className='text-muted'>
                {searchTerm ? '請嘗試其他搜尋關鍵字' : '您還沒有任何訂單記錄'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className='btn btn-outline-secondary btn-sm mt-2'
                >
                  清除搜尋
                </button>
              )}
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>

        {/* 分頁 */}
        {filteredPagination && filteredPagination.total_pages > 1 && (
          <Pagination
            page={currentPage}
            totalPages={filteredPagination.total_pages}
            paginationColor='#5c5757ff'
          />
        )}
      </div>
    </UserPanelLayout>
  );
}
