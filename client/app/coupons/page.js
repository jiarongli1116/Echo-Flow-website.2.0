'use client'

import React, { useState, useEffect } from 'react'

import CouponsContent from './_components/couponsContent'
import CouponTitle from './_components/couponTitle'
import Search from './_components/search'
import VinylTurnTable from './_components/vinylturnTable'

import styles from './_components/coupons.module.css'
import { useCoupons } from '@/hooks/use-coupons'
import { useAuth } from '@/hooks/use-auth'

export default function CouponsPage() {
    const { coupons, couponsPage, pagination, userGetAll, userGetCoupon } =
        useCoupons()

    const { user } = useAuth()

    console.log(user)

    // ! TOKEN & account 未完
    let account = user?.account || null
    // let account = 'euna.krajcik@yahoo.com'
    console.log(account)

    const [tgType, setTgType] = useState('a')
    const [tgClass, setTgClass] = useState('a')
    const [page, setPage] = useState(1)
    const [refresh, setRefresh] = useState(false)

    useEffect(() => {
        couponsPage(page, account, tgType, tgClass)
    }, [tgType, tgClass, page, refresh])

    function ClickType(type) {
        setTgType(type)
        setPage(1)
    }

    function ClickClass(c) {
        setTgClass(c)
        setPage(1)
    }

    function getOne(code) {
        userGetCoupon(account, code)
        setTimeout(() => {
            console.log('刷新')
            setRefresh(!refresh)
        }, 400)
    }

    function getAll() {
        userGetAll(account, tgType, tgClass)
        setTimeout(() => {
            console.log('刷新')
            setRefresh(!refresh)
        }, 1000)
    }

    return (
        <div className={styles.bgBlack800}>
            <div className={`${styles.headerPAD}`}>
                <div
                    id="carouselExample"
                    className="carousel slide"
                    data-bs-ride="carousel"
                >
                    <div
                        className={`${styles.carousel_inner} ${styles.bgBlack1000} carousel-inner`}
                    >
                        <div
                            className={`${styles.carousel_item} carousel-item active`}
                        >
                            <img
                                src="/images/coupon.png"
                                className="d-block w-100"
                                alt="圖片1"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${styles.container} container`}>
                <div className={styles.container2}>
                    {/* <VinylTurnTable /> */}

                    <Search getOne={getOne} />

                    <div className={styles.hr}></div>

                    <div className={styles.couponsContent}>
                        <CouponTitle
                            tgType={tgType}
                            tgClass={tgClass}
                            ClickType={ClickType}
                            ClickClass={ClickClass}
                            getAll={getAll}
                            pagination={pagination}
                        />
                        <CouponsContent
                            setPage={setPage}
                            coupons={coupons}
                            pagination={pagination}
                            page={page}
                            getOne={getOne}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
