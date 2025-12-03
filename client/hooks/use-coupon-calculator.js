'use client';

import { useMemo } from 'react';

/**
 * 優惠券折扣計算系統
 * 基於 echoflow_db的資料表結構設計
 */

// 商品分類對應表 (基於 main_category 表)
const PRODUCT_CATEGORIES = {
  1: '古典',
  2: '爵士',
  3: '西洋',
  4: '華語',
  5: '日韓',
  6: '原聲帶',
};

// 會員等級對應表
const MEMBER_LEVELS = {
  mc: '一般會員',
  mg: '進階會員',
  mv: 'VIP會員',
  mw: '新會員',
};

/**
 * 優惠券驗證器
 */
export class CouponValidator {
  /**
   * 驗證優惠券是否可用
   * @param {Object} coupon - 優惠券資料
   * @param {Object} cartData - 購物車資料
   * @param {Object} userData - 用戶資料
   * @returns {Object} 驗證結果
   */
  static validateCoupon(coupon, cartData, userData) {
    const errors = [];
    const warnings = [];

    // 1. 基本狀態檢查
    if (!coupon.is_valid || coupon.status !== 'active') {
      errors.push('此優惠券已失效或不可用');
    }

    // 2. 時間檢查
    const now = new Date();
    const startAt = new Date(coupon.start_at);
    const endAt = new Date(coupon.end_at);

    if (now < startAt) {
      errors.push('此優惠券尚未開始');
    }

    if (now > endAt) {
      errors.push('此優惠券已過期');
    }

    // 3. 用戶優惠券檢查
    if (coupon.remaining_uses !== -1 && coupon.remaining_uses <= 0) {
      errors.push('此優惠券已用完');
    }

    // 4. 最低消費金額檢查
    if (coupon.min_spend > 0 && cartData.totalAmount < coupon.min_spend) {
      errors.push(
        `此優惠券需要消費滿 NT$ ${coupon.min_spend.toLocaleString()}`,
      );
    }

    // 5. 最低商品件數檢查
    if (coupon.min_items > 1 && cartData.itemCount < coupon.min_items) {
      errors.push(`此優惠券需要至少 ${coupon.min_items} 件商品`);
    }

    // 6. 目標類型檢查
    if (coupon.target_type === 'member') {
      if (
        !userData.memberLevel ||
        userData.memberLevel !== coupon.target_value
      ) {
        errors.push(
          `此優惠券僅限 ${
            MEMBER_LEVELS[coupon.target_value] || coupon.target_value
          } 使用`,
        );
      }
    }

    // 7. 商品分類檢查
    if (coupon.target_type === 'product') {
      const targetCategory = parseInt(coupon.target_value);
      const hasMatchingCategory = cartData.items.some(
        (item) => item.categoryId === targetCategory,
      );

      if (!hasMatchingCategory) {
        const categoryName =
          PRODUCT_CATEGORIES[targetCategory] || `分類 ${targetCategory}`;
        errors.push(`此優惠券僅適用於 ${categoryName} 商品`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * 優惠券計算器
 */
export class CouponCalculator {
  /**
   * 計算優惠券折扣金額
   * @param {Object} coupon - 優惠券資料
   * @param {Object} cartData - 購物車資料
   * @returns {Object} 計算結果
   */
  static calculateDiscount(coupon, cartData) {
    let discountAmount = 0;
    let shippingDiscount = 0;
    let applicableItems = cartData.items;

    // 1. 根據目標類型篩選適用商品
    if (coupon.target_type === 'product') {
      const targetCategory = parseInt(coupon.target_value);
      applicableItems = cartData.items.filter(
        (item) => item.categoryId === targetCategory,
      );
    }

    const applicableAmount = applicableItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // 2. 優先使用 calculation 欄位（user_coupons 表中的預計算公式）
    if (coupon.calculation) {
      console.log('🎯 使用 calculation 欄位計算折扣:', coupon.calculation);

      // 使用預計算的公式
      const calculatedDiscount = CouponCalculator.calculateByFormula(
        coupon.calculation,
        applicableAmount,
      );

      // 根據折扣類型處理結果
      if (coupon.discount_type === 'free_shipping') {
        // 免運費券
        shippingDiscount = cartData.shippingFee || 0;
        discountAmount = 0;
      } else {
        // 一般折扣券
        discountAmount = calculatedDiscount;
      }
    } else {
      // 3. 回退到傳統計算方式（如果沒有 calculation 欄位）
      console.log('⚠️ 沒有 calculation 欄位，使用傳統計算方式');

      switch (coupon.discount_type) {
        case 'fixed':
          // 固定金額折扣
          discountAmount = Math.min(coupon.discount_value, applicableAmount);
          break;

        case 'percent':
          // 百分比折扣
          const discountRate = coupon.discount_value / 100;
          discountAmount = Math.round(applicableAmount * discountRate);
          break;

        case 'free_shipping':
          // 免運費
          shippingDiscount = cartData.shippingFee || 0;
          break;

        default:
          console.warn('未知的折扣類型:', coupon.discount_type);
      }
    }

    // 4. 確保折扣不超過商品總金額
    discountAmount = Math.min(discountAmount, applicableAmount);

    // 5. 確保折扣不為負數
    discountAmount = Math.max(0, discountAmount);

    return {
      discountAmount,
      shippingDiscount,
      applicableAmount,
      applicableItems: applicableItems.length,
      finalAmount: applicableAmount - discountAmount,
    };
  }

  /**
   * 使用 calculation 欄位計算折扣 (user_coupons 表中的預計算公式)
   * @param {string} calculation - 計算公式
   * @param {number} amount - 適用金額
   * @returns {number} 折扣金額
   */
  static calculateByFormula(calculation, amount) {
    if (!calculation) return 0;

    try {
      if (calculation.startsWith('*')) {
        // 百分比折扣，例如 "*0.85" 表示 85 折
        const multiplier = parseFloat(calculation.substring(1));
        const finalAmount = Math.round(amount * multiplier);
        const discountAmount = amount - finalAmount;
        return Math.max(0, discountAmount); // 返回折扣金額
      } else if (calculation.startsWith('-')) {
        // 固定金額折扣，例如 "-150" 表示減 150 元
        const discount = parseInt(calculation.substring(1));
        return Math.min(discount, amount);
      } else if (calculation === '0') {
        // 免費券
        return amount;
      } else {
        // 嘗試解析為數字（可能是其他格式）
        const numericValue = parseFloat(calculation);
        if (!isNaN(numericValue)) {
          if (numericValue < 1) {
            // 小於 1 的數字視為百分比折扣
            const finalAmount = Math.round(amount * numericValue);
            return amount - finalAmount;
          } else {
            // 大於等於 1 的數字視為固定金額折扣
            return Math.min(numericValue, amount);
          }
        }
      }
    } catch (error) {
      console.error('計算優惠券折扣失敗:', error);
    }

    return 0;
  }
}

/**
 * 優惠券管理器
 */
export class CouponManager {
  /**
   * 獲取最佳優惠券組合
   * @param {Array} availableCoupons - 可用優惠券列表
   * @param {Object} cartData - 購物車資料
   * @param {Object} userData - 用戶資料
   * @returns {Object} 最佳組合
   */
  static getBestCouponCombination(availableCoupons, cartData, userData) {
    const validCoupons = availableCoupons.filter((coupon) => {
      const validation = CouponValidator.validateCoupon(
        coupon,
        cartData,
        userData,
      );
      return validation.valid;
    });

    if (validCoupons.length === 0) {
      return {
        selectedCoupons: [],
        totalDiscount: 0,
        totalShippingDiscount: 0,
        finalAmount: cartData.totalAmount,
      };
    }

    // 簡單策略：選擇折扣金額最大的單一優惠券
    let bestCoupon = null;
    let maxDiscount = 0;

    for (const coupon of validCoupons) {
      const calculation = CouponCalculator.calculateDiscount(coupon, cartData);
      const totalDiscount =
        calculation.discountAmount + calculation.shippingDiscount;

      if (totalDiscount > maxDiscount) {
        maxDiscount = totalDiscount;
        bestCoupon = coupon;
      }
    }

    if (bestCoupon) {
      const calculation = CouponCalculator.calculateDiscount(
        bestCoupon,
        cartData,
      );
      return {
        selectedCoupons: [bestCoupon],
        totalDiscount: calculation.discountAmount,
        totalShippingDiscount: calculation.shippingDiscount,
        finalAmount:
          cartData.totalAmount -
          calculation.discountAmount -
          calculation.shippingDiscount,
        applicableItems: calculation.applicableItems,
      };
    }

    return {
      selectedCoupons: [],
      totalDiscount: 0,
      totalShippingDiscount: 0,
      finalAmount: cartData.totalAmount,
    };
  }
}

/**
 * React Hook for 優惠券計算
 */
export function useCouponCalculator() {
  const calculateCouponDiscount = useMemo(() => {
    return (coupon, cartData) => {
      return CouponCalculator.calculateDiscount(coupon, cartData);
    };
  }, []);

  const validateCoupon = useMemo(() => {
    return (coupon, cartData, userData) => {
      return CouponValidator.validateCoupon(coupon, cartData, userData);
    };
  }, []);

  const getBestCouponCombination = useMemo(() => {
    return (availableCoupons, cartData, userData) => {
      return CouponManager.getBestCouponCombination(
        availableCoupons,
        cartData,
        userData,
      );
    };
  }, []);

  return {
    calculateCouponDiscount,
    validateCoupon,
    getBestCouponCombination,
    CouponValidator,
    CouponCalculator,
    CouponManager,
  };
}

export default useCouponCalculator;
