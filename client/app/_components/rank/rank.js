'use client'

import React, { useState, useEffect } from 'react'
import styles from '../page.module.css'
import RankCircle from './circle'
import RankBeeline from './beeline'

export default function Rank({ rank, getBookmark }) {
    const [showPlayer, setShowPlayer] = useState(false)
    const [songPlay, setSongPlay] = useState('')

    return (
        <>
            <section
                className={`${styles.onRank} ${styles.bgBlack1000} flex-xxl-row flex-column align-items-xxl-center`}
            >
                <div
                    className={`${styles.title} ${styles.alc} w-2/5 w-xxl-full`}
                >
                    <h4>熱門排行</h4>
                    <div className={`${styles.bb} ${styles.bgDanger900}`}></div>
                </div>

                <RankCircle
                    rank={rank}
                    getBookmark={getBookmark}
                    songPlay={songPlay}
                    setShowPlayer={setShowPlayer}
                    setSongPlay={setSongPlay}
                />

                <RankBeeline
                    rank={rank}
                    getBookmark={getBookmark}
                    songPlay={songPlay}
                    setShowPlayer={setShowPlayer}
                    setSongPlay={setSongPlay}
                />

                {songPlay && showPlayer && (
                    <iframe
                        src={`https://open.spotify.com/embed/album/${songPlay}?utm_source=generator&theme=0`}
                        width="80%"
                        height="100"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        title="Spotify Player"
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 1000,
                            border: 'none',
                        }}
                    ></iframe>
                )}
            </section>
        </>
    )
}
