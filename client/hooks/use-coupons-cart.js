'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth'; // 引入 useAuth 以使用統一的 JWT 管理
import {
  CouponValidator,
  CouponCalculator,
  CouponManager,
} from './use-coupon-calculator'; // 引入優惠券計算系統

// 🚀 API 基礎 URL 常數
const API_BASE_URL = 'http://localhost:3005';

// 🚀 直接提供 hook，不需要 Context Provider
export function useCouponsCart() {
  // 使用 useAuth 提供的 JWT 方法，避免重複實現
  const { getToken, isLoggedIn, apiRequest, isAuth, isInitialized, user } =
    useAuth();

  const [availableCoupons, setAvailableCoupons] = useState([]); // 購物車可用優惠券
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🚀 自動獲取用戶優惠券 - 當用戶登入時自動載入
  useEffect(() => {
    if (isInitialized && isLoggedIn && user?.account) {
      console.log('用戶已登入，自動獲取優惠券:', user.account);
      getAvailableCoupons(user.account);
    } else if (isInitialized && !isLoggedIn) {
      console.log('用戶未登入，清空優惠券資料');
      setAvailableCoupons([]);
      setError(null);
    }
  }, [isInitialized, isLoggedIn, user?.account]);

  // 🚀 獲取購物車可用優惠券 - 優化版本，直接獲取完整資料
  const getAvailableCoupons = async (account) => {
    if (!account) {
      console.warn('未提供用戶帳號，無法獲取優惠券');
      return [];
    }

    if (!isLoggedIn) {
      console.warn('用戶未登入，無法獲取優惠券');
      setError('請先登入');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      // 🚀 直接使用原有的 API 方法，移除不存在的優化 API
      console.log('使用原有 API 方法獲取優惠券...');
      const response = await apiRequest(
        `${API_BASE_URL}/api/coupons/active/${account}`,
        {
          method: 'GET',
        },
      );

      console.log('購物車可用優惠券 Response:', response);

      // 🚀 檢查響應是否為 null（未登入時會返回 null）
      if (!response) {
        throw new Error('未登入或 Token 無效');
      }

      // 🚀 檢查響應狀態
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 響應錯誤:', response.status, errorText);
        throw new Error(`API 請求失敗: ${response.status} ${errorText}`);
      }

      // 🚀 解析 JSON 響應
      const result = await response.json();
      console.log('購物車可用優惠券 Data:', result);

      if (result.status === 'success') {
        const couponsWithDetails = await getCouponDetails(result.data);
        setAvailableCoupons(couponsWithDetails);
        return couponsWithDetails;
      } else {
        throw new Error(result.message || '獲取優惠券失敗');
      }
    } catch (error) {
      console.error(`${account}獲取可用優惠券失敗:`, error.message);
      setError(error.message);
      setAvailableCoupons([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 獲取優惠券詳細資訊
  const getCouponDetails = async (userCoupons) => {
    if (!userCoupons || userCoupons.length === 0) {
      return [];
    }

    try {
      const codes = userCoupons.map((uc) => uc.coupon_code).join(',');
      const response = await apiRequest(
        `${API_BASE_URL}/api/coupons/details?codes=${codes}`,
        {
          method: 'GET',
        },
      );

      console.log('優惠券詳細資訊 Response:', response);

      if (!response) {
        throw new Error('未登入或 Token 無效');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('詳細資訊 API 響應錯誤:', response.status, errorText);
        throw new Error(
          `詳細資訊 API 請求失敗: ${response.status} ${errorText}`,
        );
      }

      const result = await response.json();
      console.log('優惠券詳細資訊 Data:', result);

      if (result.status === 'success') {
        // 合併 user_coupons 和 coupons 的資料
        return userCoupons.map((userCoupon) => {
          const couponDetail = result.data.find(
            (c) => c.code === userCoupon.coupon_code,
          );
          return {
            ...userCoupon,
            ...couponDetail,
            // 確保有必要的欄位
            id: couponDetail?.id || userCoupon.id,
            name: couponDetail?.name || '未知優惠券',
            discount_type: couponDetail?.discount_type || 'fixed',
            discount_value: couponDetail?.discount_value || 0,
            min_spend: couponDetail?.min_spend || 0,
            min_items: couponDetail?.min_items || 1,
            target_type: couponDetail?.target_type || 'all',
            target_value: couponDetail?.target_value || null,
          };
        });
      }
    } catch (error) {
      console.error('獲取優惠券詳細資訊失敗:', error.message);
    }

    // 如果獲取詳細資訊失敗，返回基本資料
    return userCoupons.map((userCoupon) => ({
      ...userCoupon,
      name: '優惠券',
      discount_type: 'fixed',
      discount_value: 0,
      min_spend: 0,
      min_items: 1,
      target_type: 'all',
      target_value: null,
    }));
  };

  // 🚀 創建優化的 API 請求 (需要服務端實現)
  // 這個方法展示了如何實現服務端的優化查詢
  const createOptimizedApiRequest = () => {
    /*
    🚀 服務端需要實現的 API 端點: GET /api/coupons/active-with-details/:account

    建議的 SQL 查詢:
    ```sql
    SELECT
        uc.id as user_coupon_id,
        uc.user_account,
        uc.coupon_code,
        uc.remaining_uses,
        uc.claimed_at,
        uc.expires_at,
        uc.is_valid as user_coupon_valid,
        uc.calculation,
        c.id as coupon_id,
        c.name,
        c.content,
        c.discount_type,
        c.discount_value,
        c.min_spend,
        c.min_items,
        c.target_type,
        c.target_value,
        c.start_at,
        c.end_at,
        c.status,
        c.is_valid as coupon_valid
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_code = c.code
    WHERE uc.user_account = ?
    AND (uc.remaining_uses > 0 OR uc.remaining_uses = -1)
    AND NOW() < uc.expires_at
    AND uc.is_valid = 1
    AND c.is_valid = 1
    ORDER BY uc.expires_at ASC;
    ```

    這樣可以一次查詢獲取所有必要的資料，避免多次 API 調用。
    */
    return null; // 這個方法僅用於文檔說明
  };

  // 🚀 驗證優惠券是否可用 (使用新的計算系統)
  const validateCoupon = useCallback((coupon, cartData, userData) => {
    if (!coupon) {
      return {
        valid: false,
        message: '優惠券不存在',
      };
    }

    // 使用新的驗證系統
    const validation = CouponValidator.validateCoupon(
      coupon,
      cartData,
      userData,
    );

    return {
      valid: validation.valid,
      message: validation.valid ? '優惠券可用' : validation.errors[0],
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }, []);

  // 🚀 計算優惠券折扣金額 (使用新的計算系統)
  const calculateCouponDiscount = useCallback((coupon, cartData) => {
    if (!coupon) {
      return {
        discountAmount: 0,
        shippingDiscount: 0,
        applicableAmount: 0,
        applicableItems: 0,
        finalAmount: cartData.totalAmount || 0,
      };
    }

    // 使用新的計算系統
    return CouponCalculator.calculateDiscount(coupon, cartData);
  }, []);

  // 🚀 根據優惠券代碼查找優惠券
  const findCouponByCode = (code) => {
    return availableCoupons.find((coupon) => coupon.coupon_code === code);
  };

  // 🚀 根據優惠券ID查找優惠券
  const findCouponById = (id) => {
    return availableCoupons.find((coupon) => coupon.id === id);
  };

  // 🚀 使用優惠券
  const useCoupon = async (account, couponCode, orderId) => {
    if (!account || !couponCode || !orderId) {
      throw new Error('缺少必要參數');
    }

    if (!isLoggedIn) {
      throw new Error('請先登入');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest(
        `${API_BASE_URL}/api/coupons/${account}/${couponCode}/${orderId}`,
        {
          method: 'POST',
        },
      );

      console.log('使用優惠券 Response:', response);

      if (!response) {
        throw new Error('未登入或 Token 無效');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('使用優惠券 API 響應錯誤:', response.status, errorText);
        throw new Error(
          `使用優惠券 API 請求失敗: ${response.status} ${errorText}`,
        );
      }

      const result = await response.json();
      console.log('使用優惠券結果:', result);

      if (result.status === 'success') {
        // 使用成功後，重新獲取可用優惠券
        await getAvailableCoupons(account);
        return result;
      } else {
        throw new Error(result.message || '使用優惠券失敗');
      }
    } catch (error) {
      console.error(`${account}使用優惠券失敗:`, error.message);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 清除錯誤訊息
  const clearError = () => {
    setError(null);
  };

  // 🚀 重新整理優惠券資料
  const refreshCoupons = async (account) => {
    if (account) {
      await getAvailableCoupons(account);
    }
  };

  // 🚀 獲取最佳優惠券組合
  const getBestCouponCombination = (cartData, userData) => {
    return CouponManager.getBestCouponCombination(
      availableCoupons,
      cartData,
      userData,
    );
  };

  // 🚀 直接返回 hook 的值，不需要 Context Provider
  return {
    availableCoupons,
    isLoading,
    error,
    getAvailableCoupons,
    validateCoupon,
    calculateCouponDiscount,
    findCouponByCode,
    findCouponById,
    useCoupon,
    clearError,
    refreshCoupons,
    getBestCouponCombination,
    // 導出計算系統類別供進階使用
    CouponValidator,
    CouponCalculator,
    CouponManager,
  };
}
