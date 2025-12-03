/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useRouter } from "next/navigation"; // 導向登入
import { toast, Bounce } from "react-toastify"; // ★ 新增：在 hook 內直接噴 toast

const ForumsContext = createContext(null);
ForumsContext.displayName = "ForumsContext";

const API_FORUMS = "http://localhost:3005/api/forums";
const API_STATUS = "http://localhost:3005/api/users/status";
const LOGIN_PATH = "/auth/login";

/* ============================ 共用小工具 ============================ */
const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("reactLoginToken");
};

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 401) {
    let data = {};
    try {
      data = await res.json();
    } catch {}
    const err = new Error(data?.message || "未登入");
    err.code = 401;
    throw err;
  }
  return res;
}

/* 供 Info 用的小工具（只在本檔內使用） */
function withHost(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const u = url.startsWith("/") ? url : `/${url}`;
  return `http://localhost:3005${u}`;
}

function toAvatarUrl(img) {
  if (!img) return "/images/default-avatar.svg";
  if (/^https?:\/\//i.test(img)) return img;
  let path = String(img).trim();
  if (!path.includes("/")) path = `/uploads/avatars/${path}`;
  if (!path.startsWith("/")) path = `/${path}`;
  return withHost(path);
}

/* ---------- 資料整形：Tags / Images 強化 ---------- */
function normalizeTagsFromAny(cand) {
  if (Array.isArray(cand)) {
    return cand
      .map((t) =>
        typeof t === "string"
          ? t
          : t?.name || t?.tag_name || t?.title || t?.label || ""
      )
      .map((s) => String(s).replace(/^#/, "").trim())
      .filter(Boolean);
  }
  if (typeof cand === "string") {
    try {
      const parsed = JSON.parse(cand);
      if (Array.isArray(parsed)) return normalizeTagsFromAny(parsed);
    } catch {}
    return cand
      .split(/[,\s]+/)
      .map((s) => s.replace(/^#/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeTags(item = {}) {
  const candidates = [
    item.tags,
    item.post_tags,
    item.tag_names,
    item.tags_json,
    item.tagList,
  ];
  for (const c of candidates) {
    const arr = normalizeTagsFromAny(c);
    if (arr.length) return arr;
  }
  return [];
}

function normalizeImages(item = {}) {
  const candidates = [item.images, item.post_images, item.images_json];
  for (const cand of candidates) {
    if (!cand) continue;
    if (Array.isArray(cand)) {
      const arr = cand
        .map((x) =>
          typeof x === "string" ? x : x?.image_url || x?.url || x?.src || ""
        )
        .filter(Boolean);
      if (arr.length) return arr;
    }
    if (typeof cand === "string") {
      try {
        const parsed = JSON.parse(cand);
        if (Array.isArray(parsed)) return normalizeImages({ images: parsed });
      } catch {}
    }
  }
  return [];
}

/* ---------- 新增：布林/數字正規化 ---------- */
function toBool(v) {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return false;
}
function nz(n, d = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : d;
}

/* 後端 → 前端資料整形 */
function normalizePost(item = {}) {
  const likes = nz(item.like_count ?? item.likes ?? item.likeCount, 0);
  const comments = nz(
    item.comment_count ?? item.comments ?? item.commentCount,
    0
  );
  const bookmarks = nz(
    item.bookmark_count ?? item.bookmarks ?? item.bookmarkCount,
    0
  );

  const liked = toBool(
    item.is_liked ??
      item.me_liked ??
      item.liked ??
      item.isLiked ??
      item.liked_by_me ??
      item.isLike
  );
  const saved = toBool(
    item.is_bookmarked ??
      item.me_bookmarked ??
      item.bookmarked ??
      item.isBookmarked ??
      item.saved_by_me ??
      item.isSaved
  );

  return {
    ...item,
    id: item.id,
    users_id: item.users_id,
    category_id: item.category_id,
    title: item.title,
    content: item.content,
    created_at: item.created_at,
    updated_at: item.updated_at,
    is_hot: item.is_hot,
    view_count: item.view_count,
    author: { nickname: item.author_nickname, avatar: item.author_img },
    category_name: item.category_name,
    category_icon: item.category_icon || "",
    images: normalizeImages(item),
    tags: normalizeTags(item),
    counts: { likes, comments, bookmarks },
    likes,
    comments,
    bookmarks,
    flags: { liked, saved },
    is_liked: liked,
    is_bookmarked: saved,
  };
}

function normalizeComment(c = {}) {
  return {
    id: c.id,
    post_id: c.post_id,
    users_id: c.users_id,
    parent_id: c.parent_id ?? null,
    reply_to_comment_id: c.reply_to_comment_id ?? null,
    content: c.content,
    created_at: c.created_at,
    author: { nickname: c.author_nickname, avatar: c.author_img },
  };
}

function pickUser(payload) {
  const d = payload?.data ?? null;
  if (d?.user) return d.user;
  if (d?.id || d?.account || d?.nickname) return d;
  if (payload?.user) return payload.user;
  return null;
}

/* ============================ Provider ============================ */
export function ForumsProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [postDetail, setPostDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const ensureMe = useCallback(async () => {
    try {
      const res = await authFetch(API_STATUS, { method: "POST" });
      const json = await res.json();
      if (json?.status === "success") {
        const user = pickUser(json);
        setCurrentUser(user || null);
        return user || null;
      }
      setCurrentUser(null);
      return null;
    } catch {
      setCurrentUser(null);
      return null;
    }
  }, []);

  // ★★★ 覆蓋這個函式：支援 sort 參數，維持 append 合併 ★★★
  const list = useCallback(async (params = {}) => {
    const { page, per_page, category_id, q, sort, append } = params || {};
    const qs = new URLSearchParams();
    if (page) qs.set("page", page);
    if (per_page) qs.set("per_page", per_page);
    if (category_id) qs.set("category_id", category_id);
    if (sort) qs.set("sort", String(sort).toLowerCase()); // ← 新增
    if (q) qs.set("q", q); // 保留未來擴充

    const url = `${API_FORUMS}/posts${
      qs.toString() ? "?" + qs.toString() : ""
    }`;

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
      });
      const result = await res.json();

      if (result?.status === "success" && Array.isArray(result.data)) {
        const incoming = result.data.map(normalizePost);

        if (append) {
          setPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return prev.concat(incoming.filter((p) => !seen.has(p.id)));
          });
        } else {
          setPosts(incoming);
        }

        setPagination(result.pagination || null);
      } else {
        throw new Error(result?.message || "取得文章列表失敗");
      }
    } catch (err) {
      console.error("forums list error:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const detail = useCallback(async (postId) => {
    if (!postId) return;
    const url = `${API_FORUMS}/posts/${postId}`;

    try {
      setIsLoading(true);
      setError(null);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("reactLoginToken")
          : null;

      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const result = await res.json();
      if (result?.status === "success" && result.data) {
        setPostDetail(normalizePost(result.data));
      } else {
        throw new Error(result?.message || "取得文章失敗");
      }
    } catch (err) {
      console.error("forums detail error:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const commentsList = useCallback(async (postId, params = {}) => {
    if (!postId) return;

    const page = Math.max(1, parseInt(params.page || 1, 10));
    const limit = Math.max(1, Math.min(500, parseInt(params.limit || 20, 10)));
    const append = !!params.append;

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    qs.set("order", "asc");

    const url = `${API_FORUMS}/posts/${postId}/comments?${qs.toString()}`;

    setCommentsMap((prev) => ({
      ...prev,
      [postId]: { ...(prev[postId] || {}), isLoading: true, error: null },
    }));

    try {
      const res = await fetch(url, { cache: "no-store" });

      let result = null;
      let rawText = "";
      try {
        rawText = await res.text();
        result = rawText ? JSON.parse(rawText) : null;
      } catch {
        result = null;
      }

      let ok = res.ok;
      let rows = [];
      let pagination = null;
      let errMsg = "";

      if (ok) {
        if (Array.isArray(result)) {
          rows = result;
        } else if (
          result &&
          result.status === "success" &&
          Array.isArray(result.data)
        ) {
          rows = result.data;
          pagination = result.pagination || null;
        } else if (result && Array.isArray(result.data)) {
          rows = result.data;
          pagination = result.pagination || null;
        } else {
          ok = false;
          errMsg =
            (result && (result.message || result.msg)) ||
            "留言列表格式不符合預期";
        }
      } else {
        errMsg =
          (result && (result.message || result.msg)) ||
          (rawText && rawText.slice(0, 180)) ||
          `HTTP ${res.status}`;
      }

      if (!ok) {
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: {
            ...(prev[postId] || {}),
            isLoading: false,
            error: new Error(errMsg),
          },
        }));
        return;
      }

      const newItems = rows.map(normalizeComment);
      const newPagination = pagination || {
        page,
        limit,
        total: Array.isArray(rows) ? rows.length : 0,
        pages: undefined,
      };

      setCommentsMap((prev) => {
        const bucket = prev[postId] || { items: [], pagination: null };
        let merged = newItems;

        if (append) {
          const map = new Map();
          for (const it of [...(bucket.items || []), ...newItems]) {
            map.set(it.id, it);
          }
          merged = Array.from(map.values());
        }

        merged.sort((a, b) => {
          if (a.created_at === b.created_at) return (a.id || 0) - (b.id || 0);
          return a.created_at < b.created_at ? -1 : 1;
        });

        return {
          ...prev,
          [postId]: {
            ...bucket,
            items: merged,
            pagination: newPagination,
            isLoading: false,
            error: null,
          },
        };
      });
    } catch (err) {
      console.error("comments list fetch error:", err);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: { ...(prev[postId] || {}), isLoading: false, error: err },
      }));
    }
  }, []);

  const postComment = useCallback(async (postId, content, opts = {}) => {
    if (!postId) throw new Error("postId 不可為空");
    const url = `${API_FORUMS}/posts/${postId}/comments`;

    const { parentId = null, replyToCommentId = null } = opts || {};
    const body = {
      content,
      ...(parentId ? { parent_id: parentId } : {}),
      ...(replyToCommentId ? { reply_to_comment_id: replyToCommentId } : {}),
    };

    const res = await authFetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    let result = null;
    try {
      result = await res.json();
    } catch {
      throw new Error("新增留言失敗（回應格式錯誤）");
    }

    if (result?.status !== "success" || !result.data) {
      throw new Error(result?.message || "新增留言失敗");
    }

    const newItem = normalizeComment(result.data);

    setCommentsMap((prev) => {
      const bucket = prev[postId] || {
        items: [],
        pagination: null,
        isLoading: false,
        error: null,
      };

      const items = [...(bucket.items || []), newItem];

      items.sort((a, b) => {
        if (a.created_at === b.created_at) return (a.id || 0) - (b.id || 0);
        return a.created_at < b.created_at ? -1 : 1;
      });

      const pagination = bucket.pagination
        ? { ...bucket.pagination, total: (bucket.pagination.total || 0) + 1 }
        : bucket.pagination;

      return {
        ...prev,
        [postId]: {
          ...bucket,
          items,
          pagination,
          isLoading: false,
          error: null,
        },
      };
    });

    return newItem;
  }, []);

  return (
    <ForumsContext.Provider
      value={{
        posts,
        postDetail,
        isLoading,
        error,
        pagination,
        list,
        detail,
        commentsMap,
        commentsList,
        postComment,
        currentUser,
        ensureMe,
      }}
    >
      {children}
    </ForumsContext.Provider>
  );
}

