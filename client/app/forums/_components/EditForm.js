"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
// import Image from "next/image";
import styles from "../forums.module.css";
import { toast, ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Tiptap
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import ImageExt from "@tiptap/extension-image";

// Hooks
import { useForumPost } from "../../../hooks/use-forums";
import { useForumsWrite } from "../../../hooks/use-forums-write";

/* ---------- helpers ---------- */
// ★ 統一預設頭像 + placeholder 辨識 + 路徑正規化（與其他元件一致）
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

/** content + images → Tiptap JSON（修掉圖前後一個空行） */
function buildDocFromContent(content = "", images = []) {
  const parts = String(content).split(/\[img\]/i);
  const imgs = Array.isArray(images) ? images : [];
  const doc = { type: "doc", content: [] };
  let imgIdx = 0;

  for (let segIdx = 0; segIdx < parts.length; segIdx++) {
    let lines = String(parts[segIdx] ?? "").split(/\r?\n/);
    if (
      segIdx < parts.length - 1 &&
      lines.length &&
      lines[lines.length - 1] === ""
    )
      lines = lines.slice(0, -1);
    if (segIdx > 0 && lines.length && lines[0] === "") lines = lines.slice(1);

    for (const ln of lines) {
      if (ln)
        doc.content.push({
          type: "paragraph",
          content: [{ type: "text", text: ln }],
        });
      else doc.content.push({ type: "paragraph", content: [] });
    }
    if (segIdx < parts.length - 1 && imgIdx < imgs.length) {
      doc.content.push({
        type: "image",
        attrs: { src: imgs[imgIdx++], alt: `內文圖片 ${imgIdx}` },
      });
    }
  }
  if (!doc.content.length) doc.content.push({ type: "paragraph", content: [] });
  return doc;
}

/** 掃描 editor JSON：輸出 {textOnly, textLength, imagePlan:["keep"|"new"...], filesInDocOrder:File[]} */
function extractForSubmit(json, fileMap) {
  const pieces = [];
  let textLen = 0;
  const plan = [];
  const files = [];

  function walk(nodes = []) {
    for (const node of nodes) {
      if (node.type === "paragraph") {
        const children = node.content || [];
        if (!children.length) {
          pieces.push("");
          continue;
        }
        let buf = "";
        for (const ch of children) {
          if (ch.type === "text" && ch.text) buf += ch.text;
          else if (ch.type === "hardBreak") buf += "\n";
          else if (ch.type === "image") {
            // 影像若被放進 <p> 中，也要認得
            pieces.push(buf);
            buf = "";
            pieces.push("[img]");
            const src = ch.attrs?.src || "";
            if (src.startsWith("blob:")) {
              plan.push("new");
              const f = fileMap.get(src);
              if (f) files.push(f);
            } else {
              plan.push("keep");
            }
          }
        }
        pieces.push(buf);
        textLen += buf.replace(/\n/g, "").length;
      } else if (node.type === "image") {
        pieces.push("[img]");
        const src = node.attrs?.src || "";
        if (src.startsWith("blob:")) {
          plan.push("new");
          const f = fileMap.get(src);
          if (f) files.push(f);
        } else {
          plan.push("keep");
        }
      } else if (node.content) {
        walk(node.content);
      }
    }
  }

  walk(json?.content || []);
  const textOnly = pieces.join("\n");
  return {
    textOnly,
    textLength: textLen,
    imagePlan: plan,
    filesInDocOrder: files,
  };
}

/* === 新增：抽取要保留的舊圖 URL（依編輯器現況順序） === */
function toRelStatic(url) {
  if (!url) return "";
  const i = String(url).indexOf("/static/uploads/forums/");
  return i >= 0 ? String(url).slice(i) : String(url);
}

function extractKeepUrls(json) {
  const list = [];
  const walk = (nodes = []) => {
    for (const n of nodes) {
      if (n.type === "image") {
        const src = n.attrs?.src || "";
        if (src && !src.startsWith("blob:")) list.push(toRelStatic(src));
      }
      if (n.content) walk(n.content);
    }
  };
  walk(json?.content || []);
  return list;
}

export default function EditForm() {
  const router = useRouter();
  const { id } = useParams();

  const { ensureMe, currentUser, detail, postDetail } = useForumPost();
  const { getCategories, updatePost } = useForumsWrite();

  const [title, setTitle] = useState("");
  const [contentCount, setContentCount] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // ★ 檔案 URL 對應 File，用來依「編輯器內順序」取檔
  const fileMapRef = useRef(new Map()); // Map<blobUrl, File>

  const maxTitle = 50;
  const maxContent = 500;
  const MAX_IMAGES = 6;

  useEffect(() => {
    (async () => {
      const me = await ensureMe().catch(() => null);
      if (!me) router.replace("/auth/login");
    })();
  }, [ensureMe, router]);

  useEffect(() => {
    (async () => {
      try {
        const list = await getCategories();
        setCategories(list);
      } catch (err) {
        console.error("取得分類失敗：", err);
      }
    })();
  }, [getCategories]);

  useEffect(() => {
    if (id) detail(id);
  }, [id, detail]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: { keepMarks: true, keepAttributes: true },
      }),
      Placeholder.configure({
        placeholder: "修改你的內容…(必填)",
        showOnlyCurrent: false,
        includeChildren: true,
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount.configure({ limit: maxContent }),
      ImageExt.configure({ allowBase64: false, inline: false }),
    ],
    editorProps: {
      handlePaste(_view, event) {
        // 仍禁貼上檔案；插圖統一走「挑檔→插入到游標」
        const items = Array.from(event.clipboardData?.items || []);
        if (items.some((it) => !!it.getAsFile?.())) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      handleDrop(_view, event) {
        const hasFile = (event.dataTransfer?.files?.length || 0) > 0;
        if (hasFile) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      const json = editor.getJSON();
      const pieces = [];
      let len = 0;
      for (const node of json?.content || []) {
        if (node.type === "paragraph") {
          const children = node.content || [];
          if (!children.length) {
            pieces.push("");
            continue;
          }
          let buf = "";
          for (const ch of children) {
            if (ch.type === "text" && ch.text) buf += ch.text;
            else if (ch.type === "hardBreak") buf += "\n";
          }
          pieces.push(buf);
          len += buf.replace(/\n/g, "").length;
        } else if (node.type === "image") {
          pieces.push("[img]");
        }
      }
      setContentCount(len);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!postDetail) return;
    if (currentUser && Number(currentUser.id) !== Number(postDetail.users_id)) {
      toast.error("無權限編輯此文章");
      router.replace(`/forums/${postDetail.id}`);
      return;
    }
    setTitle(postDetail.title || "");
    setCategoryId(String(postDetail.category_id || ""));
    setTags(Array.isArray(postDetail.tags) ? postDetail.tags : []);

    const doc = buildDocFromContent(
      String(postDetail.content || ""),
      Array.isArray(postDetail.images) ? postDetail.images : []
    );
    editor?.commands.setContent(doc, false);
  }, [postDetail, currentUser, editor, router]);

  // 原本：const uiUser = currentUser || { name: "讀取中...", avatar: "/images/avatar-placeholder.png" };
  const uiUser = {
    name:
      currentUser?.nickname ||
      currentUser?.name ||
      currentUser?.account ||
      "使用者",
    nickname: currentUser?.nickname,
  };

  // ★ 使用者頭像：先顯示預設，背景預載成功才切換，避免 SSR 閃爍
  const [authorAvatarSrc, setAuthorAvatarSrc] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    const raw = currentUser?.img || currentUser?.avatar || "";
    const url = resolveAvatar(raw);

    // 空值/預設 → 維持預設，不切換
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

  function countImagesInJson(json) {
    let c = 0;
    const walk = (nodes = []) => {
      for (const n of nodes) {
        if (n.type === "image") c++;
        if (n.content) walk(n.content);
      }
    };
    walk(json?.content || []);
    return c;
  }

  /* ★ 限制整體最多 MAX_IMAGES：依「目前已有張數」計算剩餘可插入數 */
  function onPickFiles(e) {
    if (!editor) return;

    // 目前編輯器內已經有幾張圖
    const nowCount = countImagesInJson(editor.getJSON());
    const remain = Math.max(0, MAX_IMAGES - nowCount);
    if (remain <= 0) {
      toast.warn(`最多上傳 ${MAX_IMAGES} 張圖片`);
      e.target.value = "";
      return;
    }

    // 本次選取的有效影像檔
    const filesPicked = Array.from(e.target.files || []).filter((f) =>
      /^image\//.test(f.type)
    );

    // 依剩餘名額裁切
    const files = filesPicked.slice(0, remain);
    if (!files.length) {
      e.target.value = "";
      return;
    }
    if (filesPicked.length > files.length) {
      toast.warn(
        `已達上限，這次只會插入 ${files.length} 張（剩餘名額 ${remain}）`
      );
    }

    // 逐張插入：圖片後面補一個空段落，避免覆蓋
    for (const f of files) {
      const url = URL.createObjectURL(f);
      fileMapRef.current.set(url, f);
      editor
        .chain()
        .focus()
        .insertContent([
          { type: "image", attrs: { src: url, alt: f.name } },
          { type: "paragraph" },
        ])
        .run();
    }

    // 清空 input
    e.target.value = "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!editor) return;

    const json = editor.getJSON();
    const { textOnly, textLength, imagePlan, filesInDocOrder } =
      extractForSubmit(json, fileMapRef.current);
    const keepUrls = extractKeepUrls(json); // ★ 現在畫面保留的舊圖（依順序）

    const nonWs = textOnly.replace(/\s/g, "");
    if (!categoryId) return toast.error("請選擇看板");
    if (!title.trim()) return toast.error("請輸入標題");
    if (title.trim().length > maxTitle) return toast.error("標題最長 50 字");
    if (!nonWs) return toast.error("請輸入內文");
    if (textLength > maxContent) return toast.error("內文最長 500 字");

    try {
      setSubmitting(true);
      await updatePost(id, {
        title: title.trim(),
        content: textOnly, // 圖片→[img]
        category_id: Number(categoryId),
        tag_names: tags,
        images: filesInDocOrder, // 依「編輯器內出現順序」送檔
        image_plan: imagePlan, // "keep"/"new" 序列
        keep_urls: keepUrls, // ★ 告訴後端要保留哪些舊圖，且順序
        content_html: editor.getHTML(), // 可選：讓後端把 blob: 換實際網址
      });
      toast.success("更新成功");
      router.push(`/forums/${id}?t=${Date.now()}`); // 避免快取
    } catch (err) {
      console.error("更新失敗：", err);
      toast.error(err?.message || "更新失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmCancel() {
    router.push(`/forums/${id}`);
  }

  function fmtNow() {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}年${m}月${day}日 ${hh}:${mm}`;
  }

  const categoryOptions = useMemo(() => {
    return categories?.length
      ? categories
      : categoryId
      ? [{ id: Number(categoryId), name: "載入中…" }]
      : [];
  }, [categories, categoryId]);

  return (
    <>
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
              {categoryOptions.length ? (
                categoryOptions.map((c) => (
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

        {/* 內文編輯器（新圖會插在游標處） */}
        <div
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
                onClick={() => removeTag(t)}
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

        {/* 動作列（挑檔 → 直接插入編輯器） */}
        <div className={styles.forusWriteActions}>
          <label className={styles.forusActionUpload} title="在游標處插入圖片">
            <i className="bi bi-image" />
            <input
              type="file"
              accept="image/*"
              hidden
              multiple
              onChange={onPickFiles}
            />
          </label>
          <div className={styles.forusActionsRight}>
            <button
              type="button"
              className={styles.forusBtnGhost}
              onClick={confirmCancel}
            >
              取消
            </button>
            <button
              type="submit"
              className={styles.forusBtnPrimary}
              disabled={submitting || !categoryId}
            >
              {submitting ? "更新中…" : "儲存變更"}
            </button>
          </div>
        </div>
      </form>

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
