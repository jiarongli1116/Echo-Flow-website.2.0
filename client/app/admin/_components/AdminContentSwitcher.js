'use client'

import Dashboard from './Dashboard'
import UsersAdmin from '../users/_components/UsersAdmin'
import CouponAdmin from '../coupons/_components/CouponAdmin'
import ProductAdmin from '../products/_components/ProductAdmin'

export default function AdminContentSwitcher({
    activeTab,
    users = [],
    products = [],
    categories = [],
    coupons = [],
    loading = false,
    error = null,
    onUsersUpdate = () => {},
    onProductsUpdate = () => {},
    onCouponsUpdate = () => {},
    onChangeStatus = () => {},
    onValid = () => {},
    onAllStatus = () => {},
    onAllValid = () => {},
}) {
    // 根據 activeTab 渲染對應的管理組件
    switch (activeTab) {
        case 'dashboard':
            return <Dashboard />

        case 'users':
            return (
                <UsersAdmin
                    users={users}
                    loading={loading}
                    error={error}
                    onUsersUpdate={onUsersUpdate}
                />
            )

        case 'coupons':
            return (
                <CouponAdmin
                    coupons={coupons}
                    loading={loading}
                    error={error}
                    onCouponsUpdate={onCouponsUpdate}
                    onChangeStatus={onChangeStatus}
                    onValid={onValid}
                    onAllStatus={onAllStatus}
                    onAllValid={onAllValid}
                />
            )

        case 'products':
            return (
                <ProductAdmin
                    products={products}
                    categories={categories}
                    loading={loading}
                    error={error}
                    onProductsUpdate={onProductsUpdate}
                />
            )

        default:
            // 預設顯示總管理頁面
            return <Dashboard />
    }
}
