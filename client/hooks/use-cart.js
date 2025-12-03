'use client';

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import Swal from 'sweetalert2';
import { useAuth } from './use-auth'; // 宋做的修改：引入 useAuth 以使用統一的 JWT 管理

// 創建購物車 Context
const CartContext = createContext();

// CartProvider 組件
export const CartProvider = ({ children }) => {
  // 宋做的修改：使用 useAuth 提供的 JWT 方法，避免重複實現
  // 這樣可以確保所有 hook 使用相同的 token 管理邏輯
  const { getToken, isLoggedIn, apiRequest, isAuth, isInitialized } = useAuth();

  // 購物車狀態管理（取代 CartContext）
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  // 🚀 新增：專門用於選中狀態更新的 loading 狀態
  const [updatingSelection, setUpdatingSelection] = useState(false);

  // 宋做的修改：移除重複的 JWT 處理邏輯，因為 useAuth 已經提供
  // 刪除：getToken, isLoggedIn, refreshToken, apiRequest 函數
  // 這些方法現在統一由 useAuth 提供，避免重複實現和潛在的競態條件

  // 本地購物車操作函數（取代 CartContext 的 reducer 邏輯）
  const addItemLocal = useCallback(
    (product, quantity = 1) => {
      console.log('🛒 ADD_ITEM action:', {
        product: { id: product.id, name: product.name },
        quantity,
        timestamp: new Date().toLocaleTimeString(),
      });

      setItems((prev) => {
        console.log('🛒 當前購物車狀態:', {
          items: prev.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
          })),
          totalItems: prev.length,
          timestamp: new Date().toLocaleTimeString(),
        });

        // 修復：使用 vinyl_id 或 id 來比對商品，確保同一商品不會重複
        const existingItem = prev.find(
          (item) =>
            item.vinyl_id === product.id ||
            item.id === product.id ||
            (item.vinyl_id && item.vinyl_id === product.vinyl_id),
        );

        if (existingItem) {
          console.log('🛒 商品已存在，增加數量:', {
            existingQuantity: existingItem.quantity,
            addQuantity: quantity,
            newQuantity: existingItem.quantity + quantity,
          });
          const newItems = prev.map((item) =>
            item.vinyl_id === product.id ||
            item.id === product.id ||
            (item.vinyl_id && item.vinyl_id === product.vinyl_id)
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  // 確保圖片 URL 是最新的
                  image_url:
                    product.image_path ||
                    product.pathname ||
                    product.image_url ||
                    item.image_url,
                }
              : item,
          );
          console.log('🛒 更新後的購物車:', {
            items: newItems.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
            })),
            totalCount: newItems.reduce(
              (total, item) => total + item.quantity,
              0,
            ),
          });
          return newItems;
        } else {
          console.log('🛒 新增商品到購物車');
          // 確保商品有正確的圖片 URL 字段
          const imageUrl =
            product.image_path || product.pathname || product.image_url;
          console.log('🖼️ 商品圖片 URL 映射:', {
            original: {
              image_url: product.image_url,
              pathname: product.pathname,
              image_path: product.image_path,
            },
            final: imageUrl,
          });

          const productWithImage = {
            ...product,
            quantity: quantity,
            image_url: imageUrl,
          };
          const newItems = [...prev, productWithImage];
          console.log('🛒 新增後的購物車:', {
            items: newItems.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
            })),
            totalCount: newItems.reduce(
              (total, item) => total + item.quantity,
              0,
            ),
          });
          return newItems;
        }
      });
    },
    [], // 移除 items 依賴項，使用函數式更新
  );

  const removeItemLocal = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantityLocal = useCallback((id, quantity, isChecked) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity, is_checked: isChecked } : item,
      ),
    );
  }, []);

  const clearCartLocal = useCallback(() => {
    setItems([]);
  }, []);

  // 從後端同步購物車數據
  const syncCartFromServer = useCallback(async () => {
    // 如果用戶未登入，不執行同步
    if (!isLoggedIn()) {
      console.log('用戶未登入，跳過購物車同步');
      setSyncStatus('idle');
      return;
    }

    setLoading(true);
    setError(null);
    setSyncStatus('syncing');

    try {
      // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
      // 這樣可以自動處理 token 刷新和 401 錯誤
      const response = await apiRequest('http://localhost:3005/api/carts', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('同步購物車失敗');
      }

      const data = await response.json();

      if (data.status === 'success' && data.data.items) {
        // 調試：檢查後端返回的原始資料
        console.log('後端返回的購物車資料:');
        data.data.items.forEach((item, index) => {
          console.log(`原始項目 ${index + 1}:`, {
            id: item.id,
            vinyl_id: item.vinyl_id,
            name: item.vinyl_name,
            main_category_id: item.main_category_id,
            artist: item.artist,
            image_path: item.image_path,
            image_url: item.image_url,
          });
        });

        // 將後端數據轉換為本地格式並同步
        const serverItems = data.data.items.map((item) => ({
          id: item.id,
          vinyl_id: item.vinyl_id,
          name: item.vinyl_name,
          artist: item.artist,
          image_id: item.image_id,
          image_path: item.image_path,
          image_url: item.image_url,
          price: item.final_price,
          stock: item.stock,
          quantity: item.quantity,
          is_checked: item.is_checked === 1,
          main_category_id: item.main_category_id, // 新增：主分類ID
          sub_category_id: item.sub_category_id, // 新增：次分類ID
        }));

        // 調試：檢查轉換後的資料
        console.log('轉換後的購物車資料:');
        serverItems.forEach((item, index) => {
          console.log(`轉換項目 ${index + 1}:`, {
            id: item.id,
            vinyl_id: item.vinyl_id,
            name: item.name,
            main_category_id: item.main_category_id,
            sub_category_id: item.sub_category_id,
            artist: item.artist,
            image_path: item.image_path,
            image_url: item.image_url,
          });
        });

        // 直接設置後端數據
        setItems(serverItems);
        setSyncStatus('synced');
        return serverItems;
      }
    } catch (err) {
      setError(err.message);
      setSyncStatus('error');
      console.error('同步購物車錯誤:', err);

      // 只有在用戶已登入的情況下才重定向到登入頁面
      if (
        isLoggedIn() &&
        (err.message.includes('登入已過期') ||
          err.message.includes('未找到登入憑證'))
      ) {
        window.location.href = '/auth/login';
      }
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, apiRequest]); // 宋做的修改：添加依賴項，確保 hook 正確更新

  // 新增商品到購物車（同步到後端）
  const addItemToServer = useCallback(
    async (product, quantity = 1) => {
      console.log('🛒 addItemToServer 開始:', {
        product: { id: product.id, name: product.name },
        quantity,
        timestamp: new Date().toLocaleTimeString(),
      });

      // 如果用戶未登入，提示登入
      if (!isLoggedIn()) {
        console.log('🛒 用戶未登入，跳轉到登入頁面');
        Swal.fire({
          icon: 'warning',
          title: '需要登入',
          text: '請先登入才能加入購物車',
        });
        window.location.href = '/auth/login';
        return;
      }

      console.log('🛒 設置 loading 狀態為 true');
      setLoading(true);
      setError(null);

      // 立即更新本地狀態（樂觀更新）- 在 API 請求之前
      console.log('🛒 開始樂觀更新本地狀態');
      addItemLocal(product, quantity);

      try {
        console.log('🛒 發送 API 請求到後端');
        // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
        const response = await apiRequest(
          'http://localhost:3005/api/carts/items',
          {
            method: 'POST',
            body: JSON.stringify({
              vinyl_id: product.id || product.vinyl_id,
              quantity: quantity,
            }),
          },
        );

        console.log('🛒 API 請求完成:', {
          status: response.status,
          ok: response.ok,
          timestamp: new Date().toLocaleTimeString(),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.log('🛒 API 請求失敗:', errorData);
          throw new Error(errorData.message || '新增商品失敗');
        }

        console.log('🛒 API 請求成功，商品已添加到後端');
        // 不需要重新同步，因為我們已經進行了樂觀更新
        // 後端數據已經是最新的

        return true;
      } catch (err) {
        // 如果 API 請求失敗，回滾樂觀更新
        console.log('🛒 API 請求失敗，開始回滾樂觀更新:', {
          error: err.message,
          timestamp: new Date().toLocaleTimeString(),
        });

        setItems((prev) => {
          const existingItem = prev.find(
            (item) =>
              item.vinyl_id === product.id ||
              item.id === product.id ||
              (item.vinyl_id && item.vinyl_id === product.vinyl_id),
          );
          if (existingItem) {
            // 如果商品已存在，減少數量
            const newItems = prev
              .map((item) =>
                item.vinyl_id === product.id ||
                item.id === product.id ||
                (item.vinyl_id && item.vinyl_id === product.vinyl_id)
                  ? { ...item, quantity: Math.max(0, item.quantity - quantity) }
                  : item,
              )
              .filter((item) => item.quantity > 0); // 移除數量為0的商品

            console.log('🛒 回滾後的購物車狀態:', {
              items: newItems.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
              })),
              totalCount: newItems.reduce(
                (total, item) => total + item.quantity,
                0,
              ),
            });

            return newItems;
          } else {
            // 如果商品不存在，直接移除
            const newItems = prev.filter(
              (item) =>
                !(
                  item.vinyl_id === product.id ||
                  item.id === product.id ||
                  (item.vinyl_id && item.vinyl_id === product.vinyl_id)
                ),
            );
            console.log('🛒 移除商品後的購物車狀態:', {
              items: newItems.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
              })),
              totalCount: newItems.reduce(
                (total, item) => total + item.quantity,
                0,
              ),
            });
            return newItems;
          }
        });

        setError(err.message);
        console.error('🛒 新增商品錯誤:', err);
        throw err;
      } finally {
        console.log('🛒 設置 loading 狀態為 false');
        setLoading(false);
      }
    },
    [addItemLocal, isLoggedIn, apiRequest], // 移除 syncCartFromServer 依賴項
  );

  // 修改：更新商品數量和勾選狀態（同步到後端）
  // 現在支援同時更新 quantity 和 is_checked，或單獨更新其中一個
  const updateQuantityOnServer = useCallback(
    async (itemId, quantity, isChecked) => {
      // 如果用戶未登入，不執行更新
      if (!isLoggedIn()) {
        console.log('用戶未登入，跳過購物車更新');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 新增：構建請求體，只包含有值的參數
        const requestBody = {};
        if (quantity !== undefined) {
          requestBody.quantity = quantity;
        }
        if (isChecked !== undefined) {
          requestBody.is_checked = isChecked;
        }

        // 確保至少有一個參數要更新
        if (Object.keys(requestBody).length === 0) {
          throw new Error('請提供要更新的參數');
        }

        // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
        const response = await apiRequest(
          `http://localhost:3005/api/carts/items/${itemId}`,
          {
            method: 'POST',
            body: JSON.stringify(requestBody),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '更新失敗');
        }

        // 先更新本地狀態（樂觀更新）
        updateQuantityLocal(itemId, quantity, isChecked);

        // 重新同步後端數據
        await syncCartFromServer();

        return true;
      } catch (err) {
        setError(err.message);
        console.error('更新數量錯誤:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateQuantityLocal, syncCartFromServer, isLoggedIn, apiRequest], // 宋做的修改：添加依賴項
  );

  // 新增：專門處理勾選狀態更新的函數
  // 這個函數專門用於更新商品的勾選狀態，與數量更新分離
  const updateItemChecked = useCallback(
    async (itemId, isChecked) => {
      // 如果用戶未登入，不執行更新
      if (!isLoggedIn()) {
        console.log('用戶未登入，跳過勾選狀態更新');
        return;
      }

      // 🚀 修改：使用專門的選中狀態更新 loading，避免觸發主要 loading
      setUpdatingSelection(true);
      setError(null);

      try {
        console.log(` 更新商品 ${itemId} 的勾選狀態為: ${isChecked}`);

        // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
        const response = await apiRequest(
          `http://localhost:3005/api/carts/items/${itemId}`,
          {
            method: 'POST',
            body: JSON.stringify({ is_checked: isChecked }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '更新勾選狀態失敗');
        }
        //  新增：直接更新本地狀態，避免不必要的 API 調用
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, is_checked: isChecked } : item,
          ),
        );

        console.log(`✅ 商品 ${itemId} 勾選狀態更新成功`);
        return true;
      } catch (err) {
        setError(err.message);
        console.error('更新勾選狀態錯誤:', err);
        throw err;
      } finally {
        // 🚀 修改：清除專門的選中狀態更新 loading
        setUpdatingSelection(false);
      }
    },
    [isLoggedIn, apiRequest],
  ); // 宋做的修改：添加依賴項

  // 刪除商品（同步到後端）
  const removeItemFromServer = useCallback(
    async (itemId) => {
      // 如果用戶未登入，不執行刪除
      if (!isLoggedIn()) {
        console.log('用戶未登入，跳過購物車刪除');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
        const response = await apiRequest(
          `http://localhost:3005/api/carts/items/${itemId}`,
          {
            method: 'DELETE',
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '刪除商品失敗');
        }

        // 先更新本地狀態（樂觀更新）
        removeItemLocal(itemId);

        return true;
      } catch (err) {
        setError(err.message);
        console.error('刪除商品錯誤:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [removeItemLocal, isLoggedIn, apiRequest], // 宋做的修改：添加依賴項
  );

  // 清空購物車（同步到後端）
  const clearCartOnServer = useCallback(async () => {
    // 如果用戶未登入，不執行清空
    if (!isLoggedIn()) {
      console.log('用戶未登入，跳過購物車清空');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 宋做的修改：使用 useAuth 提供的 apiRequest 方法
      const response = await apiRequest(
        'http://localhost:3005/api/carts/items',
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '清空購物車失敗');
      }

      // 先更新本地狀態（樂觀更新）
      clearCartLocal();

      return true;
    } catch (err) {
      setError(err.message);
      console.error('清空購物車錯誤:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearCartLocal, isLoggedIn, apiRequest]); // 宋做的修改：添加依賴項

  // 修改：切換商品勾選狀態（現在使用新的 updateItemChecked 函數）
  const toggleItemChecked = useCallback(
    async (itemId, isChecked) => {
      try {
        // 新增：使用專門的勾選狀態更新函數
        return await updateItemChecked(itemId, isChecked);
      } catch (err) {
        console.error('切換商品勾選狀態錯誤:', err);
        throw err;
      }
    },
    [updateItemChecked],
  );

  // 計算函數（取代 CartContext 的計算邏輯）
  const getCartTotal = useCallback(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    const count = items.reduce((total, item) => total + item.quantity, 0);
    console.log('🛒 getItemCount 計算:', {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
      })),
      totalCount: count,
      timestamp: new Date().toLocaleTimeString(),
    });
    return count;
  }, [items]);

  // 獲取選中商品的總價
  const getCheckedItemsTotal = useCallback(() => {
    return items
      .filter((item) => item.is_checked)
      .reduce((total, item) => total + item.price * item.quantity, 0);
  }, [items]);

  // 獲取選中商品的數量
  const getCheckedItemsCount = useCallback(() => {
    return items
      .filter((item) => item.is_checked)
      .reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  // 初始化時同步購物車  判斷token驗證是否有效或過期
  useEffect(() => {
    console.log('🔄 useCart useEffect 觸發:', {
      isInitialized,
      isAuth,
      shouldSync: isInitialized && isAuth,
      itemsCount: items.length,
    });

    if (isInitialized) {
      if (isAuth) {
        // 用戶已登入，同步購物車
        console.log('🚀 開始同步購物車...');
        syncCartFromServer();
      } else {
        // 用戶未登入或已登出，清空購物車
        console.log('🚪 用戶未登入，清空購物車');
        setItems([]);
        setError(null);
        setSyncStatus('idle');
      }
    }
  }, [syncCartFromServer, isInitialized, isAuth]);

  const value = {
    // 狀態
    loading,
    error,
    syncStatus,
    // 🚀 新增：專門的選中狀態更新 loading
    updatingSelection,

    // 購物車數據
    items,
    getCartTotal,
    getItemCount,

    // 選中商品相關
    getCheckedItemsTotal,
    getCheckedItemsCount,

    // 同步操作
    syncCartFromServer,

    // 購物車操作（同步到後端）
    addItem: addItemToServer,
    removeItem: removeItemFromServer,
    updateQuantity: updateQuantityOnServer,
    clearCart: clearCartOnServer,
    toggleItemChecked,
    updateItemChecked, // 新增：專門處理勾選狀態更新

    // 本地操作（僅用於內部邏輯）
    addItemLocal,
    removeItemLocal,
    updateQuantityLocal,
    clearCartLocal,

    // 清除錯誤
    clearError: () => setError(null),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// useCart hook
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
