'use client'

import React, { useState, useEffect } from 'react'
import styles from './page.module.css'
import Link from 'next/link'

export default function CouponsCoupon({
    userCoupons,
    page,
    setPage,
    pagination,
    type,
}) {
    const [openId, setOpenId] = useState(null)

    const targetMap = {
        1: '古典',
        2: '爵士',
        3: '西洋',
        4: '華語',
        5: '日韓',
        6: '原聲帶',
    }

    const typeData = [
        { data: 'a', name: '已領取' },
        { data: 'used', name: '已使用' },
        { data: 'Expired', name: '已過期' },
    ]

    const daysBetween = (date1, date2) => {
        const diffTime = new Date(date1) - new Date(date2)
        return diffTime / (1000 * 60 * 60 * 24) // 毫秒轉天
    }

    console.log(userCoupons)

    const now = new Date()

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

    const getPageNumbers = (page, totalPages) => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }

        if (page <= 3) {
            return [1, 2, 3, 4, 5]
        }

        if (page >= totalPages - 2) {
            return [
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ]
        }

        return [page - 2, page - 1, page, page + 1, page + 2]
    }

    const typeName = typeData.find((item) => item.data === type)?.name
    return (
        <>
            {userCoupons.length > 0 ? (
                <div>
                    {userCoupons.map((e) => {
                        // 將日期字串 "2025-09-30 12:00:00" 轉換成有效的 ISO 格式

                        const usedDate = e.used_at
                            ? e.used_at.substring(0, 10)
                            : '-'
                        const expireDate = e.expires_at
                            ? e.expires_at.substring(0, 10)
                            : '-'
                        return (
                            <div className="card" key={e.code}>
                                <div className={styles.couponContent}>
                                    <div
                                        className={`${styles.contentLeft} ${styles.alc} ${styles.p20}`}
                                    >
                                        <div
                                            className={`${styles.couponC} ${
                                                type === 'used'
                                                    ? styles.usedCoupon
                                                    : ''
                                            }`}
                                        >
                                            <div
                                                className={styles.couponShadow}
                                            >
                                                <div
                                                    className={`${
                                                        styles.coupon
                                                    } ${
                                                        type == 'used'
                                                            ? styles.used
                                                            : ''
                                                    } ${
                                                        e.discount_type ==
                                                        'free_shipping'
                                                            ? styles.free_shipping
                                                            : ''
                                                    } ${
                                                        e.target_type ==
                                                        'member'
                                                            ? styles.member
                                                            : ''
                                                    }
                                                `}
                                                >
                                                    <div
                                                        className={`${styles.left} ${styles.alc}`}
                                                    >
                                                        <div
                                                            className={`${styles.circle} ${styles.bgBlack900}`}
                                                        ></div>
                                                        <div
                                                            className={`${styles.img} `}
                                                        >
                                                            <img src="/images/logo2.png" />
                                                        </div>
                                                        <div
                                                            className={
                                                                styles.content
                                                            }
                                                        >
                                                            <div
                                                                className={
                                                                    styles.type
                                                                }
                                                            >
                                                                {e.target_type ===
                                                                'member'
                                                                    ? '會員'
                                                                    : e.target_type ===
                                                                      'all'
                                                                    ? '全品項'
                                                                    : targetMap[
                                                                          e
                                                                              .target_value
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
                                                                    {getDiscountText(
                                                                        e
                                                                    )}
                                                                </h3>
                                                            </div>
                                                            <div
                                                                className={
                                                                    styles.title
                                                                }
                                                            >
                                                                <div
                                                                    className={
                                                                        styles.p7
                                                                    }
                                                                >
                                                                    {e.name}
                                                                </div>
                                                            </div>
                                                            <div
                                                                className={
                                                                    styles.date
                                                                }
                                                            >
                                                                <div
                                                                    className={`${styles.p6} ${styles.grey400}`}
                                                                >
                                                                    {type ===
                                                                    'used'
                                                                        ? '使用日期'
                                                                        : '有效期限'}
                                                                    &nbsp;
                                                                    {type ===
                                                                    'used'
                                                                        ? usedDate
                                                                        : expireDate}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className={`${styles.right} ${styles.alc}`}
                                                    >
                                                        <h6
                                                            className={
                                                                styles.state
                                                            }
                                                        >
                                                            {type != 'Expired'
                                                                ? '已領取'
                                                                : '已過期'}
                                                        </h6>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.contentRight}>
                                        <div className={styles.couponTags}>
                                            {type == 'a' ? (
                                                <>
                                                    {daysBetween(
                                                        now,
                                                        e.claimed_at
                                                    ) <= 3 &&
                                                        daysBetween(
                                                            now,
                                                            e.claimed_at
                                                        ) >= 0 && (
                                                            <div
                                                                className={`${styles.tag} ${styles.tagNew}`}
                                                            >
                                                                NEW
                                                            </div>
                                                        )}

                                                    {daysBetween(
                                                        e.expires_at,
                                                        now
                                                    ) <= 3 &&
                                                        daysBetween(
                                                            e.expires_at,
                                                            now
                                                        ) >= 0 && (
                                                            <div
                                                                className={`${styles.tagExpires} ${styles.tag}`}
                                                            >
                                                                即將到期
                                                            </div>
                                                        )}
                                                </>
                                            ) : (
                                                ''
                                            )}

                                            <div
                                                className={`${styles.tagType} ${styles.tag}`}
                                            >
                                                {e.target_type === 'member'
                                                    ? '會員'
                                                    : e.target_type === 'all'
                                                    ? '全品項'
                                                    : targetMap[e.target_value]}
                                            </div>

                                            <div
                                                className={`${styles.tagDiscount} ${styles.tag}`}
                                            >
                                                {getDiscountText(e)}
                                            </div>
                                            {type == 'a' &&
                                            e.remaining_uses == -1 ? (
                                                <div
                                                    className={`${styles.tagUnlimited} ${styles.tag}`}
                                                >
                                                    無限次數
                                                </div>
                                            ) : (
                                                ''
                                            )}
                                        </div>

                                        <div className={styles.contentTitle}>
                                            <div className={styles.title}>
                                                <h6>{e.name}</h6>
                                            </div>
                                        </div>

                                        <div className={styles.contentContent}>
                                            <div
                                                className={`${styles.p12} ${styles.content}`}
                                            >
                                                {e.content}
                                            </div>
                                        </div>

                                        <div className={styles.contentList}>
                                            <div className={styles.contentBtn}>
                                                <div className={styles.date}>
                                                    {type != 'used' ? (
                                                        <>
                                                            截止日期&nbsp;&nbsp;&nbsp;&nbsp;
                                                            {expireDate}
                                                        </>
                                                    ) : (
                                                        <>
                                                            使用日期&nbsp;&nbsp;&nbsp;&nbsp;
                                                            {usedDate}
                                                        </>
                                                    )}
                                                </div>

                                                {type == 'a' ? (
                                                    <Link
                                                        href={
                                                            e.target_type ===
                                                            'product'
                                                                ? `/products?mcid=${e.target_value}`
                                                                : '/products'
                                                        }
                                                        className={
                                                            styles.useBtn
                                                        }
                                                    >
                                                        使用優惠券
                                                    </Link>
                                                ) : (
                                                    ''
                                                )}
                                            </div>

                                            <div
                                                className={`${
                                                    styles.collapseContent
                                                } ${
                                                    openId === e.code
                                                        ? styles.expanded
                                                        : ''
                                                }
                                                `}
                                            >
                                                <p>
                                                    優惠種類&nbsp;&nbsp;&nbsp;&nbsp;
                                                    {e.target_type === 'member'
                                                        ? '會員'
                                                        : e.target_type ===
                                                          'all'
                                                        ? '全品項'
                                                        : targetMap[
                                                              e.target_value
                                                          ]}
                                                </p>
                                                <p>
                                                    優惠內容&nbsp;&nbsp;&nbsp;&nbsp;
                                                    {getDiscountText(e)}
                                                </p>

                                                {type == 'a' ? (
                                                    <>
                                                        <p>
                                                            使用次數&nbsp;&nbsp;&nbsp;&nbsp;
                                                            {e.remaining_uses ==
                                                            -1
                                                                ? '無限'
                                                                : e.remaining_uses +
                                                                  '次'}
                                                        </p>
                                                        <p>
                                                            使用對象&nbsp;&nbsp;&nbsp;&nbsp;
                                                            {e.min_items}個以上
                                                        </p>
                                                    </>
                                                ) : (
                                                    ''
                                                )}
                                                {e.min_spend > 0 ? (
                                                    <p>
                                                        最低消費&nbsp;&nbsp;&nbsp;&nbsp;$
                                                        {e.min_spend}
                                                    </p>
                                                ) : (
                                                    ''
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={`${styles.alc} ${styles.more}`}
                                    onClick={() =>
                                        setOpenId(
                                            openId === e.code ? null : e.code
                                        )
                                    }
                                >
                                    <h5>
                                        {openId === e.code
                                            ? '收起資訊'
                                            : '查看更多'}
                                        &nbsp;
                                        <i
                                            className={`fa-solid fa-chevron-down ${
                                                styles.icon
                                            } ${
                                                openId === e.code
                                                    ? styles.open
                                                    : ''
                                            }`}
                                        />
                                    </h5>
                                </div>
                            </div>
                        )
                    })}

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

                            {getPageNumbers(page, pagination.totalPages).map(
                                (pageNumber) => (
                                    <div
                                        key={pageNumber}
                                        className={`${styles.page} ${
                                            styles.paginationBtn
                                        } ${
                                            page === pageNumber
                                                ? styles.active
                                                : ''
                                        }
                                    `}
                                        onClick={() => setPage(pageNumber)}
                                    >
                                        {pageNumber}
                                    </div>
                                )
                            )}

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
                </div>
            ) : (
                <div className={`card ${styles.alc} p-5`}>
                    <h3 className={styles.p30}>
                        你沒有任何 {typeName} 的優惠券
                    </h3>
                </div>
            )}
        </>
    )
}
