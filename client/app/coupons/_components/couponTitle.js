'use client'

import React, { useState, useEffect } from 'react'
import styles from './coupons.module.css'

export default function CouponTitle({
    ClickType = () => {},
    ClickClass = () => {},
    getAll = () => {},
    tgType,
    tgClass,
    pagination,
}) {
    const typeTags = [
        { data: 'a', value: '全部' },
        { data: 'limit', value: '限量券' },
        { data: 'percent', value: '折價券' },
        { data: 'fixed', value: '抵用券' },
        { data: 'free_shipping', value: '免運券' },
    ]
    const typeClass = [
        { data: 'a', value: '全部' },
        { data: '1', value: '古典' },
        { data: '2', value: '爵士' },
        { data: '3', value: '歐美' },
        { data: '4', value: '華語' },
        { data: '5', value: '日韓' },
        { data: '6', value: '原聲帶' },
    ]

    return (
        <>
            <div className={styles.couponTitle}>
                <div className="d-flex align-items-center gap-px">
                    <h4>優惠券</h4>
                    <h6 className="ps-2 d-none d-xl-flex">
                        - 總共 {pagination.total} 張
                    </h6>
                </div>
                <button
                    className={`btn ${styles.couponsAll} ${styles.bgGold600} text-dark`}
                    onClick={() => {
                        getAll()
                    }}
                >
                    <h6 className="m-0">全部領取</h6>
                </button>
            </div>

            <div className={styles.couponTag}>
                <div className={styles.type}>
                    <div className={styles.label}>
                        <h6>類別</h6>
                    </div>
                    <div className={styles.tags}>
                        <ul>
                            {typeTags.map((e) => {
                                return (
                                    <li
                                        key={e.data}
                                        className={`btn ${styles.tag} ${
                                            styles.bgGold600
                                        } ${
                                            tgType === e.data
                                                ? styles.active
                                                : ''
                                        }`}
                                        data-type={e.data}
                                        onClick={(e) => {
                                            ClickType(
                                                e.currentTarget.dataset.type
                                            )
                                        }}
                                    >
                                        <p>{e.value}</p>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>

                <div className={styles.type}>
                    <div className={styles.label}>
                        <h6>分類</h6>
                    </div>
                    <div className={styles.tags}>
                        <ul>
                            {typeClass.map((e) => {
                                return (
                                    <li
                                        key={e.data}
                                        className={`btn ${styles.tag} ${
                                            styles.bgGold600
                                        } ${
                                            tgClass === e.data
                                                ? styles.active
                                                : ''
                                        }`}
                                        data-class={e.data}
                                        onClick={(e) =>
                                            ClickClass(
                                                e.currentTarget.dataset.class
                                            )
                                        }
                                    >
                                        <p>{e.value}</p>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>
            </div>
        </>
    )
}
