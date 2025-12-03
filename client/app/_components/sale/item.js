'use client'

import React, { useState, useEffect } from 'react'
import { CartIcon, LikekIcon } from '@/components/icons/Icons'
import styles from '../page.module.css'
import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function Item({ e, getBookmark }) {
    const { addItem } = useCart()

    // console.log(e.id, e.name, e.has_bookmarked)

    const [bookmark, setBookmark] = useState(e.has_bookmarked == 1)

    useEffect(() => {
        setBookmark(e.has_bookmarked == 1)
    }, [e.has_bookmarked])

    const handleAddToCart = async (product, qty) => {
        try {
            console.log('加入購物車')

            await addItem(product, qty)

            setTimeout(() => {
                toast.success(`${product.name}已加入購物車`, {
                    containerId: 'global-toast-container',
                })
            }, 200)

            // alert(`已加入購物車：${product.name} x ${qty}`)
        } catch (err) {
            // addItem 內已處理未登入導向，這裡僅提示錯誤
            // alert(err?.message || '加入購物車失敗')
            toast.error('加入購物車失敗', {
                containerId: 'global-toast-container',
            })
        }
    }

    const truncateName = (name) => {
        const isEnglish = /^[a-zA-Z0-9\s.,'()&/\u0000-\u007F]+$/.test(name)

        if (isEnglish && name.length > 24) {
            return name.substring(0, 24) + '...'
        }

        // This rule applies to both Chinese and mixed-language strings.
        if (name.length > 12) {
            return name.substring(0, 12) + '...'
        }

        return name
    }

    function handleBookmark() {
        getBookmark(e.id)
        setBookmark((prev) => !prev)
    }

    return (
        <>
            <div className={styles.item}>
                <div className={`${styles.img} bg-white`}>
                    <Link href={`/products/${e.id}`}>
                        <img src={`${e.pathname}`} alt={e.name} />
                    </Link>

                    <div className={`${styles.imgBtn} ${styles.alc}`}>
                        <div
                            className={`${styles.mark} ${styles.bgBlack800} ${styles.gold600} ${styles.alc}`}
                            onClick={() => {
                                handleBookmark()
                            }}
                        >
                            <LikekIcon filled={bookmark ? '#5ff' : ''} />
                        </div>
                        <div className={``}></div>
                    </div>
                </div>

                <div className={styles.itemContent}>
                    <Link
                        href={`/products/${e.id}`}
                        className={styles.itemName}
                    >
                        <h6>{truncateName(e.name)}</h6>
                    </Link>
                    <div className={styles.itemAuthor}>
                        <p className={styles.grey200}>
                            {truncateName(e.artist)}
                        </p>
                    </div>
                    <div className={styles.itemPrice}>
                        <div className={styles.price}>
                            <p className={styles.gold600}>$ {e.price}元</p>
                        </div>
                        <div
                            className={styles.addCart}
                            onClick={() => {
                                handleAddToCart(e, 1)
                            }}
                        >
                            <CartIcon />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