/* ============================ Hooks（對外） ============================ */
export const useForums = () => useContext(ForumsContext);

export function useForumsList() {
  const { posts, isLoading, error, pagination, list } = useForums();
  return { posts, isLoading, error, pagination, list };
}

export function useForumPost() {
  const {
    postDetail,
    isLoading,
    error,
    detail,
    commentsMap,
    commentsList,
    postComment,
    currentUser,
    ensureMe,
  } = useForums();
  return {
    postDetail,
    isLoading,
    error,
    detail,
    commentsMap,
    commentsList,
    postComment,
    currentUser,
    ensureMe,
  };
}

/* ============================ NEW: Info page hook ============================ */
export function useForumsInfo(
  userId,
  options = { page: 1, limit: 20, autoLoad: true }
) {
  // 取出 currentUser 與 ensureMe（用來判斷「不可追隨自己」）
  const { currentUser, ensureMe } = useForums();
  const router = useRouter();

  // 登入導向
  const redirectToLogin = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    router.push(`${LOGIN_PATH}?next=${next}`);
  }, [router]);

  const requireAuthOrRedirect = useCallback(() => {
    const token = getToken();
    if (!token) {
      toast.error("請先登入", { transition: Bounce });
      redirectToLogin();
      return false;
    }
    return true;
  }, [redirectToLogin]);

  // 取自己 id（用 currentUser，沒有就 ensureMe）
  const getMeId = useCallback(async () => {
    if (currentUser?.id) return Number(currentUser.id);
    const me = await ensureMe();
    return Number(me?.id || 0);
  }, [currentUser, ensureMe]);

  const [targetId, setTargetId] = useState(() => Number(userId || 0));
  useEffect(() => {
    setTargetId(Number(userId || 0));
  }, [userId]);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState({ profile: false, posts: false });
  // ★ NEW: 分頁狀態（放在 useState 區塊裡）
  const [pagination, setPagination] = useState({
    page: options.page || 1,
    limit: options.limit || 20,
    pages: 1,
    total: 0,
  });

  // ★ NEW: 監聽 page/limit 變化（autoLoad 時才重抓）
  useEffect(() => {
    if (!targetId) return;
    if (!options?.autoLoad) return;

    // 你的 reloadPosts 如果有支援參數，也可傳入 { page: options.page, limit: options.limit }
    // 這裡依照你原本的實作呼叫即可
    reloadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, options?.page, options?.limit, options?.autoLoad]);

  const reloadProfile = useCallback(
    async (_id = targetId) => {
      if (!_id) return;
      try {
        setLoading((s) => ({ ...s, profile: true }));
        const res = await authFetch(`${API_FORUMS}/users/${_id}/info`, {
          method: "GET",
        });
        const json = await res.json();
        if (json?.status === "success" && json.data) {
          setProfile(json.data);
          setIsFollowing(!!json.data.is_following);
        } else {
          throw new Error(json?.message || "取得會員資訊失敗");
        }
      } catch (err) {
        // 這裡先不噴 toast，避免頁面載入時過多提示
        console.error("reloadProfile error:", err);
      } finally {
        setLoading((s) => ({ ...s, profile: false }));
      }
    },
    [targetId]
  );

  const reloadPosts = useCallback(
    async (
      page = options.page || 1,
      limit = options.limit || 20,
      _id = targetId
    ) => {
      if (!_id) return;
      try {
        setLoading((s) => ({ ...s, posts: true }));
        const res = await fetch(
          `${API_FORUMS}/users/${_id}/posts?page=${page}&limit=${limit}`,
          { credentials: "include", cache: "no-store" }
        );
        const json = await res.json();
        if (json?.status === "success") {
          // 兼容 rows/posts/list 三種命名
          const rows =
            json?.data?.rows ??
            json?.data?.posts ??
            json?.data?.list ??
            json?.data ??
            [];

          setPosts(
            Array.isArray(rows)
              ? rows.map((p) =>
                  typeof normalizePost === "function" ? normalizePost(p) : p
                )
              : []
          );

          // ★ NEW: 接住後端的 pagination / meta
          const meta =
            json?.pagination || json?.meta || json?.data?.pagination || {};

          const nextPage = Number(options.page ?? 1);
          const nextLimit = Number(options.limit ?? 20);
          const total = Number(
            meta.total ?? meta.totalCount ?? meta.count ?? 0
          );
          const pages = Number(
            meta.pages ?? (total > 0 ? Math.ceil(total / nextLimit) : 1)
          );

          setPagination({
            page: nextPage || 1,
            limit: nextLimit || 20,
            total: Number.isFinite(total) ? total : 0,
            pages: pages || 1,
          });
        } else {
          throw new Error(json?.message || "取得使用者文章失敗");
        }
      } catch (err) {
        console.error("reloadPosts error:", err);
        toast.error(err?.message || "取得使用者文章失敗", {
          transition: Bounce,
        });
      } finally {
        setLoading((s) => ({ ...s, posts: false }));
      }
    },
    [targetId, options.page, options.limit]
  );

  /* 追隨 */
  const follow = useCallback(async () => {
    if (!targetId) return;

    // 未登入：導頁 + toast
    if (!requireAuthOrRedirect()) return;

    // 不可追隨自己
    const meId = await getMeId();
    if (meId && meId === Number(targetId)) {
      toast.error("不可追隨自己", { transition: Bounce });
      return;
    }

    // 樂觀更新
    setIsFollowing(true);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            stats: {
              ...prev.stats,
              followers_count: Number(prev?.stats?.followers_count || 0) + 1,
            },
          }
        : prev
    );

    try {
      const res = await authFetch(`${API_FORUMS}/users/${targetId}/follow`, {
        method: "POST",
      });
      const json = await res.json();
      if (json?.status !== "success") {
        throw new Error(json?.message || "追隨失敗");
      }
    } catch (err) {
      // 回滾
      setIsFollowing(false);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                followers_count: Math.max(
                  0,
                  Number(prev?.stats?.followers_count || 0) - 1
                ),
              },
            }
          : prev
      );

      if (err?.code === 401) {
        toast.error("請先登入", { transition: Bounce });
        redirectToLogin();
        return;
      }
      toast.error(err?.message || "追隨失敗", { transition: Bounce });
      // 不再 throw，避免 Runtime Error
    }
  }, [targetId, requireAuthOrRedirect, getMeId, redirectToLogin]);

  /* 取消追隨 */
  const unfollow = useCallback(async () => {
    if (!targetId) return;

    // 未登入：導頁 + toast
    if (!requireAuthOrRedirect()) return;

    //（可選）若是自己其實也沒有 follow 關係，直接略過
    const meId = await getMeId();
    if (meId && meId === Number(targetId)) {
      toast.info("這是你自己的頁面", { transition: Bounce });
      return;
    }

    // 樂觀更新
    setIsFollowing(false);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            stats: {
              ...prev.stats,
              followers_count: Math.max(
                0,
                Number(prev?.stats?.followers_count || 0) - 1
              ),
            },
          }
        : prev
    );

    try {
      const res = await authFetch(`${API_FORUMS}/users/${targetId}/follow`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json?.status !== "success") {
        throw new Error(json?.message || "取消追隨失敗");
      }
    } catch (err) {
      // 回滾
      setIsFollowing(true);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                followers_count: Number(prev?.stats?.followers_count || 0) + 1,
              },
            }
          : prev
      );

      if (err?.code === 401) {
        toast.error("請先登入", { transition: Bounce });
        redirectToLogin();
        return;
      }
      toast.error(err?.message || "取消追隨失敗", { transition: Bounce });
      // 不再 throw
    }
  }, [targetId, requireAuthOrRedirect, getMeId, redirectToLogin]);

  /* 自動載入：未帶 id 則以 ensureMe 補上 */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let id = targetId;
      if (!id && options?.autoLoad !== false) {
        const me = await ensureMe();
        id = Number(me?.id || 0);
        if (!cancelled && id && id !== targetId) setTargetId(id);
      }
      if (!id) return;
      await Promise.all([
        reloadProfile(id),
        reloadPosts(options.page, options.limit, id),
      ]);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [targetId]);

  // ★★★ 新增：分頁抓使用者文章（支援 append）★★★
  const listPosts = useCallback(
    async (params = {}) => {
      const _id = targetId;
      if (!_id) return;

      const page = Math.max(1, parseInt(params.page || 1, 10));
      const limit = Math.max(
        1,
        Math.min(100, parseInt(params.limit || 20, 10))
      );
      const append = !!params.append;

      try {
        setLoading((s) => ({ ...s, posts: true }));
        const res = await fetch(
          `${API_FORUMS}/users/${_id}/posts?page=${page}&limit=${limit}`,
          { credentials: "include", cache: "no-store" }
        );
        const json = await res.json();

        if (json?.status === "success") {
          // 兼容 rows/posts/list 三種命名
          const rows =
            json?.data?.rows ??
            json?.data?.posts ??
            json?.data?.list ??
            json?.data ??
            [];

          const incoming = Array.isArray(rows)
            ? rows.map((p) =>
                typeof normalizePost === "function" ? normalizePost(p) : p
              )
            : [];

          if (append) {
            setPosts((prev) => {
              const seen = new Set(prev.map((p) => p.id));
              const merged = prev.concat(
                incoming.filter((p) => !seen.has(p.id))
              );
              return merged;
            });
          } else {
            setPosts(incoming);
          }

          // 接住後端的 pagination / meta
          const meta =
            json?.pagination || json?.meta || json?.data?.pagination || {};
          const total = Number(
            meta.total ?? meta.totalCount ?? meta.count ?? 0
          );
          const pages = Number(
            meta.pages ?? (total > 0 ? Math.ceil(total / limit) : 1)
          );

          setPagination({
            page,
            limit,
            total: Number.isFinite(total) ? total : 0,
            pages: pages || 1,
          });
        } else {
          throw new Error(json?.message || "取得使用者文章失敗");
        }
      } catch (err) {
        console.error("listPosts error:", err);
        toast.error(err?.message || "取得使用者文章失敗", {
          transition: Bounce,
        });
      } finally {
        setLoading((s) => ({ ...s, posts: false }));
      }
    },
    [targetId]
  );

  const uiUser = useMemo(() => {
    const u = profile || {};
    const stats = u.stats || {};
    return {
      id: u.id,
      name: u.nickname || u.name || "使用者",
      handle: u.account ? `${u.account}` : "",
      avatar: toAvatarUrl(u.avatar || u.img || ""),
      stats: {
        posts: Number(stats.posts_count || 0),
        followers: Number(stats.followers_count || 0),
        following: Number(stats.following_count || 0),
      },
    };
  }, [profile]);

  return {
    uiUser,
    profile,
    posts,
    isFollowing,
    loading,
    pagination,
    follow,
    unfollow,
    reloadProfile,
    reloadPosts,
    ensureMe,
    listPosts,
  };
}

