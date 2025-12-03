'use client'

import React, { useState, useEffect } from 'react'
import styles from './coupons.module.css'
import { useCoupons } from '@/hooks/use-coupons'

export default function Search({ getOne }) {
    const [code, setCode] = useState('')

    // ! hover & active
    return (
        <>
            <div className={styles.search}>
                <div className={styles.title}>
                    <h4>優惠券代碼</h4>
                </div>
                <div
                    className={`${styles.searchBar} ${styles.bgGrey600} ${styles.alc}`}
                >
                    <p className="text-dark m-0">新增優惠券</p>
                    <input
                        type="text"
                        placeholder="輸入優惠代碼"
                        className={`${styles.searchTextarea} bg-light`}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                    <button
                        className={`${styles.searchBtn}`}
                        onClick={() => getOne(code)}
                    >
                        <p>儲存</p>
                    </button>
                </div>
            </div>
        </>
    )
}
