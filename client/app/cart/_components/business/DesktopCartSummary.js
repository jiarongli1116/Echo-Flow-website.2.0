'use client';

import Image from 'next/image';

export default function DesktopCartSummary({
  items,
  onCheckout,
  selectedItems = new Set(),
  pointsDiscount = 0,
}) {
  // 只計算選中商品的總額
  const selectedProducts = items.filter((item) => selectedItems.has(item.id));
  const subtotal = selectedProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shippingFee = subtotal >= 2000 ? 0 : 100; // 滿 2000 免運費
  const tax = Math.round(subtotal * 0.05); // 5% 稅率
  const total = subtotal + shippingFee + tax - pointsDiscount;

  const handleCheckoutClick = () => {
    if (onCheckout) {
      onCheckout(selectedProducts);
    }
  };

  return (
    <div className='desktop-cart-summary'>
      <div className='card cart-summary-card'>
        <div className='card-header bg-vinyl-light'>
          <h5 className='card-title mb-0'>
            <i className='bi bi-receipt me-2'></i>
            訂單摘要
          </h5>
        </div>

        <div className='card-body'>
          {/* 選中商品列表 */}
          {selectedProducts.length > 0 && (
            <div className='selected-items-preview mb-3'>
              <h6 className='text-muted mb-2'>
                選中商品 ({selectedProducts.length})
              </h6>
              {selectedProducts.map((item) => (
                <div
                  key={item.id}
                  className='selected-item-row d-flex justify-content-between align-items-center py-1'
                >
                  <div className='d-flex align-items-center'>
                    <img
                      src={item.image}
                      alt={item.name}
                      className='selected-item-image me-2'
                      style={{
                        width: '30px',
                        height: '30px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                      }}
                    />
                    <div>
                      <div className='fs-vinyl-small fw-medium'>
                        {item.name}
                      </div>
                      <div
                        className='text-muted'
                        style={{ fontSize: '0.75rem' }}
                      >
                        {item.artist} × {item.quantity}
                      </div>
                    </div>
                  </div>
                  <span className='fw-bold text-vinyl-secondary'>
                    NT$ {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
              <hr className='my-2' />
            </div>
          )}

          {/* 價格計算 */}
          <div className='price-breakdown'>
            <div className='d-flex justify-content-between mb-2'>
              <span>商品總計</span>
              <span>NT$ {subtotal.toLocaleString()}</span>
            </div>
            <div className='d-flex justify-content-between mb-2'>
              <span>
                運費
                {shippingFee === 0 && (
                  <small className='text-success ms-1'>(免運費)</small>
                )}
              </span>
              <span>NT$ {shippingFee.toLocaleString()}</span>
            </div>
            <div className='d-flex justify-content-between mb-3'>
              <span>稅金 (5%)</span>
              <span>NT$ {tax.toLocaleString()}</span>
            </div>
            <hr />
            <div className='d-flex justify-content-between mb-3'>
              <strong className='fs-5'>總計</strong>
              <strong className='fs-5 text-vinyl-secondary'>
                NT$ {total.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* 優惠券區域 */}
          <div className='coupon-section mb-3'>
            <label className='form-label fs-vinyl-small fw-bold'>優惠券</label>
            <div className='input-group'>
              <input
                type='text'
                className='form-control form-control-sm'
                placeholder='輸入優惠碼'
              />
              <button
                className='btn btn-outline-secondary btn-sm'
                type='button'
              >
                套用
              </button>
            </div>
          </div>

          {/* 結帳按鈕 */}
          <div className='checkout-buttons'>
            <button
              className='btn btn-vinyl w-100 mb-2'
              onClick={handleCheckoutClick}
              disabled={selectedProducts.length === 0}
            >
              <i className='bi bi-credit-card me-2'></i>
              結帳選中商品 ({selectedProducts.length})
            </button>
            <button className='btn btn-outline-secondary w-100 mb-3'>
              <i className='bi bi-arrow-left me-2'></i>
              繼續購物
            </button>
          </div>

          {/* 付款方式 */}
          <div className='payment-methods'>
            <div className='fs-vinyl-small text-muted mb-2'>支援付款方式</div>
            <div className='d-flex gap-2'>
              <div className='payment-icon bg-light border rounded p-1'>
                <i className='bi bi-credit-card text-muted'></i>
              </div>
              <div className='payment-icon bg-light border rounded p-1'>
                <i className='bi bi-paypal text-muted'></i>
              </div>
              <div className='payment-icon bg-light border rounded p-1'>
                <i className='bi bi-apple text-muted'></i>
              </div>
              <div className='payment-icon bg-light border rounded p-1'>
                <i className='bi bi-google text-muted'></i>
              </div>
              <div className='payment-icon bg-light border rounded p-1'>
                <Image
                  src='/images/payment/linepay.png'
                  alt='LINE Pay'
                  width={20}
                  height={14}
                  className='payment-icon-svg'
                />
              </div>
              <div className='payment-icon bg-light border rounded p-1'>
                <Image
                  src='/images/payment/ecpay.png'
                  alt='綠界科技'
                  width={20}
                  height={14}
                  className='payment-icon-svg'
                />
              </div>
            </div>
          </div>
        </div>

        <div className='card-footer bg-light'>
          <div className='d-flex align-items-center justify-content-center text-muted'>
            <i className='bi bi-shield-check me-2'></i>
            <small>SSL 安全加密付款</small>
          </div>
        </div>
      </div>
    </div>
  );
}
