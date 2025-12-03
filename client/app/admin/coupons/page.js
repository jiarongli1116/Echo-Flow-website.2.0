'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '../_components/AdminLayout'
import AdminContentSwitcher from '../_components/AdminContentSwitcher'
import { useCoupons } from '@/hooks/use-coupons'

export default function CouponsPage() {
    const [activeTab, setActiveTab] = useState('coupons')
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [refresh, setRefresh] = useState(false)
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    })

    const { couponStatus, couponValid, couponsAllStatus, couponsAllValid } =
        useCoupons()

    // 從後端 API 獲取優惠券資料
    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                setLoading(true)
                setError(null)

                const response = await fetch(
                    'http://localhost:3005/api/coupons/admin/all?limit=1000',
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()

                if (data.status === 'success') {
                    // 轉換 API 資料格式以符合前端組件需求
                    const formattedCoupons = data.data.map((coupon) => ({
                        id: coupon.id,
                        name: coupon.name,
                        code: coupon.code,
                        content: coupon.content || '無描述',
                        type:
                            coupon.discountType === 'free_shipping'
                                ? 'free_shipping'
                                : coupon.discountType === 'percent'
                                ? 'percentage'
                                : 'fixed',
                        value: coupon.discountValue,
                        minAmount: coupon.minSpend || 0,
                        maxDiscount:
                            coupon.discountType === 'percent'
                                ? Math.round(coupon.discountValue * 100)
                                : coupon.discountValue,
                        startDate: coupon.startAt
                            ? new Date(coupon.startAt).toLocaleDateString(
                                  'zh-TW'
                              )
                            : '未知',
                        endDate: coupon.endAt
                            ? new Date(coupon.endAt).toLocaleDateString('zh-TW')
                            : '未知',
                        usageLimit: coupon.usageLimit || 0,
                        usedCount: coupon.usedCount || 0,
                        status:
                            coupon.status === 'active' ? 'active' : 'expired',
                        totalQuantity: coupon.totalQuantity,
                        remainingQuantity: coupon.remainingQuantity,
                        usageRate: coupon.usageRate || 0,
                        targetType: coupon.targetType,
                        targetValue: coupon.targetValue,
                        validityDays: coupon.validityDays,
                        createdAt: coupon.createdAt
                            ? new Date(coupon.createdAt).toLocaleDateString(
                                  'zh-TW'
                              )
                            : '未知',
                        userCount: coupon.userCount || 0,
                    }))
                    setCoupons(formattedCoupons)
                    setPagination(
                        data.pagination || {
                            page: 1,
                            limit: 20,
                            total: formattedCoupons.length,
                            totalPages: 1,
                        }
                    )
                } else {
                    throw new Error(data.message || '獲取優惠券資料失敗')
                }
            } catch (err) {
                console.error('獲取優惠券資料錯誤:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchCoupons()
    }, [refresh])

    // 處理優惠券更新
    const handleCouponsUpdate = (updatedCoupons) => {
        setCoupons(updatedCoupons)
    }

    function changeStatus(code) {
        couponStatus(code)
        setTimeout(() => {
            setRefresh(!refresh)
        }, 500)
    }

    function changeValid(code) {
        couponValid(code)
        setTimeout(() => {
            setRefresh(!refresh)
        }, 500)
    }

    function changeAllStatus(codes, status) {
        couponsAllStatus(codes, status)
        setTimeout(() => {
            setRefresh(!refresh)
        }, 500)
    }

    function changeAllValid(codes) {
        couponsAllValid(codes)
        setTimeout(() => {
            setRefresh(!refresh)
        }, 500)
    }

    return (
        <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            <AdminContentSwitcher
                activeTab={activeTab}
                coupons={coupons}
                loading={loading}
                error={error}
                onCouponsUpdate={handleCouponsUpdate}
                onChangeStatus={changeStatus}
                onValid={changeValid}
                onAllStatus={changeAllStatus}
                onAllValid={changeAllValid}
            />
        </AdminLayout>
    )
}
