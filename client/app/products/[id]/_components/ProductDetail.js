"use client";
// 宋做的修改：引入 useState/useCallback/useEffect 以管理數量與事件處理
import React, { useState, useCallback, useEffect } from "react";
import styles from "./ProductDetail.module.css";
import { StarIcon } from "@/components/product/ProductCard.js";
// 宋做的修改：引入購物車 hook 以呼叫 addItem 與後端同步
import { useCart } from "@/hooks/use-cart";
//導入鉤子
import { useProducts } from "@/hooks/use-product";
import { useAuth } from "@/hooks/use-auth";

// 宋做的修改：引入購物車概述 toast
import { showCartOverview } from "@/components/Layout/CartOverviewToast";

export const ProductDetail = ({
  productdetail,
  reviews = [],
  onAddToWishlist = () => {},
  isBookmarked,
}) => {
  const { user } = useAuth();
  const { bookmark } = useProducts();

  if (!productdetail) {
    return <div>載入商品資料中...</div>;
  }
  // 宋做的修改：從購物車 hook 取得 addItem 函數，以及 items 和 getCartTotal
  const { addItem, items, getCartTotal } = useCart();

  // 宋做的修改：新增數量狀態，預設 1
  const [qty, setQty] = useState(1);

  // 宋做的修改：新增狀態來追蹤是否剛加入購物車
  const [justAddedToCart, setJustAddedToCart] = useState(false);

  // 宋做的修改：減少數量，最少為 1
  const dec = useCallback(() => {
    setQty((q) => Math.max(1, q - 1));
  }, []);

  // 宋做的修改：增加數量，上限為庫存值
  const inc = useCallback(() => {
    setQty((q) => {
      const max = Number(productdetail?.stock || 1);
      return Math.min(max, q + 1);
    });
  }, [productdetail]);

  // 宋做的修改：實作加入購物車，呼叫 addItem 並標記需要顯示 toast
  const handleAddToCart = useCallback(async () => {
    console.log("🛒 ProductDetail handleAddToCart 開始:", {
      product: {
        id: productdetail.id,
        name: productdetail.name,
        image_url: productdetail.image_url,
        pathname: productdetail.pathname,
        image_path: productdetail.image_path,
      },
      quantity: qty,
      timestamp: new Date().toLocaleTimeString(),
    });

    try {
      console.log("🛒 調用 addItem 函數");
      await addItem(productdetail, qty);
      console.log("🛒 addItem 成功完成");

      // 宋做的修改：標記需要顯示購物車概述 toast
      setJustAddedToCart(true);
    } catch (err) {
      console.log("🛒 addItem 失敗:", err.message);
      // addItem 內已處理未登入導向，這裡僅提示錯誤
      // alert(err?.message || '加入購物車失敗');
      Swal.fire({
        icon: "error",
        title: "加入失敗",
        text: err?.message || "加入購物車失敗",
      });
    }
  }, [addItem, productdetail, qty]);

  // 宋做的修改：監聽購物車狀態變化，當剛加入商品時顯示 toast
  useEffect(() => {
    if (justAddedToCart && items.length > 0) {
      // 計算購物車總數量和總價
      const cartCount = items.reduce((total, item) => total + item.quantity, 0);
      const totalPrice = getCartTotal();

      // 顯示購物車概述 toast
      showCartOverview(items, totalPrice, cartCount);

      // 重置標記
      setJustAddedToCart(false);
    }
  }, [justAddedToCart, items, getCartTotal]);

  const averageRating = productdetail.average_rating || 0;

  return (
    <div className={styles.productIdLayout}>
      {/* 產品圖片區域 */}
      <div
        className={styles.productIdImage}
        style={{
          backgroundImage: `url('${productdetail.pathname}')`,
        }}
      />

      {/* 產品資訊區域 */}
      <div className={styles.productIdInfo}>
        <h4 className={styles.productIdTitle}>{productdetail.name}</h4>

        <h6 className={styles.productIdSubtitle}>{productdetail.artist}</h6>

        {/* 價格區域 */}
        <div className={styles.productIdPriceSection}>
          <h6 className={styles.productIdPrice}>NT$ {productdetail.price}</h6>

          <svg
            width="20"
            height="23"
            viewBox="0 0 20 23"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.bookmarkIcon}
            onClick={() => onAddToWishlist(productdetail)}
            style={{ cursor: "pointer" }}
          >
            <path
              d="M15.2373 1.52344L15.3936 1.52734C16.1744 1.56716 16.9136 1.89283 17.4668 2.44141V2.44043C18.0197 2.98878 18.345 3.71876 18.3848 4.48633L18.3887 4.63965V20.0059C18.3889 20.2089 18.3468 20.4095 18.2646 20.5947L18.1689 20.7744C18.0249 21.0059 17.8172 21.1945 17.5693 21.3174C17.3216 21.4402 17.0435 21.4927 16.7666 21.4678C16.4897 21.4428 16.2257 21.3415 16.0049 21.1768L16.0029 21.1748L10.8027 17.3125L10.7988 17.3096L10.6768 17.2275C10.4279 17.0735 10.1459 16.9812 9.85449 16.958L9.70801 16.9521C9.36511 16.9522 9.02966 17.0478 8.73926 17.2275L8.61719 17.3096L8.61328 17.3125L3.4082 21.1797L3.40723 21.1807C3.18618 21.3452 2.92242 21.4459 2.64551 21.4707C2.36843 21.4955 2.08971 21.4434 1.8418 21.3203C1.59376 21.1971 1.38625 21.0074 1.24219 20.7754C1.09836 20.5436 1.02281 20.2776 1.02344 20.0068V4.63965C1.02517 3.81649 1.35478 3.02517 1.94434 2.44043L1.94531 2.44141C2.49836 1.89298 3.23699 1.56731 4.01758 1.52734L4.1748 1.52344H15.2373Z"
              stroke="#E6C068"
              strokeWidth="2.04645"
              fill={user && isBookmarked ? "#E6C068" : "transparent"} // 加入 user 檢查
            />
          </svg>
        </div>

        {/* 評分區域 */}
        <div className={styles.productIdRatingSection}>
          <div className={styles.stars}>
            {[...Array(5)].map((_, index) => (
              <StarIcon
                key={index}
                filled={index < Math.round(averageRating)}
              />
            ))}
          </div>
          <div className={styles.reviewCount}>共 {reviews.length} 則評論</div>
        </div>

        {/* 規格選項 */}
        <div className={styles.specLabel}>規格</div>
        <div className={`${styles.specOption} ${styles.selected}`}>
          {productdetail.lp_size}
        </div>
        {/* 要寫判斷式 sotck=0 變成預購 */}
        {/* 存貨選項 */}
        <div className={styles.stockLabel}>存貨</div>
        <div className={styles.stockOptions}>
          <div className={`${styles.stockOption} ${styles}`}>
            {productdetail.stock > 0 ? "現貨" : "缺貨"}
          </div>
        </div>

        {/* 庫存資訊 */}
        <p className={styles.inventoryInfo}>
          <span>庫存尚有 </span>
          <span className={styles.inventoryCount}>{productdetail.stock}</span>
          <span> 件</span>
        </p>

        {/* 數量選擇 */}
        <div className={styles.quantityLabel}>數量</div>
        {/* 宋做的修改：數量輸入與加減按鈕綁定 dec/inc */}
        <div className={styles.quantityInput}>
          <button className={styles.quantityBtn} onClick={dec}>
            -
          </button>
          <div className={styles.quantityDisplay}>{qty}</div>
          <button className={styles.quantityBtn} onClick={inc}>
            +
          </button>
        </div>

        {/* 加入購物車按鈕 */}
        {/* 宋做的修改：將按鈕 onClick 綁定 handleAddToCart */}
        <button
          className={styles.addToCartBtn}
          onClick={handleAddToCart}
          disabled={Number(productdetail.stock) < 1}
        >
          加入購物車
        </button>
      </div>
    </div>
  );
};
