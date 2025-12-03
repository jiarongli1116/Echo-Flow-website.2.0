'use client'

import { useEffect, useState } from "react";
import styles from "./Hero.module.css"
import Link from "next/link"

export default function Hero({ page = 1, totalPages = 1 }) {
   const [isMobile, setIsMobile] = useState(false);

  // 檢測是否為手機版
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // 初始檢查
    checkIsMobile();

    // 監聽視窗大小變化
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

const slides = [
    {
      desktop: '/product_img/1.png',
      mobile: '/product_img/1-mobile.png', // 您需要準備這些手機版圖片
      link: '/products/176'
    },
    {
      desktop: '/product_img/2.png',
      mobile: '/product_img/2-mobile.png',
      link: '/products/151'
    },
    {
      desktop: '/product_img/3.png',
      mobile: '/product_img/3-mobile.png',
      link: '/products/144'
    },
    {
      desktop: '/product_img/4.png',
      mobile: '/product_img/4-mobile.png',
      link: '/products/146'
    },
    {
      desktop: '/product_img/5.png',
      mobile: '/product_img/5-mobile.png',
      link: '/products/36'
    }
  ];


  return (
    <>
      {/* 輪播圖 */}
      <section className="hero">
        <div id="carouselExampleIndicators" className={`carousel slide ${styles.carousel}`} data-bs-ride="carousel">
          <div className={`carousel-indicators ${styles.carouselIndicators}`}>
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                data-bs-target="#carouselExampleIndicators"
                data-bs-slide-to={index}
                className={index === 0 ? 'active' : ''}
                aria-current={index === 0 ? 'true' : 'false'}
                aria-label={`Slide ${index + 1}`}
              ></button>
            ))}
          </div>
          <div className={`carousel-inner ${styles.carouselInner}`}>
             {slides.map((slide, index) => (
              <div key={index} className={`carousel-item ${index === 0 ? 'active' : ''}`}>
                <Link href={slide.link}>
               <img 
                    src={isMobile ? slide.mobile : slide.desktop}
                    className="d-block w-100" 
                    alt={`Slide ${index + 1}`}
                  />
                </Link>
              </div>
            ))}
          </div>
          <button
            className={`carousel-control-prev ${styles.carouselControlPrev}`}
            type="button"
            data-bs-target="#carouselExampleIndicators"
            data-bs-slide="prev"
          >
            <i className={`fa-solid fa-circle-chevron-left ${styles.faCircleChevronLeft}`}></i>
          </button>
          <button
            className={`carousel-control-next ${styles.carouselControlNext}`}
            type="button"
            data-bs-target="#carouselExampleIndicators"
            data-bs-slide="next"
          >
            <i className={`fa-solid fa-circle-chevron-right ${styles.faCircleChevronRight}`}></i>
          </button>
        </div>
      </section>
    </>
  )
}