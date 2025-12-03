/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast, ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import styles from "../forums.module.css";
import astyles from "../article.module.css";

import AsideLeft from "../_components/AsideLeft";
import AsideRight from "../_components/AsideRight";
import OffcanvasLeft from "../_components/OffcanvasLeft";
import OffcanvasRight from "../_components/OffcanvasRight";

import ArticleContent from "../_components/ArticleContent";
import ArticleActionBar from "../_components/ArticleActionBar";
import MoreArticles from "../_components/MoreArticles";
import CommentsThread from "../_components/CommentsThread";
import ReplyBar from "../_components/ReplyBar";

import { ForumsProvider, useForumPost } from "../../../hooks/use-forums";

const API_FORUMS = "http://localhost:3005/api/forums";

/** tags 正規化成字串陣列 */
function pickTagNames(pd) {
  const candidates = [pd?.tags, pd?.post_tags, pd?.tag_names, pd?.tags_json, pd?.tagList];
  for (const cand of candidates) {
    if (!cand) continue;

    if (Array.isArray(cand)) {
      const arr = cand
        .map((t) =>
          typeof t === "string"
            ? t
            : (t?.name || t?.tag_name || t?.title || t?.label || "")
        )
        .map((s) => String(s).replace(/^#/, "").trim())
        .filter(Boolean);
      if (arr.length) return arr;
    }

    if (typeof cand === "string") {
      try {
        const parsed = JSON.parse(cand);
        if (Array.isArray(parsed)) {
          const arr = parsed
            .map((t) =>
              typeof t === "string"
                ? t
                : (t?.name || t?.tag_name || t?.title || t?.label || "")
            )
            .map((s) => String(s).replace(/^#/, "").trim())
            .filter(Boolean);
          if (arr.length) return arr;
        }
      } catch {}
      const arr = cand
        .split(/[,\s]+/)
        .map((s) => s.replace(/^#/, "").trim())
        .filter(Boolean);
      if (arr.length) return arr;
    }
  }
  return [];
}

function Inner() {
  const router = useRouter();
  const { id } = useParams();
  const { postDetail, isLoading, detail, ensureMe, currentUser } = useForumPost();

  // 供置底回覆列使用
  const [replyTo, setReplyTo] = useState(null);

  // 載入單篇
  useEffect(() => {
    if (id) detail(id);
  }, [id, detail]);

  // 嘗試載入登入者（不強制）
  useEffect(() => {
    ensureMe().catch(() => null);
  }, [ensureMe]);

  // 整理畫面資料
  const article = useMemo(() => {
    if (!postDetail) return null;

    const authorName =
      postDetail.author?.nickname ?? postDetail.author_nickname ?? "匿名";
    const authorAvatar =
      postDetail.author?.avatar ?? postDetail.author_img ?? "https://placehold.co/35x35";

    const tags = pickTagNames(postDetail);

    // 直接把 content + images 交給 ArticleContent 內部解析 [img] 與順序
    const content = String(postDetail.content || "");
    const images = Array.isArray(postDetail.images) ? postDetail.images : [];

    return {
      id: postDetail.id,
      users_id: postDetail.users_id,
      title: postDetail.title,
      author: { id: postDetail?.users_id ?? postDetail?.author?.id ?? postDetail?.user_id ?? null, name: authorName, avatar: authorAvatar },
      timeText: postDetail.created_at,
      tags,
      content,
      images,
      actions: {
        likes: Number(postDetail.likes ?? postDetail.like_count ?? 0),
        bookmarks: Number(postDetail.bookmarks ?? postDetail.bookmark_count ?? 0),
        comments: Number(postDetail.comments ?? postDetail.comment_count ?? 0),
      },
    };
  }, [postDetail]);

  // 作者才可管理
  const canManage = !!(currentUser && article && Number(currentUser.id) === Number(article.users_id));

  // 刪除請求
  async function handleDelete() {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("reactLoginToken") : null;
      if (!token) throw new Error("請先登入");

      const res = await fetch(`${API_FORUMS}/posts/${article.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || "刪除失敗");
      }

      toast.success("已刪除貼文");
      router.replace("/forums");
    } catch (err) {
      console.error("刪除失敗：", err);
      toast.error(err?.message || "刪除失敗");
    }
  }

  const initialComments = [];

  if (isLoading || !article) return null;

  return (
    <div className={styles.forusVars}>
      <main className={styles.forusMain}>
        <div className={styles.forusContainer}>
          <div className="row">
            {/* 左欄（桌機） */}
            <div className="d-none d-lg-block col-lg-2">
              <AsideLeft />
            </div>

            {/* 中欄：文章內文頁 */}
            <div className="col-12 col-lg-8">
              <div className={styles.forusContentStack}>
                <article className={astyles.articleCard} aria-label="文章內容">
                  <ArticleContent
                    title={article.title}
                    author={article.author}
                    timeText={article.timeText}
                    content={article.content}
                    images={article.images}
                    tags={article.tags}
                    canManage={canManage}
                    // ★ 點「編輯貼文」導向編輯頁
                    onEdit={() => router.push(`/forums/${article.id}/edit`)}
                  />

                  <ArticleActionBar
                    articleId={article.id}
                    initialCounts={{
                      likes: article.actions.likes,
                      bookmarks: article.actions.bookmarks,
                      comments: article.actions.comments,
                    }}
                    className={astyles.noPadLeft}
                  />

                  <hr className={astyles.articleSep} />

                  {/* ★ 不傳 items，讓 MoreArticles 自行抓並隨機取 2 篇 */}
                  <MoreArticles excludeId={article.id}/>

                  <CommentsThread
                    articleId={article.id}
                    initialComments={initialComments}
                    totalCount={article.actions.comments}
                    onReplyToChange={setReplyTo}
                  />

                  <ReplyBar
                    articleId={article.id}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                  />
                </article>
              </div>
            </div>

            {/* 右欄（桌機） */}
            <div className="d-none d-lg-block col-lg-2">
              <AsideRight />
            </div>
          </div>
        </div>
      </main>

      {/* 手機用左右 Offcanvas */}
      <OffcanvasLeft />
      <OffcanvasRight />

      {/* ★ 刪除確認 Modal（id 與 ArticleContent 的 data-bs-target 對齊） */}
      {canManage ? (
        <div
          className="modal fade"
          id="postDeleteModal"
          tabIndex={-1}
          aria-labelledby="postDeleteModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="modal-title" id="postDeleteModalLabel">
                  刪除確認
                </div>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
              </div>
              <div className="modal-body">確定要刪除這篇貼文嗎？</div>
              <div className="modal-footer">
                <button type="button" className={styles.forusBtnGhost} data-bs-dismiss="modal">
                  取消
                </button>
                <button
                  type="button"
                  className={styles.forusBtnPrimary}
                  data-bs-dismiss="modal"
                  onClick={handleDelete}
                >
                  刪除貼文
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer
        position="bottom-center"
        autoClose={1800}
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

export default function ForumPostDetailPage() {
  return (
    <ForumsProvider>
      <Inner />
    </ForumsProvider>
  );
}
