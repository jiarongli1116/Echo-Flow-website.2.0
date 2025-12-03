'use client'

import { useState, useEffect } from 'react'
import styles from '../../_components/AdminCommon.module.css'
import Pagination from '../../_components/Pagination'
import { usePagination } from '../../_hooks/usePagination'
import { useProducts } from '@/hooks/use-product'
import ConfirmModal from '../../users/_components/ConfirmModal'
import MessageModal from '@/app/admin/_components/MessageModal'
import { useRouter } from 'next/navigation';
export default function ProductManagement() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('') //搜尋關鍵字狀態
    const [filterCategory, setFilterCategory] = useState('all') //分類篩選狀態
    const [filterSubCategory, setFilterSubCategory] = useState('all') // 次分類篩選
    const [selectedProducts, setSelectedProducts] = useState([]) //已選擇的商品 ID 陣列，用於批量操作
    const [filterStatus, setFilterStatus] = useState('all') // 商品狀態篩選
    const [isBatchProcessing, setIsBatchProcessing] = useState(false)
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null,
        product: null,
    })
    const [messageModal, setMessageModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null,
    })
    const [isToggling, setIsToggling] = useState(false)

    // 只使用 useProducts Hook
    const {
        products,
        isLoading,
        mainCategories,
        subCategories,
        list,
        mainCategorysList,
        subCategorysList,
        toggleValid
    } = useProducts()

    // 組件掛載時獲取資料
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                await Promise.all([
                    list({ status: 'all', limit: 300 }), // 使用 list 函數並傳入 status
                    mainCategorysList(),
                    subCategorysList()
                ])
            } catch (error) {
                console.error('獲取資料失敗:', error)
            }
        }

        fetchAllData()
    }, [])

    // 當狀態篩選改變時重新獲取資料
    useEffect(() => {
        if (filterStatus) {
            list({ status: filterStatus, limit: 300 })
        }
    }, [filterStatus])

    // 當主分類改變時，重置次分類
    useEffect(() => {
        setFilterSubCategory('all')
    }, [filterCategory])

    // 根據選擇的主分類篩選次分類
    const getFilteredSubCategories = () => {
        if (filterCategory === 'all') {
            return subCategories
        }

        const selectedMainCategory = mainCategories.find(cat => cat.title === filterCategory)
        if (!selectedMainCategory) {
            return []
        }

        return subCategories.filter(subCat => subCat.main_category_id === selectedMainCategory.id)
    }

    // 狀態變更處理函數，用於更新商品狀態
    const handleStatusChange = async (productId, newStatus) => {
        try {
            await list({ status: filterStatus, limit: 300 })
        } catch (error) {
            console.error('更新商品狀態失敗:', error)
        }
    }
    const getStatusText = (product) => {
        if (product.is_valid === 1) {
            return '上架'
        } else {
            return '下架'
        }
    }
    const getStatus = (product) => {
        if (product.is_valid === 1) {
            return '下架'
        } else {
            return '上架'
        }
    }

    const getStatusClass = (product) => {
        if (product.is_valid === 1) {
            return 'active'
        } else {
            return 'inactive'
        }
    }
    const actionBtnClass = (product) => {
        if (product.is_valid === 1) {
            return 'danger'
        } else {
            return 'success'
        }
    }
    // 商品篩選函數，用於篩選商品
    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.artist && product.artist.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesCategory = filterCategory === 'all' || product.main_title === filterCategory
        const matchesSubCategory = filterSubCategory === 'all' || product.sub_title === filterSubCategory

        return matchesSearch && matchesCategory && matchesSubCategory
    })

    // 使用分頁 Hook
    const {
        currentPage,
        totalItems,
        currentPageData: currentPageProducts,
        handlePageChange,
    } = usePagination(filteredProducts, 15, [searchTerm, filterCategory, filterSubCategory, filterStatus])

    const handleSelectProduct = (productId) => {
        setSelectedProducts((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        )
    }

    const handleSelectAll = () => {
        setSelectedProducts(
            selectedProducts.length === currentPageProducts.length ? [] : currentPageProducts.map((product) => product.id)
        )
    }

    // 當頁面切換時清空選擇
    useEffect(() => {
        setSelectedProducts([])
    }, [currentPage])

    const getStockStatusText = (stock) => {
        if (stock === 0) {
            return '缺貨'
        } else if (stock <= 10) {
            return '庫存不足'
        } else {
            return '庫存充足'
        }
    }

    const getStockStatusClass = (stock) => {
        if (stock === 0) {
            return 'outOfStock'
        } else if (stock <= 10) {
            return 'lowStock'
        } else {
            return 'sufficientStock'
        }
    }
    // 顯示確認對話框
    const showConfirmModal = (product, action) => {
        const actionText = product.is_valid === 1 ? '下架' : '上架';
        setConfirmModal({
            isOpen: true,
            title: `確認${actionText}商品`,
            message: `您確定要將商品「${product.name}」${actionText}嗎？`,
            type: 'warning',
            onConfirm: () => handleToggleStatus(product),
            product: product,
        })
    }

    // 關閉確認對話框
    const closeConfirmModal = () => {
        setConfirmModal({ ...confirmModal, isOpen: false })
    }

    // 顯示訊息對話框
    const showMessageModal = (title, message, type = 'info') => {
        setMessageModal({
            isOpen: true,
            title,
            message,
            type,
            onConfirm: () => setMessageModal({ ...messageModal, isOpen: false }),
        })
    }

    // 處理商品狀態切換
    const handleToggleStatus = async (product) => {
        try {
            setIsToggling(true)

            await toggleValid(product.id)
            await list({ status: filterStatus, limit: 300 })

            const action = product.is_valid === 1 ? '下架' : '上架'
            showMessageModal('操作成功', `商品「${product.name}」已成功${action}`, 'success')

        } catch (error) {
            console.error('操作失敗:', error)
            showMessageModal('操作失敗', `商品狀態切換失敗: ${error.message}`, 'error')
        } finally {
            setIsToggling(false)
            setConfirmModal({ ...confirmModal, isOpen: false })
        }
    }
const getSelectedProductsStatus = () => {
    const selectedProductsData = currentPageProducts.filter(product => 
        selectedProducts.includes(product.id)
    )
    
    const onlineCount = selectedProductsData.filter(product => product.is_valid === 1).length
    const offlineCount = selectedProductsData.filter(product => product.is_valid === 0).length
    
    return { 
        onlineCount, 
        offlineCount, 
        totalCount: selectedProductsData.length,
        selectedProductsData 
    }
}
    const selectedProductsData = currentPageProducts.filter(product => 
        selectedProducts.includes(product.id)
    )
    
    const onlineCount = selectedProductsData.filter(product => product.is_valid === 1).length
    const offlineCount = selectedProductsData.filter(product => product.is_valid === 0).length
   const handleBatchToggleStatus = async (action) => {
    if (selectedProducts.length === 0) {
        showMessageModal('提示', '請先選擇要操作的商品', 'warning')
        return
    }

    try {
        setIsBatchProcessing(true)
        
        // 使用 currentPageProducts 而不是 currentPageData
        const selectedProductsData = currentPageProducts.filter(product => 
            selectedProducts.includes(product.id)
        )
        
        const targetProducts = action === 'online' 
            ? selectedProductsData.filter(product => product.is_valid === 0)
            : selectedProductsData.filter(product => product.is_valid === 1)
        
        if (targetProducts.length === 0) {
            const actionText = action === 'online' ? '上架' : '下架'
            showMessageModal('提示', `選中的商品中沒有可${actionText}的商品`, 'warning')
            return
        }

        const promises = targetProducts.map(async (product) => {
            try {
                await toggleValid(product.id)
                return {
                    success: true,
                    product: product
                }
            } catch (error) {
                return {
                    success: false,
                    product: product,
                    message: error.message || '操作失敗'
                }
            }
        })
        
        const results = await Promise.all(promises)
        const successResults = results.filter(result => result.success)
        const failResults = results.filter(result => !result.success)
        const successCount = successResults.length
        const failCount = failResults.length
        
        await list({ status: filterStatus, limit: 300 })
        
        const actionText = action === 'online' ? '上架' : '下架'
        
        if (failCount === 0) {
            showMessageModal('操作成功', `成功${actionText} ${successCount} 個商品`, 'success')
        } else if (successCount === 0) {
            const failedProducts = failResults.map(result => result.product.name).join('、')
            showMessageModal('操作失敗', 
                `所有商品${actionText}操作都失敗了\n失敗商品：${failedProducts}`, 
                'error'
            )
        } else {
            const failedProducts = failResults.map(result => result.product.name).join('、')
            showMessageModal('部分成功', 
                `成功${actionText} ${successCount} 個商品，失敗 ${failCount} 個商品\n失敗商品：${failedProducts}`, 
                'warning'
            )
        }
        
        setSelectedProducts([])
        
    } catch (error) {
        console.error('批量操作失敗:', error)
        showMessageModal('操作失敗', `批量操作失敗: ${error.message}`, 'error')
    } finally {
        setIsBatchProcessing(false)
        setConfirmModal({ ...confirmModal, isOpen: false })
    }
}

// 4. 批量上架
const handleBatchOnline = () => {
    const { offlineCount } = getSelectedProductsStatus()
    
    if (offlineCount === 0) {
        showMessageModal('提示', '選中的商品中沒有可上架的商品', 'warning')
        return
    }
    
    setConfirmModal({
        isOpen: true,
        title: '批量上架確認',
        message: `確定要上架選中的 ${offlineCount} 個商品嗎？`,
        type: 'warning',
        onConfirm: () => handleBatchToggleStatus('online'),
        product: null,
    })
}

// 5. 批量下架
const handleBatchOffline = () => {
    const { onlineCount } = getSelectedProductsStatus()
    
    if (onlineCount === 0) {
        showMessageModal('提示', '選中的商品中沒有可下架的商品', 'warning')
        return
    }
    
    setConfirmModal({
        isOpen: true,
        title: '批量下架確認',
        message: `確定要下架選中的 ${onlineCount} 個商品嗎？`,
        type: 'warning',
        onConfirm: () => handleBatchToggleStatus('offline'),
        product: null,
    })
}
    const onAdd=()=>router.push('/admin/products/add');
    const ProductRow = ({ product }) => {
        const createdAt = product.created_at ?
            new Date(product.created_at).toLocaleDateString('zh-TW') : '未知';

        return (
            <tr className={styles.dataRow}>
                <td>
                    <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className={styles.checkbox}
                    />
                </td>
                <td className={styles.productInfoCell}>
                    <div className={styles.productInfo}>
                        <div className={styles.productImage}>
                            <img
                                src={product.pathname || '/images/default-product.jpg'}
                                alt={product.name}
                                onError={(e) => {
                                    e.target.src = '/images/default-product.jpg'
                                }}
                            />
                        </div>
                        <div className={styles.productDetails}>
                            <div className={styles.productName}>{product.name}</div>
                        </div>
                    </div>
                </td>
                <td className={styles.artistCell}>
                    <span className={`${styles.artist}`}>
                        {product.artist || '其他'}
                    </span>
                </td>
                <td className={styles.categoryCell}>
                    <span className={`${styles.category}`}>
                        {product.main_title || '其他'}
                    </span>
                </td>
                <td className={styles.categoryCell}>
                    <span className={`${styles.category}`}>
                        {product.sub_title || '其他'}
                    </span>
                </td>
                <td className={styles.priceCell}>NT$ {product.price.toLocaleString()}</td>
                <td className={styles.stockCell}>
                    <span className={`${styles.stock} ${product.stock <= 10 ? styles.lowStock : ''}`}>
                        {product.stock}
                    </span>
                </td>
                <td className={styles.salesCell}>
                    <span className={`${styles.stockStatus} ${styles[getStockStatusClass(product.stock)]}`}>
                        {getStockStatusText(product.stock)}
                    </span>
                </td>
                <td className={styles.statusCell}>
                    <span className={`${styles.status} ${styles[getStatusClass(product)]}`}>
                        {getStatusText(product)}
                    </span>
                </td>
                <td className={styles.dateCell}>{createdAt}</td>
                <td className={styles.actionsCell}>
                    <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => router.push(`/admin/products/${product.id}`)}>編輯</button>
                        <button
                            className={`${styles.actionBtn} ${styles[actionBtnClass(product)]}`}
                            onClick={() => showConfirmModal(product, 'toggle')}  // ✅ 改成這樣
                            disabled={isToggling}
                        >
                            {isToggling ? '處理中...' : getStatus(product)}
                        </button>
                    </div>
                </td>
            </tr>
        )
    }

    // 載入狀態
    if (isLoading) {
        return (
            <div className={styles.adminContainer}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>商品管理</h2>
                        <p className={styles.subtitle}>管理所有商品和庫存</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className={styles.loading}>載入中...</div>
                </div>
            </div>
        )
    }

    // 沒有資料狀態
    if (!isLoading && products.length === 0) {
        return (
            <div className={styles.adminContainer}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>商品管理</h2>
                        <p className={styles.subtitle}>管理所有商品和庫存</p>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.addBtn} onClick={() => onAdd()}>
                            新增商品
                        </button>
                    </div>
                </div>
              {/* 搜尋和篩選 */}
            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="搜尋商品名稱或藝人..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="all">全部主分類</option>
                    {mainCategories.map((category) => (
                        <option key={category.id} value={category.title}>
                            {category.title}
                        </option>
                    ))}
                </select>

                <select
                    value={filterSubCategory}
                    onChange={(e) => setFilterSubCategory(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="all">全部次分類</option>
                    {getFilteredSubCategories().map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.title}>
                            {subcategory.title}
                        </option>
                    ))}
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="all">全部狀態</option>
                    <option value="active">上架商品</option>
                    <option value="inactive">下架商品</option>
                </select>
            </div>
              {/* 商品表格 */}
            <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedProducts.length === currentPageProducts.length &&
                                        currentPageProducts.length > 0
                                    }
                                    onChange={handleSelectAll}
                                    className={styles.checkbox}
                                />
                            </th>
                            <th className={styles.productInfoHeader}>商品資訊</th>
                            <th className={styles.artistHeader}>藝人</th>
                            <th className={styles.categoryHeader}>主分類</th>
                            <th className={styles.categoryHeader}>次分類</th>
                            <th className={styles.priceHeader}>價格</th>
                            <th className={styles.stockHeader}>庫存</th>
                            <th className={styles.salesHeader}>庫存狀態</th>
                            <th className={styles.statusHeader}>狀態</th>
                            <th className={styles.dateHeader}>上架日期</th>
                            <th className={styles.actionsHeader}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentPageProducts.map((product) => (
                            <ProductRow key={product.id} product={product} />
                        ))}
                    </tbody>
                </table>
            </div>
            </div>
        )
    }

    return (
        <div className={styles.adminContainer}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h2 className={styles.title}>商品管理</h2>
                    <p className={styles.subtitle}>
                        所有商品 共{products.length} 項商品
                        {totalItems !== products.length && ` (篩選後 ${totalItems} 項)`}
                    </p>
                </div>
                <div className={styles.headerRight}>
                    <button className={styles.addBtn} onClick={() => onAdd()}>
                        新增商品
                    </button>
                </div>
            </div>

            {/* 搜尋和篩選 */}
            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="搜尋商品名稱或藝人..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="all">全部主分類</option>
                    {mainCategories.map((category) => (
                        <option key={category.id} value={category.title}>
                            {category.title}
                        </option>
                    ))}
                </select>

                <select
                    value={filterSubCategory}
                    onChange={(e) => setFilterSubCategory(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="all">全部次分類</option>
                    {getFilteredSubCategories().map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.title}>
                            {subcategory.title}
                        </option>
                    ))}
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="all">全部狀態</option>
                    <option value="active">上架商品</option>
                    <option value="inactive">下架商品</option>
                </select>
            </div>

            {/* 批量操作 - 替換現有的批量操作部分 */}
{selectedProducts.length > 0 && (
    <div className={styles.bulkActions}>
        <span className={styles.selectedCount}>
            已選擇 {selectedProducts.length} 個商品
            {(() => {
                const { onlineCount, offlineCount } = getSelectedProductsStatus()
                return (
                    <>
                        {onlineCount > 0 && <span style={{ color: '#52c41a', marginLeft: '8px' }}>上架: {onlineCount}</span>}
                        {offlineCount > 0 && <span style={{ color: '#ff4d4f', marginLeft: '8px' }}>下架: {offlineCount}</span>}
                    </>
                )
            })()}
        </span>
        <div className={styles.bulkButtons}>
            <button 
                className={styles.bulkBtn}
                onClick={()=>handleBatchOnline()}
                disabled={isBatchProcessing || (() => {
                    const { offlineCount } = getSelectedProductsStatus()
                    return offlineCount === 0
                })()}
                style={{ 
                    opacity: (() => {
                        const { offlineCount } = getSelectedProductsStatus()
                        return (offlineCount === 0 || isBatchProcessing) ? 0.5 : 1
                    })(),
                    cursor: (() => {
                        const { offlineCount } = getSelectedProductsStatus()
                        return (offlineCount === 0 || isBatchProcessing) ? 'not-allowed' : 'pointer'
                    })()
                }}
            >
                {isBatchProcessing ? '處理中...' : (() => {
                    const { offlineCount } = getSelectedProductsStatus()
                    return `批量上架${offlineCount > 0 ? ` (${offlineCount})` : ''}`
                })()}
            </button>
            
            <button 
                className={styles.bulkBtn}
                onClick={handleBatchOffline}
                disabled={isBatchProcessing || (() => {
                    const { onlineCount } = getSelectedProductsStatus()
                    return onlineCount === 0
                })()}
                style={{ 
                    opacity: (() => {
                        const { onlineCount } = getSelectedProductsStatus()
                        return (onlineCount === 0 || isBatchProcessing) ? 0.5 : 1
                    })(),
                    cursor: (() => {
                        const { onlineCount } = getSelectedProductsStatus()
                        return (onlineCount === 0 || isBatchProcessing) ? 'not-allowed' : 'pointer'
                    })()
                }}
            >
                {isBatchProcessing ? '處理中...' : (() => {
                    const { onlineCount } = getSelectedProductsStatus()
                    return `批量下架${onlineCount > 0 ? ` (${onlineCount})` : ''}`
                })()}
            </button>
            
            {/* 清空選擇按鈕 */}
            <button 
                className={styles.bulkBtn}
                onClick={() => setSelectedProducts([])}
                disabled={isBatchProcessing}
                style={{ 
                    backgroundColor: '#f5f5f5',
                    color: '#666',
                    border: '1px solid #d9d9d9',
                    cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
                    opacity: isBatchProcessing ? 0.5 : 1
                }}
            >
                清空選擇
            </button>
        </div>
    </div>
)}

            {/* 商品表格 */}
            <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedProducts.length === currentPageProducts.length &&
                                        currentPageProducts.length > 0
                                    }
                                    onChange={handleSelectAll}
                                    className={styles.checkbox}
                                />
                            </th>
                            <th className={styles.productInfoHeader}>商品資訊</th>
                            <th className={styles.artistHeader}>藝人</th>
                            <th className={styles.categoryHeader}>主分類</th>
                            <th className={styles.categoryHeader}>次分類</th>
                            <th className={styles.priceHeader}>價格</th>
                            <th className={styles.stockHeader}>庫存</th>
                            <th className={styles.salesHeader}>庫存狀態</th>
                            <th className={styles.statusHeader}>狀態</th>
                            <th className={styles.dateHeader}>上架日期</th>
                            <th className={styles.actionsHeader}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentPageProducts.map((product) => (
                            <ProductRow key={product.id} product={product} />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 分頁元件 */}
            <Pagination
                totalItems={totalItems}
                itemsPerPage={15}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                maxVisiblePages={5}
                showFirstLast={true}
                showPrevNext={true}
            />

            {/* 在這裡加入 Modal 組件 */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={isToggling ? '處理中...' : '確定'}
                cancelText="取消"
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
            />

            <MessageModal
                isOpen={messageModal.isOpen}
                title={messageModal.title}
                message={messageModal.message}
                type={messageModal.type}
                confirmText="確定"
                onConfirm={() => setMessageModal({ ...messageModal, isOpen: false })}
            />
        </div>

    )

}