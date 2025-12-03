import Image from 'next/image';

export default function CartSummary({ items = [], onCheckout }) {
  // 計算總計
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const shipping = subtotal > 2000 ? 0 : 150; // 滿2000免運費
  const tax = 0; // 售價已含稅，稅率為0
  const total = subtotal + shipping + tax;

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout();
    }
  };

  return (
    <div className='card cart-summary-card'>
      <div className='card-header bg-vinyl-light'>
        <h5 className='card-title mb-0'>
          <i className='bi bi-receipt me-2'></i>
          訂單摘要
        </h5>
      </div>

      <div className='card-body'>
        {/* 商品總計 */}
        <div className='d-flex justify-content-between mb-2'>
          <span>商品總計 ({items.length} 項)</span>
          <span>NT$ {subtotal.toLocaleString()}</span>
        </div>

        {/* 運費 */}
        <div className='d-flex justify-content-between mb-2'>
          <span>
            運費
            {shipping === 0 && (
              <small className='text-success ms-1'>(免運費)</small>
            )}
          </span>
          <span>NT$ {shipping}</span>
        </div>

        {/* 稅金 */}
        <div className='d-flex justify-content-between mb-3'>
          <span>稅金 (5%)</span>
          <span>NT$ {tax}</span>
        </div>

        <hr />

        {/* 總計 */}
        <div className='d-flex justify-content-between mb-3'>
          <strong className='fs-5'>總計</strong>
          <strong className='fs-5 text-vinyl-secondary'>
            NT$ {total.toLocaleString()}
          </strong>
        </div>

        {/* 優惠提示 */}
        {subtotal > 0 && subtotal < 2000 && (
          <div className='alert alert-info py-2'>
            <small>
              <i className='bi bi-info-circle me-1'></i>
              再購買 NT$ {2000 - subtotal} 即可享免運費
            </small>
          </div>
        )}

        {/* 結帳按鈕 */}
        <button
          className='btn btn-vinyl w-100 mb-2'
          onClick={handleCheckout}
          disabled={items.length === 0}
        >
          <i className='bi bi-credit-card me-2'></i>
          前往結帳
        </button>

        {/* 繼續購物 */}
        <button className='btn btn-outline-secondary w-100 mb-3'>
          <i className='bi bi-arrow-left me-2'></i>
          繼續購物
        </button>

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

      {/* 安全支付提示 */}
      <div className='card-footer bg-light'>
        <div className='d-flex align-items-center justify-content-center text-muted'>
          <i className='bi bi-shield-check me-2'></i>
          <small>安全加密付款</small>
        </div>
      </div>
    </div>
  );
}
