'use client'

import React, { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'
import Marquee from 'react-fast-marquee'

export default function Broadcast(props) {
    const text = 'Echo & Flow ~'

    return (
        <div className={`${styles.broadcast} ${styles.alc}`}>
            <div className={styles.track}>
                <Marquee className={styles.myMarquee}>
                    <span className={styles.h3}>{text}</span>
                    <span className={styles.h3}>{text}</span>
                    <span className={styles.h3}>{text}</span>
                    <span className={styles.h3}>{text}</span>
                    <span className={styles.h3}>{text}</span>
                    <span className={styles.h3}>{text}</span>
                </Marquee>
            </div>
        </div>
    )
}
