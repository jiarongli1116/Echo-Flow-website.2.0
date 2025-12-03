'use client'

import React, { useState, useEffect } from 'react'
import styles from '../_components/page.module.css'
import Link from 'next/link'
import { Form } from 'react-bootstrap'
import { useCoupons } from '@/hooks/use-coupons'
import { useRouter } from 'next/navigation'

export default function CouponAdd(props) {
    const { couponAdd } = useCoupons()
    const router = useRouter()

    const getCurrentDateTime = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')

        return `${year}-${month}-${day}T00:00`
    }

    const initialFormData = {
        name: '',
        code: '',
        start_at: getCurrentDateTime(),
        end_at: '',
        validity_days: '',
        discount_type: 'fixed',
        discount_value: '',
        total_quantity: '',
        target_type: 'all',
        target_value: '',
        usage_limit: '',
        status: 'active',
        min_spend: 0,
        min_items: 1,
        content: '',
    }

    const [formData, setFormData] = useState(initialFormData)

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

    function generateCode() {
        console.log(formData.target_type)

        let prefix = ''
        let randomLength = 7

        switch (formData.target_type) {
            case 'all':
                prefix = 'A'
                break
            case 'member':
                prefix = 'M' + formData.target_value.charAt(1).toUpperCase()
                randomLength = 6
                break
            case 'product':
                prefix = 'P' + formData.target_value
                randomLength = 6
                break
            case 'game':
                // 根據模式，假設 'game' 使用 'G' 開頭
                prefix = 'G'
                break
            default:
                // 任何未知類型都使用 'A' 作為備用
                prefix = 'A'
                break
        }

        // 輔助函數：創建代碼的隨機部分
        const getRandomHex = (length) => {
            let result = ''
            const characters = '0123456789ABCDEF'
            for (let i = 0; i < length; i++) {
                result += characters.charAt(
                    Math.floor(Math.random() * characters.length)
                )
            }
            return result
        }

        const newCode = prefix + getRandomHex(randomLength)

        // 使用新代碼更新狀態
        setFormData((prevData) => ({
            ...prevData,
            code: newCode,
        }))
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
    const handleFormSubmit = async (e) => {
        e.preventDefault() // 阻止頁面重新整理

        // 建立一個新物件來存放更新後的表單資料
        const nextFormData = { ...formData }

        // 如果欄位為空，設定預設值
        if (!nextFormData.validity_days) {
            nextFormData.validity_days = 0
        }
        if (!nextFormData.usage_limit) {
            nextFormData.usage_limit = 1
        }

        // 使用最終確定的資料呼叫 API 函式
        const result = await couponAdd(nextFormData)

        if (result) {
            router.push('/admin/coupons')
        }
    }

    return (
        <>
            <div className={styles.adminContainer}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>新增優惠券</h2>
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
                        <hr />
                        <div className="mb-3 mt-3 row">
                            <label
                                htmlFor="name"
                                className={`${styles.required} col-xl-1 col-form-label`}
                            >
                                名稱
                            </label>
                            <div className="col-xl-7">
                                <input
                                    id="name"
                                    type="text"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <label
                                htmlFor="code"
                                className={`${styles.required} col-xl-1 col-form-label`}
                            >
                                代碼
                            </label>
                            <div className="col-xl-3 d-flex">
                                <div className="input-group">
                                    <input
                                        id="code"
                                        type="text"
                                        className="form-control"
                                        value={formData.code}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            generateCode()
                                        }}
                                    >
                                        自動生成
                                    </button>
                                </div>
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
                                    value={formData.start_at}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <label
                                htmlFor="end_at"
                                className={`${styles.required} col-xl-1 col-form-label`}
                            >
                                活動結束
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="end_at"
                                    type="datetime-local"
                                    className="form-control"
                                    value={formData.end_at}
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
                                    value={formData.validity_days}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* 類型與選項 */}

                        <h5>優惠券類型與選項</h5>
                        <hr />
                        <div className="mb-3 mt-3 row">
                            <label
                                htmlFor="discount_type"
                                className={`${styles.required} col-xl-1 col-form-label`}
                            >
                                折扣類型
                            </label>
                            <div className="col-xl-3">
                                <select
                                    id="discount_type"
                                    className="form-select"
                                    value={formData.discount_type}
                                    onChange={handleInputChange}
                                >
                                    <option value="fixed">固定金額</option>
                                    <option value="percent">百分比</option>
                                    <option value="free_shipping">免運</option>
                                </select>
                            </div>

                            <label
                                htmlFor="discount_value"
                                className={`${styles.required} col-xl-1 col-form-label`}
                            >
                                折扣內容
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="discount_value"
                                    type="number"
                                    className="form-control"
                                    value={formData.discount_value}
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
                                className={`${styles.required} col-xl-1 col-form-label`}
                            >
                                總發放量
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="total_quantity"
                                    type="number"
                                    className="form-control"
                                    placeholder="-1 = ∞"
                                    value={formData.total_quantity}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="mb-4 row">
                            <label
                                htmlFor="target_type"
                                className={`${styles.required} col-xl-1 col-form-label`}
                            >
                                對象類型
                            </label>
                            <div className="col-xl-3">
                                <select
                                    id="target_type"
                                    className="form-select"
                                    value={formData.target_type}
                                    onChange={handleInputChange}
                                >
                                    <option value="all">全品項</option>
                                    <option value="member">會員</option>
                                    <option value="product">產品</option>
                                    <option value="game">遊戲</option>
                                </select>
                            </div>

                            <label
                                htmlFor="target_value"
                                className={`${styles.required} col-xl-1 col-form-label`}
                            >
                                對象內容
                            </label>
                            <div className="col-xl-3">
                                <select
                                    id="target_value"
                                    className="form-select"
                                    value={formData.target_value || ''}
                                    onChange={handleInputChange}
                                    disabled={formData.target_type === 'all'}
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
                                className={`col-xl-1 col-form-label`}
                            >
                                使用次數
                            </label>
                            <div className="col-xl-3">
                                <input
                                    id="usage_limit"
                                    type="number"
                                    className="form-control"
                                    placeholder="-1 = ∞"
                                    value={formData.usage_limit}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* 限制與說明 */}

                        <h5>優惠券限制與說明</h5>
                        <hr />
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
                                    value={formData.status}
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
                                    value={formData.min_spend}
                                    onChange={handleInputChange}
                                    required
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
                                    value={formData.min_items}
                                    onChange={handleInputChange}
                                    required
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
                                    value={formData.content}
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
