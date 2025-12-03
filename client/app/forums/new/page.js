import styles from "../forums.module.css";
import Bar from "../_components/Bar";
import WriteForm from "../_components/WriteForm";
import AsideLeft from "../_components/AsideLeft";
import AsideRight from "../_components/AsideRight";
import OffcanvasLeft from "../_components/OffcanvasLeft";
import OffcanvasRight from "../_components/OffcanvasRight";

export const metadata = {
  title: "發文 - ECHO & FLOW",
  description: "建立新文章",
};

export default function ForumsNewPage() {
  return (
    <div className={styles.forusVars}>
      <main className={styles.forusMain}>
        <div className={styles.forusContainer}>
          <div className="row">
            {/* 左欄（桌機顯示，手機隱藏） */}
            <div className="d-none d-lg-block col-lg-2">
              <AsideLeft />
            </div>

            {/* 中欄 */}
            <div className="col-12 col-lg-8">
              {/* 手機置頂 bar（左右 offcanvas、置中標題） */}
              <Bar title="發文" />
              {/* 內容區（沿用清單的 12px 手機留白） */}
              <div className={styles.forusContentStack}>
                <WriteForm />
              </div>
            </div>

            {/* 右欄（桌機顯示，手機隱藏） */}
            <div className="d-none d-lg-block col-lg-2">
              <AsideRight />
            </div>
          </div>
        </div>
      </main>
      {/* 手機用左右 Offcanvas */}
      <OffcanvasLeft />
      <OffcanvasRight />
    </div>
  );
}
