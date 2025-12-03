"use client";

import styles from "../forums.module.css";

/**
 * Bar（mobile 專用）
 * - TabsBar 造型：白底、底線、置頂
 * - 左右是 Offcanvas icon（沿用現有 #offcanvasLeft / #forusOffcanvasRight）
 * - 中間置中標題文字；不顯示 tabs
 */
export default function Bar({ title = "資訊" }) {
  return (
    <div className={`d-lg-none ${styles.forusBar}`}>
      <div className={styles.forusBarInner}>
        {/* 左：開啟左側 Offcanvas */}
        <button
          type="button"
          className={styles.forusTabsIconBtn}
          data-bs-toggle="offcanvas"
          data-bs-target="#offcanvasLeft"
          aria-controls="offcanvasLeft"
          aria-label="開啟分類清單"
        >
          <i className="bi bi-list"></i>
        </button>

        {/* 中：置中標題 */}
        <div className={styles.forusBarTitleWrap}>
          <span className={styles.forusBarTitle}>{title}</span>
        </div>

        {/* 右：開啟右側 Offcanvas */}
        <button
          type="button"
          className={styles.forusTabsIconBtn}
          data-bs-toggle="offcanvas"
          data-bs-target="#forusOffcanvasRight"
          aria-controls="forusOffcanvasRight"
          aria-label="開啟搜尋與管理"
        >
          <i className="bi bi-search"></i>
        </button>
      </div>
    </div>
  );
}
