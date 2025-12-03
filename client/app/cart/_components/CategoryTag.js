'use client';

import React from 'react';
import styles from './CategoryTag.module.css';

// 分類對應表
const CATEGORY_MAP = {
  1: { name: '古典', color: 'classical' },
  2: { name: '爵士', color: 'jazz' },
  3: { name: '西洋', color: 'western' },
  4: { name: '華語', color: 'chinese' },
  5: { name: '日韓', color: 'japanese' },
  6: { name: '原聲帶', color: 'soundtrack' },
};

/**
 * 分類標籤組件
 * @param {Object} props
 * @param {number} props.mainCategoryId - 主分類ID (1-6)
 * @param {number} props.subCategoryId - 次分類ID (可選)
 * @param {string} props.size - 標籤大小 ('small' | 'medium' | 'large')
 * @param {boolean} props.showSubCategory - 是否顯示次分類
 */
export default function CategoryTag({
  mainCategoryId,
  subCategoryId,
  size = 'small',
  showSubCategory = false,
}) {
  // 如果沒有主分類ID，不顯示標籤
  if (!mainCategoryId || !CATEGORY_MAP[mainCategoryId]) {
    return null;
  }

  const mainCategory = CATEGORY_MAP[mainCategoryId];

  return (
    <div className={`${styles.categoryTag} ${styles[size]}`}>
      <span
        className={`${styles.categoryBadge} ${styles[mainCategory.color]}`}
        title={`主分類: ${mainCategory.name}`}
      >
        {mainCategory.name}
      </span>

      {/* 如果啟用次分類顯示且有次分類ID，可以在此處添加次分類標籤 */}
      {showSubCategory && subCategoryId && (
        <span
          className={`${styles.subCategoryBadge} ${styles[mainCategory.color]}`}
        >
          {/* 這裡可以根據 subCategoryId 顯示次分類名稱 */}
        </span>
      )}
    </div>
  );
}

// 導出分類對應表供其他組件使用
export { CATEGORY_MAP };
