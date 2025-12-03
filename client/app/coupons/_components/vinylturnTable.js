'use client'

import React, { useState, useEffect } from 'react'
import styles from './coupons.module.css'

export default function VinylTurnTable(props) {
    return (
        <>
            <div className={styles.vinylTurntable}>
                <div className={styles.title}>
                    <h4>每日輪盤</h4>
                </div>
                <div className={`${styles.content} ${styles.alc}`}>
                    <div
                        className={`${styles.turntable} ${styles.bgBlack1000}`}
                    >
                        <div className={styles.circle}>
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`${styles.slice} ${
                                        styles[`slice${i + 1}`]
                                    }`}
                                ></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
