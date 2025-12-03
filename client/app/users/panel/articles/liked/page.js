/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import UserPanelLayout from "@/app/users/panel/_components/UserPanelLayout";
import PostCard from "@/app/forums/_components/PostCard";
import { useUserLikedPosts } from "@/hooks/use-forums";
import styles from "../page.module.css";

const PAGE_SIZE = 3;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("reactLoginToken");
}
function decodeJwtPayload(token) {
  try {
    const parts = String(token).split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
    const json = atob(b64 + "=".repeat(pad)).replace(/\u0000/g, "");
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function pickUserId(payload) {
  if (!payload) return 0;
  if (payload.id) return Number(payload.id);
  return 0;
}

// 回到 5 顆頁碼
const getPageNumbers = (page, totalPages) => {
  const tp = Number(totalPages || 1);
  const p = Math.min(Math.max(Number(page || 1), 1), tp);
  if (tp <= 5) return Array.from({ length: tp }, (_, i) => i + 1);
  if (p <= 3) return [1, 2, 3, 4, 5];
  if (p >= tp - 2) return [tp - 4, tp - 3, tp - 2, tp - 1, tp];
  return [p - 2, p - 1, p, p + 1, p + 2];
};

export default function LikedArticlesPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/auth/login?next=/users/panel/articles/liked");
      return;
    }
    const payload = decodeJwtPayload(token);
    const uid = pickUserId(payload);
    if (!uid) {
      router.replace("/auth/login?next=/users/panel/articles/liked");
      return;
    }
    setMe({ id: uid });
    setChecking(false);
  }, [router]);

  const { posts, loading, pagination } = useUserLikedPosts(me?.id || 0, {
    page,
    limit: PAGE_SIZE,
    autoLoad: !!me?.id,
  });

  const total = Number(pagination?.total || 0);
  const pages = Math.max(
    1,
    Number(pagination?.pages || Math.ceil(total / PAGE_SIZE) || 1)
  );
  const isLoading = Boolean(loading?.posts);
  const list = Array.isArray(posts) ? posts : [];

  if (checking) {
    return (
      <UserPanelLayout pageTitle="喜愛的文章">
        <div className="container py-4">
          <div className="text-center py-5">載入中…</div>
        </div>
      </UserPanelLayout>
    );
  }

  return (
    <UserPanelLayout pageTitle="喜愛的文章">
      <div className="container-fluid p-0">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4 mb-0"></h2>
              <small className="text-muted">共 {total} 篇</small>
            </div>

            {list.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-heart display-1 text-muted"></i>
                <p className="mt-3 text-muted">你還沒有按讚任何文章。</p>
              </div>
            ) : (
              <div className="vstack gap-3">
                {list.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}

                {pages > 1 && (
                  <div className={`${styles.alc} ${styles.pages}`}>
                    <div
                      className={`${styles.page}`}
                      onClick={() => !isLoading && setPage(1)}
                    >
                      <i className="fa-solid fa-backward-step" />
                    </div>

                    <div
                      className={`${styles.page} ${
                        page === 1 ? styles.disabled : ""
                      }`}
                      onClick={
                        page === 1 || isLoading ? null : () => setPage(page - 1)
                      }
                    >
                      <i className="fa-solid fa-angle-left"></i>
                    </div>

                    {getPageNumbers(page, pages).map((n) => (
                      <div
                        key={n}
                        className={`${styles.page} ${
                          page === n ? styles.active : ""
                        }`}
                        onClick={() => !isLoading && setPage(n)}
                      >
                        {n}
                      </div>
                    ))}

                    <div
                      className={`${styles.page} ${
                        page === pages ? styles.disabled : ""
                      }`}
                      onClick={
                        page === pages || isLoading
                          ? null
                          : () => setPage(page + 1)
                      }
                    >
                      <i className="fa-solid fa-angle-right"></i>
                    </div>

                    <div
                      className={`${styles.page}`}
                      onClick={() => !isLoading && setPage(pages)}
                    >
                      <i className="fa-solid fa-forward-step" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </UserPanelLayout>
  );
}
