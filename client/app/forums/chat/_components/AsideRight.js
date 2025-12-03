/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "../../forums.module.css";

export default function AsideRight() {
  return (
    <aside className={styles.forusAsideRight}>
      <div className={styles.forusAsidePanel}>
        <div>
          <a className={styles.forusPanelLink} href="/forums">
            <i className={"bi bi-arrow-bar-left me-2"}></i>回到論壇
          </a>
        </div>

        <div>
          <div className={styles.forusPanelSectionTitle}>通知</div>
          <a className={styles.forusPanelLink} href="/forums/chat">
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
