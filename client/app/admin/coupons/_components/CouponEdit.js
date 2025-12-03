'use client'

import React, { useState, useEffect } from 'react'
import styles from '../_components/page.module.css'
import Link from 'next/link'
import { Form } from 'react-bootstrap'
import { useCoupons } from '@/hooks/use-coupons'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function CouponEdit({ coupon = null }) {
    const { couponEdit } = useCoupons()
    const router = useRouter()
    // console.log(coupon.name)

    // 這段程式碼會根據每次的 props 重新建立
    const initialFormData = {
        name: coupon?.name || '',
        code: coupon?.code || '',
        start_at: coupon?.start_at || '',
        end_at: coupon?.end_at || '',
        validity_days: coupon?.validity_days || 0,
        discount_type: coupon?.discount_type || '',
        discount_value: coupon?.discount_value || '',
        total_quantity: coupon?.total_quantity || '',
        target_type: coupon?.target_type || '',
        target_value: coupon?.target_value || '',
        usage_limit: coupon?.usage_limit || '',
        status: coupon?.status || '',
        min_spend: coupon?.min_spend || 0,
        min_items: coupon?.min_items || '',
        content: coupon?.content || '',
    }
    console.log('initialFormData (渲染時):', initialFormData)

    const [formData, setFormData] = useState(initialFormData)

    useEffect(() => {
        if (coupon) {
            setFormData({
                name: coupon.name,
                code: coupon.code,
                start_at: coupon.start_at,
                end_at: coupon.end_at,
                validity_days: coupon.validity_days,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                total_quantity: coupon.total_quantity,
                target_type: coupon.target_type,
                target_value: coupon.target_value,
                usage_limit: coupon.usage_limit,
                status: coupon.status,
                min_spend: coupon.min_spend,
                min_items: coupon.min_items,
                content: coupon.content,
            })
        }
    }, [coupon])

    // console.log('formData (狀態):', formData)

    const targetData = {
        all: null,
        member: { mc: '活動', mv: 'VIP', mg: '回饋', mw: '歡迎禮' },
        product: {
            1: '古典',
            2: '爵士',
            3: '西洋',
            4: '華語',
            5: '日韓',
            6: '原聲帶',
        },
        game: {},
    }

    // 2. 建立一個處理所有輸入變更的處理器
    const handleInputChange = (e) => {
        const { id, value } = e.target

        if (id === 'discount_type') {
            if (value === 'free_shipping') {
                setFormData({
                    ...formData,
                    discount_type: value,
                    discount_value: 0, // 設定為 0 並禁用輸入
                })
            } else {
                setFormData({
                    ...formData,
                    discount_type: value,
                })
            }
        } else {
            setFormData({
                ...formData,
                [id]: value,
            })
        }
    }

    // 3. 建立表單提交處理器
    const handleFormSubmit = (e) => {
        e.preventDefault() // 阻止頁面重新整理
        if (JSON.stringify(formData) === JSON.stringify(initialFormData)) {
            console.log('未修改')

            toast.warn(`${formData.name} 優惠券未修改`, {
                containerId: 'global-toast-container',
            })
            return
        }
        router.push('/admin/coupons')
        couponEdit(formData)
    }

    return (
        <>
            <div className={styles.adminContainer}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>修改優惠券</h2>
                        <p className={styles.subtitle}></p>
                    </div>
                    <div className={styles.headerRight}>
                        <Link href={'/admin/coupons'} className={styles.addBtn}>
                            回到優惠券
                        </Link>
                    </div>
                </div>
                <Form className="p-3" method="post" onSubmit={handleFormSubmit}>
                    <div
                        className={`card ${styles.bigCard} d-flex flex-column gap-1`}
                    >
                        {/* 資訊 */}
                        <h5>優惠券資訊</h5>

                        <div className="mb-3 mt-3 row">
                            <label
                                htmlFor="name"
                                className={`col-xl-1 col-form-label`}
                            >
                                名稱
                            </label>
                            <div className="col-xl-7">
                                <input
                                    id="name"
                                    type="text"
                                    className="form-control"
                                    value={formData.name || ''}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <label
                                htmlFor="code"
                                className={`col-xl-1 col-form-label`}
                            >
                                代碼
                            </label>
                            <div className="col-xl-3 d-flex">
                                <input
                                    id="code"
                                    type="text"
                                    className="form-control"
                                    value={formData.code || ''}
                                    onChange={handleInputChange}
                                    disabled
                                />
                            </div>
                        </div>

                        <div className="mb-4 row">
                            <label
                                htmlFor="start_at"
                                className="col-xl-1 col-form-label"
                            >
                                活動開始
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="start_at"
                                    type="datetime-local"
                                    className="form-control"
                                    value={formData.start_at || ''}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <label
                                htmlFor="end_at"
                                className={`col-xl-1 col-form-label`}
                            >
                                活動結束
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="end_at"
                                    type="datetime-local"
                                    className="form-control"
                                    value={formData.end_at || ''}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <label
                                htmlFor="validity_days"
                                className="col-xl-1 col-form-label"
                            >
                                有效天數
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="validity_days"
                                    type="number"
                                    className="form-control"
                                    placeholder="0 = 有效期限為活動結束"
                                    value={formData.validity_days || 0}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* 類型與選項 */}

                        <h5>優惠券類型與選項</h5>

                        <div className="mb-3 mt-3 row">
                            <label
                                htmlFor="discount_type"
                                className={`col-xl-1 col-form-label`}
                            >
                                折扣類型
                            </label>
                            <div className="col-xl-3">
                                <select
                                    id="discount_type"
                                    className="form-select"
                                    value={formData.discount_type || ''}
                                    onChange={handleInputChange}
                                >
                                    <option value="fixed">固定金額</option>
                                    <option value="percent">百分比</option>
                                    <option value="free_shipping">免運</option>
                                </select>
                            </div>

                            <label
                                htmlFor="discount_value"
                                className={`col-xl-1 col-form-label`}
                            >
                                折扣內容
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="discount_value"
                                    type="number"
                                    className="form-control"
                                    value={formData.discount_value || ''}
                                    onChange={handleInputChange}
                                    disabled={
                                        formData.discount_type ===
                                        'free_shipping'
                                    }
                                    required
                                />
                            </div>

                            <label
                                htmlFor="total_quantity"
                                className="col-xl-1 col-form-label"
                            >
                                總發放量
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="total_quantity"
                                    type="number"
                                    className="form-control"
                                    placeholder="-1 = ∞"
                                    value={formData.total_quantity || ''}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="mb-4 row">
                            <label
                                htmlFor="target_type"
                                className={`col-xl-1 col-form-label`}
                            >
                                對象類型
                            </label>
                            <div className="col-xl-3">
                                <select
                                    id="target_type"
                                    className="form-select"
                                    value={formData.target_type || ''}
                                    onChange={handleInputChange}
                                    disabled
                                >
                                    <option value="all">全品項</option>
                                    <option value="member">會員</option>
                                    <option value="product">產品</option>
                                    <option value="game">遊戲</option>
                                </select>
                            </div>

                            <label
                                htmlFor="target_value"
                                className={`col-xl-1 col-form-label`}
                            >
                                對象內容
                            </label>
                            <div className="col-xl-3">
                                <select
                                    id="target_value"
                                    className="form-select"
                                    value={formData.target_value || ''}
                                    onChange={handleInputChange}
                                    disabled
                                >
                                    {formData.target_type !== 'all' &&
                                        targetData[formData.target_type] &&
                                        Object.entries(
                                            targetData[formData.target_type]
                                        ).map(([key, value]) => (
                                            <option key={key} value={key}>
                                                {value}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <label
                                htmlFor="usage_limit"
                                className="col-xl-1 col-form-label"
                            >
                                使用次數
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="usage_limit"
                                    type="number"
                                    className="form-control"
                                    placeholder="-1 = ∞"
                                    value={formData.usage_limit || ''}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* 限制與說明 */}

                        <h5>優惠券限制與說明</h5>

                        <div className="mb-3 mt-3 row">
                            <label
                                htmlFor="status"
                                className={`col-xl-1 col-form-label`}
                            >
                                活動狀態
                            </label>
                            <div className="col-xl-1">
                                <select
                                    id="status"
                                    className="form-select"
                                    value={formData.status || ''}
                                    onChange={handleInputChange}
                                >
                                    <option value="active" defaultChecked>
                                        啟用
                                    </option>
                                    <option value="inactive">停用</option>
                                </select>
                            </div>

                            <label
                                htmlFor="min_spend"
                                className="col-xl-1 col-form-label"
                            >
                                最低消費
                            </label>
                            <div className="col-xl-4">
                                <input
                                    id="min_spend"
                                    type="number"
                                    className="form-control"
                                    value={formData.min_spend || 0}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <label
                                htmlFor="min_items"
                                className="col-xl-1 col-form-label"
                                placeholder="1"
                            >
                                最低件數
                            </label>
                            <div className="col-xl-4">
                                <input
                                    id="min_items"
                                    type="number"
                                    className="form-control"
                                    value={formData.min_items || ''}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="mb-4 row">
                            <label
                                htmlFor="content"
                                className="col-xl-1 col-form-label"
                            >
                                說明
                            </label>
                            <div className="col-xl-11">
                                <textarea
                                    id="content"
                                    className="form-control"
                                    rows="3"
                                    value={formData.content || ''}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* 送出 */}
                        <div className="text-end">
                            <button
                                type="submit"
                                className="btn btn-primary me-2"
                            >
                                儲存
                            </button>

                            <button
                                type="button"
                                className="btn btn-danger me-2"
                                onClick={() => {
                                    setFormData(initialFormData)
                                }}
                            >
                                重置
                            </button>

                            <button
                                type="button"
                                className="btn btn-warning"
                                onClick={() => history.back()}
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </Form>
            </div>
        </>
    )
}
