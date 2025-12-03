'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from './_components/cart.module.css';

//hooks引用
import { useCart } from '@/hooks/use-cart';
import { useOrder } from '@/hooks/use-order';
import { useDiscountSync } from '@/hooks/use-discount-sync'; // 🚀 新增：統一的折扣同步系統

// 組件引用
import Checkbox from './_components/ui/Checkbox';
import CategoryTag from './_components/CategoryTag'; // 🚀 新增：分類標籤組件
import CouponSelectModal from './_components/CouponSelectModal'; // 🚀 新增：優惠券選擇 Modal
import ErrorModal from './_components/ErrorModal'; // 🚀 新增：錯誤訊息彈出框組件
import CheckoutProgress from '@/app/cart/_components/CheckoutProgress/CheckoutProgress';
import { DeleteIcon } from '@/components/icons/Icons'; // 🚀 新增：垃圾桶圖標組件
import {
  ListMotionContainer,
  ListMotionItem,
} from './_components/ui/ListMotion';

export default function CartPage() {
  const router = useRouter();

  // 🚀 修改：從 useCart Hook 獲取更多狀態
  const {
    items: cartItems,
    loading, // 新增：載入狀態
    error, // 新增：錯誤狀態
    syncStatus, // 新增：同步狀態
    updatingSelection, // 🚀 新增：選中狀態更新載入狀態
    updateQuantity,
    removeItem,
    clearCart,
    addItem,
    syncCartFromServer, // 新增：同步購物車函數
    updateItemChecked, // 🚀 新增：專門處理勾選狀態更新
    clearError, // 🚀 新增：清除錯誤訊息函數
  } = useCart();

  // 🚀 新增：從 useOrder Hook 獲取訂單相關函數
  const { createOrderSummary } = useOrder();

  // 🚀 優惠券相關功能已移至統一的折扣同步系統

  const [selectAll, setSelectAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  // 🚀 新增：管理移除動畫的狀態
  const [removingItems, setRemovingItems] = useState(new Set());
  // 🚀 新增：管理加入動畫的狀態
  const [addingItems, setAddingItems] = useState(new Set());
  // 🚀 新增：管理價格變化動畫的狀態
  const [priceChanging, setPriceChanging] = useState(false);

  // 🚀 新增：使用統一的折扣同步系統
  const {
    // 狀態
    selectedCoupon,
    couponCode,
    couponDiscount,
    pointsInput,
    pointsToUse,
    pointsDiscount,
    selectedItemsTotal: syncSelectedItemsTotal,
    availablePoints: syncAvailablePoints,
    availableCoupons: syncAvailableCoupons,
    couponsLoading: syncCouponsLoading,
    couponsError: syncCouponsError,

    // 方法
    handleCouponSelect,
    handleCouponCodeApply,
    handleApplyPoints,
    handlePointsChange, // 🚀 新增：使用統一的點數輸入處理
    handleQuickSetPoints,
    getMaxUsablePoints,
    syncDiscountState,
    getDiscountState,
    clearAllDiscounts,

    // 直接狀態更新方法
    setSelectedCoupon,
    setCouponCode,
    setCouponDiscount,
    setPointsInput,
    setPointsToUse,
    setPointsDiscount,
  } = useDiscountSync(
    cartItems.filter((item) => selectedItems.has(item.id)),
    true, // isInitialized
  );

  // 需求：進入購物車頁時，清空點數/優惠券設定，讓使用者重新設定
  useEffect(() => {
    try {
      clearAllDiscounts();
    } catch (e) {
      console.warn('清空折扣狀態時發生非致命錯誤:', e);
    }
    // 僅在初次載入執行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI 狀態
  const [isPointsInputFocused, setIsPointsInputFocused] = useState(false); // 點數輸入框聚焦狀態
  const [showCouponModal, setShowCouponModal] = useState(false); // 優惠券選擇 Modal 顯示狀態

  // 🚀 使用統一的折扣同步系統提供的選中商品總金額
  const selectedItemsTotal = syncSelectedItemsTotal;

  // 🚀 新增：初始化時獲取優惠券資料
  useEffect(() => {
    // 從 useCouponsCart hook 內部獲取用戶資訊，避免重複驗證
    // 優惠券資料會在用戶登入後自動獲取
    console.log('購物車頁面初始化，優惠券資料將由 useCouponsCart hook 管理');
  }, []); // 空依賴數組，只在組件掛載時執行

  // 🚀 修改：合併調試相關的 useEffect，減少 useEffect 數量
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // 組件渲染狀態
      console.log('=== CartPage 組件渲染 ===');
      console.log('cartItems:', cartItems);
      console.log('loading:', loading);
      console.log('error:', error);
      console.log('syncStatus:', syncStatus);

      // 手動觸發同步測試
      if (cartItems.length === 0 && syncStatus === 'idle') {
        console.log('🔄 購物車為空且未同步，手動觸發同步...');
        syncCartFromServer();
      }

      // Hook 狀態檢查
      console.log('=== CartPage Hook 狀態檢查 ===');
      console.log('createOrderSummary 函數類型:', typeof createOrderSummary);
      console.log(
        'createOrderSummary 是否為函數:',
        typeof createOrderSummary === 'function',
      );
    }
  }, [cartItems, loading, error, syncStatus, createOrderSummary]);

  // 🚀 移除：handlePointsChange 現在由 useDiscountSync 提供

  // 🚀 新增：處理優惠券 Modal 顯示
  const handleShowCouponModal = useCallback(() => {
    setShowCouponModal(true);
  }, []);

  const handleCloseCouponModal = useCallback(() => {
    setShowCouponModal(false);
  }, []);

  // 🚀 新增：處理從 Modal 選擇優惠券
  const handleModalCouponSelect = useCallback(
    (couponId) => {
      handleCouponSelect(couponId);
    },
    [handleCouponSelect],
  );

  // 計算剩餘點數 (只有套用後的點數才會被扣除)
  const remainingPoints = syncAvailablePoints - pointsToUse;

  // 🚀 新增：價格變化動畫觸發 - 快速動畫
  useEffect(() => {
    if (syncSelectedItemsTotal > 0) {
      setPriceChanging(true);
      const timer = setTimeout(() => {
        setPriceChanging(false);
      }, 500); // 500ms 配合快速動畫
      return () => clearTimeout(timer);
    }
  }, [syncSelectedItemsTotal, couponDiscount, pointsDiscount]);

  // 🚀 新增：ESC 鍵關閉錯誤彈出框
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && error) {
        clearError();
      }
    };

    if (error) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滾動
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 恢復背景滾動
      document.body.style.overflow = '';
    };
  }, [error, clearError]);

  // 🚀 新增：同步選中狀態與後端購物車數據
  // 當頁面刷新或購物車數據同步後，根據後端的 is_checked 狀態來初始化選中狀態
  useEffect(() => {
    if (cartItems.length > 0) {
      // 🚀 新增：檢查是否需要同步（避免重複執行）
      const checkedItems = cartItems.filter((item) => item.is_checked);
      const checkedItemIds = new Set(checkedItems.map((item) => item.id));

      // 檢查當前選中狀態是否與後端一致，避免不必要的更新
      const currentSelectedArray = Array.from(selectedItems);
      const backendSelectedArray = Array.from(checkedItemIds);

      // 只有當選中狀態不一致時才更新
      if (
        currentSelectedArray.length !== backendSelectedArray.length ||
        !currentSelectedArray.every((id) => backendSelectedArray.includes(id))
      ) {
        console.log('🔄 同步選中狀態與後端購物車數據');

        console.log(
          '📊 後端勾選狀態:',
          checkedItems.map((item) => ({
            id: item.id,
            name: item.name,
            is_checked: item.is_checked,
          })),
        );
        console.log('🔄 勾選的商品數量:', checkedItems.length);

        // 更新本地選中狀態
        setSelectedItems(checkedItemIds);

        // 更新全選狀態
        const newSelectAll =
          checkedItems.length === cartItems.length && cartItems.length > 0;
        setSelectAll(newSelectAll);

        console.log('✅ 選中狀態同步完成');
        console.log('📋 選中的商品ID:', Array.from(checkedItemIds));
        console.log('🔘 全選狀態:', newSelectAll);
      }
    } else {
      // 如果購物車為空，清空選中狀態
      if (selectedItems.size > 0 || selectAll) {
        setSelectedItems(new Set());
        setSelectAll(false);
      }
    }
  }, [cartItems, selectedItems, selectAll]); // 🚀 添加 selectedItems 和 selectAll 依賴，但通過條件檢查避免無限循環

  // 🚀 修改：原有的同步邏輯，現在專注於清理已刪除商品的選中狀態
  // 這個 useEffect 負責清理已刪除商品的選中狀態，避免選中不存在的商品
  useEffect(() => {
    if (cartItems.length === 0) {
      if (selectedItems.size > 0 || selectAll) {
        setSelectedItems(new Set());
        setSelectAll(false);
      }
    } else {
      // 移除不存在的商品ID
      const existingIds = new Set(cartItems.map((item) => item.id));
      const currentSelectedArray = [...selectedItems];
      const filteredSelectedArray = currentSelectedArray.filter((id) =>
        existingIds.has(id),
      );

      // 🚀 新增：只有當選中項目確實發生變化時才更新狀態
      if (filteredSelectedArray.length !== currentSelectedArray.length) {
        const filteredSelected = new Set(filteredSelectedArray);
        setSelectedItems(filteredSelected);

        // 🚀 新增：檢查全選狀態是否需要更新
        const newSelectAll =
          filteredSelected.size === cartItems.length && cartItems.length > 0;
        if (selectAll !== newSelectAll) {
          setSelectAll(newSelectAll);
        }
      }
    }
  }, [cartItems, selectedItems, selectAll]); // 🚀 添加依賴項，但通過條件檢查避免無限循環

  // 🚀 修改：處理全選/取消全選，現在會批量調用 API 更新勾選狀態
  const handleSelectAll = useCallback(
    async (checked) => {
      try {
        console.log(`🔄 處理全選狀態變更: ${checked}`);

        // 🚀 新增：先更新本地狀態（樂觀更新），提升用戶體驗
        setSelectAll(checked);
        if (checked) {
          setSelectedItems(new Set(cartItems.map((item) => item.id)));
        } else {
          // 取消全選：添加移除動畫，延遲後清空選中列表
          const currentSelectedIds = Array.from(selectedItems);
          setRemovingItems(new Set(currentSelectedIds));

          setTimeout(() => {
            setSelectedItems(new Set());
            setRemovingItems(new Set());
          }, 200); // 200ms 動畫延遲 - 配合快速動畫
        }

        // 🚀 新增：批量更新所有商品的勾選狀態
        console.log(`🔄 開始批量更新 ${cartItems.length} 個商品的勾選狀態`);
        const updatePromises = cartItems.map((item) =>
          updateItemChecked(item.id, checked),
        );

        await Promise.all(updatePromises);
        console.log(`✅ 批量更新勾選狀態成功`);
      } catch (error) {
        console.error('❌ 批量更新勾選狀態失敗:', error);

        // 🚀 新增：如果 API 調用失敗，回滾本地狀態
        setSelectAll(!checked);
        if (checked) {
          setSelectedItems(new Set());
        } else {
          setSelectedItems(new Set(cartItems.map((item) => item.id)));
        }

        // 🚀 新增：顯示用戶友好的錯誤提示
        Swal.fire({
          icon: 'error',
          title: '更新失敗',
          text: `批量更新勾選狀態失敗: ${error.message}`,
        });
      }
    },
    [cartItems, selectedItems, updateItemChecked],
  );

  // 🚀 修改：處理單個商品選擇，現在會調用 API 更新勾選狀態
  const handleItemSelect = useCallback(
    async (itemId, checked) => {
      try {
        console.log(`🔄 處理商品 ${itemId} 的勾選狀態變更: ${checked}`);

        if (checked) {
          // 勾選商品：先添加加入動畫，然後更新狀態
          setAddingItems((prev) => new Set(prev).add(itemId));

          // 立即更新狀態
          const newSelected = new Set(selectedItems);
          newSelected.add(itemId);
          setSelectedItems(newSelected);

          // 更新全選狀態
          const newSelectAll =
            newSelected.size === cartItems.length && cartItems.length > 0;
          if (selectAll !== newSelectAll) {
            setSelectAll(newSelectAll);
          }

          // 調用 API 更新勾選狀態
          await updateItemChecked(itemId, checked);
          console.log(`✅ 商品 ${itemId} 勾選狀態更新成功`);

          // 等待動畫完成後清除加入動畫狀態
          setTimeout(() => {
            setAddingItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(itemId);
              return newSet;
            });
          }, 1400); // 0.8s 動畫 + 0.6s 延遲 = 1.4s
        } else {
          // 取消勾選：先添加移除動畫，延遲後更新狀態
          setRemovingItems((prev) => new Set(prev).add(itemId));

          // 等待動畫完成後再更新狀態 - 配合更慢的動畫
          setTimeout(async () => {
            try {
              const newSelected = new Set(selectedItems);
              newSelected.delete(itemId);
              setSelectedItems(newSelected);

              // 更新全選狀態
              const newSelectAll =
                newSelected.size === cartItems.length && cartItems.length > 0;
              if (selectAll !== newSelectAll) {
                setSelectAll(newSelectAll);
              }

              // 調用 API 更新勾選狀態
              await updateItemChecked(itemId, checked);
              console.log(`✅ 商品 ${itemId} 取消勾選狀態更新成功`);

              // 清除移除動畫狀態
              setRemovingItems((prev) => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
              });
            } catch (error) {
              console.error('❌ 更新取消勾選狀態失敗:', error);

              // 如果 API 調用失敗，回滾本地狀態
              const newSelected = new Set(selectedItems);
              newSelected.add(itemId);
              setSelectedItems(newSelected);

              // 重新計算全選狀態
              const newSelectAll =
                newSelected.size === cartItems.length && cartItems.length > 0;
              if (selectAll !== newSelectAll) {
                setSelectAll(newSelectAll);
              }

              // 清除移除動畫狀態
              setRemovingItems((prev) => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
              });

              Swal.fire({
                icon: 'error',
                title: '更新失敗',
                text: `更新勾選狀態失敗: ${error.message}`,
              });
            }
          }, 200); // 200ms 動畫延遲 - 配合快速動畫
        }
      } catch (error) {
        console.error('❌ 更新勾選狀態失敗:', error);

        // 🚀 新增：如果 API 調用失敗，回滾本地狀態
        const newSelected = new Set(selectedItems);
        if (checked) {
          newSelected.delete(itemId);
        } else {
          newSelected.add(itemId);
        }
        setSelectedItems(newSelected);

        // 重新計算全選狀態
        const newSelectAll =
          newSelected.size === cartItems.length && cartItems.length > 0;
        if (selectAll !== newSelectAll) {
          setSelectAll(newSelectAll);
        }

        // 🚀 新增：顯示用戶友好的錯誤提示
        Swal.fire({
          icon: 'error',
          title: '更新失敗',
          text: `更新勾選狀態失敗: ${error.message}`,
        });
      }
    },
    [selectedItems, cartItems, selectAll, updateItemChecked, addingItems],
  );

  // 🚀 新增：使用 useCallback 優化其他購物車操作函數
  // 更新商品數量
  const handleUpdateQuantity = useCallback(
    async (id, newQuantity) => {
      try {
        await updateQuantity(id, newQuantity);
      } catch (error) {
        // 🚀 新增：錯誤已經通過 useCart 的 error 狀態顯示，這裡不需要額外處理
        console.error('更新商品數量失敗:', error);
      }
    },
    [updateQuantity],
  );

  // 移除商品
  const handleRemoveItem = useCallback(
    async (id) => {
      const item = cartItems.find((item) => item.id === id);

      // 添加確認對話框以防止意外刪除
      if (item && window.confirm(`確定要移除「${item.name}」嗎？`)) {
        try {
          await removeItem(id);

          // 從選中列表移除
          if (selectedItems.has(id)) {
            const newSelected = new Set(selectedItems);
            newSelected.delete(id);
            setSelectedItems(newSelected);

            // 更新全選狀態（減去將要移除的商品）
            const remainingCartItems = cartItems.filter(
              (item) => item.id !== id,
            );
            const newSelectAll =
              newSelected.size === remainingCartItems.length &&
              remainingCartItems.length > 0;
            if (selectAll !== newSelectAll) {
              setSelectAll(newSelectAll);
            }
          }
        } catch (error) {
          // 🚀 新增：錯誤已經通過 useCart 的 error 狀態顯示，這裡不需要額外處理
          console.error('移除商品失敗:', error);
        }
      }
    },
    [cartItems, selectedItems, selectAll, removeItem],
  );

  // 清空購物車
  const handleClearCart = useCallback(async () => {
    try {
      await clearCart();
      setSelectedItems(new Set());
      setSelectAll(false);
    } catch (error) {
      // 🚀 新增：錯誤已經通過 useCart 的 error 狀態顯示，這裡不需要額外處理
      console.error('清空購物車失敗:', error);
    }
  }, [clearCart]);

  // 🚀 修改：前往結帳，現在會先建立訂單摘要
  const handleCheckout = useCallback(
    async (selectedProducts = null) => {
      try {
        // 🚀 新增：檢查 createOrderSummary 函數是否可用
        if (typeof createOrderSummary !== 'function') {
          throw new Error(
            'createOrderSummary 函數未定義，請檢查 useOrder hook 是否正確導入',
          );
        }

        const itemsToCheckout =
          selectedProducts ||
          cartItems.filter((item) => selectedItems.has(item.id));

        if (itemsToCheckout.length === 0) {
          Swal.fire({
            icon: 'warning',
            title: '請選擇商品',
            text: '請選擇要結帳的商品',
          });
          return;
        }

        // 🚀 新增：顯示載入狀態
        console.log('🔄 正在建立訂單摘要...');
        console.log('📦 選中的商品數量:', itemsToCheckout.length);

        // 🚀 新增：調用 createOrderSummary 建立訂單摘要
        const orderSummary = await createOrderSummary();

        console.log('✅ 訂單摘要建立成功:', orderSummary);

        // 🚀 修改：準備要傳遞到結帳頁面的資料，現在包含訂單摘要
        const checkoutData = {
          // 原有的購物車資料
          selectedItems: itemsToCheckout.map((item) => item.id), // 選中的商品 ID 列表
          // 將使用者在購物車頁重新設定的折扣傳遞到結帳頁
          pointsToUse: pointsToUse,
          pointsDiscount: pointsDiscount,
          selectedCoupon: selectedCoupon,
          couponDiscount: couponDiscount,
          couponCode: couponCode,

          // 🚀 新增：從後端 API 獲得的訂單摘要資料
          orderSummary: {
            order_id: orderSummary.order_id, // 臨時訂單ID
            user_id: orderSummary.user_id, // 使用者ID
            items: orderSummary.items, // 商品明細（包含庫存檢查）
            total_amount: orderSummary.total_amount, // 訂單總金額
            created_at: orderSummary.created_at, // 建立時間
            status: orderSummary.status, // 訂單狀態
          },
        };

        // 🚀 新增：檢查是否有設定折扣，如果沒有則傳遞 resetDiscount 參數
        const hasDiscount =
          (pointsToUse && pointsToUse > 0) ||
          (couponDiscount && couponDiscount > 0) ||
          (selectedCoupon && selectedCoupon !== '');

        const resetDiscount = !hasDiscount ? '1' : '0';

        // 🚀 新增：驗證訂單摘要資料
        if (!orderSummary.items || orderSummary.items.length === 0) {
          throw new Error('訂單摘要建立失敗：沒有商品資料');
        }

        console.log('✅ 訂單摘要驗證通過，準備跳轉到結帳頁面');

        // 將資料編碼並傳遞到結帳頁面
        const queryParams = new URLSearchParams({
          data: JSON.stringify(checkoutData),
          resetDiscount: resetDiscount,
        });

        // 🚀 新增：跳轉到結帳頁面，現在包含完整的訂單摘要和折扣重置參數
        console.log(
          '🔗 準備跳轉到結帳頁面，折扣重置參數:',
          resetDiscount,
          '（有折扣:',
          hasDiscount,
          '）',
        );
        router.push(`/cart/checkout?${queryParams.toString()}`);
      } catch (error) {
        console.error('❌ 建立訂單摘要失敗:', error);

        // 🚀 新增：顯示用戶友好的錯誤訊息
        let errorMessage = '建立訂單摘要失敗';

        if (error.message.includes('登入驗證失效')) {
          errorMessage = '登入驗證失效，請重新登入';
        } else if (error.message.includes('沒有已勾選的商品')) {
          errorMessage = '購物車中沒有已勾選的商品，請先選擇要結帳的商品';
        } else if (error.message.includes('使用者不存在')) {
          errorMessage = '使用者帳號異常，請重新登入';
        } else if (error.message.includes('createOrderSummary 函數未定義')) {
          errorMessage = '系統錯誤：訂單功能未正確載入，請重新整理頁面';
        } else {
          errorMessage = error.message || '建立訂單摘要時發生錯誤，請稍後再試';
        }

        Swal.fire({
          icon: 'error',
          title: '建立訂單摘要失敗',
          text: errorMessage,
        });
      }
    },
    [
      createOrderSummary,
      cartItems,
      selectedItems,
      pointsToUse,
      pointsDiscount,
      selectedCoupon,
      couponDiscount,
      couponCode,
      router,
    ],
  );

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

  return (
    <div className={styles.cartPage}>
      <div className='container py-4'>
        {/* 結帳進度條 */}
        <CheckoutProgress currentStep={1} />

        {/* 主要內容區域 (根據 Figma FrameScreen 設計) */}
        <div className='row g-4'>
          {/* 左側：心願商品列表 (Figma FrameScreen 精確結構) */}
          <div className='col-lg-7 col-xl-8'>
            <div className={styles.cartScreen}>
              {/* 心願商品標題 (Figma FrameScreen 結構) */}
              <div className={styles.sectionTitle}>
                <h6 className={styles.sectionTitleText}>心願商品</h6>
              </div>

              {/* 分隔線 (Figma PropertyDefault) */}
              <div className={styles.property1Default}>
                <hr className={styles.sectionDivider} />
              </div>

              {/* 全選區域 */}
              {cartItems.length > 0 && (
                <div className={styles.selectAllSection}>
                  <Checkbox
                    checked={selectAll}
                    className='checkbox-8'
                    color='info'
                    indeterminate={false}
                    paddingClassName='checkbox-9'
                    size='large'
                    stateProp='enabled'
                    onChange={handleSelectAll}
                    disabled={loading}
                  />
                  <div className={styles.textWrapper14}>全選</div>
                </div>
              )}

              {cartItems.length === 0 ? (
                // 空狀態
                <div className={`${styles.emptyCartState} text-center py-5`}>
                  <div className='mb-4'>
                    <i className='bi bi-heart display-1 text-muted'></i>
                  </div>
                  <h3 className='text-muted mb-3'>心願商品是空的</h3>
                  <p className='text-muted mb-4'>
                    開始將喜愛的黑膠唱片加入心願商品吧！
                  </p>
                  <div className='d-flex gap-3 justify-content-center'>
                    <Link
                      href='/'
                      className={`btn ${styles.cartBtnGold} btn-lg`}
                    >
                      <i className='bi bi-shop me-2'></i>
                      開始購物
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* 商品列表 */}
                  <div className={styles.wishlistItems}>
                    {cartItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`${styles.wishlistItemCard} mb-3`}
                      >
                        <div className='d-flex align-items-center p-3'>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            className='me-3'
                            onChange={(checked) =>
                              handleItemSelect(item.id, checked)
                            }
                            disabled={loading}
                          />
                          {/* 🚀 商品信息區域 - 圖片、專輯名稱、歌手、單價、音樂類型標籤 */}
                          <div
                            className={`${styles.itemInfoSection} flex-grow-1`}
                          >
                            <div className={`${styles.itemImage} me-3`}>
                              <Image
                                src={renderProductImage(item)}
                                alt={item.name}
                                width={60}
                                height={60}
                                style={{ objectFit: 'cover' }}
                                unoptimized
                              />
                            </div>
                            <div className={`${styles.itemDetails}`}>
                              <h6 className={`${styles.itemName}`}>
                                {item.name}
                              </h6>
                              <p className={`${styles.itemArtist}`}>
                                {item.artist}
                              </p>
                              <div
                                className={`${styles.itemTagPriceContainer}`}
                              >
                                <CategoryTag
                                  mainCategoryId={item.main_category_id}
                                  subCategoryId={item.sub_category_id}
                                  size='small'
                                  showSubCategory={false}
                                />
                                <div className={`${styles.itemUnitPrice}`}>
                                  單價：NT${item.price.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* 🚀 操作區域 - 增減按鈕、總價、垃圾桶圖標 */}
                          <div className={`${styles.itemActionSection}`}>
                            <div className={`${styles.itemQuantity}`}>
                              <div className={`${styles.quantityControl}`}>
                                <button
                                  className={styles.quantityBtn}
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.id,
                                      Math.max(1, item.quantity - 1),
                                    )
                                  }
                                  disabled={item.quantity <= 1 || loading}
                                >
                                  -
                                </button>
                                <span className='fw-bold'>{item.quantity}</span>
                                <button
                                  className={styles.quantityBtn}
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.id,
                                      item.quantity + 1,
                                    )
                                  }
                                  disabled={loading}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className={`${styles.itemTotal} me-3`}>
                              <div className='fw-bold text-end'>
                                NT$
                                {(item.price * item.quantity).toLocaleString()}
                              </div>
                            </div>
                            <div className={styles.itemActions}>
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleRemoveItem(item.id)}
                                title={`移除 ${item.name}`}
                                disabled={loading}
                              >
                                <DeleteIcon
                                  width={20}
                                  height={20}
                                  fill='currentColor'
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 右側：已選商品總價  */}
          <div className='col-lg-5 col-xl-4'>
            <div
              className={`${styles.stickySidebar} ${
                styles.rightSideContainer
              } ${loading ? styles.loading : ''} ${
                updatingSelection ? styles.updating : ''
              }`}
            >
              <div
                className={`${styles.cartSummaryPanel} ${
                  loading ? styles.loading : ''
                } ${updatingSelection ? styles.updating : ''}`}
              >
                {/* 標題區域 */}
                <div className={styles.sectionTitle}>
                  <h6 className={styles.sectionTitleText}>已選商品總價</h6>
                </div>

                {/* 分隔線 */}
                <div className={styles.propertyDefaultInstance}>
                  <hr className={styles.sectionDivider} />
                </div>
                {/* 選中商品列表 引入套件ListMotionContainer*/}
                <ListMotionContainer
                  element='div'
                  className={`${styles.selectedItemsView}`}
                >
                  {/* 🚀 新增：空狀態提示 */}
                  {cartItems.filter((item) => selectedItems.has(item.id))
                    .length === 0 ? (
                    <div className={styles.emptyStateMessage}>
                      請於左側勾選加入商品
                    </div>
                  ) : (
                    cartItems
                      .filter((item) => selectedItems.has(item.id))
                      .map((item, index) => (
                        <ListMotionItem element='div' key={item.id} noShift>
                          <div
                            className={`${styles.selectedItemFrame} d-flex align-items-center`}
                          >
                            {/* 🚀 修改：使用新的圖片渲染函數 */}
                            <Image
                              src={renderProductImage(item)}
                              alt={item.name}
                              width={40}
                              height={40}
                              className='me-3'
                              style={{ objectFit: 'cover' }}
                              unoptimized
                            />
                            <div className='flex-grow-1'>
                              <div className={styles.itemNameSmall}>
                                {item.name}
                              </div>
                              <div className={styles.itemArtistSmall}>
                                {item.artist}
                              </div>
                              {/* 🚀 新增：分類標籤 */}
                              <div className='d-flex align-items-center gap-2'>
                                <CategoryTag
                                  mainCategoryId={item.main_category_id}
                                  subCategoryId={item.sub_category_id}
                                  size='x-small'
                                  showSubCategory={false}
                                />
                                <div
                                  className={`${styles.itemQuantitySmall} text-muted`}
                                >
                                  數量：{item.quantity}
                                </div>
                              </div>
                            </div>
                            <div className='d-flex align-items-center'>
                              <div
                                className={`${styles.itemPriceSmall} fw-bold me-2`}
                              >
                                NT$
                                {(item.price * item.quantity).toLocaleString()}
                              </div>
                              <button
                                className='btn btn-outline-danger btn-sm'
                                onClick={() => handleRemoveItem(item.id)}
                                title={`移除 ${item.name}`}
                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                // 🚀 新增：loading 狀態時禁用按鈕
                                disabled={loading || updatingSelection}
                              >
                                <i className='bi bi-x'></i>
                              </button>
                            </div>
                          </div>
                          {/* 商品間分隔線 */}
                          {index <
                            cartItems.filter((item) =>
                              selectedItems.has(item.id),
                            ).length -
                              1 && (
                            <div className={styles.propertyDefaultInstance}>
                              <hr
                                className={`${styles.sectionDivider} ${
                                  loading || updatingSelection
                                    ? styles.loading
                                    : ''
                                }`}
                              />
                            </div>
                          )}
                        </ListMotionItem>
                      ))
                  )}
                </ListMotionContainer>
                {/* 分隔線 */}
                <div className={styles.propertyDefaultInstance}>
                  <hr className={styles.sectionDivider} />
                </div>
                {/* 付款方式圖標 */}
                <div className={styles.paymentMethodsSection}>
                  <div
                    className={`${styles.paymentIconsContainer} d-flex align-items-center`}
                  >
                    <Image
                      src='/images/payment/mastercard.svg'
                      alt='Mastercard'
                      width={50}
                      height={50}
                      className={`${styles.paymentIconImg} me-2`}
                      unoptimized
                    />
                    <Image
                      src='/images/payment/visa.svg'
                      alt='Visa'
                      width={50}
                      height={50}
                      className={`${styles.paymentIconImg} me-2`}
                      unoptimized
                    />
                    <Image
                      src='/images/payment/jcb.svg'
                      alt='JCB'
                      width={50}
                      height={50}
                      className={`${styles.paymentIconImg} me-2`}
                      unoptimized
                    />
                    <Image
                      src='/images/payment/linepay.svg'
                      alt='LINE Pay'
                      width={50}
                      height={50}
                      className={`${styles.paymentIconImg} me-2`}
                      unoptimized
                    />
                    <Image
                      src='/images/payment/ecpay.svg'
                      alt='綠界科技'
                      width={50}
                      height={50}
                      className={`${styles.paymentIconImg} me-2`}
                      unoptimized
                    />
                  </div>
                  <div className={styles.paymentMethodsDescription}>
                    <div className={styles.paymentSupportText}>
                      支援以上付款方式
                    </div>
                  </div>
                </div>
                {/* 分隔線 */}
                <div className={styles.propertyDefaultInstance}>
                  <hr className={styles.sectionDivider} />
                </div>
                {/* 優惠券區域 */}
                <div className={styles.frameWrapper}>
                  <div className={styles.couponSection}>
                    <label className={styles.couponLabel}>優惠代碼</label>

                    {/* 優惠券代碼輸入 */}
                    <div className={styles.couponInputRow}>
                      <input
                        type='text'
                        className={styles.couponInput}
                        placeholder='請輸入優惠券代碼'
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={loading}
                      />
                      <button
                        className={styles.couponApplyButton}
                        onClick={handleCouponCodeApply}
                        disabled={loading}
                      >
                        套用
                      </button>
                    </div>

                    {/* 選擇優惠券連結 */}
                    <div className={styles.couponSelectLinkContainer}>
                      <button
                        className={styles.couponSelectLink}
                        onClick={handleShowCouponModal}
                        disabled={loading}
                      >
                        選擇優惠券
                      </button>
                    </div>

                    {/* 點數折扣 */}
                    <div className={styles.pointsSection}>
                      <label className={styles.pointsLabel}>點數折扣</label>

                      <div className={styles.pointsInputRow}>
                        <div className={styles.pointsInputWrapper}>
                          {pointsInput !== '' && (
                            <button
                              className={styles.pointsClearBtn}
                              onClick={() => {
                                setPointsInput('');
                                setPointsToUse(0);
                                setPointsDiscount(0);
                              }}
                              type='button'
                              disabled={loading}
                            >
                              ✕
                            </button>
                          )}
                          {/* 🚀 點數輸入框 - 用戶可以輸入任意點數，系統會驗證但不強制調整 */}
                          <input
                            type='number'
                            className={`${styles.pointsInput} ${
                              pointsInput !== '' ? styles.hasValue : ''
                            }`}
                            placeholder='輸入要使用的點數'
                            value={pointsInput}
                            onChange={(e) => handlePointsChange(e.target.value)}
                            onFocus={(e) => {
                              setIsPointsInputFocused(true);
                              // 🚀 聚焦時選中所有文本，方便用戶重新輸入
                              e.target.select();
                            }}
                            onBlur={() => setIsPointsInputFocused(false)}
                            max={syncAvailablePoints}
                            min={0}
                            title={`輸入要使用的點數（最多 ${syncAvailablePoints.toLocaleString()} 點）`}
                            disabled={loading}
                          />
                        </div>
                        {/* 🚀 點數折扣按鈕 - 套用用戶輸入的點數，不再強制調整 */}
                        <button
                          className={styles.pointsApplyButton}
                          onClick={handleApplyPoints}
                          disabled={
                            pointsInput === '' || pointsInput === '0' || loading
                          }
                          title={`套用 ${pointsInput || 0} 點數折扣`}
                        >
                          套用
                        </button>
                      </div>

                      {/* 🚀 快速設定按鈕 - 現在可以正常使用，不再被強制調整 */}
                      <div className={styles.pointsQuickSet}>
                        <span className={styles.quickSetLabel}>快速設定：</span>
                        {/* 🚀 1,000點快速設定 - 當最大可用點數 >= 1000 時啟用 */}
                        <button
                          className={styles.quickSetBtn}
                          onClick={() => handleQuickSetPoints(1000)}
                          disabled={getMaxUsablePoints() < 1000 || loading}
                          title={`快速設定 1,000 點折抵（需要最大可用點數 >= 1,000）`}
                        >
                          1,000點
                        </button>
                        {/* 🚀 5,000點快速設定 - 當最大可用點數 >= 5000 時啟用 */}
                        <button
                          className={styles.quickSetBtn}
                          onClick={() => handleQuickSetPoints(5000)}
                          disabled={getMaxUsablePoints() < 5000 || loading}
                          title={`快速設定 5,000 點折抵（需要最大可用點數 >= 5,000）`}
                        >
                          5,000點
                        </button>
                        {/* 🚀 全部使用 - 使用所有可用的點數 */}
                        <button
                          className={styles.quickSetBtn}
                          onClick={() =>
                            handleQuickSetPoints(getMaxUsablePoints())
                          }
                          disabled={getMaxUsablePoints() === 0 || loading}
                          title={`使用所有可用點數：${getMaxUsablePoints().toLocaleString()} 點折抵`}
                        >
                          全部使用
                        </button>
                      </div>

                      <div className={styles.pointsInfoContainer}>
                        <div className={styles.pointsInfo}>
                          紅利點數：剩餘
                          <span
                            className={`${styles.pointsNumber} ${
                              pointsToUse > 0 ? styles.pointsChanging : ''
                            }`}
                          >
                            {remainingPoints.toLocaleString()}
                          </span>
                          點
                          <span className={styles.pointsMaxInfo}>
                            （最多可用: {getMaxUsablePoints().toLocaleString()}{' '}
                            點）
                          </span>
                        </div>
                        {pointsToUse > 0 && (
                          <div className={styles.pointsDiscountPreview}>
                            已套用 {pointsToUse.toLocaleString()} 點數，折抵 NT${' '}
                            {pointsDiscount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* 分隔線 */}
                <div className={styles.propertyDefaultInstance}>
                  <hr className={styles.sectionDivider} />
                </div>
                {/* 價格明細框架 */}
                <div className={styles.cartPriceSummary}>
                  <div className={styles.priceRow}>
                    <div className={styles.priceLabel}>小計：</div>

                    <div className={styles.priceValue}>
                      NT$
                      {/* 🚀 修改：使用 useMemo 計算的 selectedItemsTotal，避免重複計算 */}
                      {selectedItemsTotal.toLocaleString()}
                    </div>
                  </div>

                  {couponDiscount > 0 && (
                    <div className={styles.priceRow}>
                      <div className={styles.discountWrapper}>
                        <div className={styles.priceLabel}>優惠券折抵：</div>
                      </div>

                      <div className={styles.discountWrapper}>
                        <div
                          className={`${styles.discountDescription} ${
                            priceChanging ? styles.changing : ''
                          }`}
                        >
                          {selectedCoupon === 'code-applied'
                            ? syncAvailableCoupons.find(
                                (c) => c.code === couponCode,
                              )?.name || '優惠代碼'
                            : syncAvailableCoupons.find(
                                (c) => c.id === parseInt(selectedCoupon, 10),
                              )?.name || '優惠券'}
                          {/* selectedCoupon 是字符串（來自 HTML select 的 value）
                            coupon.id 是數字（來自 couponData.js）所以需要使用
                            parseInt() 進行類型轉換 */}
                          <br />
                          (-NT${couponDiscount.toLocaleString()})
                        </div>
                      </div>
                    </div>
                  )}

                  {pointsDiscount > 0 && (
                    <div className={styles.priceRow}>
                      <div className={styles.priceLabel}>點數折抵：</div>
                      <div
                        className={`${styles.priceValue} ${
                          priceChanging ? styles.changing : ''
                        }`}
                      >
                        {pointsToUse.toLocaleString()}點(-NT$
                        {pointsDiscount.toLocaleString()})
                      </div>
                    </div>
                  )}

                  <div className={styles.priceRow}>
                    <div className={styles.totalLabel}>合計：</div>

                    <p className={`${styles.totalAmount} mb-0`}>
                      <span className={styles.currencySymbol}>NT</span>

                      <span
                        className={`${styles.totalPrice} ${
                          priceChanging ? styles.changing : ''
                        }`}
                      >
                        $
                        {/* 🚀 修改：使用 useMemo 計算的 selectedItemsTotal，避免重複計算 */}
                        {Math.max(
                          0,
                          Math.round(
                            selectedItemsTotal -
                              couponDiscount -
                              pointsDiscount,
                          ),
                        ).toLocaleString()}
                      </span>
                    </p>
                  </div>

                  <div className={styles.taxNotice}>
                    ※本訂單金額已含稅
                    <br />
                    ※運費將於結帳時計算，恕無法使用點數折抵
                  </div>
                </div>
                {/* 分隔線 */}
                <div className={styles.propertyDefaultInstance}>
                  <hr className={styles.sectionDivider} />
                </div>
                {/* 結帳按鈕 */}
                <div className={styles.buttonLoginWrapper}>
                  <button
                    className={`btn ${styles.checkoutBtn}`}
                    onClick={() => handleCheckout()}
                    disabled={selectedItems.size === 0 || loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className='spinner-border spinner-border-sm me-2'
                          role='status'
                          aria-hidden='true'
                        ></span>
                        處理中...
                      </>
                    ) : (
                      '立即付款'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 新增：錯誤訊息彈出框組件 */}
      <ErrorModal
        isOpen={!!error}
        onClose={clearError}
        title='很抱歉，庫存不足'
        message={error}
        type='error'
        showCloseButton={true}
        autoClose={false}
      />

      {/* 🚀 新增：優惠券選擇 Modal */}
      <CouponSelectModal
        isOpen={showCouponModal}
        onClose={handleCloseCouponModal}
        availableCoupons={syncAvailableCoupons}
        onSelectCoupon={handleModalCouponSelect}
        loading={loading}
      />
    </div>
  );
}
