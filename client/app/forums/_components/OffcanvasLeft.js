"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../forums.module.css";
import { useForumsWrite } from "@/hooks/use-forums-write";

const nameToIcon = {
  閒話家常: "/forums/icon/metal.svg",
  最新資訊: "/forums/icon/latin.svg",
  爵士: "/forums/icon/jazz.svg",
  歐美: "/forums/icon/rock.svg",
  華語: "/forums/icon/acoustic.svg",
  日韓: "/forums/icon/clasical.svg",
  原聲帶: "/forums/icon/vocal.svg",
  二手唱片: "/forums/icon/indie.svg",
};

export default function OffcanvasLeft() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cidNow = searchParams.get("cid");
  const activeCid = cidNow ? Number(cidNow) : null;

  const { getCategories } = useForumsWrite();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getCategories();
        if (alive) setCategories(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("offcanvas categories error:", err);
        if (alive) setCategories([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [getCategories]);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => (a.id || 0) - (b.id || 0)),
    [categories]
  );

  const goCategory = useCallback(
    (id) => {
      const url = id ? `/forums?cid=${id}` : "/forums";
      router.replace(url, { scroll: true });
      setTimeout(() => {
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {}
      }, 0);
    },
    [router]
  );

  return (
    <div
      className={"offcanvas offcanvas-start" + " " + styles.forusOffcanvas} // ★ 新增
      tabIndex="-1"
      id="offcanvasLeft"
      aria-labelledby="offcanvasLeftLabel"
    >
      <div className="offcanvas-header">
        <div className="offcanvas-title" id="offcanvasLeftLabel">
          看板分類
        </div>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>

      <div className={"offcanvas-body p-0"}>
        <nav className={"p-2" + " " + styles.forusAsideNav}>
          {/* 全部文章 */}
          <a
            className={[
              styles.forusBtnAside,
              activeCid === null ? styles.forusBtnAsideActive : "",
            ].join(" ")}
            href="#"
            data-bs-dismiss="offcanvas"
            onClick={(e) => {
              e.preventDefault();
              goCategory(null);
            }}
          >
            <Image
              className={styles.forusIcon}
              src="/forums/icon/disco.svg"
              alt=""
              width={24}
              height={24}
              draggable={false}
            />
            <span className={styles.forusBtnLabel}>全部文章</span>
          </a>

          {/* 動態分類 */}
          {sorted.map((c) => {
            const isActive = activeCid === c.id;
            const icon = nameToIcon[c.name] || "/forums/icon/disco.svg";
            return (
              <a
                key={c.id}
                className={[
                  styles.forusBtnAside,
                  isActive ? styles.forusBtnAsideActive : "",
                ].join(" ")}
                href="#"
                data-bs-dismiss="offcanvas"
                onClick={(e) => {
                  e.preventDefault();
                  goCategory(c.id);
                }}
                aria-label={`切換到 ${c.name}`}
                title={c.description || c.name}
              >
                <Image
                  className={styles.forusIcon}
                  src={icon}
                  alt=""
                  width={24}
                  height={24}
                  draggable={false}
                />
                <span className={styles.forusBtnLabel}>{c.name}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
