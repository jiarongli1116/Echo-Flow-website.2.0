'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { LikekIcon } from '@/components/icons/Icons'
import styles from '../page.module.css'

export default function RankItem({
    e,
    i,
    getBookmark,
    shiftX = null,
    select,
    handleItemSelect,
    songPlay,
    setShowPlayer,
    setSongPlay,
}) {
    const [bookmark, setBookmark] = useState(e.has_bookmarked == 1)

    useEffect(() => {
        setBookmark(e.has_bookmarked == 1)
    }, [e.has_bookmarked])

    // console.log(e.id, e.name, e.has_bookmarked)

    const truncateName = (name, type) => {
        const isEnglish = /^[a-zA-Z0-9\s.,'()&/\u0000-\u007F]+$/.test(name)
        if (isEnglish && type == 'name' && name.length > 9) {
            return name.substring(0, 9) + '...'
        }
        if (isEnglish && type == 'author' && name.length > 15) {
            return name.substring(0, 15) + '...'
        }
        if (name.length > 7 && type == 'name') {
            return name.substring(0, 7) + '...'
        }
        return name
    }

    function handleBookmark() {
        getBookmark(e.id)
        setBookmark((prev) => !prev)
    }

    return (
        <>
            <div
                className={`${styles.rank} ${
                    i == select ? styles.selected : ''
                }`}
                key={e.id}
                onClick={() => handleItemSelect(i)}
                style={{
                    transform: `translateX(${shiftX}px)`,
                }}
            >
                <h3
                    className={`${styles.rankNum} ${styles.gold600} ${styles.alc}`}
                >
                    {i + 1}.
                </h3>
                <div className={`${styles.rankImg}`}>
                    <img src={`${e.pathname}`} alt={e.name} />
                </div>
                <div className={styles.rankInf}>
                    <Link
                        href={`/products/${e.id}`}
                        className={styles.rankName}
                    >
                        <h6>{truncateName(e.name, 'name')}</h6>
                    </Link>
                    <div className={styles.rankAuthor}>
                        <p>{truncateName(e.artist, 'author')}</p>
                    </div>
                </div>
                <div className={`${styles.rankBtn} ${styles.alc}`}>
                    <div
                        className={`${styles.mark} ${styles.bgBlack900} ${styles.gold600}`}
                        onClick={() => {
                            handleBookmark()
                        }}
                    >
                        <LikekIcon filled={bookmark ? '#5ff' : ''} />
                    </div>

                    <div
                        className={`${styles.play} ${styles.bgBlack900} ${
                            e.spotify_album_id ? styles.gold600 : styles.grey
                        } ${
                            e.spotify_album_id ? styles.doPlay : styles.notPlay
                        }`}
                        onClick={() => {
                            if (e.spotify_album_id) {
                                if (songPlay == e.spotify_album_id) {
                                    setShowPlayer(false)
                                    setSongPlay('')
                                    return
                                }
                                setShowPlayer(true)
                                setSongPlay(e.spotify_album_id)
                            }
                        }}
                    >
                        {songPlay == e.spotify_album_id ? (
                            <i className="fa-solid fa-stop"></i>
                        ) : (
                            <i className="fa-solid fa-play"></i>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
