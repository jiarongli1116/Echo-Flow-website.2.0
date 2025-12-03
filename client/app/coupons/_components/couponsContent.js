'use client'

import React, { useState, useEffect } from 'react'
import styles from './coupons.module.css'

export default function CouponsContent({
    coupons,
    setPage,
    page,
    pagination,
    getOne,
}) {
    const targetMap = {
        1: '古典',
        2: '爵士',
        3: '西洋',
        4: '華語',
        5: '日韓',
        6: '原聲帶',
    }

    const getDiscountText = (e) => {
        if (e.discount_type === 'free_shipping') {
            return '免運'
        }

        if (e.discount_type === 'percent') {
            // 檢查 discount_value 是否能被 10 整除
            const isTenMultiple = e.discount_value % 10 === 0
            const discount = isTenMultiple
                ? e.discount_value / 10
                : e.discount_value
            return `${discount}折`
        }

        // 預設情況，處理金額折扣
        return `$${e.discount_value}`
    }

    if (coupons.length > 0) {
        return (
            <>
                <div
                    className={`${styles.coupons} row row-cols-1 row-cols-md-2 row-cols-xl-3`}
                >
                    {coupons.map((e) => {
                        const endDate = e.end_at.substring(0, 10)
                        return (
                            <div
                                className={`${styles.couponContent} bg-light col`}
                                key={e.code}
                            >
                                <div className={styles.couponShadow}>
                                    <div
                                        className={`${styles.coupon} ${
                                            e.discount_type == 'free_shipping'
                                                ? styles.free_shipping
                                                : ''
                                        }`}
                                    >
                                        <div
                                            className={`${styles.left} ${styles.alc}`}
                                        >
                                            <div
                                                className={`${styles.circle} ${styles.bgBlack900}`}
                                            ></div>
                                            <div className={`${styles.img} `}>
                                                <img src="/images/logo2.png" />
                                            </div>
                                            <div className={styles.content}>
                                                <div className={styles.type}>
                                                    {e.target_type === 'all'
                                                        ? '全品項'
                                                        : targetMap[
                                                              e.target_value
                                                          ]}
                                                </div>
                                                <div
                                                    className={
                                                        styles.discountNum
                                                    }
                                                >
                                                    <h3
                                                        className={
                                                            styles.gold600
                                                        }
                                                    >
                                                        {getDiscountText(e)}
                                                    </h3>
                                                </div>
                                                <div className={styles.title}>
                                                    <div className={styles.p7}>
                                                        {e.name}
                                                    </div>
                                                </div>
                                                <div className={styles.date}>
                                                    <div
                                                        className={`${styles.p6} ${styles.grey400}`}
                                                    >
                                                        有效期限&nbsp;
                                                        {endDate}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className={`${styles.right} ${styles.alc}`}
                                        >
                                            {e.has_coupon ? (
                                                <h6 className={styles.state}>
                                                    已領取
                                                </h6>
                                            ) : (
                                                <h6 className={styles.state}>
                                                    未領取
                                                </h6>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`${styles.title} ${styles.black900}`}
                                >
                                    <h6>{e.name}</h6>
                                </div>
                                <div className={styles.content}>
                                    <div
                                        className={`${styles.endData} ${styles.grey800}`}
                                    >
                                        <p>有效期限 {endDate}</p>
                                    </div>
                                    {e.has_coupon ? (
                                        <button
                                            className={`${styles.couponBtn} ${styles.bgBlack600} ${styles.gold600} ${styles.alc}`}
                                            disabled
                                        >
                                            已領取
                                        </button>
                                    ) : (
                                        <button
                                            className={`${styles.couponBtn} ${styles.bgGold600} ${styles.couponActive} ${styles.alc}`}
                                            onClick={() => {
                                                getOne(e.code)
                                            }}
                                        >
                                            未領取
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {pagination.totalPages > 1 && (
                    <div className={`${styles.alc} ${styles.pages} gap-px`}>
                        <div
                            className={`${styles.page} `}
                            onClick={() => setPage(1)}
                        >
                            <i className="fa-solid fa-backward-step" />
                        </div>

                        <div
                            className={`${styles.page} ${
                                page === 1 ? styles.disabled : ''
                            }`}
                            onClick={
                                page === 1 ? null : () => setPage(page - 1)
                            }
                        >
                            <i className="fa-solid fa-angle-left"></i>
                        </div>

                        {Array.from(
                            { length: pagination.totalPages },
                            (_, i) => i + 1
                        ).map((pageNumber) => (
                            <div
                                key={pageNumber}
                                className={`${styles.page} ${
                                    styles.paginationBtn
                                } ${page === pageNumber ? styles.active : ''}`}
                                onClick={() => setPage(pageNumber)}
                            >
                                {pageNumber}
                            </div>
                        ))}

                        <div
                            className={`${styles.page} ${
                                page === pagination.totalPages
                                    ? styles.disabled
                                    : ''
                            }`}
                            onClick={
                                page === pagination.totalPages
                                    ? null
                                    : () => setPage(page + 1)
                            }
                        >
                            <i className="fa-solid fa-angle-right"></i>
                        </div>

                        <div
                            className={`${styles.page}`}
                            onClick={() => setPage(pagination.totalPages)}
                        >
                            <i className="fa-solid fa-forward-step" />
                        </div>
                    </div>
                )}
            </>
        )
    } else {
        return (
            <>
                <h1>無此類別優惠券</h1>
            </>
        )
    }
}
