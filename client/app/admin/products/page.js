'use client'

import { useState } from 'react'
import AdminLayout from '../_components/AdminLayout'
import AdminContentSwitcher from '../_components/AdminContentSwitcher'

export default function ProductsPage() {
    const [activeTab, setActiveTab] = useState('products')

    return (
        <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            <AdminContentSwitcher 
                activeTab={activeTab}
            />
        </AdminLayout>
    )
}