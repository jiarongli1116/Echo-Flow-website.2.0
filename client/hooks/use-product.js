"use client";

import { useParams } from "next/navigation";
import { useContext, createContext, useState, useEffect } from "react";

const ProductsContext = createContext(null);
ProductsContext.displayName = "ProductsContext";
export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [productdetail, setProductdetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [relateds, setRelateds] = useState([]);
  const [artists, setArtists] = useState([]);
  const [userBookmark, setUserBookmark] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const params = useParams();
  // 列表api
  const list = async ({
    page = 1,
    limit = 16,
    mcid = null,
    scid = null,
    sortBy = null,
    sortOrder = null,
    search = null,
    qtype = null,
    lp = null,
    minPrice = null,
    maxPrice = null,
    status = null

  } = {}) => {
      if (products.length === 0) {
    setIsLoading(true);
  }
    let API = `http://localhost:3005/api/products?page=${page}&limit=${limit}`;
    if (status) {
      API += `&status=${status}`;
    }
    if (mcid) {
      API += `&mcid=${mcid}`;
    }
    if (scid) {
      API += `&scid=${scid}`;
    }
    if (sortBy && sortOrder) {
      API += `&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    }
    if (search && qtype) {
      API += `&qtype=${qtype}&search=${search}`;
    }
    if (lp) {
      API += `&lp=${lp}`;
    }
    if (maxPrice) {
      API += `&maxPrice=${maxPrice}`;
    }
    if (minPrice) {
      API += `&minPrice=${minPrice}`;
    }

    try {
      const res = await fetch(API);
      const result = await res.json();
      console.log(result);

      if (result.status == "success") {
        setProducts(result.data);
        setPagination(result.pagination);
      } else {
        throw new Error(result.message);
        setProducts([]);
        setPagination(null);
      }
    } catch (error) {
      console.log(`商品列表取得失敗: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  //詳細頁面api
  const detail = async (productId) => {
    setIsLoading(true);
    const API = `http://localhost:3005/api/products/${productId}`;

    try {
      const res = await fetch(API);
      const result = await res.json();
      console.log(result);

      if (result.status == "success") {
        setProductdetail(result.data);
      } else {
        throw new Error(result.message);
        setProductdetail(null);
      }
    } catch (error) {
      console.log(`商品詳細頁取得失敗: ${error.message}`);
      //  alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  //評論列表
  const reviewsList = async (productId, sortBy = null, sortOrder = null) => {
    // setReviews([]);

    // ✅ 正確的 URL 構建
    let API = `http://localhost:3005/api/products/${productId}/reviews`;
    if (sortBy && sortOrder) {
      API += `?sortBy=${sortBy}&sortOrder=${sortOrder}`;  // 使用 ? 開頭
    }

    try {
      const res = await fetch(API);
      const result = await res.json();
      console.log(result);

      if (result.status === "success") {  // ✅ 使用 === 比較好
        setReviews(result.data);
      } else {
        // ✅ 先設定空陣列，再拋出錯誤
        // setReviews([]);
        throw new Error(result.message);
      }
    } catch (error) {
      console.log(`商品評論讀取失敗: ${error.message}`);
      // ✅ 確保錯誤時也設定空陣列
      // setReviews([]);
    }
  };
  //主分類
  const mainCategorysList = async () => {
    let API = `http://localhost:3005/api/products/main_category`;

    try {
      const res = await fetch(API);
      const result = await res.json();
      console.log(result);

      if (result.status == "success") {
        setMainCategories(result.mainCategory);
      } else {
        throw new Error(result.message);
        setMainCategories([]);
      }
    } catch (error) {
      console.log(`主分類列表取得失敗: ${error.message}`);
    }
  };
  //次分類
  const subCategorysList = async () => {
    let API = `http://localhost:3005/api/products/sub_category`;

    try {
      const res = await fetch(API);
      const result = await res.json();
      console.log(result);

      if (result.status == "success") {
        setSubCategories(result.subCategory);
      } else {
        throw new Error(result.message);
        setSubCategories([]);
      }
    } catch (error) {
      console.log(`次分類列表取得失敗: ${error.message}`);
    }
  };
  //相關專輯列表
  const relatedlist = async (productId) => {
    setRelateds([]);
    const API = `http://localhost:3005/api/products/${productId}/related`;

    try {
      const res = await fetch(API);
      const result = await res.json();
      console.log(result);

      if (result.status == "success") {
        setRelateds(result.data);
      } else {
        setRelateds([]);
        throw new Error(result.message);
      }
    } catch (error) {
      console.log(`相關專輯讀取失敗: ${error.message}`);
    }
  };
  //同藝人列表
  const artistlist = async (productId) => {
    setRelateds([]);
    const API = `http://localhost:3005/api/products/${productId}/artist`;

    try {
      const res = await fetch(API);
      const result = await res.json();
      console.log(result);

      if (result.status == "success") {
        setArtists(result.data);
      } else {
        setArtists([]);
        throw new Error(result.message);
      }
    } catch (error) {
      console.log(`同藝人專輯讀取失敗: ${error.message}`);
    }
  };
  //增加評論
  const addReview = async (productId, reviewData) => {
    const API = `http://localhost:3005/api/products/${productId}/reviews`;

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData)
      });
      const result = await res.json();
      console.log(result);

      if (result.status === "success") {
        // 新增成功後重新載入評論列表
        await reviewsList(productId);
        return { success: true, message: result.message };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.log(`新增評論失敗: ${error.message}`);
      return { success: false, message: error.message };
    }
  };
  //收藏商品
  const bookmark = async (productId, currentUserId) => {
    const API = `http://localhost:3005/api/products/bookmarks`;
    try {
      const res = await fetch(API, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vinyl_id: productId,
          users_id: currentUserId
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();
      console.log(result);
      if (result.status === 'success') {
        // 回傳收藏狀態，讓呼叫方可以更新 UI
        return {
          success: true,
          isBookmarked: result.data.isBookmarked,
          message: result.message
        };
      } else {
        // 後端回傳錯誤
        throw new Error(result.message || '操作失敗');
      }


    } catch (error) {
      console.log(`商品收藏讀取失敗: ${error.message}`);
    }
  };
  //user收藏的商品
  const loadUserBookmarks = async (userId, page = 1,
    limit = 16) => {
      const API = `http://localhost:3005/api/products/bookmarks?users_id=${userId}&page=${page}&limit=${limit}`;
    setIsLoading(true);
    try {
      const res = await fetch(API);
      const result = await res.json();
      console.log(result);

      if (result.status == "success") {
        setUserBookmark(result.data);
      } else {
        setUserBookmark(null);
        throw new Error(result.message);

      }
    } catch (error) {
      console.log(`商品詳細頁取得失敗: ${error.message}`);
      //  alert(error.message);
    } finally {
      setIsLoading(false);
    }

  };
  //user頁面的的favorites
  const favoritesList = async (userId, page = 1, limit = 10) => {
    const API = `http://localhost:3005/api/products/favorites/${userId}?page=${page}&limit=${limit}`;
    setIsLoading(true);
    try {
      const res = await fetch(API);
      const result = await res.json();
      console.log(result);

      if (result.status == "success") {
        setFavorites(result.data);
        setPagination(result.pagination);
      } else {
        setPagination(null);
        setFavorites([]);
        throw new Error(result.message);
      }
    } catch (error) {
      console.log(`商品詳細頁取得失敗: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  const removeFavorite = async (userId, vinylId) => {
    try {
      const res = await fetch(`http://localhost:3005/api/products/favorites/${userId}/${vinylId}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.status === "success") {
        // 重新載入收藏列表
        await favoritesList(userId);
        return { success: true, message: result.message };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.log(`刪除收藏失敗: ${error.message}`);
      return { success: false, message: error.message };
    }
  };
    //上下架
const toggleValid = async (productId) => {
    const API = `http://localhost:3005/api/products/${productId}`;
    try {
        const res = await fetch(API, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const result = await res.json();
        console.log(result);
        
        if (result.status === 'success') {
            return {
                success: true,
                newStatus: result.data.is_valid,  // 修正屬性名
                message: result.message
            };
        } else {
            throw new Error(result.message || '操作失敗');
        }
        
    } catch (error) {
        console.log(`商品狀態切換失敗: ${error.message}`);  // 修正錯誤訊息
        return {
            success: false,
            message: error.message
        };
    }
};
  return (
    <ProductsContext.Provider
      value={{
        products,
        isLoading,
        productdetail,
        pagination,
        reviews,
        mainCategories,
        subCategories,
        relateds,
        artists,
        list,
        detail,
        reviewsList,
        subCategorysList,
        mainCategorysList,
        relatedlist,
        artistlist,
        addReview,
        bookmark,
        loadUserBookmarks,
        userBookmark,
        favoritesList,
        favorites,
        removeFavorite,
        toggleValid
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export const useProducts = () => useContext(ProductsContext);
