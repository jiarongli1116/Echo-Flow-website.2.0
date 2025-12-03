'use client'

import { LikekIcon, UserIcon } from '@/components/icons/Icons'
import React, { useState, useEffect } from 'react'
import styles from './page.module.css'
import Link from 'next/link'

export default function News({ news, getNewsType = () => {}, type }) {
    // console.log(news)

    const typeTags = [
        { data: '1', value: '最新消息' },
        { data: '2', value: '熱門' },
        { data: '3', value: '爵士' },
        { data: '4', value: '歐美' },
        { data: '5', value: '華語' },
        { data: '6', value: '日韓' },
        { data: '7', value: '原聲帶' },
        { data: '8', value: '二手唱片' },
    ]

    const truncateName = (name, type) => {
        if (!name) return name

        if (name.length > 36 && type == 'title') {
            return name.substring(0, 36) + '...'
        }
        // 處理文章內容 (text) 的截斷，並移除 [img] 標籤
        if (type === 'text') {
            // 先移除所有 [img] 標籤
            const cleanedName = name.replace(/\[img\]/g, '')

            // 檢查移除標籤後的字串長度是否超過 38 個字元
            if (cleanedName.length > 30) {
                return cleanedName.substring(0, 30) + '...'
            }

            // 如果沒有超過，直接回傳處理後的字串
            return cleanedName
        }

        return name
    }

    const getHref = (type) => {
        if (!type) {
            return '/forums'
        }
        if (type === 1) {
            return '/forums?sort=new'
        }
        if (type === 2) {
            return '/forums'
        }
        return `/forums?cid=${type}`
    }

    // !! display - grid
    return (
        <>
            <section className={`${styles.onNews} ${styles.bgBlack800}`}>
                <div className={`${styles.container} container`}>
                    <div className={`${styles.main} ${styles.p30}`}>
                        <div
                            className={`${styles.title} ${styles.alc} ms-auto me-auto`}
                        >
                            <h4 className={styles.gold600}>最新文章</h4>
                        </div>

                        <div className={styles.newBarsList}>
                            {typeTags.map((e) => {
                                return (
                                    <div
                                        key={e.data}
                                        className={`active ${styles.newBar} ${
                                            e.data === type ? styles.active : ''
                                        }`}
                                        data-type={e.data}
                                        onClick={(e) => {
                                            console.log(
                                                e.currentTarget.dataset.type
                                            )
                                            getNewsType(
                                                e.currentTarget.dataset.type
                                            )
                                        }}
                                    >
                                        <p className={styles.gold600}>
                                            {e.value}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>

                        <div className={styles.newsList}>
                            {news.map((e) => {
                                const tags = e.tags.split(',')
                                return (
                                    <div className={styles.new} key={e.id}>
                                        <div
                                            className={`${styles.img} bg-dark`}
                                        >
                                            <img src={e.image_url} />
                                        </div>
                                        <div
                                            className={`${styles.newContext} ${styles.p30} bg-light `}
                                        >
                                            <div
                                                className={`${styles.tagsList} d-flex gap-2`}
                                            >
                                                {tags.map((tag, index) => (
                                                    // Render a div for each tag.
                                                    <div
                                                        key={index}
                                                        className={`${styles.tag} ${styles.bgGrey100} text-dark`}
                                                    >
                                                        {tag.trim()}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className={styles.newTitle}>
                                                <h6
                                                    className={`${styles.gold900} fw-normal`}
                                                >
                                                    {truncateName(
                                                        e.title,
                                                        'title'
                                                    )}
                                                </h6>
                                            </div>

                                            <div className={styles.func}>
                                                <div
                                                    className={`${styles.like} ${styles.grey900}`}
                                                >
                                                    <i className="fa-regular fa-heart"></i>
                                                    {e.like_count}
                                                </div>
                                                <div
                                                    className={`${styles.discuss} ${styles.grey900}`}
                                                >
                                                    <i className="fa-regular fa-message"></i>
                                                    {e.comment_count}
                                                </div>
                                                <div className={styles.user}>
                                                    <div
                                                        className={`${styles.userImg} ${styles.bgGrey600}`}
                                                    >
                                                        <UserIcon />
                                                    </div>
                                                    <div
                                                        className={`${styles.userName} ${styles.grey900}`}
                                                    >
                                                        {e.nickname}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={styles.paragraph}>
                                                <p className="text-dark">
                                                    {truncateName(
                                                        e.content,
                                                        'text'
                                                    )}
                                                </p>
                                            </div>

                                            <Link
                                                href={`/forums/${e.id}`}
                                                className={`btn ${styles.btnMore} ${styles.bgGold600} ${styles.textLight}`}
                                            >
                                                閱讀更多 →
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <Link
                            href={getHref(type)}
                            className={`btn ${styles.newBtn} ${styles.bgGold600}`}
                        >
                            <h6 className="">更多文章</h6>
                        </Link>
                    </div>
                </div>
            </section>
        </>
    )
}
