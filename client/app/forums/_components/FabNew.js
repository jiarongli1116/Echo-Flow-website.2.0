/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import styles from "../forums.module.css";

// 手機浮動按鈕：發表新貼文
export default function FabNew() {
  const router = useRouter();
  const goNew = () => {
    router.push("/forums/new"); // 導向「發表新貼文」頁
  };

  return (
    <button
      type="button"
      className={`${styles.forusFab} rounded-circle position-fixed bottom-0 end-0 m-3`}
      aria-label="發表新貼文"
      title="發表新貼文"
      onClick={goNew}
    >
      <i className="bi bi-pencil-square"></i>
    </button>
  );
}
