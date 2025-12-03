/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "../../forums.module.css";
import AsideLeft from "../../_components/AsideLeft";
import AsideRight from "../../_components/AsideRight";
import OffcanvasLeft from "../../_components/OffcanvasLeft";
import OffcanvasRight from "../../_components/OffcanvasRight";
import { ForumsProvider } from "../../../../hooks/use-forums";
import EditForm from "../../_components/EditForm";

function Inner() {
  return (
    <div className={styles.forusVars}>
      <main className={styles.forusMain}>
        <div className={styles.forusContainer}>
          <div className="row">
            <div className="d-none d-lg-block col-lg-2">
              <AsideLeft />
            </div>

            <div className="col-12 col-lg-8">
              <div className={styles.forusContentStack}>
                <EditForm />
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
    </div>
  );
}

export default function ForumEditPage() {
  return (
    <ForumsProvider>
      <Inner />
    </ForumsProvider>
  );
}
