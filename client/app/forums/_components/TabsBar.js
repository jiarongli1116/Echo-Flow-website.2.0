"use client";

import styles from "../forums.module.css";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * TabsBar（手機：白底、icon 無 BS 按鈕；桌機：icon 隱藏）
 * - 左 icon -> #offcanvasLeft
 * - 右 icon -> #forusOffcanvasRight
 * - 以 URL ?sort=hot|new 決定當前分頁（預設 hot）
 *   ★ DOM 與樣式 class 完全照你的原始檔，不更動任何結構
 */
export default function TabsBar({ items = ["熱門", "最新"], activeIndex = 0 }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 由 URL 推導目前分頁；預設熱門
  const sort = (searchParams.get("sort") || "hot").toLowerCase();
  const curIndex = sort === "new" ? 1 : 0;

  // 切換分頁：更新 URL 並回到頁面頂端
  const onSwitch = (idx) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (idx === 0) params.delete("sort"); // 熱門為預設，不留多餘參數
    else params.set("sort", "new");

    const qs = params.toString();
    router.replace(`/forums${qs ? `?${qs}` : ""}`, { scroll: true });

    // 保險再捲到最上方（避免部分瀏覽器不自動捲動）
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  return (
    <nav className={styles.forusTabsBar}>
      <div className={styles.forusTabsWrap}>
        <div className="d-flex align-items-center">
          {/* Left mobile icon（分類） */}
          <button
            type="button"
            className={`${styles.forusTabsIconBtn} d-lg-none`}
            data-bs-toggle="offcanvas"
            data-bs-target="#offcanvasLeft"
            aria-controls="offcanvasLeft"
            aria-label="開啟分類清單"
          >
            <i className="bi bi-list"></i>
          </button>

          {/* Tabs —— 結構與 class 100% 沿用你的原檔 */}
          <div className="flex-grow-1">
            <ul
              className={styles.forusTabs}
              role="tablist"
              aria-label="討論區分類"
              // 若你的 CSS 使用滑塊變數，這兩個變數供底線定位；沒有用也不會影響
              style={{
                "--active-index": String(curIndex),
                "--count": String(items.length),
              }}
            >
              {items.map((label, i) => (
                <li key={label} className={styles.forusTabItem}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={i === curIndex}
                    className={[
                      styles.forusTabLink,
                      i === curIndex ? styles.forusTabLinkActive : "",
                    ].join(" ")}
                    onClick={() => onSwitch(i)}
                  >
                    {label}
                  </button>
                </li>
              ))}
              {/* 底線視覺（保持你的原結構） */}
              <div className={styles.forusTabsUnderline}>
                <div className={styles.forusTabsThumb} />
              </div>
            </ul>
          </div>

          {/* Right mobile icon（搜尋/管理） */}
          <button
            type="button"
            className={`${styles.forusTabsIconBtn} d-lg-none`}
            data-bs-toggle="offcanvas"
            data-bs-target="#forusOffcanvasRight"
            aria-controls="forusOffcanvasRight"
            aria-label="開啟搜尋與管理"
          >
            <i className="bi bi-search"></i>
          </button>
        </div>
      </div>
    </nav>
  );
}
