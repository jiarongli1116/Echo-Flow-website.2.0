'use client'

import React, { useState, useEffect } from 'react'
import styles from './page.module.css'
import Link from 'next/link'

export default function Class({ category }) {
    return (
        <>
            <section className={styles.onClass}>
                <h3 className="text-light">商品分類</h3>
                <div className={styles.rowClass}>
                    {category.map((e) => {
                        return (
                            <Link
                                className={styles.class}
                                key={e.id}
                                href={`/products?mcid=${e.main_category_id}`}
                            >
                                <h3>{e.title}</h3>
                                <img src={`${e.pathname}`} alt={e.name} />
                            </Link>
                        )
                    })}
                </div>
            </section>
        </>
    )
}
