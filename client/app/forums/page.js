/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "./forums.module.css";
import { ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import TabsBar from "./_components/TabsBar";
import AsideLeft from "./_components/AsideLeft";
import AsideRight from "./_components/AsideRight";
import OffcanvasLeft from "./_components/OffcanvasLeft";
import OffcanvasRight from "./_components/OffcanvasRight";
import ForumsListPure from "./_components/ForumsListPure";
import FabNew from "./_components/FabNew";
import { useSearchParams } from "next/navigation";

export default function ForumsPage() {
  const searchParams = useSearchParams();
  const cidStr = searchParams.get("cid");
  const categoryId = cidStr ? Number(cidStr) : undefined;

  return (
    <div className={styles.forusVars}>
      <main className={styles.forusMain}>
        <div className={styles.forusContainer}>
          <div className="row">
            {/* 左欄 */}
            <div className="d-none d-lg-block col-lg-2">
              <AsideLeft />
            </div>

            {/* 中欄：TabsBar 在最上面 */}
            <div className="col-12 col-lg-8">
              <TabsBar />
              <div className={styles.forusContentStack}>
                {/* 傳入分類；排序交由 URL 的 ?sort 控制 */}
                <ForumsListPure
                  query={categoryId ? { category_id: categoryId } : {}}
                />
              </div>
            </div>

            {/* 右欄 */}
            <div className="d-none d-lg-block col-lg-2">
              <AsideRight />
            </div>
          </div>
        </div>
        <FabNew />
      </main>

      {/* 手機 Offcanvas */}
      <OffcanvasLeft />
      <OffcanvasRight />

      {/* 你先前採用的 Toast 容器設定 */}
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
