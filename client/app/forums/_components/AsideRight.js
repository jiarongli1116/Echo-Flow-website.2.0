/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../forums.module.css";

export default function AsideRight() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 與網址同步（已存在的 ?q）
  const [q, setQ] = useState(searchParams.get("q") || "");
  useEffect(() => {
    setQ(searchParams.get("q") || "");
  }, [searchParams]);

  // 提交搜尋：更新 ?q，保留既有的 ?cid / ?sort，並回到頂部
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
    },
    [q, router, searchParams]
  );

  return (
    <aside className={styles.forusAsideRight}>
      <div className={styles.forusAsidePanel}>
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

        {/* 發表新貼文 → 新增貼文頁 */}
        <div className={styles.forusPanelCompose}>
          <a className={styles.forusPanelLink} href="/forums/new">
            <i className={"bi bi-pencil-square me-2"}></i>發表新貼文
          </a>
        </div>

        <div>
          <div className={styles.forusPanelSectionTitle}>通知</div>
          <a
            className={styles.forusPanelLink}
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
        </div>

        <div>
          <div className={styles.forusPanelSectionTitle}>文章管理</div>
          <a className={styles.forusPanelLink} href="/users/panel/articles">
            <i className={"bi bi-journal-text me-2"}></i>已發表{" "}
            <i className={"bi bi-chevron-right ms-auto"}></i>
          </a>
          <a
            className={styles.forusPanelLink}
            href="/users/panel/articles/liked"
          >
            <i className={"bi bi-heart me-2"}></i>已按讚{" "}
            <i className={"bi bi-chevron-right ms-auto"}></i>
          </a>
          <a
            className={styles.forusPanelLink}
            href="/users/panel/articles/bookmarks"
          >
            <i className={"bi bi-bookmark me-2"}></i>文章收藏{" "}
            <i className={"bi bi-chevron-right ms-auto"}></i>
          </a>
        </div>
      </div>
    </aside>
  );
}
