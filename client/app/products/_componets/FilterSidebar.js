import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from './FilterSidebar.module.css'

const FilterSidebar = ({
    mainCategories,
    subCategories,
    minPrice = '',
    maxPrice = '',
    handleMainCategoryClick = () => {},
    handleSubCategoryClick = () => {},
    selectedSize = '',
    handleSizeChange = () => {},
}) => {
    const router = useRouter()
    const pathname = usePathname()

    // 價格篩選狀態
    const [inputMinPrice, setInputMinPrice] = useState(minPrice || '')
    const [inputMaxPrice, setInputMaxPrice] = useState(maxPrice || '')

    // 下拉選單狀態
    const [openDropdowns, setOpenDropdowns] = useState({})

    const handleFilter = () => {
        const params = new URLSearchParams(window.location.search)
        if (inputMinPrice && inputMinPrice.trim() !== '') {
            params.set('minPrice', inputMinPrice)
        } else {
            params.delete('minPrice')
        }
        if (inputMaxPrice && inputMaxPrice.trim() !== '') {
            params.set('maxPrice', inputMaxPrice)
        } else {
            params.delete('maxPrice')
        }
        if (selectedSize) {
            let lpValue
            switch (selectedSize) {
                case '1LP':
                    lpValue = '1'
                    break
                case '2LP':
                    lpValue = '2'
                    break
                case '3LP+':
                    lpValue = '3'
                    break
            }
            params.set('lp', lpValue)
        } else {
            params.delete('lp')
        }
        params.delete('page') // 排序改變時重置頁碼
        router.replace(`${pathname}?${params.toString()}`)
    }

    // 切換下拉選單
    const toggleDropdown = (categoryId) => {
        setOpenDropdowns((prev) => ({
            ...prev,
            [categoryId]: !prev[categoryId],
        }))
    }

    // 關閉所有下拉選單
    const closeAllDropdowns = () => {
        setOpenDropdowns({})
    }

    // 清除所有篩選
const handleClearFilter = () => {
    setInputMinPrice('')
    setInputMaxPrice('')
    handleSizeChange('')
    
    const params = new URLSearchParams(window.location.search)
    params.delete('minPrice')
    params.delete('maxPrice') 
    params.delete('lp')
    params.delete('page')
    
    router.replace(`${pathname}?${params.toString()}`)
}

    // 當價格參數變更時更新輸入框
    useEffect(() => {
        setInputMinPrice(minPrice || '')
        setInputMaxPrice(maxPrice || '')
    }, [minPrice, maxPrice])

    return (
        <aside className={styles.filterSidebar}>
            {/* 分類下拉選單區域 */}
            <div className="mb-3">
                <h6 className={styles.filterTitle}>類別</h6>
                {mainCategories.map((mainCategory) => (
                    <div
                        key={mainCategory.id}
                        className={`${styles.dropdown} mt-3`}
                    >
                        {/* 分離的按鈕容器 */}
                        <div className={styles.splitButtonContainer}>
                        
                            {/* 左側：文字連結 - 點擊跳轉頁面 */}
                            <Link
                                href={`/products?mcid=${mainCategory.id}`}
                                className={styles.mainCategoryLink}
                                onClick={() => {
                                    handleMainCategoryClick(
                                        mainCategory.id,
                                        mainCategory.title
                                    ) // 直接用 props
                                    closeAllDropdowns()
                                }}
                            >
                                {mainCategory.title}
                            </Link>

                            {/* 右側：下拉箭頭 - 點擊展開選單 */}
                            <button
                                className={`${styles.dropdownArrow} ${
                                    openDropdowns[mainCategory.id]
                                        ? styles.open
                                        : ''
                                }`}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    toggleDropdown(mainCategory.id)
                                }}
                                aria-expanded={
                                    openDropdowns[mainCategory.id] || false
                                }
                            >
                                <i className="fas fa-chevron-down"></i>
                            </button>
                        </div>

                        {/* 下拉選單內容 */}
                        <ul
                            className={`${styles.customDropdownMenu} ${
                                openDropdowns[mainCategory.id]
                                    ? styles.show
                                    : ''
                            }`}
                        >
                            {subCategories
                                .filter(
                                    (sub) =>
                                        sub.main_category_id === mainCategory.id
                                )
                                .map((subCategory) => (
                                    <li key={subCategory.id}>
                                        <Link
                                            href={`/products?mcid=${mainCategory.id}&scid=${subCategory.id}`}
                                            className={
                                                styles.customDropdownItem
                                            }
                                            onClick={() => {
                                                handleMainCategoryClick(
                                                    mainCategory.id,
                                                    mainCategory.title
                                                )
                                                handleSubCategoryClick(
                                                    subCategory.id
                                                )
                                                closeAllDropdowns()
                                            }}
                                        >
                                            {subCategory.title}
                                        </Link>
                                    </li>
                                ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* 尺寸篩選區域 */}
            <div className={styles.lpArea}>
                <h6 className={styles.filterTitle}>規格</h6>
                <div className="form-check">
                    <input
                        className={`form-check-input ${styles.formCheckInput}`}
                        type="checkbox"
                        value="1LP"
                        id="lp1"
                        checked={selectedSize === '1LP'}
                        onChange={() => handleSizeChange('1LP')}
                    />
                    <label
                        className={`form-check-label ${styles.formCheckLabel}`}
                        htmlFor="lp1"
                    >
                        1LP
                    </label>
                </div>
                <div className="form-check">
                    <input
                        className={`form-check-input ${styles.formCheckInput}`}
                        type="checkbox"
                        value="2LP"
                        id="lp2"
                        checked={selectedSize === '2LP'}
                        onChange={() => handleSizeChange('2LP')}
                    />
                    <label
                        className={`form-check-label ${styles.formCheckLabel}`}
                        htmlFor="lp2"
                    >
                        2LP
                    </label>
                </div>
                <div className="form-check">
                    <input
                        className={`form-check-input ${styles.formCheckInput}`}
                        type="checkbox"
                        value="3LP+"
                        id="lp3"
                        checked={selectedSize === '3LP+'}
                        onChange={() => handleSizeChange('3LP+')}
                    />
                    <label
                        className={`form-check-label ${styles.formCheckLabel}`}
                        htmlFor="lp3"
                    >
                        3LP以上
                    </label>
                </div>
            </div>

            {/* 價格篩選區域 */}
            <div className={styles.priceFilterContainer}>
                <h6 className={styles.filterTitle}>金額篩選</h6>
                <div className={styles.priceInputContainer}>
                    <input
                        type="number"
                        placeholder="最低"
                        name="minPrice"
                        value={inputMinPrice}
                        onChange={(e) => setInputMinPrice(e.target.value)}
                        className={styles.priceInput}
                    />
                    <span className={styles.priceSeparator}>~</span>
                    <input
                        type="number"
                        placeholder="最高"
                        name="maxPrice"
                        value={inputMaxPrice}
                        onChange={(e) => setInputMaxPrice(e.target.value)}
                        className={styles.priceInput}
                    />
                </div>
            </div>
            <div className='d-flex justify-content-between align-items-center'> <button onClick={handleFilter} className={styles.filterButton}>
                進行篩選
            </button>
            <button onClick={handleClearFilter} className={styles.clearButton}>
    清除篩選
</button></div>
           
        </aside>
    )
}

export default FilterSidebar
