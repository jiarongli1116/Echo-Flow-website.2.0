'use client'

import React, { useState, useEffect } from 'react'
import styles from '../page.module.css'
import VolumeBar from './VolumeBar'
import VolumeBar2 from './VolumeBar2'
import Link from 'next/link'
import Marquee from 'react-fast-marquee'

export default function Head({ motion, motion2 }) {
    // console.log(motion, motion2)

    return (
        <>
            <div className={`${styles.indexHeader} overflow-hidden`}>
                <div className={`${styles.motion}`}>
                    <VolumeBar2 />

                    <div className={styles['film-strip']}></div>

                    <div className={styles.vinylList}>
                        <Marquee pauseOnHover>
                            {motion.map((e) => {
                                return (
                                    <Link
                                        href={`/products/${e.id}`}
                                        key={e.id}
                                        className={`${styles.vinylImg} ${styles.alc}`}
                                    >
                                        <img
                                            src={`${e.pathname}`}
                                            alt={e.name}
                                        />
                                    </Link>
                                )
                            })}
                        </Marquee>
                    </div>

                    <div className={styles['film-strip']}></div>
                    <VolumeBar />
                </div>

                <div className={styles.vinylContent}>
                    <div
                        className={`${styles.headerLogo} ${styles.alc} w-100 w-lg-50`}
                    >
                        <h1>
                            ECHO&FLOW
                            <br />
                            VINYLSTORE
                        </h1>
                    </div>
                    <div
                        className={`${styles.headerTitle} ${styles.alc} d-none d-xl-block`}
                    >
                        <img src="/images/headerTitle.png" />
                    </div>
                </div>

                <div className={`${styles.motion} ${styles.motion2}`}>
                    <VolumeBar2 />

                    <div className={styles['film-strip']}></div>

                    <div className={styles.vinylList}>
                        <Marquee pauseOnHover direction="right">
                            {motion2.map((e) => {
                                return (
                                    <Link
                                        href={`/products/${e.id}`}
                                        key={e.id}
                                        className={`${styles.vinylImg} ${styles.alc}`}
                                    >
                                        <img
                                            src={`${e.pathname}`}
                                            alt={e.name}
                                        />
                                    </Link>
                                )
                            })}
                        </Marquee>
                    </div>
                    <div className={styles['film-strip']}></div>
                    <VolumeBar />
                </div>
            </div>
        </>
    )
}
