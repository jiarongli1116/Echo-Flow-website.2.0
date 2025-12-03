export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  // 如果沒有傳入 item，使用預設資料
  const defaultItem = {
    id: 1,
    name: 'Abbey Road',
    artist: 'The Beatles',
    price: 1299,
    image:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop',
    genre: 'Rock',
    quantity: 1,
  };

  const itemData = item || defaultItem;

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    if (onUpdateQuantity) {
      onUpdateQuantity(itemData.id, newQuantity);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(itemData.id);
    }
  };

  return (
    <div className='cart-item'>
      <div className='row align-items-center'>
        {/* 商品圖片 */}
        <div className='col-3 col-md-2'>
          <img
            src={itemData.image}
            alt={itemData.name}
            className='img-fluid rounded'
            style={{ aspectRatio: '1', objectFit: 'cover' }}
          />
        </div>

        {/* 商品資訊 */}
        <div className='col-6 col-md-4'>
          <h6 className='fw-bold mb-1'>{itemData.name}</h6>
          <p className='text-muted fs-vinyl-small mb-1'>{itemData.artist}</p>
          <span className='badge bg-secondary fs-vinyl-small'>
            {itemData.genre}
          </span>
        </div>

        {/* 數量控制 */}
        <div className='col-3 col-md-2'>
          <div className='quantity-control d-flex align-items-center'>
            <button
              className='btn'
              onClick={() => handleQuantityChange(itemData.quantity - 1)}
              disabled={itemData.quantity <= 1}
            >
              <i className='bi bi-dash'></i>
            </button>
            <span className='px-3 fw-bold'>{itemData.quantity}</span>
            <button
              className='btn'
              onClick={() => handleQuantityChange(itemData.quantity + 1)}
            >
              <i className='bi bi-plus'></i>
            </button>
          </div>
        </div>

        {/* 價格 */}
        <div className='col-6 col-md-2 mt-2 mt-md-0'>
          <div className='text-muted fs-vinyl-small'>
            單價: NT$ {itemData.price}
          </div>
          <div className='fw-bold text-vinyl-secondary'>
            小計: NT$ {itemData.price * itemData.quantity}
          </div>
        </div>

        {/* 移除按鈕 */}
        <div className='col-6 col-md-2 mt-2 mt-md-0 text-end'>
          <button
            className='btn btn-outline-danger btn-sm'
            onClick={handleRemove}
            title='移除商品'
          >
            <i className='bi bi-trash'></i>
          </button>
        </div>
      </div>
    </div>
  );
}
