"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
// import Image from "next/image";
import styles from "../forums.module.css";

import { toast, ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Tiptap
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExt from "@tiptap/extension-image";
import CharacterCount from "@tiptap/extension-character-count";

// Hooks
import { useForumPost } from "../../../hooks/use-forums";
import { useForumsWrite } from "../../../hooks/use-forums-write";

/* ---------- helpers ---------- */
// 統一預設頭像 + placeholder 辨識 + 路徑正規化
const DEFAULT_AVATAR = "/images/default-avatar.svg";
const PLACEHOLDER_HOST =
  /^https?:\/\/(?:placehold\.co|via\.placeholder\.com)(?:\/|$)/i;

function resolveAvatar(input) {
  if (!input) return DEFAULT_AVATAR;

  let s = String(input).trim();
  if (!s) return DEFAULT_AVATAR;

  // 任何 placeholder 網域 → 視為空值（改站內預設圖）
  if (PLACEHOLDER_HOST.test(s)) return DEFAULT_AVATAR;

  // http(s) 絕對網址 → 原樣
  if (/^https?:\/\//i.test(s)) return s;

  // 僅檔名 → /uploads/avatars/<檔名>
  if (!s.includes("/")) s = `/uploads/avatars/${s}`;
  // 相對路徑補起始斜線
  if (!s.startsWith("/")) s = `/${s}`;

  const origin =
    (typeof window !== "undefined" && window.__API_ORIGIN__) ||
    "http://localhost:3005";

  return `${origin}${s}`;
}

// 把相對/裸路徑轉成 URL（新增頁其實是 blob 圖，這裡預備好）
const resolveImg = (u) =>
  !u ? "" : /^https?:\/\//i.test(u) ? u : u.startsWith("/") ? u : `/${u}`;

/** 從 editor JSON 還原：textOnly、contentWithImgMarkers（保留空行與 [img]） */
function extractTextAndMarkersFromDoc(json) {
  const lines = [];
  let textLen = 0;

  (json?.content || []).forEach((n) => {
    if (n.type === "paragraph") {
      const t = (n.content || [])
        .filter((x) => x.type === "text" && x.text)
        .map((x) => x.text)
        .join("");
      lines.push(t); // 可能是空字串 -> 代表空行
      textLen += t.length; // 字數只算文字，不算換行與圖片
    } else if (n.type === "image") {
      lines.push("[img]"); // 圖片獨立一行，之後前台可用 images 對位
    }
  });

  const withMarkers = lines.join("\n"); // 完整內容（含空行、[img]）
  const textOnly = lines.filter((x) => x !== "[img]").join("\n"); // 純文字（保留空行）
  return { textOnly, withMarkers, textLength: textLen };
}

export default function WriteForm() {
  const router = useRouter();
  const editorRootRef = useRef(null);
  const fetchedCatsRef = useRef(false);

  // 後端 API
  const { ensureMe, currentUser } = useForumPost();
  const { getCategories, createPost } = useForumsWrite();

  // 狀態
  const [title, setTitle] = useState("");
  const [contentCount, setContentCount] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  // ★ 存檔案本體 file（維持你原本結構）
  const [blobImages, setBlobImages] = useState([]); // [{ url, id, file }]

  const [submitting, setSubmitting] = useState(false);

  const maxTitle = 50;
  const maxContent = 500;
  const maxImages = 6;

  // 取登入者：未登入就跳轉到登入頁
  useEffect(() => {
    (async () => {
      const user = await ensureMe().catch(() => null);
      if (!user) {
        router.replace(`/auth/login`);
      }
    })();
  }, [ensureMe, router]);

  // 取分類
  useEffect(() => {
    if (fetchedCatsRef.current) return;
    fetchedCatsRef.current = true;

    (async () => {
      try {
        const list = await getCategories();
        setCategories(list);
        // 初次載入預設選第一個分類（若尚未有值）
        setCategoryId((prev) =>
          prev ? prev : list[0]?.id ? String(list[0].id) : ""
        );
      } catch (err) {
        console.error("取得分類失敗：", err);
      }
    })();
  }, [getCategories]);

  // 原本：const uiUser = currentUser || { name: "讀取中...", avatar: "/images/avatar-placeholder.png" };
  const uiUser = {
    name:
      currentUser?.nickname ||
      currentUser?.name ||
      currentUser?.account ||
      "使用者",
    nickname: currentUser?.nickname,
  };

  // ★ 使用者頭像：先顯示預設，背景預載成功才切換
  const [authorAvatarSrc, setAuthorAvatarSrc] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    const raw = currentUser?.img || currentUser?.avatar || "";
    const url = resolveAvatar(raw);

    // 空值/預設 → 維持預設，不切換，避免 SSR 閃爍
    if (!url || url === DEFAULT_AVATAR) {
      setAuthorAvatarSrc(DEFAULT_AVATAR);
      return;
    }

    let canceled = false;
    const img = new Image();
    img.onload = () => {
      if (!canceled) setAuthorAvatarSrc(url);
    };
    img.onerror = () => {
      if (!canceled) setAuthorAvatarSrc(DEFAULT_AVATAR);
    };
    img.src = url;

    return () => {
      canceled = true;
    };
  }, [currentUser?.img, currentUser?.avatar]);

  // Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: { keepMarks: true, keepAttributes: true },
      }),
      Placeholder.configure({
        placeholder: "寫點什麼吧…(必填)",
        showOnlyCurrent: false,
        includeChildren: true,
        emptyEditorClass: "is-editor-empty",
      }),
      ImageExt.configure({ allowBase64: false, inline: false }),
      CharacterCount.configure({ limit: maxContent }),
    ],
    editorProps: {
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items || []);
        const files = items.map((it) => it.getAsFile?.()).filter(Boolean);
        if (!files.length) return false;
        event.preventDefault();
        insertFilesAsImages(files);
        return true;
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) return false;
        event.preventDefault();
        insertFilesAsImages(files);
        return true;
      },
    },
    onUpdate({ editor }) {
      // 用 JSON 計數（只算純文字）
      const { textLength } = extractTextAndMarkersFromDoc(editor.getJSON());
      setContentCount(textLength);
    },
    immediatelyRender: false,
  });

  // 插入圖片（★ 修正：每張圖後補一個 paragraph，避免覆蓋/壞圖）
  function insertBlobImage(url) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "image", attrs: { src: url, alt: "內文圖片" } },
        { type: "paragraph" },
      ])
      .run();
  }

  function insertFilesAsImages(files) {
    if (!editor) return;
    const imagesOnly = files.filter((f) => f && /^image\//.test(f.type));
    if (!imagesOnly.length) return;

    const remain = Math.max(0, maxImages - blobImages.length);
    if (remain <= 0) return;

    const picked = imagesOnly.slice(0, remain);
    const added = [];

    editor.chain().focus().run();

    picked.forEach((file) => {
      const url = URL.createObjectURL(file);
      const id = String(Date.now() + Math.random()).replace(".", "");
      added.push({ url, id, file });
      insertBlobImage(url);
    });

    if (added.length) {
      setBlobImages((prev) => [...prev, ...added]);
    }
  }

  // 移除節點時釋放 blob
  useEffect(() => {
    if (!editor) return;
    const root = editorRootRef.current?.querySelector?.(".ProseMirror");
    if (!root) return;

    const obs = new MutationObserver((muts) => {
      const removedSrc = [];
      muts.forEach((m) => {
        m.removedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const imgs = [];
          if (node.tagName === "IMG") imgs.push(node);
          node.querySelectorAll?.("img")?.forEach((x) => imgs.push(x));
          imgs.forEach((img) => {
            const src = img.getAttribute("src");
            if (src && src.startsWith("blob:")) removedSrc.push(src);
          });
        });
      });
      if (removedSrc.length) {
        // 合併為一次 setState，並且「一定」回傳新陣列，避免把 state 設成 undefined
        setBlobImages((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          // 先釋放被移除的 blob URL
          list
            .filter((x) => removedSrc.includes(x.url))
            .forEach((x) => URL.revokeObjectURL(x.url));
          // 回傳過濾後的新清單
          return list.filter((x) => !removedSrc.includes(x.url));
        });
      }
    });

    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [editor]);

  // 標籤
  function addTagFromInput() {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }
  function onTagKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTagFromInput();
    }
  }
  function removeTag(t) {
    setTags(tags.filter((x) => x !== t));
  }

  // 送出
  async function onSubmit(e) {
    e.preventDefault();

    // ★ 從 JSON 取出：純文字字串 / 含 [img] 的字串（保留空行）
    const json = editor?.getJSON();
    const { textOnly, withMarkers, textLength } =
      extractTextAndMarkersFromDoc(json);

    if (!categoryId) return toast.error("請選擇看板");
    if (!title.trim()) return toast.error("請輸入標題");
    if (title.trim().length > maxTitle) return toast.error("標題最長 50 字");
    if (!textOnly) return toast.error("請輸入內文");
    if (textLength > maxContent) return toast.error("內文最長 500 字");

    // 編輯器原始 HTML（讓後端把 blob: 替換為正式 URL）
    const html = editor?.getHTML() || "";

    try {
      setSubmitting(true);

      const fd = new FormData();
      fd.set("category_id", String(categoryId));
      fd.set("title", title.trim());
      // ★ 關鍵：content 改用 withMarkers（保留空行與圖片位置）
      fd.set("content", withMarkers);
      fd.set("content_html", html);
      if (tags.length) fd.set("tag_names", JSON.stringify(tags));

      // 依加入順序送出圖片
      blobImages.forEach((img, i) => {
        if (img.file) {
          fd.append("images", img.file, `editor-image-${i}.webp`);
        }
      });

      const newId = await createPost(fd);
      if (!newId) throw new Error("回傳 postId 不存在");

      toast.success("發文成功，正在跳轉…");
      router.push(`/forums/${newId}`);
    } catch (err) {
      console.error("發文失敗：", err);
      toast.error(err?.message || "發文失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  // 取消
  function confirmCancel() {
    // 釋放 blob URL
    blobImages.forEach((b) => URL.revokeObjectURL(b.url));
    setBlobImages([]);
    editor?.commands.clearContent(true);
    router.push("/forums");
  }

  // 卸載釋放 blob
  useEffect(
    () => () => {
      blobImages.forEach((b) => URL.revokeObjectURL(b.url));
    },
    [blobImages]
  );

  // 顯示用時間
  function fmtNow() {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}年${m}月${day}日 ${hh}:${mm}`;
  }

  return (
    <>
      {/* 表單卡片 */}
      <form
        className={[styles.forusPostCard, styles.forusWriteCard].join(" ")}
        onSubmit={onSubmit}
      >
        {/* 看板 */}
        <div className={styles.forusWriteHeaderRow}>
          <div className={styles.forusWriteBoard}>
            <label htmlFor="board" className={styles.forusWriteLabel}>
              看板
            </label>
            <select
              id="board"
              className={styles.forusSelect}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.length ? (
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              ) : (
                <option value="">請稍候…</option>
              )}
            </select>
          </div>
        </div>

        {/* 標題 */}
        <div className={styles.forusWriteHeader}>
          <input
            className={styles.forusWriteTitleInput}
            type="text"
            placeholder="輸入標題…(必填)"
            maxLength={maxTitle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className={styles.forusWriteCounterRow}>
            <div className={styles.forusWriteCounter}>
              {title.length}/{maxTitle}
            </div>
          </div>
        </div>

        {/* 使用者資訊 */}
        <div className={styles.forusAuthorRow}>
          <div className={styles.forusAuthorAvatar}>
            <img
              src={authorAvatarSrc} // ★ 預載成功才切換，失敗維持 DEFAULT_AVATAR
              alt="頭像"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div className={styles.forusAuthorMeta}>
            <div className={styles.forusAuthorName}>
              {uiUser?.nickname || uiUser?.name || "使用者"}
            </div>
            <div className={styles.forusAuthorTime}>{fmtNow()}</div>
          </div>
        </div>

        {/* 內文 */}
        <div
          ref={editorRootRef}
          className={[styles.forusEditorBox, styles.forusTextareaFramed].join(
            " "
          )}
        >
          {editor ? (
            <EditorContent editor={editor} className={styles.forusEditorArea} />
          ) : (
            <div className={styles.forusEditorArea} />
          )}
          <div className={styles.forusWriteCounterRow}>
            <div className={styles.forusWriteCounter}>
              {contentCount}/{maxContent}
            </div>
          </div>
        </div>

        {/* 標籤 */}
        <div className={styles.forusWriteTags}>
          {tags.map((t) => (
            <span key={t} className={styles.forusTag}>
              #{t}
              <button
                type="button"
                className={styles.forusTagRemove}
                onClick={() => setTags(tags.filter((x) => x !== t))}
                aria-label={`移除 ${t}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className={[styles.forusTagInput, styles.forusTagInputFramed].join(
              " "
            )}
            type="text"
            placeholder="新增標籤，按 Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKeyDown}
          />
        </div>

        {/* 動作列 */}
        <div className={styles.forusWriteActions}>
          <label
            className={styles.forusActionUpload}
            title="插入圖片"
            onMouseDown={() => editor?.chain().focus().run()}
          >
            <i className="bi bi-image" />
            <input
              type="file"
              accept="image/*"
              hidden
              multiple
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                insertFilesAsImages(list);
                e.target.value = "";
              }}
            />
          </label>
          <div className={styles.forusActionsRight}>
            <button
              type="button"
              className={styles.forusBtnGhost}
              data-bs-toggle="modal"
              data-bs-target="#writeCancelModal"
            >
              取消
            </button>
            <button
              type="submit"
              className={styles.forusBtnPrimary}
              disabled={submitting || !categoryId}
            >
              {submitting ? "送出中…" : "發佈"}
            </button>
          </div>
        </div>
      </form>

      {/* 取消確認 Modal */}
      <div
        className="modal fade"
        id="writeCancelModal"
        tabIndex={-1}
        aria-labelledby="writeCancelModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="writeCancelModalLabel">
                取消發文？
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              將清空目前輸入並返回論壇首頁。確定要取消嗎？
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className={styles.forusBtnGhost}
                data-bs-dismiss="modal"
              >
                繼續編輯
              </button>
              <button
                type="button"
                className={styles.forusBtnPrimary}
                data-bs-dismiss="modal"
                onClick={confirmCancel}
              >
                確認取消
              </button>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer
        position="bottom-center"
        autoClose={2000}
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
    </>
  );
}
