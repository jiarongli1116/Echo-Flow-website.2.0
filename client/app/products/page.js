// app/product/page.js
"use client";
import React, { useEffect, useState, useCallback } from "react";
import styles from "./products.module.css";
import Swal from "sweetalert2";

// 引入組件
import ProductCard from "@/components/product/ProductCard";
import FilterSidebar from "./_componets/FilterSidebar"; // 桌面版篩選側邊欄
import MobileFilterSidebar from "./_componets/MobileFilterSidebar"; // 手機版篩選側邊欄
import Hero from "@/components/product/Hero";
import Pagination from "@/components/product/Pagination";
import { useSearchParams } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import { useRouter, usePathname } from "next/navigation";

//導入鉤子
import { useProducts } from "@/hooks/use-product";
import { useAuth } from "@/hooks/use-auth";
//宋
import { useCart } from "@/hooks/use-cart";
// 宋做的修改：引入購物車概述 toast
import { showCartOverview } from "@/components/Layout/CartOverviewToast";
import Link from "next/link";

const ProductSite = () => {
  const [currentSortValue, setCurrentSortValue] = useState('');
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  
  const pathname = usePathname();
  const {
    list,
    products,
    pagination,
    mainCategories,
    subCategories,
    mainCategorysList,
    subCategorysList,
    isLoading,
    bookmark,
    userBookmark,
    loadUserBookmarks,
  } = useProducts();
  const currentUserId = user?.id;

  // 宋做的修改：從購物車 hook 取得 addItem，用於商品列表
  const { addItem, items, getCartTotal } = useCart();

  // 宋做的修改：新增狀態來追蹤是否剛加入購物車
  const [justAddedToCart, setJustAddedToCart] = useState(false);

  // 分頁部分
  const searchParams = useSearchParams();

  // 獲取分頁參數
  const page = parseInt(searchParams.get("page")) || 1;
  const per_page = parseInt(searchParams.get("per_page")) || 16;
  // 分類網址部分
  const mcid = parseInt(searchParams.get("mcid")) || null;
  const scid = parseInt(searchParams.get("scid")) || null;
  const sortBy = searchParams.get("sortBy") || null;
  const sortOrder = searchParams.get("sortOrder") || null;
  const search = searchParams.get("search") || null;
  const qtype = searchParams.get("qtype") || null;
  const lp = searchParams.get("lp") || null;
  const minPrice = searchParams.get("minPrice") || null;
  const maxPrice = searchParams.get("maxPrice") || null;

  // 側邊篩選欄主次分類部分
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);

  // 處理主分類點擊
  const handleMainCategoryClick = (mcid, categoryTitle) => {
    setSelectedMainCategory({ id: mcid, title: categoryTitle });
    const filtered = subCategories.filter(
      (sub) => sub.main_category_id === mcid
    );
    setFilteredSubCategories(filtered);
  };

  // 手機版的側邊欄狀態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 處理 sidebar 開關
  const toggleSidebar = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };

  // 處理加入願望清單
  const handleAddToWishlist = async (product) => {
    if (!currentUserId) {
      // alert('請先登入才能使用收藏功能');
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
      // 更新收藏狀態

      // alert(result.message);
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

  // 宋做的修改：處理加入購物車
  const handleAddToCart = useCallback(
    async (product) => {
      console.log("🛒 ProductsPage handleAddToCart 開始:", {
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
        // alert(err?.message || "加入購物車失敗");
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

  // 處理排序變更
const handleSortChange = (e) => {
  const value = e.target.value;
  setCurrentSortValue(value); // 立即更新狀態
  
  const params = new URLSearchParams(window.location.search);
  switch (value) {
    case "1":
      params.set("sortBy", "price");
      params.set("sortOrder", "ASC");
      break;
    case "2":
      params.set("sortBy", "price");
      params.set("sortOrder", "DESC");
      break;
    case "3":
      params.set("sortBy", "average_rating");
      params.set("sortOrder", "ASC");
      break;
    case "4":
      params.set("sortBy", "average_rating");
      params.set("sortOrder", "DESC");
      break;
    case "5":
      params.set("sortBy", "release_date");
      params.set("sortOrder", "ASC");
      break;
    case "6":
      params.set("sortBy", "release_date");
      params.set("sortOrder", "DESC");
      break;
    default:
      params.delete("sortBy");
      params.delete("sortOrder");
  }
  params.delete("page");
  router.push(`${pathname}?${params.toString()}`, { scroll: false });
};

  // 搜尋功能
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchType, setSearchType] = useState("name");

  const handleSearch = () => {
    const params = new URLSearchParams(window.location.search);
    if (searchKeyword.trim() && searchType) {
      params.set("search", searchKeyword);
      params.set("qtype", searchType);
    } else {
      params.delete("search");
      params.delete("qtype");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // 處理尺寸變更
  const [selectedSize, setSelectedSize] = useState("");

  const handleSizeChange = (size) => {
    const newSize = selectedSize === size ? "" : size;
    setSelectedSize(newSize);
  };
  const bookmarkedIds = userBookmark.map((item) => item.vinyl_id);
  const currentCategory = mainCategories.find(
    (category) => category.id === mcid
  );
  const currentSubCategory = subCategories.find(
    (category) => category.id === scid
  );

  // 載入數據
  useEffect(() => {
    mainCategorysList();
    subCategorysList();
  }, []);

  // 第一個：載入商品列表
  useEffect(() => {
    list({
      page,
      limit: per_page,
      mcid,
      scid,
      sortBy,
      sortOrder,
      search,
      qtype,
      lp,
      maxPrice,
      minPrice,
    });
  }, [
    page,
    per_page,
    mcid,
    scid,
    sortBy,
    sortOrder,
    search,
    qtype,
    lp,
    maxPrice,
    minPrice,
  ]);

  // 第二個：載入用戶收藏清單
  useEffect(() => {
    if (currentUserId) {
      loadUserBookmarks(currentUserId);
    }
  }, [currentUserId]);
useEffect(() => {
  let sortValue = '';
  if (sortBy && sortOrder) {
    if (sortBy === 'price' && sortOrder === 'ASC') sortValue = '1';
    else if (sortBy === 'price' && sortOrder === 'DESC') sortValue = '2';
    else if (sortBy === 'average_rating' && sortOrder === 'ASC') sortValue = '3';
    else if (sortBy === 'average_rating' && sortOrder === 'DESC') sortValue = '4';
    else if (sortBy === 'release_date' && sortOrder === 'ASC') sortValue = '5';
    else if (sortBy === 'release_date' && sortOrder === 'DESC') sortValue = '6';
  }
  setCurrentSortValue(sortValue);
}, [sortBy, sortOrder]);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 正確：mounted 檢查應該在最前面
  if (!mounted) {
    return (
      <div className={styles.body}>
        <div
          className={`${styles.container} container`}
          style={{ minHeight: "100vh" }}
        >
          {/* 載入中... */}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.body}>
        <div
          className={`${styles.container} container`}
          style={{ minHeight: "100vh" }}
        >
          {/* 載入中... */}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 輪播圖 */}
      <Hero />

      {/* 主要內容區域 */}
      <main className={`container ${styles.main}`}>
        {/* 麵包屑導航 */}
        <nav
          style={{ "--bs-breadcrumb-divider": "'/'", border: "none" }}
          aria-label="breadcrumb"
          className={`mt-3 ${styles.productnav}`}
        >
          <ol className="breadcrumb">
            {/* 首頁 */}
            <li className={`breadcrumb-item ${styles.productsBreadcrumbItem}`}>
              <Link href="/" className={styles.link}>
                <i className="fa-solid fa-house"></i>
              </Link>
            </li>
            <li
              className={`breadcrumb-item active} ${styles.productsBreadcrumbItem}`}
            >
              <Link href={`/products`} className={styles.link}>
                全站商品
              </Link>
            </li>

            {/* 主分類 */}
            {currentCategory && (
              <li
                className={`breadcrumb-item ${
                  !currentSubCategory ? "active" : ""
                } ${styles.productsBreadcrumbItem}`}
              >
                <Link
                  href={`/products?mcid=${currentCategory.id}`}
                  className={styles.link}
                >
                  {currentCategory.title}
                </Link>
              </li>
            )}

            {/* 子分類 */}
            {currentSubCategory && (
              <li
                className={`breadcrumb-item active ${styles.productsBreadcrumbItem}`}
              >
                <Link
                  href={`/products?mcid=${currentCategory.id}&scid=${currentSubCategory.id}`}
                  className={styles.link}
                >
                  {currentSubCategory.title}
                </Link>
              </li>
            )}
          </ol>
        </nav>

        {/* 搜尋和篩選工具列 */}
        <div className={`${styles.searchfilter} mb-3`}>
          <div className={styles.filter}>
            <select
              className={`form-select ${styles.productSelect}`}
              aria-label="排序選擇"
              onChange={handleSortChange}
              name="sortOrder"
               value={currentSortValue} 
            >
              <option value="">默認排序</option>
              <option value="1">價錢低到高</option>
              <option value="2">價錢高到低</option>
              <option value="3">評分低到高</option>
              <option value="4">評分高到低</option>
              <option value="5">發行日低到高</option>
              <option value="6">發行日高到低</option>
            </select>
          </div>

          <div className={`${styles.search} ms-3`}>
            <select
              className={`form-select ${styles.productSelect}`}
              aria-label="搜尋類型選擇"
              value={searchType}
              name="searchType"
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="name">專輯名稱</option>
              <option value="artist">藝人</option>
            </select>
            <input
              type="text"
              placeholder="請輸入關鍵字"
              aria-label="搜尋關鍵字"
              value={searchKeyword}
              name="searchKeyword"
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <i
              className={`fa-solid fa-magnifying-glass me-2 ${styles.faMagnifyingGlass} btn`}
              aria-hidden="true"
              onClick={handleSearch}
            ></i>
          </div>

          {/* 手機版篩選按鈕 */}
          <button
            className={styles.mobileFilterBtn}
            onClick={() => toggleSidebar(true)}
          >
            <i className="fa-solid fa-bars"></i>
          </button>
        </div>

        {/* 內容區域：側邊欄 + 商品陳列 */}
        <div className={`${styles.contentArea} row`}>
          {/* 桌面版側邊篩選欄 */}
          <div className={`col-md-3 ${styles.desktopSidebar}`}>
            <FilterSidebar
              mainCategories={mainCategories}
              subCategories={subCategories}
              minPrice={minPrice}
              maxPrice={maxPrice}
              selectedSize={selectedSize}
              handleSizeChange={handleSizeChange}
              handleMainCategoryClick={handleMainCategoryClick}
            />
          </div>

          {/* 手機版側邊欄 */}
          <MobileFilterSidebar
            isOpen={isSidebarOpen}
            onClose={() => toggleSidebar(false)}
            mainCategories={mainCategories}
            subCategories={subCategories}
            minPrice={minPrice}
            maxPrice={maxPrice}
            selectedSize={selectedSize}
            handleSizeChange={handleSizeChange}
            handleMainCategoryClick={handleMainCategoryClick}
          />

          {/* 商品陳列區域 */}
          <section
            className={`col-md-8 offset-md-1 product-section ${styles.productSection}`}
          >
            <div className="row mb-4">
              {products.map((product, index) => (
                <div key={`${product.id}-${index}`} className="col-3 mb-4">
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                    isBookmarked={bookmarkedIds.includes(product.id)}
                  />
                </div>
              ))}
            </div>

            {/* 分頁組件 */}
            {/*  */}
            {(pagination?.totalPages || 1) > 1 && (
              <Pagination
                page={page}
                totalPages={pagination?.totalPages || 1}
                paginationColor={"#fff"}
              />
            )}
          </section>
        </div>
      </main>
    </>
  );
};

export default ProductSite;
