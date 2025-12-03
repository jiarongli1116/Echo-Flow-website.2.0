'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import { useCouponsCart } from './use-coupons-cart';
import { usePointsCart } from './use-points-cart';

// 統一的折扣狀態存儲鍵名
const DISCOUNT_STORAGE_KEY = 'echoflow_discount_state';

/**
 * 統一的折扣同步 Hook
 * 用於在購物車和結帳頁面之間同步優惠券和點數折扣資訊
 * 支援跨頁面狀態同步和持久化存儲
 */
export function useDiscountSync(
  cartItems = [],
  isInitialized = false,
  shouldResetDiscount = false,
) {
  // 使用現有的 hooks
  const {
    availableCoupons,
    loading: couponsLoading,
    error: couponsError,
    validateCoupon,
    calculateCouponDiscount,
    findCouponById,
    findCouponByCode,
  } = useCouponsCart();

  const {
    availablePoints,
    calculateMaxUsablePoints,
    validatePointsUsage,
    calculatePointsDiscount,
    refreshPointsBalance, // 🚀 新增：用於同步點數餘額
  } = usePointsCart();

  // 🚀 修復：安全的客戶端狀態初始化，避免 Hydration Mismatch
  const [isClient, setIsClient] = useState(false);

  // 折扣狀態 - 使用安全的初始值，避免 SSR 不一致
  const [selectedCoupon, setSelectedCoupon] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [pointsInput, setPointsInput] = useState('');
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);

  // 使用 useRef 來追蹤最新的 couponDiscount 值，避免循環依賴
  const couponDiscountRef = useRef(0);

  // 🚀 修復：客戶端初始化後從 localStorage 載入狀態，並確保狀態一致性
  useEffect(() => {
    setIsClient(true);

    // 🚀 新增：如果應該重置折扣，先清除 localStorage 中的狀態
    if (shouldResetDiscount) {
      console.log('🧹 應該重置折扣，清除 localStorage 中的折扣狀態');
      try {
        localStorage.removeItem(DISCOUNT_STORAGE_KEY);
        console.log('✅ localStorage 中的折扣狀態已清除');
      } catch (error) {
        console.warn('⚠️ 清除 localStorage 折扣狀態失敗:', error);
      }
      return; // 不載入 localStorage 狀態
    }

    // 只在客戶端載入 localStorage 狀態
    try {
      const stored = localStorage.getItem(DISCOUNT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🔄 從 localStorage 載入折扣狀態:', parsed);

        // 更新狀態
        if (parsed.selectedCoupon !== undefined) {
          setSelectedCoupon(parsed.selectedCoupon);
        }
        if (parsed.couponCode !== undefined) {
          setCouponCode(parsed.couponCode);
        }
        if (parsed.couponDiscount !== undefined) {
          setCouponDiscount(parsed.couponDiscount);
          couponDiscountRef.current = parsed.couponDiscount;
        }
        if (parsed.pointsInput !== undefined) {
          setPointsInput(parsed.pointsInput);
        }
        if (parsed.pointsToUse !== undefined) {
          setPointsToUse(parsed.pointsToUse);
        }
        if (parsed.pointsDiscount !== undefined) {
          setPointsDiscount(parsed.pointsDiscount);
        }

        // 🚀 修復：確保點數狀態一致性
        // 如果 pointsInput 有值但 pointsToUse 或 pointsDiscount 為 0，重新計算
        if (
          parsed.pointsInput &&
          parsed.pointsInput !== '' &&
          parsed.pointsInput !== '0'
        ) {
          const points = parseInt(parsed.pointsInput, 10);
          if (!isNaN(points) && points > 0) {
            // 如果 pointsToUse 或 pointsDiscount 為 0，重新計算
            if (!parsed.pointsToUse || !parsed.pointsDiscount) {
              console.log('🔄 重新計算點數狀態，確保一致性');
              const discount = calculatePointsDiscount(points);
              setPointsToUse(points);
              setPointsDiscount(discount);

              // 更新 localStorage 中的狀態
              const updatedState = {
                ...parsed,
                pointsToUse: points,
                pointsDiscount: discount,
              };
              localStorage.setItem(
                DISCOUNT_STORAGE_KEY,
                JSON.stringify(updatedState),
              );
              console.log('✅ 點數狀態已重新計算並保存:', updatedState);
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ 載入折扣狀態失敗:', error);
    }
  }, [calculatePointsDiscount, shouldResetDiscount]);

  // 🚀 修復：只在客戶端保存狀態到 localStorage
  const saveStateToStorage = useCallback(
    (state) => {
      if (!isClient || typeof window === 'undefined') return;

      try {
        const stateToSave = {
          selectedCoupon: state.selectedCoupon || '',
          couponCode: state.couponCode || '',
          couponDiscount: state.couponDiscount || 0,
          pointsInput: state.pointsInput || '',
          pointsToUse: state.pointsToUse || 0,
          pointsDiscount: state.pointsDiscount || 0,
          lastUpdated: Date.now(),
        };

        localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(stateToSave));
        console.log('💾 折扣狀態已保存到 localStorage:', stateToSave);
      } catch (error) {
        console.warn('⚠️ 保存折扣狀態失敗:', error);
      }
    },
    [isClient],
  );

  // 🚀 新增：監聽 pointsInput 變化，確保與 pointsToUse 和 pointsDiscount 的一致性
  useEffect(() => {
    if (!isClient) return;

    // 如果 pointsInput 有值但 pointsToUse 為 0，說明可能是從 localStorage 恢復的狀態
    if (
      pointsInput &&
      pointsInput !== '' &&
      pointsInput !== '0' &&
      pointsToUse === 0
    ) {
      const points = parseInt(pointsInput, 10);
      if (!isNaN(points) && points > 0) {
        console.log(
          '🔄 檢測到 pointsInput 有值但 pointsToUse 為 0，重新計算狀態',
        );
        const discount = calculatePointsDiscount(points);
        setPointsToUse(points);
        setPointsDiscount(discount);

        // 保存到 localStorage
        saveStateToStorage({
          selectedCoupon,
          couponCode,
          couponDiscount,
          pointsInput,
          pointsToUse: points,
          pointsDiscount: discount,
        });
      }
    }
    // 如果 pointsInput 為空但 pointsToUse 不為 0，清除點數狀態
    else if (
      (!pointsInput || pointsInput === '' || pointsInput === '0') &&
      pointsToUse > 0
    ) {
      console.log(
        '🔄 檢測到 pointsInput 為空但 pointsToUse 不為 0，清除點數狀態',
      );
      setPointsToUse(0);
      setPointsDiscount(0);

      // 保存到 localStorage
      saveStateToStorage({
        selectedCoupon,
        couponCode,
        couponDiscount,
        pointsInput: '',
        pointsToUse: 0,
        pointsDiscount: 0,
      });
    }
  }, [
    pointsInput,
    // 移除 pointsToUse 從依賴數組中，避免循環
    isClient,
    calculatePointsDiscount,
    selectedCoupon,
    couponCode,
    couponDiscount,
    saveStateToStorage,
  ]);

  // 🚀 新增：監聽 availablePoints 變化，確保點數使用不超過可用餘額
  useEffect(() => {
    if (!isClient || availablePoints === 0) return;

    // 如果當前要使用的點數超過可用餘額，自動調整
    if (pointsToUse > availablePoints) {
      console.log(
        `🔄 檢測到點數使用超過可用餘額 (${pointsToUse} > ${availablePoints})，自動調整`,
      );
      const adjustedPoints = Math.min(pointsToUse, availablePoints);
      const adjustedDiscount = calculatePointsDiscount(adjustedPoints);

      setPointsToUse(adjustedPoints);
      setPointsDiscount(adjustedDiscount);
      setPointsInput(adjustedPoints.toString());

      // 保存調整後的狀態
      saveStateToStorage({
        selectedCoupon,
        couponCode,
        couponDiscount,
        pointsInput: adjustedPoints.toString(),
        pointsToUse: adjustedPoints,
        pointsDiscount: adjustedDiscount,
      });
    }
  }, [
    availablePoints,
    pointsToUse,
    isClient,
    calculatePointsDiscount,
    selectedCoupon,
    couponCode,
    couponDiscount,
    saveStateToStorage,
  ]);

  // 🚀 修復：跨頁面同步事件監聽，只在客戶端執行
  useEffect(() => {
    if (!isClient || typeof window === 'undefined') return;

    const handleStorageChange = (e) => {
      if (e.key === DISCOUNT_STORAGE_KEY && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          console.log('🔄 檢測到跨頁面狀態變化:', newState);

          // 更新本地狀態
          setSelectedCoupon(newState.selectedCoupon || '');
          setCouponCode(newState.couponCode || '');
          setCouponDiscount(newState.couponDiscount || 0);
          couponDiscountRef.current = newState.couponDiscount || 0;
          setPointsInput(newState.pointsInput || '');
          setPointsToUse(newState.pointsToUse || 0);
          setPointsDiscount(newState.pointsDiscount || 0);
        } catch (error) {
          console.warn('⚠️ 解析跨頁面狀態失敗:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isClient]);

  // 計算選中商品的總金額
  const selectedItemsTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = item.price || item.unit_price || 0;
      const quantity = item.quantity || item.qty || 0;
      return sum + price * quantity;
    }, 0);
  }, [cartItems]);

  // 構建購物車資料格式（用於優惠券驗證）
  const buildCartData = useCallback(() => {
    return {
      items: cartItems.map((item) => ({
        id: item.id || item.vinyl_id,
        categoryId: item.category_id || item.main_category_id,
        price: item.price || item.unit_price || 0,
        quantity: item.quantity || item.qty || 0,
        subtotal:
          (item.price || item.unit_price || 0) *
          (item.quantity || item.qty || 0),
      })),
      totalAmount: selectedItemsTotal,
      itemCount: cartItems.length,
    };
  }, [cartItems, selectedItemsTotal]);

  // 使用穩定簽章避免因為函式/參考變動導致的無限重算
  const cartSignature = useMemo(() => {
    try {
      return JSON.stringify(
        cartItems.map((item) => ({
          id: item.id || item.vinyl_id,
          categoryId: item.category_id || item.main_category_id,
          price: item.price || item.unit_price || 0,
          quantity: item.quantity || item.qty || 0,
        })),
      );
    } catch (e) {
      // 回退：確保永不拋錯
      return String(selectedItemsTotal) + ':' + (cartItems?.length || 0);
    }
  }, [cartItems, selectedItemsTotal]);

  // 構建用戶資料格式（用於優惠券驗證）
  const buildUserData = useCallback(() => {
    return {
      memberLevel: 'mc', // 預設為一般會員，實際應該從用戶資料獲取
      isLoggedIn: true, // 預設為已登入，實際應該從認證狀態獲取
    };
  }, []);

  // 統一的優惠券選擇處理
  const handleCouponSelect = useCallback(
    (couponId) => {
      console.log('🔍 統一的優惠券選擇處理');
      console.log('📝 選擇的優惠券ID:', couponId);
      console.log('💰 選中商品總金額:', selectedItemsTotal);

      // 清除代碼輸入狀態
      if (couponId !== '') {
        setCouponCode('');
      }

      setSelectedCoupon(couponId);

      if (couponId === '') {
        setCouponDiscount(0);
        couponDiscountRef.current = 0;
        // 🚀 保存狀態到 localStorage
        saveStateToStorage({
          selectedCoupon: '',
          couponCode: '',
          couponDiscount: 0,
          pointsInput,
          pointsToUse,
          pointsDiscount,
        });
        return;
      }

      // 查找優惠券
      const couponIdNum = parseInt(couponId, 10);
      const coupon = findCouponById(couponIdNum);
      if (!coupon) {
        console.warn('未找到優惠券:', couponId);
        return;
      }

      // 構建驗證資料
      const cartData = buildCartData();
      const userData = buildUserData();

      // 驗證優惠券
      const validation = validateCoupon(coupon, cartData, userData);
      if (!validation.valid) {
        Swal.fire({
          icon: 'warning',
          title: '優惠券驗證失敗',
          text: validation.message,
        });
        setSelectedCoupon('');
        setCouponDiscount(0);
        couponDiscountRef.current = 0;
        // 🚀 保存狀態到 localStorage
        saveStateToStorage({
          selectedCoupon: '',
          couponCode: '',
          couponDiscount: 0,
          pointsInput,
          pointsToUse,
          pointsDiscount,
        });
        return;
      }

      // 計算折扣
      const discountResult = calculateCouponDiscount(coupon, cartData);
      const discount = discountResult.discountAmount || discountResult;

      setCouponDiscount(discount);
      couponDiscountRef.current = discount;
      console.log('✅ 優惠券套用成功，折扣金額:', discount);

      // 🚀 保存狀態到 localStorage
      saveStateToStorage({
        selectedCoupon: couponId,
        couponCode: '',
        couponDiscount: discount,
        pointsInput,
        pointsToUse,
        pointsDiscount,
      });
    },
    [
      selectedItemsTotal,
      findCouponById,
      validateCoupon,
      calculateCouponDiscount,
      buildCartData,
      buildUserData,
      pointsInput,
      pointsToUse,
      pointsDiscount,
      saveStateToStorage,
    ],
  );

  // 統一的優惠券代碼處理
  const handleCouponCodeApply = useCallback(() => {
    console.log('🔍 統一的優惠券代碼處理');
    console.log('📝 輸入的優惠券代碼:', couponCode);

    if (couponCode.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: '請輸入優惠券代碼',
        text: '優惠券代碼不能為空',
      });
      return;
    }

    const couponCodeTrimmed = couponCode.trim();
    const coupon = findCouponByCode(couponCodeTrimmed);

    if (!coupon) {
      const availableCodes = availableCoupons
        .map((c) => c.code || c.coupon_code)
        .join(', ');
      Swal.fire({
        icon: 'error',
        title: '無效的優惠券代碼',
        text: `無效的優惠券代碼！\n\n可用的優惠券代碼：\n${availableCodes}\n\n請輸入正確的優惠券代碼`,
      });
      return;
    }

    // 構建驗證資料
    const cartData = buildCartData();
    const userData = buildUserData();

    // 驗證優惠券
    const validation = validateCoupon(coupon, cartData, userData);
    if (!validation.valid) {
      Swal.fire({
        icon: 'warning',
        title: '優惠券驗證失敗',
        text: validation.message,
      });
      return;
    }

    // 計算折扣
    const discountResult = calculateCouponDiscount(coupon, cartData);
    const discount = discountResult.discountAmount || discountResult;

    setCouponDiscount(discount);
    couponDiscountRef.current = discount;
    setSelectedCoupon('code-applied');

    // 🚀 保存狀態到 localStorage
    saveStateToStorage({
      selectedCoupon: 'code-applied',
      couponCode,
      couponDiscount: discount,
      pointsInput,
      pointsToUse,
      pointsDiscount,
    });

    Swal.fire({
      icon: 'success',
      title: '優惠券已套用',
      text: `優惠券已套用：${
        coupon.name
      }，折抵 NT$ ${discount.toLocaleString()}`,
    });
  }, [
    couponCode,
    availableCoupons,
    findCouponByCode,
    validateCoupon,
    calculateCouponDiscount,
    buildCartData,
    buildUserData,
    pointsInput,
    pointsToUse,
    pointsDiscount,
    saveStateToStorage,
  ]);

  // 🚀 新增：統一的點數驗證方法
  const validatePointsWithSync = useCallback(
    (points) => {
      const validation = validatePointsUsage(
        points,
        selectedItemsTotal,
        couponDiscount,
      );

      // 如果驗證失敗，自動調整點數使用
      if (!validation.isValid && points > 0) {
        console.log('⚠️ 點數驗證失敗，自動調整:', validation.errors);
        const adjustedPoints = Math.min(points, validation.maxUsablePoints);
        return {
          ...validation,
          adjustedPoints,
          shouldAdjust: adjustedPoints !== points,
        };
      }

      return validation;
    },
    [validatePointsUsage, selectedItemsTotal, couponDiscount],
  );

  // 統一的點數套用處理
  const handleApplyPoints = useCallback(() => {
    console.log('🔍 統一的點數套用處理');
    console.log('📝 輸入的點數:', pointsInput);

    // 檢查輸入
    if (
      pointsInput === '' ||
      pointsInput === null ||
      pointsInput === undefined
    ) {
      setPointsToUse(0);
      setPointsDiscount(0);
      return;
    }

    const points = parseInt(pointsInput, 10);

    if (isNaN(points) || points < 0) {
      setPointsToUse(0);
      setPointsDiscount(0);
      Swal.fire({
        icon: 'warning',
        title: '請輸入有效的點數',
        text: '點數必須為正整數',
      });
      return;
    }

    if (selectedItemsTotal === 0) {
      Swal.fire({
        icon: 'warning',
        title: '請先選擇商品',
        text: '請先選擇要結帳的商品',
      });
      return;
    }

    // 🚀 使用統一的點數驗證方法
    const validation = validatePointsWithSync(points);

    if (!validation.isValid) {
      if (validation.shouldAdjust) {
        // 自動調整點數使用
        console.log(
          `🔄 自動調整點數使用: ${points} -> ${validation.adjustedPoints}`,
        );
        const adjustedPoints = validation.adjustedPoints;
        setPointsToUse(adjustedPoints);
        setPointsDiscount(calculatePointsDiscount(adjustedPoints));
        setPointsInput(adjustedPoints.toString());

        // 保存調整後的狀態
        saveStateToStorage({
          selectedCoupon,
          couponCode,
          couponDiscount,
          pointsInput: adjustedPoints.toString(),
          pointsToUse: adjustedPoints,
          pointsDiscount: calculatePointsDiscount(adjustedPoints),
        });

        Swal.fire({
          icon: 'info',
          title: '點數已自動調整',
          text: `點數已自動調整為 ${adjustedPoints} 點\n原因: ${validation.errors.join(
            ', ',
          )}`,
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: '點數使用失敗',
          text: validation.errors.join('\n'),
        });
        return;
      }
    } else {
      // 套用點數
      const discount = calculatePointsDiscount(points);
      setPointsToUse(points);
      setPointsDiscount(discount);

      // 🚀 保存狀態到 localStorage
      saveStateToStorage({
        selectedCoupon,
        couponCode,
        couponDiscount,
        pointsInput,
        pointsToUse: points,
        pointsDiscount: discount,
      });

      Swal.fire({
        icon: 'success',
        title: '點數套用成功',
        text: `成功套用 ${points.toLocaleString()} 點數，折抵 NT$ ${discount.toLocaleString()}`,
      });
    }
  }, [
    pointsInput,
    selectedItemsTotal,
    couponDiscount,
    validatePointsWithSync,
    calculatePointsDiscount,
    selectedCoupon,
    couponCode,
    saveStateToStorage,
  ]);

  // 🚀 新增：處理點數輸入變化 (只更新輸入框，不套用折扣)
  const handlePointsChange = useCallback(
    (value) => {
      setPointsInput(value);
      // 保存到 localStorage
      saveStateToStorage({
        selectedCoupon,
        couponCode,
        couponDiscount,
        pointsInput: value,
        pointsToUse,
        pointsDiscount,
      });
    },
    [
      selectedCoupon,
      couponCode,
      couponDiscount,
      pointsToUse,
      pointsDiscount,
      saveStateToStorage,
    ],
  );

  // 快速設定點數
  const handleQuickSetPoints = useCallback(
    (amount) => {
      setPointsInput(amount.toString());
      // 🚀 保存狀態到 localStorage
      saveStateToStorage({
        selectedCoupon,
        couponCode,
        couponDiscount,
        pointsInput: amount.toString(),
        pointsToUse,
        pointsDiscount,
      });
    },
    [
      selectedCoupon,
      couponCode,
      couponDiscount,
      pointsToUse,
      pointsDiscount,
      saveStateToStorage,
    ],
  );

  // 計算最大可用點數
  const getMaxUsablePoints = useCallback(() => {
    return calculateMaxUsablePoints(selectedItemsTotal, couponDiscount);
  }, [selectedItemsTotal, couponDiscount, calculateMaxUsablePoints]);

  // 當商品變化時重新計算折扣
  useEffect(() => {
    if (!isInitialized) return;
    if (!selectedCoupon) return;
    if (!availableCoupons || availableCoupons.length === 0) return;

    // 重新計算優惠券折扣
    if (selectedCoupon) {
      let coupon = null;

      if (selectedCoupon === 'code-applied') {
        coupon = availableCoupons.find((c) => c.code === couponCode);
      } else {
        const couponId = parseInt(selectedCoupon, 10);
        coupon = availableCoupons.find((c) => c.id === couponId);
      }

      if (coupon) {
        const cartData = buildCartData();
        const userData = buildUserData();

        const validation = validateCoupon(coupon, cartData, userData);
        if (validation.valid) {
          const discountResult = calculateCouponDiscount(coupon, cartData);
          const discount = discountResult.discountAmount || discountResult;
          // 避免重複設定相同值導致的重渲染/循環
          if (couponDiscountRef.current !== discount) {
            setCouponDiscount(discount);
            couponDiscountRef.current = discount;
          }
        } else {
          if (couponDiscountRef.current !== 0) {
            setCouponDiscount(0);
            couponDiscountRef.current = 0;
          }
        }
      }
    }
  }, [
    isInitialized,
    selectedCoupon,
    couponCode,
    availableCoupons,
    cartSignature,
    validateCoupon,
    calculateCouponDiscount,
  ]);

  // 分離點數折扣計算，避免循環依賴
  useEffect(() => {
    if (!isInitialized) return;

    // 使用 useRef 來獲取最新的 couponDiscount 值，避免依賴陣列中的循環
    const currentCouponDiscount = couponDiscountRef.current;
    const remainingAmountAfterCoupon =
      selectedItemsTotal - currentCouponDiscount;

    // 如果剩餘金額小於等於0，重置點數使用
    if (remainingAmountAfterCoupon <= 0) {
      if (pointsToUse > 0) {
        setPointsToUse(0);
        setPointsDiscount(0);
      }
      return;
    }

    // 計算最大可用點數
    const maxPointsForRemainingAmount = calculateMaxUsablePoints(
      selectedItemsTotal,
      currentCouponDiscount,
    );

    // 只有在點數使用超過最大值時才調整
    if (pointsToUse > maxPointsForRemainingAmount) {
      const adjustedPoints = Math.min(pointsToUse, maxPointsForRemainingAmount);
      setPointsToUse(adjustedPoints);
      setPointsDiscount(calculatePointsDiscount(adjustedPoints));
    }
  }, [
    isInitialized,
    selectedItemsTotal,
    calculateMaxUsablePoints,
    calculatePointsDiscount,
    // 移除 pointsToUse 從依賴數組中，避免循環
  ]);

  // 從外部同步折扣狀態（用於從購物車傳遞到結帳頁面）
  const syncDiscountState = useCallback(
    (discountData) => {
      if (discountData) {
        const newState = {
          selectedCoupon:
            discountData.selectedCoupon !== undefined
              ? discountData.selectedCoupon
              : selectedCoupon,
          couponCode:
            discountData.couponCode !== undefined
              ? discountData.couponCode
              : couponCode,
          couponDiscount:
            discountData.couponDiscount !== undefined
              ? discountData.couponDiscount
              : couponDiscount,
          pointsInput:
            discountData.pointsInput !== undefined
              ? discountData.pointsInput
              : pointsInput,
          pointsToUse:
            discountData.pointsToUse !== undefined
              ? discountData.pointsToUse
              : pointsToUse,
          pointsDiscount:
            discountData.pointsDiscount !== undefined
              ? discountData.pointsDiscount
              : pointsDiscount,
        };

        // 更新本地狀態
        if (discountData.selectedCoupon !== undefined) {
          setSelectedCoupon(discountData.selectedCoupon);
        }
        if (discountData.couponCode !== undefined) {
          setCouponCode(discountData.couponCode);
        }
        if (discountData.couponDiscount !== undefined) {
          setCouponDiscount(discountData.couponDiscount);
          couponDiscountRef.current = discountData.couponDiscount;
        }
        if (discountData.pointsInput !== undefined) {
          setPointsInput(discountData.pointsInput);
        }
        if (discountData.pointsToUse !== undefined) {
          setPointsToUse(discountData.pointsToUse);
        }
        if (discountData.pointsDiscount !== undefined) {
          setPointsDiscount(discountData.pointsDiscount);
        }

        // 🚀 保存到 localStorage
        saveStateToStorage(newState);
      }
    },
    [
      selectedCoupon,
      couponCode,
      couponDiscount,
      pointsInput,
      pointsToUse,
      pointsDiscount,
      saveStateToStorage,
    ],
  );

  // 獲取當前折扣狀態（用於傳遞到結帳頁面）
  const getDiscountState = useCallback(() => {
    return {
      selectedCoupon,
      couponCode,
      couponDiscount,
      pointsInput,
      pointsToUse,
      pointsDiscount,
    };
  }, [
    selectedCoupon,
    couponCode,
    couponDiscount,
    pointsInput,
    pointsToUse,
    pointsDiscount,
  ]);

  // 清除所有折扣
  const clearAllDiscounts = useCallback(() => {
    setSelectedCoupon('');
    setCouponCode('');
    setCouponDiscount(0);
    couponDiscountRef.current = 0;
    setPointsInput('');
    setPointsToUse(0);
    setPointsDiscount(0);

    // 🚀 修復：只在客戶端清除 localStorage 中的狀態
    if (isClient && typeof window !== 'undefined') {
      localStorage.removeItem(DISCOUNT_STORAGE_KEY);
      console.log('🗑️ 已清除所有折扣狀態');
    }
  }, [isClient]);

  // 🚀 修復：強制同步狀態到 localStorage（用於手動觸發同步）
  const forceSyncToStorage = useCallback(() => {
    if (!isClient) return;

    const currentState = {
      selectedCoupon,
      couponCode,
      couponDiscount,
      pointsInput,
      pointsToUse,
      pointsDiscount,
    };
    saveStateToStorage(currentState);
    console.log('🔄 強制同步狀態到 localStorage:', currentState);
  }, [
    isClient,
    selectedCoupon,
    couponCode,
    couponDiscount,
    pointsInput,
    pointsToUse,
    pointsDiscount,
    saveStateToStorage,
  ]);

  return {
    // 狀態
    selectedCoupon,
    couponCode,
    couponDiscount,
    pointsInput,
    pointsToUse,
    pointsDiscount,
    selectedItemsTotal,
    availablePoints,
    availableCoupons,
    couponsLoading,
    couponsError,
    isClient, // 🚀 新增：客戶端狀態標識

    // 方法
    handleCouponSelect,
    handleCouponCodeApply,
    handleApplyPoints,
    handlePointsChange, // 🚀 新增：點數輸入變化處理
    handleQuickSetPoints,
    getMaxUsablePoints,
    syncDiscountState,
    getDiscountState,
    clearAllDiscounts,
    forceSyncToStorage, // 🚀 新增：強制同步方法
    validatePointsWithSync, // 🚀 新增：統一的點數驗證方法
    refreshPointsBalance, // 🚀 新增：同步點數餘額

    // 直接狀態更新方法（用於外部控制）
    setSelectedCoupon,
    setCouponCode,
    setCouponDiscount,
    setPointsInput,
    setPointsToUse,
    setPointsDiscount,
  };
}
