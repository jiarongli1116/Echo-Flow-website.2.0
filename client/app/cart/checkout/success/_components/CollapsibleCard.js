'use client';

import { useState } from 'react';
import successStyles from './success.module.css';

/**
 * 可收合的卡片組件
 * @param {Object} props - 組件屬性
 * @param {string} props.title - 卡片標題
 * @param {string} props.icon - 卡片圖示 (emoji)
 * @param {React.ReactNode} props.children - 卡片內容
 * @param {boolean} props.defaultExpanded - 預設是否展開，預設為 true
 * @param {string} props.className - 額外的 CSS 類別
 * @param {string} props.headerClassName - 標題區域的額外 CSS 類別
 * @param {string} props.contentClassName - 內容區域的額外 CSS 類別
 */
export default function CollapsibleCard({
  title,
  icon,
  children,
  defaultExpanded = true,
  className = '',
  headerClassName = '',
  contentClassName = '',
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`bg-white border rounded-1 shadow-sm p-4 ${className}`}>
      {/* 可點擊的標題區域 */}
      <div
        className={`d-flex align-items-center justify-content-between mb-3 ${successStyles.collapsibleHeader} ${headerClassName}`}
        onClick={toggleExpanded}
      >
        <div className='d-flex align-items-center gap-2'>
          <span className='fs-5'>{icon}</span>
          <h3 className={`h5 mb-0 ${successStyles.infoCardTitle}`}>{title}</h3>
        </div>
        <span
          className={`text-dark ${successStyles.collapseToggleIcon} ${
            isExpanded
              ? successStyles.collapseToggleIconExpanded
              : successStyles.collapseToggleIconCollapsed
          }`}
        >
          ▼
        </span>
      </div>

      {/* 可收合的內容區域 */}
      <div
        className={`${successStyles.collapsibleContent} ${
          isExpanded
            ? successStyles.collapsibleContentExpanded
            : successStyles.collapsibleContentCollapsed
        } ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
