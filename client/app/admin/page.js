'use client'

import { useState } from 'react'
import AdminLayout from './_components/AdminLayout'
import Dashboard from './_components/Dashboard'
import AdminContentSwitcher from './_components/AdminContentSwitcher'

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('dashboard')

    return (
        <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            <AdminContentSwitcher activeTab={activeTab} />
        </AdminLayout>
    )
}
