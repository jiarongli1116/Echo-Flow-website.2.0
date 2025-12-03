"use client";

import UserPanelLayout from "@/app/users/panel/_components/UserPanelLayout";
import styles from "./favorities.module.css";
import { CartIcon, DeleteIcon } from "@/components/icons/Icons";
import { useProducts } from "@/hooks/use-product";
import { useAuth } from "@/hooks/use-auth";
// 宋做的修改：引入購物車 hook，以便收藏清單使用加入購物車
import { useCart } from "@/hooks/use-cart";
// 宋做的修改：引入購物車概述 toast
import { showCartOverview } from "@/components/Layout/CartOverviewToast";
import { useCallback, useEffect, useState } from "react";
import Pagination from "@/components/product/Pagination";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
export default function UserFavoritesPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const {
    favoritesList,
    favorites = [],
    isLoading,
    pagination,
    removeFavorite,
  } = useProducts();

  // 宋做的修改：從購物車 hook 取得 addItem，用於收藏清單
  const { addItem, items, getCartTotal } = useCart();

  // 宋做的修改：新增狀態來追蹤是否剛加入購物車
  const [justAddedToCart, setJustAddedToCart] = useState(false);
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page")) || 1;
  const per_page = parseInt(searchParams.get("per_page")) || 10;

  const loadFavorites = useCallback(() => {
    if (user?.id) {
      favoritesList(user.id, page);
    }
  }, [user?.id, page]); // 移除 favoritesList

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);
  const handleProductClick = (productId) => {
    router.push(`/products/${productId}`);
  };
  const handleDelete = useCallback(
    async (vinylId) => {
      try {
        await removeFavorite(user.id, vinylId);
        // Optionally reload favorites after deletion
        loadFavorites();
          loadFavorites();
        Swal.fire({
          icon: 'success',
          title: '已刪除',
          text: '商品已從收藏清單中移除'
        });
      } catch (error) {
        console.error("Failed to remove favorite:", error);
        // Handle error (show toast notification, etc.)
         Swal.fire({
          icon: 'error',
          title: '刪除失敗',
          text: '無法移除商品，請稍後再試'
        });
      }
    },
    [user?.id, removeFavorite, loadFavorites]
  );

  // 宋做的修改：處理加入購物車
  const handleAddToCart = useCallback(
    async (productId) => {
      // 從 favorites 中找到對應的商品資料
      const product = favorites.find((fav) => fav.id === productId);

      if (!product) {
        console.error("找不到商品資料:", productId);
        // alert('找不到商品資料');
        Swal.fire({
          icon: "error",
          title: "錯誤",
          text: "找不到商品資料",
        });
        return;
      }

      console.log("🛒 FavoritesPage handleAddToCart 開始:", {
        product: {
          id: product.id,
          name: product.name,
          image_url: product.pathname,
          price: product.price,
        },
        quantity: 1,
        timestamp: new Date().toLocaleTimeString(),
      });

      try {
        console.log("🛒 調用 addItem 函數");
        await addItem(product, 1);
        console.log("🛒 addItem 成功完成");

        // 宋做的修改：標記需要顯示購物車概述 toast
        setJustAddedToCart(true);
      } catch (err) {
        console.log("🛒 addItem 失敗:", err.message);
        // alert(err?.message || '加入購物車失敗');
        Swal.fire({
          icon: "error",
          title: "加入失敗",
          text: err?.message || "加入購物車失敗",
        });
      }
    },
    [addItem, favorites]
  );

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

  useEffect(() => {
    setMounted(true);
  }, []);
  // 這個檢查要在 isLoading 之前
  // 在 app/products/page.js 中
  if (!mounted) {
    return (
      <UserPanelLayout pageTitle="我的黑膠收藏">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">收藏清單</h5>
            <p className="card-text">管理您收藏的黑膠唱片和音樂作品。</p>
            在這裡添加收藏列表{" "}
          </div>
        </div>
      </UserPanelLayout>
    );
  }

  return (
    <UserPanelLayout pageTitle="我的黑膠收藏">
      <div className="card">
        <div className="card-body">
          <div className={styles.thead}>
            <div className={styles.th}>商品</div>
            <div
              className={`${styles.componentWrapper} ${styles.hideOnMobile}`}
            >
              價錢
            </div>
            <div className={`${styles.divWrapper} ${styles.hideOnMobile}`}>
              操作
            </div>
          </div>
          {favorites.map((favorite) => (
            <div key={favorite.id} className={styles.tbody}>
              <div className={styles.frame}>
                <img
                  className={styles.rectangle}
                  alt={favorite.name}
                  src={favorite.pathname}
                  onClick={() => {
                    handleProductClick(favorite.id);
                  }}
                />
                <div className={styles.favoriteWord}>
                  <div
                    className={styles.favoriteName}
                    onClick={() => {
                      handleProductClick(favorite.id);
                    }}
                  >
                    {favorite.name}{" "}
                  </div>
                  <div className={styles.textWrapper}>{favorite.artist}</div>
                </div>
              </div>
              <div className={styles.componentWrapper}>
                $ {favorite.price} 元
              </div>
              <div className={styles.divWrapper}>
                <div>
                  {/* 宋做的修改：加入加入購物車的 onClick 事件 */}
                  <CartIcon
                    onClick={() => {
                      handleAddToCart(favorite.id);
                    }}
                    className="me-1"
                  />
                  <DeleteIcon
                    onClick={() => {
                      handleDelete(favorite.id);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {(pagination?.totalPages || 1) > 1 && (
        <Pagination
          page={page}
          totalPages={pagination?.totalPages || 1}
          paginationColor="#5c5757ff"
        />
      )}
    </UserPanelLayout>
  );
}
