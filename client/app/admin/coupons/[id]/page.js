'use client'

import React, { useState, useEffect } from 'react'

import AdminLayout from '../../_components/AdminLayout'
import CouponEdit from '../_components/CouponEdit'
import { useCoupons } from '@/hooks/use-coupons'
import { useParams } from 'next/navigation'

export default function CouponEditPage() {
    const [activeTab, setActiveTab] = useState('coupons')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const { coupon, couponGet } = useCoupons()

    const params = useParams() // 獲取路由參數
    let code = params.id
    // console.log(code)

    useEffect(() => {
        couponGet(code)
    }, [code])

    return (
        <>
            <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
                <CouponEdit coupon={coupon} />
            </AdminLayout>
        </>
    )
}
