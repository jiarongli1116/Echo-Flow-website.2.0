import React, { useState, useRef } from "react";
import ProductCard from "@/components/product/ProductCard";
import styles from "./SlideableProductSection.module.css";

const SlideableProductSection = ({
  products,
  title,
  onAddToCart,
  onAddToWishlist
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  // 計算每次滑動的距離
  const slideWidth = 148; // 每個產品卡片的寬度 + margin
  const visibleCards = 2; // 手機版一次顯示2張卡片
  const maxIndex = Math.max(0, products.length - visibleCards);

  const handlePrevSlide = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: newIndex * slideWidth,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleNextSlide = () => {
    if (currentIndex < maxIndex) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: newIndex * slideWidth,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const newIndex = Math.round(scrollLeft / slideWidth);
    setCurrentIndex(newIndex);
  };

  return (
    <div className={styles.slideableProductSection}>
      <h5 className={styles.sectionTitle} style={{ color: 'var(--primary--600)', marginBottom: '1rem' }}>
        {title}
      </h5>

      <div className={styles.sliderContainer}>
        {/* 左箭頭 */}
        <button
          className={`${styles.arrowBtn} ${styles.leftArrow} ${currentIndex === 0 ? styles.disabled : ''}`}
          onClick={handlePrevSlide}
          disabled={currentIndex === 0}
          aria-label="上一頁"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* 滑動容器 */}
        <div
          className={styles.productsScrollContainer}
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          <div className={styles.productsWrapper}>
            {products.map((product) => (
              <div key={product.id} className={styles.productSlideItem}>
                <ProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  onAddToWishlist={onAddToWishlist}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 右箭頭 */}
        <button
          className={`${styles.arrowBtn} ${styles.rightArrow} ${currentIndex >= maxIndex ? styles.disabled : ''}`}
          onClick={handleNextSlide}
          disabled={currentIndex >= maxIndex}
          aria-label="下一頁"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SlideableProductSection;