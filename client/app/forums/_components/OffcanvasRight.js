"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../forums.module.css";

export default function OffcanvasRight() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  useEffect(() => {
    setQ(searchParams.get("q") || "");
  }, [searchParams]);

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const params = new URLSearchParams(searchParams?.toString() || "");
      const v = String(q || "").trim();
      if (v) params.set("q", v);
      else params.delete("q");

      const url = `/forums${params.toString() ? `?${params}` : ""}`;
      router.replace(url, { scroll: true });
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      // 是否要關閉 Offcanvas？你原檔沒有按鈕送出，就先不自動關
    },
    [q, router, searchParams]
  );

  return (
    <div
      className={"offcanvas offcanvas-end" + " " + styles.forusOffcanvas} // ★ 確保有這個 class
      tabIndex="-1"
      id="forusOffcanvasRight"
      aria-labelledby="forusOffcanvasRightLabel"
    >
      <div className={"offcanvas-header"}>
        <div className={"offcanvas-title"}>搜尋與管理</div>
        <button
          className={"btn-close"}
          type="button"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>

      <div className={"offcanvas-body p-0"}>
        <div className={"p-3 pt-2"}>
          <form
            className={styles.forusSearchForm}
            role="search"
            onSubmit={onSubmit}
          >
            <i className={"bi bi-search"}></i>
            <input
              className={"form-control" + " " + styles.forusSearchInput}
              type="search"
              placeholder="搜尋文章、標籤"
              aria-label="搜尋文章、標籤"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {/* 你原本預留的清除鈕，先維持註解
            <button
              className={styles.forusClearBtn}
              type="reset"
              aria-label="清除"
              onClick={() => setQ("")}
            >
              <i className={"bi bi-x"}></i>
            </button>
            */}
          </form>
        </div>

        <div className={"p-2" + " " + styles.forusAsidePanel}>
          {/* 發表新貼文 → 新增貼文頁 */}
          <a className={styles.forusPanelLink} href="/forums/new">
            <i className={"bi bi-pencil-square me-2"}></i>發表新貼文
          </a>

          <div className={" " + styles.forusPanelSectionTitle}>
            通知
          </div>
          <a
            className={
              styles.forusPanelLink + " " + styles.forusPanelLinkAccent
            }
            href="/forums/chat"
          >
            <i className={"bi bi-bell me-2"}></i>回覆訊息
          </a>
          <a
            className={styles.forusPanelLink}
            href="/users/panel/articles/following"
          >
            <i className={"bi bi-person-plus me-2"}></i>追蹤對象
          </a>

          <div className={" " + styles.forusPanelSectionTitle}>
            文章管理
          </div>
          <a className={styles.forusPanelLink} href="/users/panel/articles">
            <i className={"bi bi-journal-text me-2"}></i>已發表
          </a>
          <a
            className={styles.forusPanelLink}
            href="/users/panel/articles/liked"
          >
            <i className={"bi bi-heart me-2"}></i>已按讚
          </a>
          <a
            className={styles.forusPanelLink}
            href="/users/panel/articles/bookmarks"
          >
            <i className={"bi bi-bookmark me-2"}></i>文章收藏
          </a>
        </div>
      </div>
    </div>
  );
}