/* ============================
 * 會員清單：按讚 / 收藏
 * ============================ */
function buildListState() {
  return {
    posts: [],
    loading: { posts: false },
    pagination: { page: 1, limit: 3, pages: 1, total: 0 },
    error: null,
  };
}

function useUserPostList(userId, kind, options = {}) {
  const [state, setState] = useState(buildListState());
  const page = Number(options.page || state.pagination.page || 1);
  const limit = Number(options.limit || state.pagination.limit || 3);
  const autoLoad = options.autoLoad ?? true;

  const load = useCallback(
    async (p = page, l = limit) => {
      if (!userId) return;
      setState((s) => ({
        ...s,
        loading: { ...s.loading, posts: true },
        error: null,
      }));
      try {
        const url = `${API_FORUMS}/users/${userId}/${kind}/posts?page=${p}&limit=${l}`;
        const res = await authFetch(url);
        const json = await res.json();
        if (json?.status !== "success")
          throw new Error(json?.message || "載入失敗");
        const rows = Array.isArray(json?.data) ? json.data : [];
        setState({
          posts: rows.map(normalizePost),
          loading: { posts: false },
          pagination: json?.pagination || {
            page: p,
            limit: l,
            pages: 1,
            total: rows.length,
          },
          error: null,
        });
      } catch (err) {
        console.error(`load ${kind} posts error:`, err);
        setState((s) => ({
          ...s,
          loading: { ...s.loading, posts: false },
          error: err,
        }));
        toast.error(err?.message || "載入失敗", {
          transition: Bounce,
          autoClose: 1600,
          theme: "dark",
        });
      }
    },
    [userId, kind, page, limit]
  );

  useEffect(() => {
    if (autoLoad && userId) load(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, userId, page, limit, kind]);

  const reload = useCallback(
    () => load(state.pagination.page, state.pagination.limit),
    [load, state.pagination]
  );

  return { ...state, reload };
}

export function useUserLikedPosts(userId, options = {}) {
  return useUserPostList(userId, "likes", options);
}

export function useUserBookmarkedPosts(userId, options = {}) {
  return useUserPostList(userId, "bookmarks", options);
}

/* ============================
 * 會員清單：追蹤中使用者（每頁預設 8）
 * ============================ */
function buildFollowingState() {
  return {
    users: [],
    loading: { users: false },
    pagination: { page: 1, limit: 8, pages: 1, total: 0 },
    error: null,
  };
}

export function useUserFollowing(userId, options = {}) {
  const [state, setState] = useState(buildFollowingState());
  const page = Number(options.page ?? state.pagination.page ?? 1);
  const limit = Number(options.limit ?? state.pagination.limit ?? 8);
  const autoLoad = options.autoLoad ?? true;

  const load = useCallback(
    async (p = page, l = limit) => {
      if (!userId) return;
      setState((s) => ({
        ...s,
        loading: { ...s.loading, users: true },
        error: null,
      }));
      try {
        const url = `${API_FORUMS}/users/${userId}/following?page=${p}&limit=${l}`;
        const res = await authFetch(url);
        const json = await res.json();
        if (json?.status !== "success")
          throw new Error(json?.message || "載入失敗");

        const list = Array.isArray(json?.data) ? json.data : [];
        setState({
          users: list,
          loading: { users: false },
          pagination: json?.pagination || {
            page: p,
            limit: l,
            pages: 1,
            total: list.length,
          },
          error: null,
        });
      } catch (err) {
        console.error("useUserFollowing load error:", err);
        setState((s) => ({
          ...s,
          loading: { ...s.loading, users: false },
          error: err,
        }));
        // 如需提示：可開啟下行（此檔若已引入 toast）
        // toast.error(err?.message || "載入失敗", { transition: Bounce, autoClose: 1600, theme: "dark" });
      }
    },
    [userId, page, limit]
  );

  useEffect(() => {
    if (autoLoad && userId) load(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, userId, page, limit]);

  /** 切換追蹤（成功取消後，從列表移除） */
  const toggleFollow = useCallback(async (targetId) => {
    if (!targetId) return;
    try {
      const res = await authFetch(`${API_FORUMS}/follows/${targetId}`, {
        method: "POST",
      });
      const json = await res.json();
      if (json?.status !== "success")
        throw new Error(json?.message || "追蹤操作失敗");

      // 這頁是「管理追蹤」，取消追蹤就直接把對象從列表移除
      setState((s) => {
        const nextUsers = (s.users || []).filter(
          (u) => Number(u.id) !== Number(targetId)
        );
        const nextTotal = Math.max(0, Number(s.pagination?.total || 0) - 1);
        return {
          ...s,
          users: nextUsers,
          pagination: { ...s.pagination, total: nextTotal },
        };
      });
    } catch (err) {
      console.error("useUserFollowing toggleFollow error:", err);
      // toast?.error?.(err?.message || "操作失敗");
    }
  }, []);

  const reload = useCallback(
    () => load(state.pagination.page, state.pagination.limit),
    [load, state.pagination]
  );

  return { ...state, load, reload, toggleFollow };
}
