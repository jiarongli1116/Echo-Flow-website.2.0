"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProductDetail } from "./_components/ProductDetail.js";
import ProductDesc from "./_components/ProductDesc.js";
import CustomerFeedback from "./_components/CustomerFeedback.js";
import SlideableProductSection from "./_components/SlideableProductSection.js";
import styles from "./productId.module.css";
import ProductCard from "@/components/product/ProductCard.js";
import { useParams } from "next/navigation";
import Link from "next/link";
//導入鉤子
import { useProducts } from "@/hooks/use-product";
import { useAuth } from "@/hooks/use-auth";
// 宋做的修改：引入購物車 hook，以便列表卡片使用加入購物車
import { useCart } from "@/hooks/use-cart";
// 宋做的修改：引入購物車概述 toast
import { showCartOverview } from "@/components/Layout/CartOverviewToast";
import Swal from "sweetalert2";
export default function ProductailLayout(props) {
  const params = useParams(); // 獲取路由參數
  const [mounted, setMounted] = useState(false);
  const {
    detail,
    productdetail,
    list,
    reviewsList,
    reviews,
    isLoading,
    relateds,
    relatedlist,
    artists,
    artistlist,
    addReview,
    bookmark,
    userBookmark,
    loadUserBookmarks,
  } = useProducts();
  // products ,list 先暫時使用
  const { user } = useAuth();
  const currentUserId = user?.id;
  const bookmarkedIds = userBookmark.map((item) => item.vinyl_id);
  // 處理加入願望清單
  const handleAddToWishlist = async (product) => {
    if (!currentUserId) {
      Swal.fire({
        icon: "warning",
        title: "需要登入",
        text: "請先登入才能使用收藏功能",
      });
      return;
    }

    const result = await bookmark(product.id, currentUserId);

    if (result.success) {
      await loadUserBookmarks(currentUserId);
      Swal.fire({
        icon: "success",
        title: "成功！",
        text: result.message,
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "操作失敗",
        text: result.error || "收藏操作失敗",
      });
    }
  };

  useEffect(() => {
    if (params.id) {
      detail(params.id);
      reviewsList(params.id);
      relatedlist(params.id);
      artistlist(params.id);
    }
  }, [params.id]);
  useEffect(() => {
    list();
  }, []);
  useEffect(() => {
    if (currentUserId) {
      loadUserBookmarks(currentUserId);
    }
  }, [currentUserId]);

  // 處理加入購物車
  // 宋做的修改：從購物車 hook 取得 addItem，用於相關/同藝人清單
  const { addItem, items, getCartTotal } = useCart();

  // 宋做的修改：新增狀態來追蹤是否剛加入購物車
  const [justAddedToCart, setJustAddedToCart] = useState(false);

  // 宋做的修改：點擊卡片的加入購物車，直接以數量 1 呼叫 addItem
  const handleAddToCart = useCallback(
    async (product) => {
      console.log("🛒 Page handleAddToCart 開始:", {
        product: {
          id: product.id,
          name: product.name || product.title,
          image_url: product.image_url,
          pathname: product.pathname,
          image_path: product.image_path,
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
        Swal.fire({
          icon: "error",
          title: "加入失敗",
          text: err?.message || "加入購物車失敗",
        });
      }
    },
    [addItem]
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

  // ✅ 第一優先：hydration 安全檢查
  if (!mounted) {
    return (
      <div className={styles.body}>
        <div
          className={`${styles.container} container`}
          style={{ minHeight: "100vh" }}
        >
          <div>載入中...</div>
        </div>
      </div>
    );
  }

  // ✅ 第二優先：loading 檢查
  if (isLoading) {
    return (
      <div className={styles.body}>
        <div
          className={`${styles.container} container`}
          style={{ minHeight: "100vh" }}
        >
          <div>載入商品資料中...</div>
        </div>
      </div>
    );
  }

  // ✅ 第三優先：資料檢查
  if (!productdetail) {
    return <div className={styles.body}>商品不存在</div>;
  }

  // 加上安全檢查
  if (!productdetail) {
    return <div className={styles.body}></div>; // ✅ 當沒有商品資料時也返回
  }
  return (
    <>
      <div className={styles.body}>
        <div className={`${styles.container} container`}>
          <nav
            style={{ "--bs-breadcrumb-divider": "'/'", border: "none" }}
            aria-label="breadcrumb"
            className={`${styles.productnav}`}
          >
            <ol className="breadcrumb">
              {/* 首頁 */}
              <li
                className={`breadcrumb-item ${styles.productsBreadcrumbItem}`}
              >
                <Link href="/" className={styles.link}>
                  <i className="fa-solid fa-house"></i>
                </Link>
              </li>

              {/* 全站商品 */}
              <li
                className={`breadcrumb-item ${styles.productsBreadcrumbItem}`}
              >
                <Link href={`/products`} className={styles.link}>
                  全站商品
                </Link>
              </li>

              {/* 主分類 */}
              <li
                className={`breadcrumb-item ${styles.productsBreadcrumbItem}`}
              >
                <Link
                  href={`/products?mcid=${productdetail.main_category_id}`}
                  className={styles.link}
                >
                  {productdetail.main_category_title}
                </Link>
              </li>

              {/* 子分類 - 只有這個有 active */}
              <li
                className={`breadcrumb-item active ${styles.productsBreadcrumbItem}`}
                aria-current="page"
              >
                <Link
                  href={`/products?mcid=${productdetail.main_category_id}&scid=${productdetail.sub_category_id}`}
                  className={styles.link}
                >
                  {productdetail.sub_category_title}
                </Link>
              </li>
            </ol>
          </nav>
          <ProductDetail
            productdetail={productdetail}
            reviews={reviews}
            onAddToWishlist={handleAddToWishlist}
            isBookmarked={bookmarkedIds.includes(productdetail.id)}
          />
          <ProductDesc productdetail={productdetail} />

          {/* 桌面版 - 原有的網格布局 */}
          <div className="product-ID-recommend row d-flex justify-content-flex-start d-none d-lg-flex ms-3">
            {relateds && relateds.length > 0 && (
              <>
                <h5
                  style={{
                    color: "var(--primary--600)",
                    marginBottom: "1rem",
                    fontWeight: "600",
                    lineHeight: "42px",
                    fontSize: "var(--tw---h5)",
                  }}
                >
                  相關專輯
                </h5>
                {relateds.map((product) => (
                  <div key={product.id} className="col-2 product mb-4">
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      onAddToWishlist={handleAddToWishlist}
                      isBookmarked={bookmarkedIds.includes(product.id)}
                    />
                  </div>
                ))}
              </>
            )}
            {artists && artists.length > 0 && (
              <>
                <h5
                  style={{
                    color: "var(--primary--600)",
                    marginBottom: "1rem",
                    fontWeight: "600",
                    lineHeight: "42px",
                    fontSize: "var(--tw---h5)",
                  }}
                >
                  同藝人系列
                </h5>
                {artists.map((product) => (
                  <div
                    key={product.id}
                    className="col-2 product-ID-aritis mb-4"
                  >
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      onAddToWishlist={handleAddToWishlist}
                      isBookmarked={bookmarkedIds.includes(product.id)}
                    />
                  </div>
                ))}
              </>
            )}
          </div>

          {/* 手機版 - 滑動布局 */}
          <div className="d-lg-none">
            {relateds && relateds.length > 0 && (
              <>
                <SlideableProductSection
                  title="相關專輯"
                  products={relateds}
                  onAddToCart={handleAddToCart}
                  onAddToWishlist={handleAddToWishlist}
                  isBookmarked={bookmarkedIds.includes(relateds.id)}
                  relatedlist={relatedlist}
                />
              </>
            )}
            {artists && artists.length > 0 && (
              <>
                <SlideableProductSection
                  title="同藝人系列"
                  products={artists}
                  onAddToCart={handleAddToCart}
                  onAddToWishlist={handleAddToWishlist}
                  isBookmarked={bookmarkedIds.includes(artists.id)}
                  relatedlist={relatedlist}
                />
              </>
            )}
          </div>

          <CustomerFeedback
            reviewsList={reviewsList}
            reviews={reviews}
            productId={params.id}
            productdetail={productdetail}
            addReview={addReview}
          />
        </div>
      </div>
    </>
  );
}
