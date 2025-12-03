import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import styles from "./MobileFilterSidebar.module.css";

const MobileFilterSidebar = ({ 
  isOpen,
  onClose,
  mainCategories, 
  subCategories, 
  minPrice = "", 
  maxPrice = "",
  handleMainCategoryClick= () => {},
  handleSubCategoryClick= () => {},
  selectedSize = "",
  handleSizeChange = () => {},
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // 價格篩選狀態
  const [inputMinPrice, setInputMinPrice] = useState(minPrice || "");
  const [inputMaxPrice, setInputMaxPrice] = useState(maxPrice || "");

  // 下拉選單狀態
  const [openDropdowns, setOpenDropdowns] = useState({});

  const handleFilter = () => {
    const params = new URLSearchParams(window.location.search);
    if (inputMinPrice && inputMinPrice.trim() !== "") {
      params.set("minPrice", inputMinPrice);
    } else {
      params.delete("minPrice");
    }
    if (inputMaxPrice && inputMaxPrice.trim() !== "") {
      params.set("maxPrice", inputMaxPrice);
    } else {
      params.delete("maxPrice");
    }
    if (selectedSize) {
      let lpValue;
      switch (selectedSize) {
        case "1LP":
          lpValue = "1";
          break;
        case "2LP":
          lpValue = "2";
          break;
        case "3LP+":
          lpValue = "3";
          break;
      }
      params.set("lp", lpValue);
    } else {
      params.delete("lp");
    }
    params.delete("page"); // 排序改變時重置頁碼
    router.replace(`${pathname}?${params.toString()}`);
  };

  // 切換下拉選單
  const toggleDropdown = (categoryId) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // 關閉所有下拉選單
  const closeAllDropdowns = () => {
    setOpenDropdowns({});
  };

    // 清除所有篩選
const handleClearFilter = () => {
    setInputMinPrice('')
    setInputMaxPrice('')
    handleSizeChange('')
    
    const params = new URLSearchParams(window.location.search)
    params.delete('minPrice')
    params.delete('maxPrice') 
    params.delete('lp')
    params.delete('page')
    
    router.replace(`${pathname}?${params.toString()}`)
}
 
  

  // 當價格參數變更時更新輸入框
  useEffect(() => {
    setInputMinPrice(minPrice || "");
    setInputMaxPrice(maxPrice || "");
  }, [minPrice, maxPrice]);

  // 處理背景滾動控制
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.setAttribute("data-scroll-position", scrollY.toString());
      document.body.classList.add(styles.sidebarOpen);
      document.body.style.top = `-${scrollY}px`;

      setTimeout(() => {
        const sidebar = document.querySelector(`.${styles.mobileSidebar}`);
        if (sidebar) {
          sidebar.style.overflowY = "auto";
          sidebar.scrollTop = 0;
        }
      }, 100);
    } else {
      const scrollY = document.body.getAttribute("data-scroll-position") || "0";
      document.body.classList.remove(styles.sidebarOpen);
      document.body.style.top = "";
      document.body.removeAttribute("data-scroll-position");
      window.scrollTo(0, parseInt(scrollY));
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.overflow = "";
      document.body.style.width = "";
      document.body.classList.remove(styles.sidebarOpen);
    };
  }, [isOpen]);

  return (
    <>
      {/* 側邊欄遮罩 */}
      <div
        className={`${styles.mobileSidebarOverlay} ${isOpen ? styles.show : ""}`}
        onClick={onClose}
      ></div>

      {/* 手機版側邊欄 */}
      <aside className={`${styles.mobileSidebar} ${isOpen ? styles.show : ""}`}>
        <button className={styles.mobileSidebarClose} onClick={onClose}>
          <i className="fa-solid fa-times"></i>
        </button>

        <div className={styles.mobileSidebarContent}>
          {/* 手機版分類下拉選單 */}
          <div className="mb-3">
            <h6 className={styles.filterTitle}>類別</h6>
            {mainCategories.map((mainCategory) => (
              <div key={mainCategory.id} className={`${styles.dropdown} mt-3`}>
                <div className={styles.splitButtonContainer}>
                  <Link
                    href={`/products?mcid=${mainCategory.id}`}
                    className={styles.mainCategoryLink}
                    onClick={() => {
                      handleMainCategoryClick(mainCategory.id, mainCategory.title);
                      closeAllDropdowns();
                    }}
                  >
                    {mainCategory.title}
                  </Link>

                  <button
                    className={`${styles.dropdownArrow} ${
                      openDropdowns[mainCategory.id] ? styles.open : ""
                    }`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleDropdown(mainCategory.id);
                    }}
                    aria-expanded={openDropdowns[mainCategory.id] || false}
                  >
                    <i className="fas fa-chevron-down"></i>
                  </button>
                </div>

                <ul
                  className={`${styles.customDropdownMenu} ${
                    openDropdowns[mainCategory.id] ? styles.show : ""
                  }`}
                >
                  {subCategories
                    .filter((sub) => sub.main_category_id === mainCategory.id)
                    .map((subCategory) => (
                      <li key={subCategory.id}>
                        <Link
                          href={`/products?mcid=${mainCategory.id}&scid=${subCategory.id}`}
                          className={styles.customDropdownItem}
                          onClick={() => {
                            handleMainCategoryClick(mainCategory.id, mainCategory.title);
                            handleSubCategoryClick(subCategory.id);
                            closeAllDropdowns();
                          }}
                        >
                          {subCategory.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 手機版尺寸篩選區域 */}
          <div className={styles.lpArea}>
            <h6 className={styles.filterTitle}>規格</h6>
            <div className="form-check">
              <input
                className={`form-check-input ${styles.formCheckInput}`}
                type="checkbox"
                value="1LP"
                id="mobile-lp1"
                checked={selectedSize === "1LP"}
                onChange={() => handleSizeChange("1LP")}
              />
              <label className={`form-check-label ${styles.formCheckLabel}`} htmlFor="mobile-lp1">
                1LP
              </label>
            </div>
            <div className="form-check">
              <input
                className={`form-check-input ${styles.formCheckInput}`}
                type="checkbox"
                value="2LP"
                id="mobile-lp2"
                checked={selectedSize === "2LP"}
                onChange={() => handleSizeChange("2LP")}
              />
              <label className={`form-check-label ${styles.formCheckLabel}`} htmlFor="mobile-lp2">
                2LP
              </label>
            </div>
            <div className="form-check">
              <input
                className={`form-check-input ${styles.formCheckInput}`}
                type="checkbox"
                value="3LP+"
                id="mobile-lp3"
                checked={selectedSize === "3LP+"}
                onChange={() => handleSizeChange("3LP+")}
              />
              <label className={`form-check-label ${styles.formCheckLabel}`} htmlFor="mobile-lp3">
                3LP以上
              </label>
            </div>
          </div>

          {/* 手機版價格篩選區域 */}
          <div className={styles.priceFilterContainer}>
            <h6 className={styles.filterTitle}>金額篩選</h6>
            <div className={styles.priceInputContainer}>
              <input
                type="number"
                placeholder="最低"
                name="minPrice"
                value={inputMinPrice}
                onChange={(e) => setInputMinPrice(e.target.value)}
                className={styles.priceInput}
              />
              <span className={styles.priceSeparator}>~</span>
              <input
                type="number"
                placeholder="最高"
                name="maxPrice"
                value={inputMaxPrice}
                onChange={(e) => setInputMaxPrice(e.target.value)}
                className={styles.priceInput}
              />
            </div>
           
          </div>  <div className='d-flex justify-content-between align-items-center'> <button onClick={handleFilter} className={styles.filterButton}>
                進行篩選
            </button>
            <button onClick={handleClearFilter} className={styles.clearButton}>
    清除篩選
</button></div>
        </div> 
        
      </aside>
    </>
  );
};

export default MobileFilterSidebar;