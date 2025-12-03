'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './use-auth';

export const usePointsCart = () => {
  // 使用 useAuth 提供的統一 JWT 管理
  const { getToken, isLoggedIn, apiRequest, isAuth, isInitialized } = useAuth();

  // 點數餘額狀態
  const [availablePoints, setAvailablePoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 點數兌換率 (1點 = 1元)
  const POINTS_TO_CURRENCY_RATE = 1;

  // 獲取點數餘額
  const fetchPointsBalance = useCallback(async () => {
    // 如果用戶未登入，不執行請求
    if (!isLoggedIn()) {
      console.log('用戶未登入，跳過點數餘額獲取');
      setAvailablePoints(0);
      return { currentPoints: 0 };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest(
        'http://localhost:3005/api/points/balance',
      );

      if (!response.ok) {
        throw new Error('獲取點數餘額失敗');
      }

      const result = await response.json();

      if (result.status === 'success') {
        const currentPoints = result.data.currentPoints || 0;
        setAvailablePoints(currentPoints);
        setLastUpdated(new Date());
        console.log('✅ 點數餘額獲取成功:', currentPoints);
        return result.data;
      } else {
        throw new Error(result.message || '獲取點數餘額失敗');
      }
    } catch (error) {
      console.error('❌ 獲取點數餘額錯誤:', error);
      setError(error.message);
      setAvailablePoints(0);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, apiRequest]);

  // 扣除點數（用於結帳）
  const deductPoints = useCallback(
    async (points, description = '購物消費') => {
      // 如果用戶未登入，拋出錯誤
      if (!isLoggedIn()) {
        throw new Error('請先登入');
      }

      // 驗證點數
      if (!points || points <= 0) {
        throw new Error('扣除點數必須大於0');
      }

      // 檢查點數是否足夠
      if (points > availablePoints) {
        throw new Error(
          `點數不足！您有 ${availablePoints} 點，無法扣除 ${points} 點`,
        );
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest(
          'http://localhost:3005/api/points/deduct',
          {
            method: 'POST',
            body: JSON.stringify({
              points,
              description,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '扣除點數失敗');
        }

        const result = await response.json();

        if (result.status === 'success') {
          // 更新本地點數餘額
          const newBalance = result.data.remainingPoints;
          setAvailablePoints(newBalance);
          setLastUpdated(new Date());
          console.log(`✅ 成功扣除 ${points} 點，剩餘點數: ${newBalance}`);
          return result.data;
        } else {
          throw new Error(result.message || '扣除點數失敗');
        }
      } catch (error) {
        console.error('❌ 扣除點數錯誤:', error);
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [isLoggedIn, apiRequest, availablePoints],
  );

  // 回補/新增點數（用於訂單取消或失敗）
  const refundPoints = useCallback(
    async (points, description = '訂單取消回補') => {
      if (!isLoggedIn()) {
        throw new Error('請先登入');
      }

      if (!points || points <= 0) {
        throw new Error('回補點數必須大於0');
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest(
          'http://localhost:3005/api/points/add',
          {
            method: 'POST',
            body: JSON.stringify({
              points, // 正數表示增加
              pointsType: '獲得',
              description,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '回補點數失敗');
        }

        const result = await response.json();

        if (result.status === 'success') {
          const newBalance = availablePoints + points;
          setAvailablePoints(newBalance);
          setLastUpdated(new Date());
          console.log(`✅ 回補 ${points} 點成功，最新點數: ${newBalance}`);
          return { points, remainingPoints: newBalance };
        } else {
          throw new Error(result.message || '回補點數失敗');
        }
      } catch (error) {
        console.error('❌ 回補點數錯誤:', error);
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [isLoggedIn, apiRequest, availablePoints],
  );

  // 計算最大可用點數（基於購物車總金額）
  const calculateMaxUsablePoints = useCallback(
    (cartTotal, couponDiscount = 0) => {
      const remainingAmountAfterCoupon = cartTotal - couponDiscount;

      // 如果優惠券已覆蓋全部金額，則無法使用點數
      if (remainingAmountAfterCoupon <= 0) {
        return 0;
      }

      // 計算最大可用點數（不超過剩餘金額和用戶擁有的點數）
      const maxPointsForRemainingAmount = Math.floor(
        remainingAmountAfterCoupon / POINTS_TO_CURRENCY_RATE,
      );
      return Math.min(availablePoints, maxPointsForRemainingAmount);
    },
    [availablePoints],
  );

  // 驗證點數使用是否有效
  const validatePointsUsage = useCallback(
    (pointsToUse, cartTotal, couponDiscount = 0) => {
      const errors = [];

      // 檢查點數是否為正數
      if (pointsToUse < 0) {
        errors.push('點數不能為負數');
      }

      // 檢查點數是否超過可用餘額
      if (pointsToUse > availablePoints) {
        errors.push(
          `點數不足！您有 ${availablePoints} 點，無法使用 ${pointsToUse} 點`,
        );
      }

      // 檢查點數是否超過可折抵金額
      const maxUsablePoints = calculateMaxUsablePoints(
        cartTotal,
        couponDiscount,
      );
      if (pointsToUse > maxUsablePoints) {
        errors.push(`點數超過可折抵金額！最多只能使用 ${maxUsablePoints} 點`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        maxUsablePoints,
      };
    },
    [availablePoints, calculateMaxUsablePoints],
  );

  // 計算點數折扣金額
  const calculatePointsDiscount = useCallback((pointsToUse) => {
    return pointsToUse * POINTS_TO_CURRENCY_RATE;
  }, []);

  // 重新載入點數餘額
  const refreshPointsBalance = useCallback(async () => {
    try {
      await fetchPointsBalance();
    } catch (error) {
      console.error('重新載入點數餘額失敗:', error);
    }
  }, [fetchPointsBalance]);

  // 清除錯誤
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 格式化點數顯示
  const formatPoints = useCallback((points) => {
    return points.toLocaleString();
  }, []);

  // 初始化時載入點數餘額 判斷token驗證是否有效或過期
  useEffect(() => {
    if (isInitialized && isAuth) {
      fetchPointsBalance();
    }
  }, [fetchPointsBalance, isInitialized, isAuth]);

  // 計算派生狀態
  const pointsInfo = useMemo(
    () => ({
      availablePoints,
      formattedPoints: formatPoints(availablePoints),
      lastUpdated,
      isLoading: loading,
      hasError: !!error,
      errorMessage: error,
    }),
    [availablePoints, formatPoints, lastUpdated, loading, error],
  );

  return {
    // 狀態
    ...pointsInfo,

    // 方法
    fetchPointsBalance,
    deductPoints,
    refundPoints,
    refreshPointsBalance,
    clearError,

    // 計算方法
    calculateMaxUsablePoints,
    validatePointsUsage,
    calculatePointsDiscount,
    formatPoints,

    // 常數
    POINTS_TO_CURRENCY_RATE,
  };
};
