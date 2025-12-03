/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import styles from "../forums.module.css";
import Bar from "../_components/Bar";
import UserHeader from "../_components/UserHeader";
import AsideLeft from "../_components/AsideLeft";
import AsideRight from "../_components/AsideRight";
import PostCard from "../_components/PostCard";
import OffcanvasLeft from "../_components/OffcanvasLeft";
import OffcanvasRight from "../_components/OffcanvasRight";

import { useForumsInfo } from "../../../hooks/use-forums";

/** 解析 query 的 userId：支援 ?id=5、?user=5、?uid=5、?u=5、以及「純數字」?5 */
function parseUserId(searchParams) {
  const keys = ["id", "user", "uid", "u"];
  for (const k of keys) {
    const v = searchParams.get(k);
    if (v && /^\d+$/.test(v)) return parseInt(v, 10);
  }
  if (typeof window !== "undefined") {
    const raw = window.location.search || "";
    const m = raw.match(/^\?(\d+)$/);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

export default function ForumsInfoPage() {
  const searchParams = useSearchParams();
  const userId = useMemo(() => parseUserId(searchParams), [searchParams]);

  // page 只負責 render）
  const {
    uiUser,
    posts,
    isFollowing,
    follow,
    unfollow,
    loading,
    pagination,
    listPosts, // ★ 取用新函式
  } = useForumsInfo(userId, { page: 1, limit: 20, autoLoad: true });

  const chatHref = uiUser?.id ? `/forums/chat?open=create&members=${uiUser.id}` : "#";

  // --- 無限捲動（放慢觸發，避免太快載入） ---
  const loaderRef = useRef(null);
  const lastLoadAtRef = useRef(0);
  const pendingTimerRef = useRef(null);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const COOLDOWN_MS = 800; // 兩次載入至少間隔 0.8s
    const DELAY_MS = 200; // 交會後需停留 0.2s 才載入

    const io = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (!ent || !ent.isIntersecting) {
          if (pendingTimerRef.current) {
            clearTimeout(pendingTimerRef.current);
            pendingTimerRef.current = null;
          }
          return;
        }

        if (loading?.posts) return;

        const now = Date.now();
        if (now - lastLoadAtRef.current < COOLDOWN_MS) return;

        const pg = Number(pagination?.page || 1);
        const pages = Number(pagination?.pages || 1);
        const limit = Number(pagination?.limit || 20);
        if (pg >= pages) return; // 沒下一頁

        pendingTimerRef.current = setTimeout(async () => {
          if (!loaderRef.current) return;
          const rect = loaderRef.current.getBoundingClientRect();
          const vh =
            window.innerHeight || document.documentElement.clientHeight;
          const stillVisible = rect.top < vh && rect.bottom >= 0;
          if (!stillVisible) return;

          lastLoadAtRef.current = Date.now();
          await listPosts({ page: pg + 1, limit, append: true });
        }, DELAY_MS);
      },
      {
        rootMargin: "0px 0px 80px 0px", // 靠近底部才觸發
        threshold: 1.0, // sentinel 完全進入視窗才觸發
      }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [
    listPosts,
    loading?.posts,
    pagination?.page,
    pagination?.pages,
    pagination?.limit,
  ]);
  // --- 無限捲動結束 ---

  return (
    <div className={styles.forusVars}>
      <main className={styles.forusMain}>
        <div className={styles.forusContainer}>
          <div className="row">
            <div className="d-none d-lg-block col-lg-2">
              <AsideLeft />
            </div>

            <div className="col-12 col-lg-8">
              <Bar />
              <UserHeader
                user={uiUser}
                isFollowing={isFollowing}
                onFollow={follow}
                onUnfollow={unfollow}
                chatHref={chatHref}
              />

              <div className={styles.forusContentStack}>
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}

                {/* 無限捲動觸發器 */}
                <div ref={loaderRef} style={{ height: 1 }} />

                {loading.posts && (
                  <div className="text-center py-3">讀取中…</div>
                )}
              </div>
            </div>

            <div className="d-none d-lg-block col-lg-2">
              <AsideRight />
            </div>
          </div>
        </div>
      </main>

      <OffcanvasLeft />
      <OffcanvasRight />

      <ToastContainer
        position="bottom-right"
        autoClose={1200}
        limit={2}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        transition={Bounce}
      />
    </div>
  );
}
