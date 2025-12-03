/* eslint-disable no-console */
"use client";

import { useCallback } from "react";

const API_FORUMS = "http://localhost:3005/api/forums";

export function useForumsWrite() {
  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("reactLoginToken")
      : null;

  const getCategories = useCallback(async () => {
    const res = await fetch(`${API_FORUMS}/categories`, { cache: "no-store" });
    const json = await res.json();
    if (json?.status === "success") return json.data;
    throw new Error(json?.message || "取得分類失敗");
  }, []);

  const createPost = useCallback(async (formData) => {
    if (!(formData instanceof FormData)) throw new Error("請傳入 FormData");

    const token = getToken();
    const res = await fetch(`${API_FORUMS}/posts`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.status !== "success") {
      throw new Error(json?.message || "新增貼文失敗");
    }
    return json.data?.id;
  }, []);

  const deletePost = useCallback(async (postId) => {
    if (!postId) throw new Error("postId 不可為空");
    const token = getToken();
    if (!token) throw new Error("請先登入");

    const res = await fetch(`${API_FORUMS}/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.status !== "success") {
      let msg = json?.message || "刪除貼文失敗";
      if (res.status === 401) msg = "登入驗證失效，請重新登入";
      else if (res.status === 403) msg = "無權限刪除此文章";
      else if (res.status === 404) msg = "文章不存在或已刪除";
      throw new Error(msg);
    }
    return true;
  }, []);

  /**
   * 更新貼文（支援圖片清空）
   * 用法：
   *  updatePost(id, formData)
   *  updatePost(id, { title, content, category_id, tag_names, tag_ids, images, image_plan:[], keep_urls:[], content_html })
   */
  const updatePost = useCallback(async (postId, payload = {}) => {
    if (!postId) throw new Error("postId 不可為空");

    const token = getToken();
    if (!token) throw new Error("請先登入");

    let fd;

    if (payload instanceof FormData) {
      fd = payload;
    } else {
      fd = new FormData();

      if (payload.title !== undefined) {
        const t = String(payload.title).trim();
        if (!t || t.length > 50) throw new Error("標題必填且 ≤ 50 字");
        fd.set("title", t);
      }
      if (payload.content !== undefined) {
        const c = String(payload.content).trim();
        if (!c || c.length > 500) throw new Error("內文必填且 ≤ 500 字");
        fd.set("content", c);
      }
      if (payload.category_id !== undefined) {
        const cid = Number(payload.category_id);
        if (!Number.isInteger(cid)) throw new Error("category_id 必須是整數");
        fd.set("category_id", String(cid));
      }

      if (payload.tag_names !== undefined) {
        const arr = Array.isArray(payload.tag_names)
          ? payload.tag_names
          : String(payload.tag_names || "")
              .split(/[,\s]+/)
              .map((s) => s.trim())
              .filter(Boolean);
        fd.set("tag_names", JSON.stringify(arr));
      }
      if (payload.tag_ids !== undefined) {
        const ids = Array.isArray(payload.tag_ids)
          ? payload.tag_ids
          : String(payload.tag_ids || "")
              .split(/[,\s]+/)
              .map((s) => s.trim())
              .filter(Boolean);
        fd.set("tag_ids", ids.join(","));
      }

      if (payload.images) {
        const files = Array.isArray(payload.images)
          ? payload.images
          : Array.from(payload.images);
        files.slice(0, 6).forEach((file) => {
          if (file instanceof File) fd.append("images", file);
        });
      }

      // 關鍵修正：只要是陣列就送（包含 []）
      if (Array.isArray(payload.image_plan)) {
        fd.set("image_plan", JSON.stringify(payload.image_plan));
      }
      if (Array.isArray(payload.keep_urls)) {
        fd.set("keep_urls", JSON.stringify(payload.keep_urls));
      }

      if (payload.content_html !== undefined) {
        fd.set("content_html", String(payload.content_html || ""));
      }
    }

    const res = await fetch(`${API_FORUMS}/posts/${postId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.status !== "success") {
      let msg = json?.message || "更新貼文失敗";
      if (res.status === 401) msg = "登入驗證失效，請重新登入";
      else if (res.status === 403) msg = "無權限編輯此文章";
      else if (res.status === 404) msg = "文章不存在或已刪除";
      throw new Error(msg);
    }

    return true;
  }, []);

  return { getCategories, createPost, deletePost, updatePost };
}
