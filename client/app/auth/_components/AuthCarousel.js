'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from './Auth.module.css'

export default function AuthCarousel({ carouselId, images }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const intervalRef = useRef(null)

  // 自動輪播
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length)
    }, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [images.length])

  // 手動切換輪播圖
  const goToSlide = (index) => {
    // 先清除現有計時器
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    // 設置新的當前幻燈片
    setCurrentSlide(index)
    
    // 延遲設置新的計時器，避免狀態衝突
    setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % images.length)
      }, 3000)
    }, 100)
  }

  const goToPrevious = () => {
    const newIndex = currentSlide === 0 ? images.length - 1 : currentSlide - 1
    goToSlide(newIndex)
  }

  const goToNext = () => {
    const newIndex = (currentSlide + 1) % images.length
    goToSlide(newIndex)
  }

  return (
    <div
      id={carouselId}
      className={styles['auth-carousel']}
    >
      {/* 自定義輪播指示器 */}
      <div className={styles['auth-carousel-indicators']}>
        {images.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goToSlide(index)}
            className={`${styles['auth-carousel-indicator']} ${
              index === currentSlide ? styles.active : ''
            }`}
            aria-label={`Go to slide ${index + 1}`}
          ></button>
        ))}
      </div>

      {/* 輪播圖片容器 */}
      <div className={styles['auth-carousel-images']}>
        {images.map((image, index) => (
          <div
            key={index}
            className={`${styles['auth-carousel-image']} ${
              index === currentSlide ? '' : styles.hidden
            }`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0}
              quality={85}
              style={{
                objectFit: 'cover',
                objectPosition: 'center'
              }}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={goToPrevious}
        className={`${styles['auth-carousel-btn']} ${styles.prev}`}
      >
        ←
      </button>

      <button
        type="button"
        onClick={goToNext}
        className={`${styles['auth-carousel-btn']} ${styles.next}`}
      >
        →
      </button>
    </div>
  )
}
