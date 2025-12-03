'use client'

import React, { useState, useEffect } from 'react'
import styles from '../_components/page.module.css'
import AdminLayout from '../../_components/AdminLayout'

import CouponAdd from '../_components/CouponAdd'

export default function CouponAddPage(props) {
    const [activeTab, setActiveTab] = useState('coupons')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    return (
        <>
            <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
                <CouponAdd />
            </AdminLayout>
        </>
    )
}
