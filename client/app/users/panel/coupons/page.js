'use client'

import UserPanelLayout from '@/app/users/panel/_components/UserPanelLayout'
import { useCoupons } from '@/hooks/use-coupons'
import { useEffect, useState } from 'react'
import styles from './page.module.css'
import CouponsCoupon from './coupon'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'

export default function usersCouponsPage() {
    const { userCouponsPage, userGetCoupon, userCoupons, pagination } =
        useCoupons()
    const [type, setType] = useState('a')
    const [page, setPage] = useState(1)
    const [code, setCode] = useState('')
    const [refresh, setRefresh] = useState(false)

    const typeData = [
        { data: 'a', name: '已領取' },
        { data: 'used', name: '已使用' },
        { data: 'Expired', name: '已過期' },
    ]

    // ! 獲取 account
    const { user } = useAuth()
    // console.log(user)
    let account = user?.account || null

    // let account = 'echoflow123@gmail.com'
    console.log(account)
    useEffect(() => {
        if (account) {
            userCouponsPage(page, account, type)
        }
    }, [account, type, page, refresh])

    function getOne(code) {
        userGetCoupon(account, code)
        setTimeout(() => {
            console.log('刷新')
            setRefresh(!refresh)
        }, 400)
    }

    // !! 跳轉 訂單
    return (
        <UserPanelLayout pageTitle="我的優惠券">
            <div className="card">
                <div className="card-body">
                    <div className={styles.titleBtn}>
                        <div className={`d-flex ${styles.titleListNum}`}>
                            <h5 className="card-title">優惠券列表</h5>
                            <h6 className="ps-2 d-none d-xl-flex">
                                - 總共 {pagination.total} 張
                            </h6>
                        </div>
                        <Link href={'/coupons'} className={styles.couponPage}>
                            更多優惠券
                        </Link>
                    </div>
                    <hr />

                    <div className={styles.search}>
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
                                className={`${styles.searchBtn} ${styles.bgGold600}`}
                                onClick={() => getOne(code)}
                            >
                                <p>儲存</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className={`${styles.typeList} d-flex`}>
                    {typeData.map((e) => {
                        return (
                            <div
                                className={`${styles.type} ${styles.alc} ${
                                    type === e.data ? styles.active : ''
                                }`}
                                data-type={e.data}
                                key={e.data}
                                onClick={() => {
                                    setType(e.data)
                                    setPage(1)
                                }}
                            >
                                <h6>{e.name}</h6>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className={styles.couponList}>
                <CouponsCoupon
                    userCoupons={userCoupons}
                    page={page}
                    setPage={setPage}
                    type={type}
                    pagination={pagination}
                />
            </div>
        </UserPanelLayout>
    )
}
