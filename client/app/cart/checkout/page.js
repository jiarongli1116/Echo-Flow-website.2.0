'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useAddresses } from '@/hooks/use-addresses'
import Swal from 'sweetalert2'
import styles from '../_components/cart.module.css'
import { useRouter } from 'next/navigation'

//hooks引用
import { useCart } from '@/hooks/use-cart'
import { useOrder } from '@/hooks/use-order'
import { useAuth } from '@/hooks/use-auth'
import { usePointsCart } from '@/hooks/use-points-cart'
import { useDiscountSync } from '@/hooks/use-discount-sync'

//組件
import AddressSelector from './_components/AddressSelector'
import CheckoutAddressForm from './_components/CheckoutAddressForm'
import CouponSelectModal from '../_components/CouponSelectModal'
import CheckoutProgress from '@/app/cart/_components/CheckoutProgress/CheckoutProgress'
import OrderPreviewModal from './_components/OrderPreviewModal'
import LinePayConfirmModal from './_components/LinePayConfirmModal'
import EcPayConfirmModal from './_components/EcPayConfirmModal'

//711運送商店選擇 - 使用 711 專用的 hooks 避免與其他功能衝突
import { useShip711StoreOpener } from '@/app/ship/_hooks/use-ship-711-store'

export default function CartCheckoutPage() {
    const { items: cartItems, loading } = useCart()
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const router = useRouter()
    const { checkoutOrder, submitting } = useOrder()

    // 從購物車傳遞過來的結帳商品
    const [checkoutItems, setCheckoutItems] = useState([])

    // 追蹤是否已完成初始化，避免 useEffect 干擾初始數據
    const [isInitialized, setIsInitialized] = useState(false)

    // 🚀 新增：訂單摘要狀態 - 用於儲存後端API回傳的訂單資料
    const [orderSummary, setOrderSummary] = useState(null)

    // 🚀 新增：控制是否使用後端資料的狀態
    const [useBackendData, setUseBackendData] = useState(false)

    // 🚀 新增：防止重複初始化的標記
    const [hasInitialized, setHasInitialized] = useState(false)

    // 🚀 新增：使用 ref 來追蹤組件是否已經初始化，避免 React 19 嚴格模式下的重複執行
    const hasInitializedRef = useRef(false)

    //711運送商店選擇 - 使用專用的 localStorage key 避免與其他功能衝突
    const [callbackUrl, setCallbackUrl] = useState('')

    // 在 useEffect 中設定 callback URL
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // 修正：指向實際存在的 7-11 回呼頁面路徑
            setCallbackUrl(`${window.location.origin}/ship/api`)
        }
    }, [])

    const { store711, openWindow, closeWindow } = useShip711StoreOpener(
        callbackUrl, // 使用動態設定的 URL
        {
            autoCloseMins: 3, // 3 分鐘自動關閉
            keyLocalStorage: 'checkout711', // 使用不同的 localStorage key 避免衝突
        }
    )

    // 表單狀態
    const [formData, setFormData] = useState({
        // 購買人資訊（付款人）
        buyerName: '',
        buyerPhone: '',
        buyerEmail: '',

        // 收件人資訊
        recipientName: '',
        recipientPhone: '',

        // 地址資訊
        zipcode: '',
        city: '',
        district: '',
        address: '',

        // 其他設定
        deliveryMethod: 'home',

        // 新增 711 店家相關欄位
        store711: {
            storeid: '',
            storename: '',
            storeaddress: '',
            outside: '',
            ship: '',
            TempVar: '',
        },
        paymentMethod: 'quick', // 預設為快速付款選項
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
        sameAddress: true,
        manualInput: false, // 新增：手動輸入地址的狀態
        agreeTerms: false,
        agreeQuickPayment: false, // 新增：快速結帳同意條款
    })

    // 🚀 新增：追蹤使用者是否已手動編輯過表單欄位
    const [userEditedFields, setUserEditedFields] = useState({
        buyerName: false,
        buyerPhone: false,
        buyerEmail: false,
        cardholderName: false,
    })

    // 🚀 新增：收合式商品明細狀態管理
    const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false)
    const [activeTab, setActiveTab] = useState('summary') // 'summary', 'coupon', 'points'

    // 🚀 新增：從 URL 參數獲取是否應該重置折扣
    const shouldResetDiscount = searchParams.get('resetDiscount') === '1'

    // 🚀 新增：使用統一的折扣同步系統
    const {
        // 狀態
        selectedCoupon,
        couponCode,
        couponDiscount,
        pointsInput,
        pointsToUse,
        pointsDiscount,
        selectedItemsTotal: syncSelectedItemsTotal,
        availablePoints: syncAvailablePoints,
        availableCoupons: syncAvailableCoupons,
        couponsLoading: syncCouponsLoading,
        couponsError: syncCouponsError,

        // 方法
        handleCouponSelect,
        handleCouponCodeApply,
        handleApplyPoints,
        handlePointsChange, // 🚀 新增：使用統一的點數輸入處理
        handleQuickSetPoints,
        getMaxUsablePoints,
        syncDiscountState,
        getDiscountState,
        clearAllDiscounts,

        // 直接狀態更新方法
        setSelectedCoupon,
        setCouponCode,
        setCouponDiscount,
        setPointsInput,
        setPointsToUse,
        setPointsDiscount,
    } = useDiscountSync(checkoutItems, isInitialized, shouldResetDiscount)

    // UI 狀態
    const [showCouponModal, setShowCouponModal] = useState(false) // 優惠券選擇 Modal 顯示狀態

    // UI 狀態
    const [isPointsInputFocused, setIsPointsInputFocused] = useState(false) // 點數輸入框聚焦狀態

    // 點數與相關操作由 usePointsCart 提供
    const { deductPoints, refundPoints, refreshPointsBalance } = usePointsCart()

    // 會員預設地址
    const {
        addresses,
        loading: addressesLoading,
        error: addressesError,
        fetchAddresses, // 新增：手動刷新地址的功能
    } = useAddresses()

    // 新增：獲取預設地址的輔助函數
    const defaultAddress = addresses?.find((addr) => addr.isDefault) || null

    // 地址選擇器狀態
    const [showAddressSelector, setShowAddressSelector] = useState(false)
    const [selectedAddress, setSelectedAddress] = useState(defaultAddress)

    // 🚀 新增：從使用者資料自動填入購買人資訊
    // 注意：購買人資訊只使用 JWT token 中的使用者資料，不與地址資訊同步
    useEffect(() => {
        if (user && !isInitialized) {
            console.log('👤 自動填入使用者資訊:', user)

            // 自動填入使用者基本資訊到 formData 狀態
            // 注意：只填入使用者尚未編輯過的欄位
            setFormData((prev) => ({
                ...prev,
                buyerName: userEditedFields.buyerName ? prev.buyerName : user.name || user.nickname || '',
                buyerPhone: userEditedFields.buyerPhone ? prev.buyerPhone : user.phone || '',
                buyerEmail: userEditedFields.buyerEmail ? prev.buyerEmail : user.email || '',
                cardholderName: userEditedFields.cardholderName
                    ? prev.cardholderName
                    : user.name || user.nickname || '',
            }))
        }
    }, [user, isInitialized, userEditedFields])

    // 地址狀態監控
    useEffect(() => {
        // 監控地址狀態變化，但不輸出調試信息
    }, [addresses, addressesLoading, addressesError, defaultAddress])

    // 🚀 修復：當預設地址改變時，更新選中的地址
    // 新增一個專門的狀態來追蹤地址是否已經初始化
    const [addressInitialized, setAddressInitialized] = useState(false)

    useEffect(() => {
        // 只有在地址存在且尚未初始化時才進行初始化
        if (defaultAddress && !addressInitialized) {
            console.log('🏠 初始化預設地址:', defaultAddress)

            setSelectedAddress(defaultAddress)

            // 自動填入預設地址到 formData
            setFormData((prev) => {
                const newFormData = {
                    ...prev,
                    zipcode: defaultAddress.zipcode || '',
                    city: defaultAddress.city || '',
                    district: defaultAddress.district || '',
                    address: defaultAddress.address || '',
                    recipientName: defaultAddress.recipient_name || prev.recipientName,
                    recipientPhone: defaultAddress.recipient_phone || prev.recipientPhone,
                    manualInput: false,
                    sameAddress: true,
                }

                console.log('🏠 預設地址已填入 formData:', newFormData)
                return newFormData
            })

            // 標記地址已初始化
            setAddressInitialized(true)
        } else if (defaultAddress && addressInitialized) {
            // 如果已經初始化過，只更新選中的地址（不重新填入 formData）
            setSelectedAddress(defaultAddress)
        }
    }, [defaultAddress, addressInitialized])

    // 處理地址選擇
    const handleAddressSelect = (address) => {
        setSelectedAddress(address)

        // 填入完整的地址資料到 formData
        setFormData((prev) => {
            const newFormData = {
                ...prev,
                zipcode: address.zipcode || '',
                city: address.city || '',
                district: address.district || '',
                address: address.address || '', // 修復：填入詳細地址
                recipientName: address.recipient_name || prev.recipientName, // 修復：填入收件人姓名
                recipientPhone: address.recipient_phone || prev.recipientPhone, // 修復：填入收件人電話
                // 如果選擇了已儲存地址，關閉手動輸入模式
                manualInput: false,
                sameAddress: true,
            }

            return newFormData
        })
    }

    // 打開地址選擇器
    const openAddressSelector = () => {
        setShowAddressSelector(true)
    }

    // 關閉地址選擇器
    const closeAddressSelector = () => {
        setShowAddressSelector(false)
    }

    // 修復地址表單資料變更回調函數 - 移除 formData 依賴避免無限迴圈
    const handleAddressFormChange = useCallback(
        (addressData) => {
            // 當地址表單資料改變時，同步更新結帳表單
            setFormData((prev) => {
                // 檢查資料是否真的改變了，避免不必要的更新
                const hasAddressDataChanged =
                    prev.zipcode !== addressData.zipcode ||
                    prev.city !== addressData.city ||
                    prev.district !== addressData.district ||
                    prev.address !== addressData.address ||
                    prev.recipientName !== (addressData.recipient_name || prev.recipientName) ||
                    prev.recipientPhone !== (addressData.recipient_phone || prev.recipientPhone)

                if (!hasAddressDataChanged) {
                    return prev
                }

                // 直接更新資料，不進行比較檢查
                const newFormData = {
                    ...prev,
                    zipcode: addressData.zipcode || '',
                    city: addressData.city || '',
                    district: addressData.district || '',
                    address: addressData.address || '',
                    recipientName: addressData.recipient_name || prev.recipientName, // 修復：更新收件人姓名
                    recipientPhone: addressData.recipient_phone || prev.recipientPhone, // 修復：更新收件人電話
                }

                return newFormData
            })
        },
        [] // 移除 formData 依賴，避免無限迴圈
    )

    // 修復：監控手動輸入狀態的 useEffect - 簡化依賴避免無限迴圈
    useEffect(() => {
        // 使用 ref 來追蹤是否已經處理過這個狀態變化
        const currentManualInput = formData.manualInput

        if (currentManualInput) {
        }
    }, [formData.manualInput]) // 只監控 manualInput 狀態

    // 🚀 修復手動輸入地址選項的處理邏輯
    const handleManualInputChange = (e) => {
        const isChecked = e.target.checked

        if (isChecked) {
            // 如果選擇手動輸入，取消使用已儲存地址選項
            setFormData((prev) => {
                const newFormData = {
                    ...prev,
                    manualInput: true,
                    sameAddress: false,
                    // 清空已儲存地址的資訊，讓使用者手動輸入
                    zipcode: '',
                    city: '',
                    district: '',
                    address: '',
                    // 修復：清空收件人資訊，避免預設地址資料干擾
                    recipientName: '',
                    recipientPhone: '',
                }

                return newFormData
            })

            // 清空選中的地址
            setSelectedAddress(null)
        } else {
            // 取消選擇時，恢復使用已儲存地址
            if (defaultAddress) {
                setSelectedAddress(defaultAddress)

                setFormData((prev) => ({
                    ...prev,
                    manualInput: false,
                    sameAddress: true,
                    zipcode: defaultAddress.zipcode || '',
                    city: defaultAddress.city || '',
                    district: defaultAddress.district || '',
                    address: defaultAddress.address || '',
                    recipientName: defaultAddress.recipient_name || prev.recipientName,
                    recipientPhone: defaultAddress.recipient_phone || prev.recipientPhone,
                }))
            } else {
                // 如果沒有預設地址，只關閉手動輸入模式
                setFormData((prev) => ({
                    ...prev,
                    manualInput: false,
                }))
            }
        }
    }

    // 手動刷新地址（如果需要）
    const handleRefreshAddresses = () => {
        fetchAddresses()
    }

    // 新增：監聽 711 門市選擇變化，同步到表單資料
    useEffect(() => {
        if (store711.storename) {
            setFormData((prev) => ({
                ...prev,
                store711: {
                    storeid: store711.storeid || '',
                    storename: store711.storename || '',
                    storeaddress: store711.storeaddress || '',
                    outside: store711.outside || '',
                    ship: store711.ship || '',
                    TempVar: store711.TempVar || '',
                },
            }))
        }
    }, [store711])

    // 初始化：從 URL 參數中獲取購物車資料
    useEffect(() => {
        // 🚀 修復：防止重複執行初始化邏輯 - 使用 ref 避免 React 19 嚴格模式問題
        if (hasInitializedRef.current) {
            return
        }

        // 🚀 修復：防止重複執行初始化邏輯 - 使用 state 作為備用檢查
        if (hasInitialized) {
            hasInitializedRef.current = true // 同步 ref 狀態
            return
        }

        console.log('🚀 開始初始化結帳頁面...')

        const shouldResetDiscount = searchParams.get('resetDiscount') === '1'
        const dataParam = searchParams.get('data')
        if (dataParam) {
            try {
                const checkoutData = JSON.parse(dataParam)
                console.log('📦 接收到結帳資料:', checkoutData)

                // 🎯 混合方案：優先使用後端訂單摘要資料
                if (checkoutData.orderSummary && checkoutData.orderSummary.items) {
                    console.log('✅ 使用後端訂單摘要資料初始化（包含庫存檢查）')

                    // 🚀 新增：驗證後端資料的完整性
                    const validItems = checkoutData.orderSummary.items.filter((item) => {
                        const hasValidId = item.id || item.vinyl_id
                        if (!hasValidId) {
                            console.warn('⚠️ 發現無效ID的商品項目:', item)
                        }
                        return hasValidId
                    })

                    if (validItems.length !== checkoutData.orderSummary.items.length) {
                        console.warn(
                            `⚠️ 過濾掉 ${checkoutData.orderSummary.items.length - validItems.length} 個無效ID的商品項目`
                        )
                    }

                    // 直接使用後端API的商品資料，確保資料準確性
                    setCheckoutItems(validItems)
                    setOrderSummary(checkoutData.orderSummary)

                    // 🚀 新增：標記已使用後端資料，避免前端計算
                    setUseBackendData(true)
                } else if (checkoutData.selectedItems && checkoutData.selectedItems.length > 0) {
                    console.log('🔄 回退到前端選中商品資料初始化')

                    // 如果沒有後端訂單摘要，使用前端購物車資料作為備用
                    const selectedItemIds = checkoutData.selectedItems
                    const itemsToCheckout = cartItems.filter((item) => selectedItemIds.includes(item.id))

                    // 🚀 新增：驗證前端資料的完整性
                    const validItems = itemsToCheckout.filter((item) => {
                        const hasValidId = item.id
                        if (!hasValidId) {
                            console.warn('⚠️ 發現無效ID的購物車商品:', item)
                        }
                        return hasValidId
                    })

                    if (validItems.length !== itemsToCheckout.length) {
                        console.warn(`⚠️ 過濾掉 ${itemsToCheckout.length - validItems.length} 個無效ID的購物車商品`)
                    }

                    setCheckoutItems(validItems)
                    setUseBackendData(false)
                } else {
                    console.log('⚠️ 沒有有效的商品資料，使用所有購物車商品')

                    // 🚀 新增：驗證購物車資料的完整性
                    const validItems = cartItems.filter((item) => {
                        const hasValidId = item.id
                        if (!hasValidId) {
                            console.warn('⚠️ 發現無效ID的購物車商品:', item)
                        }
                        return hasValidId
                    })

                    if (validItems.length !== cartItems.length) {
                        console.warn(`⚠️ 過濾掉 ${cartItems.length - validItems.length} 個無效ID的購物車商品`)
                    }

                    setCheckoutItems(validItems)
                    setUseBackendData(false)
                }

                // 🚀 修改：折扣狀態現在由 useDiscountSync 自動處理
                // 如果 shouldResetDiscount 為 true，useDiscountSync 會自動清除狀態
                // 如果 shouldResetDiscount 為 false，useDiscountSync 會從 localStorage 載入狀態
                // 只有在傳遞了明確的折扣資料時，才手動設置狀態
                if (!shouldResetDiscount && checkoutData) {
                    console.log('🔄 檢查是否需要設置傳遞的折扣狀態')

                    // 設置點數相關狀態 - 延遲設置以避免被 useDiscountSync 覆蓋
                    setTimeout(() => {
                        if (
                            checkoutData.pointsToUse !== undefined &&
                            checkoutData.pointsToUse !== null &&
                            checkoutData.pointsToUse > 0
                        ) {
                            console.log('💰 設置傳遞的點數狀態:', checkoutData.pointsToUse)
                            setPointsToUse(checkoutData.pointsToUse)
                            setPointsInput(checkoutData.pointsToUse.toString())
                        }
                        if (
                            checkoutData.pointsDiscount !== undefined &&
                            checkoutData.pointsDiscount !== null &&
                            checkoutData.pointsDiscount > 0
                        ) {
                            console.log('💰 設置傳遞的點數折扣:', checkoutData.pointsDiscount)
                            setPointsDiscount(checkoutData.pointsDiscount)
                        }
                    }, 100)

                    // 設置優惠券相關狀態
                    if (checkoutData.selectedCoupon) {
                        console.log('🎫 設置傳遞的優惠券:', checkoutData.selectedCoupon)
                        setSelectedCoupon(checkoutData.selectedCoupon)
                    }
                    if (checkoutData.couponDiscount) {
                        console.log('🎫 設置傳遞的優惠券折扣:', checkoutData.couponDiscount)
                        setCouponDiscount(checkoutData.couponDiscount)
                    }
                    if (checkoutData.couponCode) {
                        console.log('🎫 設置傳遞的優惠券代碼:', checkoutData.couponCode)
                        setCouponCode(checkoutData.couponCode)
                    }
                } else if (shouldResetDiscount) {
                    console.log('🧹 應該重置折扣，useDiscountSync 會自動處理')
                }

                // 🚀 修復：標記初始化完成，防止重複執行
                setIsInitialized(true)
                setHasInitialized(true) // 🚀 新增：標記已初始化
                hasInitializedRef.current = true // 🚀 新增：同步 ref 狀態
                console.log('✅ 初始化完成（後端資料）')
            } catch (error) {
                console.error('❌ 解析結帳資料時發生錯誤:', error)
                // 如果解析失敗，使用所有購物車商品作為最後備用
                setCheckoutItems(cartItems)
                setIsInitialized(true)
                setHasInitialized(true) // 🚀 新增：即使錯誤也要標記
                hasInitializedRef.current = true // 🚀 新增：同步 ref 狀態
                setUseBackendData(false)
                console.log('✅ 初始化完成（錯誤處理）')
            }
        } else {
            console.log('⚠️ 沒有傳遞結帳資料，使用所有購物車商品')
            // 如果沒有傳遞資料，使用所有購物車商品
            setCheckoutItems(cartItems)
            setIsInitialized(true)
            setHasInitialized(true) // 🚀 新增：標記已初始化
            hasInitializedRef.current = true // 🚀 新增：同步 ref 狀態
            setUseBackendData(false)
            console.log('✅ 初始化完成（購物車資料）')
        }
    }, [searchParams]) // 🚀 修復：移除 cartItems 依賴，避免重複觸發

    // 渲染商品圖片：優先使用本地路徑，再回退到 URL
    const renderProductImage = (item) => {
        if (!item) return '/images/logo.svg'

        // 優先使用本地路徑 (image_path 或 pathname)
        if (item.image_path) return item.image_path
        if (item.pathname) return item.pathname

        // 最後才使用 URL
        if (item.image_url) return item.image_url

        // 如果都沒有，根據 vinyl_id 生成本地路徑
        if (item.vinyl_id) return `/product_img/vinyl_id_${item.vinyl_id}.jpg`

        // 最終回退到預設圖片
        return '/images/logo.svg'
    }

    // 🎯 簡化方案：只使用後端資料
    const getProductName = (item) => {
        // 只使用後端資料的 vinyl_name
        return item.vinyl_name || '未知商品'
    }

    // 🎯 簡化方案：只使用後端資料
    const getProductArtist = (item) => {
        // 只使用後端資料的 artist
        return item.artist || '未知藝術家'
    }

    // 🎯 簡化方案：只使用後端資料
    const getProductPrice = (item) => {
        // 只使用後端資料的 price
        return item.price || 0
    }

    // 🚀 使用統一的折扣同步系統提供的選中商品總金額
    const subtotal = syncSelectedItemsTotal
    const shippingFee = 100
    const total = subtotal - couponDiscount - pointsDiscount + shippingFee

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        setUserEditedFields((prev) => ({ ...prev, [field]: true }))
    }

    // 點數系統狀態（可用點數改由 hook 管理）

    // 在結帳頁面，我們不需要選擇商品功能，所有商品都會被結帳
    const [selectAll] = useState(true) // 固定為全選
    const [selectedItems] = useState(new Set(checkoutItems.map((item) => item.id))) // 固定選擇所有結帳商品

    // 計算剩餘點數
    const remainingPoints = syncAvailablePoints - pointsToUse

    // 🚀 新增：處理優惠券 Modal 顯示
    const handleShowCouponModal = useCallback(() => {
        setShowCouponModal(true)
    }, [])

    const handleCloseCouponModal = useCallback(() => {
        setShowCouponModal(false)
    }, [])

    // 🚀 新增：處理從 Modal 選擇優惠券
    const handleModalCouponSelect = useCallback(
        (couponId) => {
            handleCouponSelect(couponId)
        },
        [handleCouponSelect]
    )

    // 🚀 移除：handlePointsChange 現在由 useDiscountSync 提供
    // 更新商品數量
    const handleUpdateQuantity = (id, newQuantity) => {
        // updateQuantity(id, newQuantity); // This function is not defined in the original file
    }

    // 移除商品
    const handleRemoveItem = (id) => {
        const item = checkoutItems.find((item) => item.id === id)

        // 添加確認對話框以防止意外刪除
        if (item && window.confirm(`確定要移除「${getProductName(item)}」嗎？`)) {
            // removeItem(id); // This function is not defined in the original file
        }
    }

    // 結帳表單提交處理
    const handleCheckoutSubmit = async () => {
        try {
            // 基本表單驗證
            if (!formData.agreeTerms) {
                Swal.fire({
                    icon: 'warning',
                    title: '請同意服務條款',
                    text: '請先同意服務條款才能繼續結帳',
                })
                return
            }

            // 驗證地址表單
            if (formData.deliveryMethod === 'home') {
                console.log('📍 開始驗證地址表單...')

                if (formData.sameAddress && !selectedAddress) {
                    Swal.fire({
                        icon: 'warning',
                        title: '請選擇地址',
                        text: '請選擇已儲存的地址或改用手動輸入',
                    })
                    return
                }

                if (formData.manualInput) {
                    console.log('✍️ 驗證手動輸入地址...')
                    console.log('zipcode:', formData.zipcode, 'type:', typeof formData.zipcode)
                    console.log('city:', formData.city, 'type:', typeof formData.city)
                    console.log('district:', formData.district, 'type:', typeof formData.district)
                    console.log('address:', formData.address, 'type:', typeof formData.address)

                    // 修復：檢查所有必要的地址欄位，包括 zipcode
                    if (!formData.zipcode || !formData.city || !formData.district || !formData.address) {
                        const missingFields = []
                        if (!formData.zipcode) missingFields.push('郵遞區號')
                        if (!formData.city) missingFields.push('縣市')
                        if (!formData.district) missingFields.push('區域')
                        if (!formData.address) missingFields.push('詳細地址')

                        console.log('❌ 地址驗證失敗，缺少欄位:', missingFields)
                        Swal.fire({
                            icon: 'warning',
                            title: '地址資訊不完整',
                            text: `請填寫完整的地址資訊：${missingFields.join('、')}`,
                        })
                        return
                    }

                    console.log('✅ 手動輸入地址驗證通過')
                }

                // 新增：如果使用已儲存地址，也要檢查地址資料完整性
                if (formData.sameAddress && selectedAddress) {
                    console.log('🏠 驗證已儲存地址...')
                    if (
                        !selectedAddress.zipcode ||
                        !selectedAddress.city ||
                        !selectedAddress.district ||
                        !selectedAddress.address
                    ) {
                        Swal.fire({
                            icon: 'warning',
                            title: '地址資料不完整',
                            text: '已儲存的地址資料不完整，請選擇其他地址或改用手動輸入',
                        })
                        return
                    }
                }
            }

            // 驗證其他必填欄位
            if (!formData.buyerName || !formData.buyerPhone || !formData.buyerEmail) {
                Swal.fire({
                    icon: 'warning',
                    title: '個人資訊不完整',
                    text: '請填寫完整的個人資訊',
                })
                return
            }

            // 驗證 711 門市選擇 - 如果選擇超商取貨，必須選擇門市
            if (formData.deliveryMethod === '711') {
                if (!store711.storename || !store711.storeaddress) {
                    Swal.fire({
                        icon: 'warning',
                        title: '請選擇門市',
                        text: '請選擇 7-11 門市',
                    })
                    return
                }
            }

            // 驗證付款資訊
            if (formData.paymentMethod === 'credit') {
                if (!formData.cardNumber || !formData.expiryDate || !formData.cvv || !formData.cardholderName) {
                    Swal.fire({
                        icon: 'warning',
                        title: '信用卡資訊不完整',
                        text: '請填寫完整的信用卡資訊',
                    })
                    return
                }
            }

            console.log('🚀 開始結帳流程...')

            // 在結帳函數開始處添加調試日誌
            console.log('📍 地址驗證調試:')
            console.log('deliveryMethod:', formData.deliveryMethod)
            console.log('sameAddress:', formData.sameAddress)
            console.log('manualInput:', formData.manualInput)
            console.log('selectedAddress ID:', selectedAddress?.id)
            console.log('formData.zipcode:', formData.zipcode, 'type:', typeof formData.zipcode)
            console.log('formData.city:', formData.city, 'type:', typeof formData.city)
            console.log('formData.district:', formData.district, 'type:', typeof formData.district)
            console.log('formData.address:', formData.address, 'type:', typeof formData.address)
            console.log('formData.buyerName:', formData.buyerName, 'type:', typeof formData.buyerName)
            console.log('formData.buyerPhone:', formData.buyerPhone, 'type:', typeof formData.buyerPhone)

            // 修復：如果使用已儲存地址，確保地址資料同步到 formData
            if (
                formData.deliveryMethod === 'home' &&
                formData.sameAddress &&
                selectedAddress &&
                !formData.manualInput
            ) {
                console.log('🔄 同步已儲存地址到 formData，地址ID:', selectedAddress?.id)

                // 同步地址資料到 formData
                setFormData((prev) => ({
                    ...prev,
                    zipcode: selectedAddress.zipcode || '',
                    city: selectedAddress.city || '',
                    district: selectedAddress.district || '',
                    address: selectedAddress.address || '',
                    recipientName: selectedAddress.recipient_name || prev.recipientName,
                    recipientPhone: selectedAddress.recipient_phone || prev.recipientPhone,
                }))

                // 等待狀態更新完成後再繼續
                setTimeout(() => {
                    console.log('✅ 地址資料同步完成，繼續結帳流程')
                    proceedWithCheckout()
                }, 100)
                return
            }

            // 如果不需要同步地址資料，直接繼續結帳
            proceedWithCheckout()
        } catch (error) {
            console.error('❌ 結帳失敗:', error)
            Swal.fire({
                icon: 'error',
                title: '結帳失敗',
                text: `結帳失敗：${error.message}`,
            })
        }
    }

    // 實際的結帳邏輯
    const proceedWithCheckout = async () => {
        let pointsDeducted = false
        try {
            // 組裝結帳資料 - 根據資料庫結構調整
            const checkoutData = {
                // 購物車項目 - 對應 order_items 表
                cartItems: checkoutItems.map((item) => ({
                    id: item.id || item.vinyl_id,
                    vinyl_id: item.id || item.vinyl_id, // 對應 order_items.vinyl_id
                    name: item.name || item.vinyl_name,
                    price: getProductPrice(item),
                    qty: item.quantity,
                    quantity: item.quantity, // 對應 order_items.quantity
                    unit_price: getProductPrice(item), // 對應 order_items.unit_price
                    subtotal: getProductPrice(item) * item.quantity,
                    sku: item.sku || null,
                })),

                // 金額總計 - 對應 orders.total_price
                totals: {
                    itemsSubtotal: subtotal,
                    shippingFee: shippingFee,
                    discountTotal: couponDiscount + pointsDiscount,
                    payableTotal: Math.max(0, subtotal - couponDiscount - pointsDiscount + shippingFee),
                },

                // 優惠券 - 對應 orders.coupon_id
                // 🚀 A方案：將代碼(如 'AARAIN05' 或 'code-applied') 解析為實際的數字 coupon_id
                // 以符合資料庫 orders.coupon_id（int）需求
                coupon: (() => {
                    if (!selectedCoupon) return null
                    const norm = (s) => (s ?? '').toString().trim().toUpperCase()
                    let resolvedId = null
                    if (selectedCoupon === 'code-applied') {
                        const target = norm(couponCode)
                        const hit = syncAvailableCoupons.find(
                            (c) => norm(c.code) === target || norm(c.coupon_code) === target
                        )
                        resolvedId = hit?.id ?? null
                    } else {
                        const maybeNum = parseInt(selectedCoupon, 10)
                        if (Number.isFinite(maybeNum)) {
                            resolvedId = maybeNum
                        } else {
                            const target = norm(selectedCoupon)
                            const hit = syncAvailableCoupons.find(
                                (c) => norm(c.code) === target || norm(c.coupon_code) === target
                            )
                            resolvedId = hit?.id ?? null
                        }
                    }
                    if (!resolvedId) return null
                    return {
                        id: resolvedId,
                        code: couponCode || selectedCoupon,
                        discount: couponDiscount,
                    }
                })(),

                // 使用點數 - 對應 orders.points_used
                usedPoints: pointsToUse,

                // 收貨地址 - 對應 orders.shipping_address
                shippingAddress:
                    formData.deliveryMethod === '711' && store711.storename
                        ? {
                              // 7-11 門市取貨：使用門市地址
                              fullName: store711.storename, // 門市名稱
                              mobile: null, // 門市沒有電話
                              zipcode: null, // 門市地址通常不包含郵遞區號
                              city: null, // 門市地址通常不包含縣市
                              district: null, // 門市地址通常不包含區域
                              addressLine: store711.storeaddress, // 門市完整地址
                          }
                        : {
                              // 宅配到府：使用收件人地址
                              fullName: formData.recipientName || formData.buyerName,
                              mobile: formData.recipientPhone || formData.buyerPhone,
                              zipcode: formData.zipcode,
                              city: formData.city,
                              district: formData.district,
                              addressLine: formData.address,
                          },

                // 收件人 - 對應 orders.recipient_name, recipient_phone
                recipient:
                    formData.deliveryMethod === '711'
                        ? {
                              // 7-11 門市取貨：收件人使用購買人資訊
                              fullName: formData.buyerName, // 購買人姓名
                              mobile: formData.buyerPhone, // 購買人電話
                              zipcode: null, // 門市取貨不需要收件人地址
                              city: null,
                              district: null,
                              addressLine: null,
                          }
                        : formData.sameAddress && selectedAddress
                        ? {
                              // 宅配到府 + 使用已儲存地址：使用已儲存地址的收件人資訊
                              fullName: selectedAddress.recipient_name,
                              mobile: selectedAddress.recipient_phone,
                              zipcode: selectedAddress.zipcode,
                              city: selectedAddress.city,
                              district: selectedAddress.district,
                              addressLine: selectedAddress.address,
                          }
                        : {
                              // 宅配到府 + 手動輸入：使用表單中的收件人資訊
                              fullName: formData.recipientName || formData.buyerName,
                              mobile: formData.recipientPhone || formData.buyerPhone,
                              zipcode: formData.zipcode,
                              city: formData.city,
                              district: formData.district,
                              addressLine: formData.address,
                          },

                // 使用者資料 - 對應 orders.users_id
                user: {
                    memberId: user?.id,
                    email: formData.buyerEmail, // 修復：使用購買人郵箱
                    phone: formData.buyerPhone, // 修復：使用購買人電話
                },

                // 🚀 新增：配送方式 - 對應 orders.delivery_method (如果資料表有此欄位)
                deliveryMethod: formData.deliveryMethod,

                // 🚀 新增：付款方式 - 對應 orders.payment_method
                payment_method:
                    formData.paymentMethod === 'credit'
                        ? 'CREDIT_CARD'
                        : formData.paymentMethod === 'linepay'
                        ? 'LINE_PAY'
                        : formData.paymentMethod === 'ecpay'
                        ? 'ECPAY'
                        : 'CREDIT_CARD', // 預設為信用卡

                // 🚀 新增：7-11 門市資料 - 對應 logistics_info 表
                logisticsInfo:
                    formData.deliveryMethod === '711' && store711.storename
                        ? {
                              type: '711', // 對應 logistics_info.type
                              store_id: store711.storeid, // 對應 logistics_info.store_id
                              store_name: store711.storename, // 對應 logistics_info.store_name
                              store_telephone: null, // 7-11 門市通常沒有電話，可設為 null
                              tracking_number: null, // 初始為 null，後續由物流系統填入
                              status: 'pending', // 對應 logistics_info.status，初始為 pending
                          }
                        : formData.deliveryMethod === 'home'
                        ? {
                              type: 'home', // 對應 logistics_info.type
                              store_id: null,
                              store_name: null,
                              store_telephone: null,
                              tracking_number: null, // 初始為 null，後續由物流系統填入
                              status: 'pending', // 對應 logistics_info.status，初始為 pending
                          }
                        : null,
            }

            console.log('📋 結帳資料組裝完成:', checkoutData)

            // 如有使用點數，先扣除點數（預扣）
            if (pointsToUse > 0) {
                await deductPoints(pointsToUse, '購物車結帳')
                pointsDeducted = true
            }

            // 呼叫結帳 API
            const result = await checkoutOrder(checkoutData)

            console.log('✅ 結帳成功，結果:', result)

            // 結帳成功，刷新點數餘額並導向完成頁
            try {
                await refreshPointsBalance()
            } catch (_) {}
            if (result.orderId || result.orderNo) {
                const orderId = result.orderId || result.orderNo
                Swal.fire({
                    icon: 'success',
                    title: '結帳成功！',
                    text: `訂單編號：${orderId}`,
                })
                router.push(`/cart/checkout/success?orderId=${orderId}`)
            } else {
                Swal.fire({
                    icon: 'success',
                    title: '結帳成功！',
                    text: '您的訂單已建立完成',
                })
                router.push('/cart/checkout/success')
            }
        } catch (error) {
            console.error('❌ 結帳失敗:', error)
            // 若已預扣點數，嘗試回補
            if (pointsDeducted && pointsToUse > 0) {
                try {
                    await refundPoints(pointsToUse, '結帳失敗回補')
                    await refreshPointsBalance()
                    Swal.fire({
                        icon: 'error',
                        title: '結帳失敗',
                        text: `結帳失敗：${error.message}\n已回補 ${pointsToUse.toLocaleString()} 點`,
                    })
                } catch (refundErr) {
                    console.error('❌ 回補點數失敗:', refundErr)
                    Swal.fire({
                        icon: 'error',
                        title: '結帳失敗',
                        text: `結帳失敗：${error.message}\n且回補點數時發生問題：${refundErr.message}`,
                    })
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: '結帳失敗',
                    text: `結帳失敗：${error.message}`,
                })
            }
        }
    }

    // 前往結帳
    const handleCheckout = (selectedProducts = null) => {
        const itemsToCheckout = selectedProducts || checkoutItems
        if (itemsToCheckout.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: '購物車是空的',
                text: '請先加入商品到購物車',
            })
            return
        }

        // 計算商品小計
        const subtotal = itemsToCheckout.reduce((sum, item) => sum + getProductPrice(item) * item.quantity, 0)

        // 計算最終結帳金額（扣除優惠券和點數折扣）
        const finalAmount = Math.max(0, Math.round(subtotal - couponDiscount - pointsDiscount))

        // 構建折扣詳情訊息
        let discountInfo = ''
        if (couponDiscount > 0 || pointsDiscount > 0) {
            discountInfo += '\n折扣明細：'
            discountInfo += `\n商品小計：NT$ ${subtotal.toLocaleString()}`
            if (couponDiscount > 0) {
                discountInfo += `\n優惠券折扣：-NT$ ${couponDiscount.toLocaleString()}`
            }
            if (pointsDiscount > 0) {
                discountInfo += `\n點數折扣：-NT$ ${pointsDiscount.toLocaleString()}`
            }
        }

        Swal.fire({
            icon: 'info',
            title: '準備結帳',
            text: `準備結帳 ${
                itemsToCheckout.length
            } 項商品${discountInfo}\n\n實際付款金額：NT$ ${finalAmount.toLocaleString()}`,
        })
    }

    // 🚀 新增：追蹤 formData 的變化歷史，配合已移除的監測面板使用
    // const [formDataHistory, setFormDataHistory] = useState([]);

    // 🚀 新增：ECPay 跳轉確認吐司頁面狀態
    const [showEcpayConfirm, setShowEcpayConfirm] = useState(false)
    const [ecpayOrderData, setEcpayOrderData] = useState(null)

    // 🚀 新增：LINE Pay 跳轉確認吐司頁面狀態
    const [showLinepayConfirm, setShowLinepayConfirm] = useState(false)
    const [linepayOrderData, setLinepayOrderData] = useState(null)

    // 🚀 新增：訂單預覽狀態
    const [showOrderPreview, setShowOrderPreview] = useState(false)
    const [previewPaymentMethod, setPreviewPaymentMethod] = useState(null)

    // 🚀 新增：處理 ECPay 確認跳轉
    const handleEcpayConfirm = () => {
        if (ecpayOrderData) {
            console.log('🚀 用戶確認跳轉到 ECPay，訂單資料:', ecpayOrderData)
            router.push(
                `http://localhost:3005/api/ecpay?amount=${ecpayOrderData.amount}&items=${ecpayOrderData.items}&orderId=${ecpayOrderData.orderId}`
            )
        }
        setShowEcpayConfirm(false)
        setEcpayOrderData(null)
    }

    // 🚀 新增：取消 ECPay 跳轉
    const handleEcpayCancel = () => {
        setShowEcpayConfirm(false)
        setEcpayOrderData(null)
    }

    // 🚀 新增：處理 LINE Pay 確認跳轉
    const handleLinepayConfirm = () => {
        if (linepayOrderData) {
            console.log('🚀 用戶確認跳轉到 LINE Pay，訂單資料:', linepayOrderData)
            router.push(
                `http://localhost:3005/api/linepay/reserve?amount=${linepayOrderData.amount}&orderId=${linepayOrderData.orderId}`
            )
        }
        setShowLinepayConfirm(false)
        setLinepayOrderData(null)
    }

    // 🚀 新增：取消 LINE Pay 跳轉
    const handleLinepayCancel = () => {
        setShowLinepayConfirm(false)
        setLinepayOrderData(null)
    }

    // 🚀 新增：處理訂單預覽確認
    const handleOrderPreviewConfirm = async () => {
        try {
            console.log('🚀 開始建立訂單...')

            // 建立訂單資料
            const checkoutData = {
                // 購物車項目
                cartItems: checkoutItems.map((item) => ({
                    id: item.id || item.vinyl_id,
                    vinyl_id: item.id || item.vinyl_id,
                    name: item.name || item.vinyl_name,
                    price: getProductPrice(item),
                    qty: item.quantity,
                    quantity: item.quantity,
                    unit_price: getProductPrice(item),
                    subtotal: getProductPrice(item) * item.quantity,
                    sku: item.sku || null,
                })),

                // 金額總計
                totals: {
                    itemsSubtotal: subtotal,
                    shippingFee: 100,
                    discountTotal: couponDiscount + pointsDiscount,
                    payableTotal: Math.max(0, subtotal - couponDiscount - pointsDiscount + 100),
                },

                // 優惠券
                // 🚀 A方案：將代碼解析為數字 coupon_id（同上，預覽流程也需一致）
                coupon: (() => {
                    if (!selectedCoupon) return null
                    const norm = (s) => (s ?? '').toString().trim().toUpperCase()
                    let resolvedId = null
                    if (selectedCoupon === 'code-applied') {
                        const target = norm(couponCode)
                        const hit = syncAvailableCoupons.find(
                            (c) => norm(c.code) === target || norm(c.coupon_code) === target
                        )
                        resolvedId = hit?.id ?? null
                    } else {
                        const maybeNum = parseInt(selectedCoupon, 10)
                        if (Number.isFinite(maybeNum)) {
                            resolvedId = maybeNum
                        } else {
                            const target = norm(selectedCoupon)
                            const hit = syncAvailableCoupons.find(
                                (c) => norm(c.code) === target || norm(c.coupon_code) === target
                            )
                            resolvedId = hit?.id ?? null
                        }
                    }
                    if (!resolvedId) return null
                    return {
                        id: resolvedId,
                        code: couponCode || selectedCoupon,
                        discount: couponDiscount,
                    }
                })(),

                // 使用點數
                usedPoints: pointsToUse,

                // 收貨地址 - 根據配送方式決定
                shippingAddress:
                    formData.deliveryMethod === '711' && store711.storename
                        ? {
                              // 7-11 門市取貨：使用門市地址
                              fullName: store711.storename,
                              mobile: null,
                              zipcode: null,
                              city: null,
                              district: null,
                              addressLine: store711.storeaddress,
                          }
                        : {
                              // 宅配到府：使用收件人地址
                              fullName: formData.recipientName || formData.buyerName,
                              mobile: formData.recipientPhone || formData.buyerPhone,
                              zipcode: formData.zipcode,
                              city: formData.city,
                              district: formData.district,
                              addressLine: formData.address,
                          },

                // 收件人 - 根據配送方式決定
                recipient:
                    formData.deliveryMethod === '711'
                        ? {
                              // 7-11 門市取貨：收件人使用購買人資訊
                              fullName: formData.buyerName,
                              mobile: formData.buyerPhone,
                              zipcode: null,
                              city: null,
                              district: null,
                              addressLine: null,
                          }
                        : formData.sameAddress && selectedAddress
                        ? {
                              // 宅配到府 + 使用已儲存地址：使用已儲存地址的收件人資訊
                              fullName: selectedAddress.recipient_name,
                              mobile: selectedAddress.recipient_phone,
                              zipcode: selectedAddress.zipcode,
                              city: selectedAddress.city,
                              district: selectedAddress.district,
                              addressLine: selectedAddress.address,
                          }
                        : {
                              // 宅配到府 + 手動輸入：使用表單中的收件人資訊
                              fullName: formData.recipientName || formData.buyerName,
                              mobile: formData.recipientPhone || formData.buyerPhone,
                              zipcode: formData.zipcode,
                              city: formData.city,
                              district: formData.district,
                              addressLine: formData.address,
                          },

                // 使用者資料
                user: {
                    memberId: user?.id,
                    email: formData.buyerEmail,
                    phone: formData.buyerPhone,
                },

                // 配送方式
                deliveryMethod: formData.deliveryMethod,

                // 付款方式
                payment_method: previewPaymentMethod === 'linepay' ? 'LINE_PAY' : 'ECPAY',

                // 物流資訊 - 根據配送方式決定
                logisticsInfo:
                    formData.deliveryMethod === '711' && store711.storename
                        ? {
                              type: '711',
                              store_id: store711.storeid,
                              store_name: store711.storename,
                              store_telephone: null,
                              tracking_number: null,
                              status: 'pending',
                          }
                        : formData.deliveryMethod === 'home'
                        ? {
                              type: 'home',
                              store_id: null,
                              store_name: null,
                              store_telephone: null,
                              tracking_number: null,
                              status: 'pending',
                          }
                        : null,
            }

            console.log('📋 準備建立訂單:', checkoutData)

            // 呼叫結帳 API 建立訂單
            const result = await checkoutOrder(checkoutData)
            console.log('✅ 訂單建立成功:', result)

            // 關閉預覽，顯示付款確認
            setShowOrderPreview(false)

            const amount = result.total_amount || checkoutData.totals.payableTotal
            const items = checkoutData.cartItems.map((item) => `${item.name} X${item.quantity}`).join(',')
            const encodedItems = encodeURIComponent(items)

            const orderData = {
                amount,
                items: encodedItems,
                orderId: result.orderId,
                orderNo: result.orderNo,
                totalAmount: result.total_amount,
            }

            if (previewPaymentMethod === 'linepay') {
                setLinepayOrderData(orderData)
                setShowLinepayConfirm(true)
            } else if (previewPaymentMethod === 'ecpay') {
                setEcpayOrderData(orderData)
                setShowEcpayConfirm(true)
            }
        } catch (error) {
            console.error('❌ 訂單建立失敗:', error)
            Swal.fire({
                icon: 'error',
                title: '訂單建立失敗',
                text: `訂單建立失敗：${error.message}`,
            })
        }
    }

    // 🚀 新增：監測 formData 變化，幫助調試手動輸入是否有效
    useEffect(() => {
        const currentTime = new Date().toISOString()

        // 記錄變化歷史，配合已移除的監測面板使用
        // setFormDataHistory((prev) => {
        //   const newHistory = [
        //     {
        //       timestamp: currentTime,
        //       formData: { ...formData },
        //       changes:
        //         prev.length > 0
        //           ? getFormDataChanges(prev[prev.length - 1].formData, formData)
        //           : 'initial',
        //     },
        //     ...prev.slice(0, 9), // 只保留最近 10 次變化
        //   ];
        //   return newHistory;
        // });

        console.log('📍 formData 變化監測:', {
            timestamp: currentTime,
            buyerInfo: {
                name: formData.buyerName,
                phone: formData.buyerPhone,
                email: formData.buyerEmail,
            },
            recipientInfo: {
                name: formData.recipientName,
                phone: formData.recipientPhone,
            },
            addressInfo: {
                zipcode: formData.zipcode,
                city: formData.city,
                district: formData.district,
                address: formData.address,
            },
            settings: {
                deliveryMethod: formData.deliveryMethod,
                sameAddress: formData.sameAddress,
                manualInput: formData.manualInput,
            },
            // 添加變化檢測
            hasAddressData: !!(formData.zipcode || formData.city || formData.district || formData.address),
            hasRecipientData: !!(formData.recipientName || formData.recipientPhone),
            hasBuyerData: !!(formData.buyerName || formData.buyerPhone || formData.buyerEmail),
            paymentMethod: formData.paymentMethod,
        })
    }, [formData]) // 監聽 formData 的所有變化

    // 🚀 新增：輔助函數，檢測 formData 的具體變化
    // const getFormDataChanges = (oldData, newData) => {
    //   const changes = [];

    //   // 檢測購買人資訊變化
    //   if (oldData.buyerName !== newData.buyerName)
    //     changes.push(
    //       `buyerName: "${oldData.buyerName}" → "${newData.buyerName}"`,
    //     );
    //   if (oldData.buyerPhone !== newData.buyerPhone)
    //     changes.push(
    //       `buyerPhone: "${oldData.buyerPhone}" → "${newData.buyerPhone}"`,
    //     );
    //   if (oldData.buyerEmail !== newData.buyerEmail)
    //     changes.push(
    //       `buyerEmail: "${oldData.buyerEmail}" → "${newData.buyerEmail}"`,
    //     );

    //   // 檢測收件人資訊變化
    //   if (oldData.recipientName !== newData.recipientName)
    //     changes.push(
    //       `recipientName: "${oldData.recipientName}" → "${newData.recipientName}"`,
    //     );
    //   if (oldData.recipientPhone !== newData.recipientPhone)
    //     changes.push(
    //       `recipientPhone: "${oldData.recipientPhone}" → "${newData.recipientPhone}"`,
    //     );

    //   // 檢測地址資訊變化
    //   if (oldData.zipcode !== newData.zipcode)
    //     changes.push(`zipcode: "${oldData.zipcode}" → "${newData.zipcode}"`);
    //   if (oldData.city !== newData.city)
    //     changes.push(`city: "${oldData.city}" → "${newData.city}"`);
    //   if (oldData.district !== newData.district)
    //     changes.push(`district: "${oldData.district}" → "${newData.district}"`);
    //   if (oldData.address !== newData.address)
    //     changes.push(`address: "${oldData.address}" → "${newData.address}"`);

    //   // 檢測設定變化
    //   if (oldData.deliveryMethod !== newData.deliveryMethod)
    //     changes.push(
    //       `deliveryMethod: "${oldData.deliveryMethod}" → "${newData.deliveryMethod}"`,
    //     );
    //   if (oldData.sameAddress !== newData.sameAddress)
    //     changes.push(
    //       `sameAddress: ${oldData.sameAddress} → ${newData.sameAddress}`,
    //     );
    //   if (oldData.manualInput !== newData.manualInput)
    //     changes.push(
    //       `manualInput: ${oldData.manualInput} → ${newData.manualInput}`,
    //     );

    //   return changes.length > 0 ? changes : 'no changes';
    // };

    return (
        <div className={styles.cartPage}>
            <div className="container py-4">
                {/* 結帳進度條 */}
                <CheckoutProgress currentStep={2} />

                {/* 主要內容區域 (重用 cart 的 row 佈局) */}
                <div className="row g-4">
                    {/* 左側：結帳表單 */}
                    <div className="col-lg-7 col-xl-8 order-2 order-lg-1">
                        <div className={styles.cartScreen}>
                            {/* 購買人資訊區域 */}
                            <div className={styles.sectionTitle}>
                                <h6 className={styles.sectionTitleText}>購買人資訊</h6>
                                {user && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // 重置為預設使用者資料
                                            setFormData((prev) => ({
                                                ...prev,
                                                buyerName: user.name || user.nickname || '',
                                                buyerPhone: user.phone || '',
                                                buyerEmail: user.email || '',
                                                cardholderName: user.name || user.nickname || '',
                                            }))
                                            // 重置編輯標記
                                            setUserEditedFields({
                                                buyerName: false,
                                                buyerPhone: false,
                                                buyerEmail: false,
                                                cardholderName: false,
                                            })
                                        }}
                                        className={styles.autoFillButton}
                                        title="恢復預設資料"
                                    >
                                        點擊可自動填入會員資料
                                    </button>
                                )}
                            </div>
                            {/* 分隔線 (Figma PropertyDefault) */}
                            <div className={styles.property1Default}>
                                <hr className={styles.sectionDivider} />
                            </div>

                            {/* 姓名欄位 */}
                            <div className={styles.formFieldContainer}>
                                <label className={styles.formFieldLabel}>
                                    姓名<span className={styles.requiredAsterisk}>*</span>
                                </label>
                                <input
                                    className={styles.formFieldInput}
                                    type="text"
                                    value={formData.buyerName || ''}
                                    onChange={(e) => handleInputChange('buyerName', e.target.value)}
                                    placeholder={'請輸入購買人姓名'}
                                />
                            </div>

                            {/* 手機號碼欄位 */}
                            <div className={styles.formFieldContainer}>
                                <label className={styles.formFieldLabel}>
                                    手機號碼<span className={styles.requiredAsterisk}>*</span>
                                </label>
                                <input
                                    className={styles.formFieldInput}
                                    type="tel"
                                    value={formData.buyerPhone || ''}
                                    onChange={(e) => handleInputChange('buyerPhone', e.target.value)}
                                    placeholder={'請輸入手機號碼'}
                                />
                            </div>

                            {/* 聯絡信箱欄位 */}
                            <div className={styles.formFieldContainer}>
                                <label className={styles.formFieldLabel}>
                                    聯絡信箱<span className={styles.requiredAsterisk}>*</span>
                                </label>
                                <input
                                    className={styles.formFieldInput}
                                    type="email"
                                    value={formData.buyerEmail || ''}
                                    onChange={(e) => handleInputChange('buyerEmail', e.target.value)}
                                    placeholder={'請輸入電子郵件'}
                                />
                            </div>

                            {/* 提示文字 綠色通知會根據購買人資訊是否已經填寫來顯示*/}
                            <div className={styles.formFieldContainer}>
                                <div className={styles.formFieldLabel}></div>
                                <p className={styles.formNotice}>
                                    {user && (formData.buyerName || formData.buyerPhone || formData.buyerEmail) && (
                                        <span style={{ color: '#28a745' }}>
                                            ✓ 購買人資訊已從您的會員資料自動填入，您可以自由編輯
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* 配送方式區域 */}
                            <div className={styles.deliverySection}>
                                <div className={styles.sectionTitle}>
                                    <h6 className={styles.sectionTitleText}>配送方式</h6>
                                </div>

                                {/* 宅配到府選項 */}
                                <div className={styles.deliveryOptionContainer}>
                                    <div className={styles.deliveryOptionCard}>
                                        <input
                                            type="radio"
                                            name="delivery"
                                            id="home-delivery"
                                            className={styles.deliveryRadio}
                                            checked={formData.deliveryMethod === 'home'}
                                            onChange={() => handleInputChange('deliveryMethod', 'home')}
                                        />
                                        <label htmlFor="home-delivery" className={styles.deliveryOptionLabel}>
                                            <span>宅配到府 運費：NT$100</span>
                                            <span className={styles.deliveryTimeBadge}>2-3 天送達</span>
                                        </label>
                                    </div>

                                    {/* 使用已儲存地址選項 */}
                                    {formData.deliveryMethod === 'home' && (
                                        <div className={styles.addressOptionSection}>
                                            {/* 使用已儲存地址選項 */}
                                            <div className={styles.addressCheckboxRow}>
                                                <input
                                                    type="checkbox"
                                                    id="use-saved-address"
                                                    className={styles.customCheckbox}
                                                    checked={formData.sameAddress}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked

                                                        // 如果選擇使用已儲存地址，取消手動輸入選項
                                                        if (isChecked) {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                sameAddress: true,
                                                                manualInput: false,
                                                            }))

                                                            // 填入已儲存地址的資訊
                                                            if (selectedAddress) {
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    zipcode: selectedAddress.zipcode || '',
                                                                    city: selectedAddress.city || '',
                                                                    district: selectedAddress.district || '',
                                                                    address: selectedAddress.address || '',
                                                                    recipientName: selectedAddress.recipient_name || '',
                                                                    recipientPhone:
                                                                        selectedAddress.recipient_phone || '',
                                                                }))
                                                            } else if (defaultAddress) {
                                                                // 如果沒有選中的地址但有預設地址，使用預設地址
                                                                setSelectedAddress(defaultAddress)
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    zipcode: defaultAddress.zipcode || '',
                                                                    city: defaultAddress.city || '',
                                                                    district: defaultAddress.district || '',
                                                                    address: defaultAddress.address || '',
                                                                    recipientName: defaultAddress.recipient_name || '',
                                                                    recipientPhone:
                                                                        defaultAddress.recipient_phone || '',
                                                                }))
                                                            }
                                                        } else {
                                                            // 取消選擇時，清空地址資訊
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                sameAddress: false,
                                                                zipcode: '',
                                                                city: '',
                                                                district: '',
                                                                address: '',
                                                                recipientName: '',
                                                                recipientPhone: '',
                                                            }))
                                                        }
                                                    }}
                                                />
                                                <label
                                                    htmlFor="use-saved-address"
                                                    className={styles.addressCheckboxLabel}
                                                >
                                                    使用已儲存地址
                                                </label>
                                                <span className={styles.defaultBadge}>預設</span>
                                            </div>

                                            {/* 已儲存地址資訊 - 只在選擇使用已儲存地址時顯示 */}
                                            {formData.sameAddress && selectedAddress && (
                                                <div className={styles.addressInfoCard}>
                                                    <div className={styles.addressInfoContent}>
                                                        <div className={styles.addressInfoRow}>
                                                            <span className={styles.addressLabel}>收件人</span>
                                                            <span className={styles.addressValue}>
                                                                {selectedAddress.recipient_name}
                                                            </span>
                                                        </div>
                                                        <div className={styles.addressInfoRow}>
                                                            <span className={styles.addressLabel}>地址</span>
                                                            <span className={styles.addressValue}>
                                                                {`${selectedAddress.zipcode || ''} ${
                                                                    selectedAddress.city || ''
                                                                } ${selectedAddress.district || ''} ${
                                                                    selectedAddress.address || ''
                                                                }`.trim()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.addressActionButtons}>
                                                        <button
                                                            type="button"
                                                            onClick={openAddressSelector}
                                                            className={`${styles.selectAddressBtn}
                               m-3`}
                                                        >
                                                            選擇其他地址
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {formData.sameAddress && !selectedAddress && (
                                                <div className={styles.addressInfoCard}>
                                                    <div className={styles.addressInfoContent}>
                                                        <div className={styles.addressInfoRow}>
                                                            <span className={styles.addressValue}>
                                                                {!addresses || addresses.length === 0
                                                                    ? '尚未儲存任何地址，請手動輸入'
                                                                    : '請選擇地址或手動輸入'}
                                                            </span>
                                                        </div>
                                                        {addresses && addresses.length > 0 && (
                                                            <div className={styles.addressActionButtons}>
                                                                <button
                                                                    type="button"
                                                                    onClick={openAddressSelector}
                                                                    className={styles.selectAddressBtn}
                                                                >
                                                                    選擇地址
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 手動輸入地址選項 */}
                                            <div className={styles.addressCheckboxRow}>
                                                <input
                                                    type="checkbox"
                                                    id="manual-input-address"
                                                    className={styles.customCheckbox}
                                                    checked={formData.manualInput}
                                                    onChange={handleManualInputChange}
                                                />
                                                <label
                                                    htmlFor="manual-input-address"
                                                    className={styles.addressCheckboxLabel}
                                                >
                                                    手動輸入地址
                                                </label>
                                                <span className={styles.defaultBadge}>手動輸入</span>
                                            </div>

                                            {/* 手動輸入地址表單 - 只在選擇手動輸入時顯示 */}
                                            {formData.manualInput && (
                                                <CheckoutAddressForm
                                                    key="manual-address-form" // 添加穩定的 key
                                                    initialData={{
                                                        zipcode: formData.zipcode || '',
                                                        city: formData.city || '',
                                                        district: formData.district || '',
                                                        address: formData.address || '',
                                                        recipient_name: formData.recipientName || '', // 修復：使用收件人姓名
                                                        recipient_phone: formData.recipientPhone || '', // 修復：使用收件人電話
                                                    }}
                                                    onDataChange={handleAddressFormChange}
                                                    loading={false}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* 超商取貨選項 */}
                                    <div className={styles.deliveryOptionCard}>
                                        <input
                                            type="radio"
                                            name="delivery"
                                            id="store-pickup"
                                            className={styles.deliveryRadio}
                                            checked={formData.deliveryMethod === '711'}
                                            onChange={() => handleInputChange('deliveryMethod', '711')}
                                        />
                                        <label htmlFor="store-pickup" className={styles.deliveryOptionLabel}>
                                            <span>超商取貨 運費：NT$100</span>
                                            <span className={styles.deliveryTimeBadge}>5-7 天送達</span>
                                        </label>
                                    </div>

                                    {/* 711 門市選擇 */}
                                    {formData.deliveryMethod === '711' && (
                                        <div className={styles.addressOptionSection}>
                                            {/* 711 門市選擇按鈕 - 僅在未選擇門市時顯示 */}
                                            {!store711.storename && (
                                                <div className={styles.storeActionRow}>
                                                    <button
                                                        className={styles.addStoreButton}
                                                        onClick={openWindow} // 使用 711 hook 的 openWindow 函數
                                                        type="button"
                                                    >
                                                        + 選擇 7-11 門市
                                                    </button>
                                                </div>
                                            )}

                                            {/* 已選擇的 7-11 門市資訊顯示 */}
                                            {store711.storename && (
                                                <div className={styles.addressInfoCard}>
                                                    <div className={styles.addressInfoContent}>
                                                        <div className={styles.addressInfoRow}>
                                                            <span className={styles.addressLabel}>門市名稱</span>
                                                            <span className={styles.addressValue}>
                                                                {store711.storename}
                                                            </span>
                                                        </div>
                                                        <div className={styles.addressInfoRow}>
                                                            <span className={styles.addressLabel}>門市地址</span>
                                                            <span className={styles.addressValue}>
                                                                {store711.storeaddress}
                                                            </span>
                                                        </div>
                                                        {store711.storeid && (
                                                            <div className={styles.addressInfoRow}>
                                                                <span className={styles.addressLabel}>門市代號</span>
                                                                <span className={styles.addressValue}>
                                                                    {store711.storeid}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={styles.storeActionButtons}>
                                                        {/* 重新選擇門市按鈕 */}
                                                        <button
                                                            className={styles.storeActionBtn}
                                                            onClick={openWindow} // 使用 711 hook 的 openWindow 函數
                                                            type="button"
                                                        >
                                                            重新選擇
                                                        </button>
                                                        {/* 清除門市選擇按鈕 */}
                                                        <button
                                                            className={styles.storeActionBtn}
                                                            onClick={() => {
                                                                // 清除選擇的門市 - 同步清除 formData 和 hook 狀態
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    store711: {
                                                                        storeid: '',
                                                                        storename: '',
                                                                        storeaddress: '',
                                                                        outside: '',
                                                                        ship: '',
                                                                        TempVar: '',
                                                                    },
                                                                }))

                                                                // 安全地清除 hook 的狀態，讓畫面回到選擇分店的狀態
                                                                // 只清除特定的 checkout711 key，避免影響其他重要資料
                                                                try {
                                                                    if (typeof window !== 'undefined') {
                                                                        // 只清除門市相關資料，保留其他可能的資料
                                                                        const clearedData = {
                                                                            storeid: '',
                                                                            storename: '',
                                                                            storeaddress: '',
                                                                            outside: '',
                                                                            ship: '',
                                                                            TempVar: '',
                                                                        }
                                                                        localStorage.setItem(
                                                                            'checkout711',
                                                                            JSON.stringify(clearedData)
                                                                        )

                                                                        // 觸發自定義事件通知 hook 更新狀態
                                                                        // 這樣可以讓 useShip711StoreOpener 的 store711 狀態同步更新
                                                                        //CustomEvent 是瀏覽器提供的 Web API，用於創建自定義事件。它允許開發者定義自己的事件類型，並在 DOM 中傳播。
                                                                        window.document.dispatchEvent(
                                                                            new CustomEvent('set-store', {
                                                                                detail: clearedData,
                                                                            })
                                                                        )
                                                                    }
                                                                } catch (error) {
                                                                    console.warn('清除 711 門市資料時發生錯誤:', error)
                                                                }
                                                            }}
                                                            type="button"
                                                        >
                                                            清除選擇
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 如果沒有選擇門市，顯示提示訊息 */}
                                            {!store711.storename && (
                                                <div className={styles.addressInfoCard}>
                                                    <div className={styles.addressInfoContent}>
                                                        <div className={styles.addressInfoRow}>
                                                            <span className={styles.addressValue}>
                                                                請點擊上方按鈕選擇 7-11 門市
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Method Section */}

                            <div className={styles.sectionTitle}>
                                <h6 className={styles.sectionTitleText}>付款方式</h6>
                            </div>

                            <div className={styles.paymentMethodSection}>
                                {/* 綠界 LINE Pay付款選項 */}
                                <div className={styles.deliveryOptionCard}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        id="quick-payment"
                                        className={styles.deliveryRadio}
                                        checked={
                                            formData.paymentMethod === 'linepay' ||
                                            formData.paymentMethod === 'ecpay' ||
                                            formData.paymentMethod === 'quick'
                                        }
                                        onChange={() => {
                                            // 點擊快速付款選項時，設定為 quick，讓使用者選擇具體付款方式
                                            handleInputChange('paymentMethod', 'quick')
                                        }}
                                    />
                                    <label htmlFor="quick-payment" className={styles.deliveryOptionLabel}>
                                        <span>綠界 / LINE Pay快速付款</span>
                                        <div className="d-flex gap-3">
                                            <Image
                                                src="/images/payment/linepay.svg"
                                                alt="LINE Pay"
                                                width={72}
                                                height={24}
                                                unoptimized
                                            />

                                            <Image
                                                src="/images/payment/ecpay.svg"
                                                alt="ECPay"
                                                width={50}
                                                height={24}
                                                unoptimized
                                            />
                                        </div>
                                    </label>
                                </div>
                                {/* Quick Checkout - 只在選擇快速付款時顯示 */}
                                {(formData.paymentMethod === 'linepay' ||
                                    formData.paymentMethod === 'ecpay' ||
                                    formData.paymentMethod === 'quick') && (
                                    <div className={styles.quickCheckoutContainer}>
                                        {/* 快速結帳同意條款 */}
                                        <div className={styles.termsAgreement}>
                                            <div className={styles.addressCheckboxRow}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.customCheckbox}
                                                    id="quick-payment-terms"
                                                    checked={formData.agreeQuickPayment}
                                                    onChange={(e) =>
                                                        handleInputChange('agreeQuickPayment', e.target.checked)
                                                    }
                                                />
                                                <div className="flex-1">
                                                    <label className={styles.termsLabel} htmlFor="quick-payment-terms">
                                                        我已閱讀並同意快速結帳服務條款與ECHO&FLOW會員的條款與條件
                                                    </label>
                                                    <div className={styles.termsNotice}>
                                                        ※使用快速結帳即表示同意第三方付款以及ECHO&FLOW的服務條款與隱私政策。
                                                        <br />
                                                        ※我們會使用你的個人資料來處理你的訂單、支援你在本網站中的使用體驗，以及用於隱私權政策中說明的其他用途。
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.quickPaymentButtons}>
                                            {/* LINE Pay */}
                                            <button
                                                className={styles.linepayButton}
                                                disabled={!formData.agreeQuickPayment}
                                                onClick={() => {
                                                    if (formData.agreeQuickPayment) {
                                                        // 設定付款方式為 Line Pay
                                                        handleInputChange('paymentMethod', 'linepay')
                                                        // 顯示訂單預覽
                                                        setPreviewPaymentMethod('linepay')
                                                        setShowOrderPreview(true)
                                                    }
                                                }}
                                            >
                                                <Image
                                                    src="/images/payment/linepay.svg"
                                                    alt="LINE Pay"
                                                    width={120}
                                                    height={40}
                                                    unoptimized
                                                />
                                            </button>
                                        </div>
                                        <div className={styles.quickPaymentButtons}>
                                            {/* ECPay */}
                                            <button
                                                className={styles.ecpayButton}
                                                disabled={!formData.agreeQuickPayment}
                                                onClick={() => {
                                                    if (formData.agreeQuickPayment) {
                                                        // 設定付款方式為 ECPay
                                                        handleInputChange('paymentMethod', 'ecpay')
                                                        // 顯示訂單預覽
                                                        setPreviewPaymentMethod('ecpay')
                                                        setShowOrderPreview(true)
                                                    }
                                                }}
                                            >
                                                <Image
                                                    src="/images/payment/ecpay.svg"
                                                    alt="ECPay"
                                                    width={120}
                                                    height={40}
                                                    unoptimized
                                                />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {/* 信用卡選項 */}
                                <div className={styles.deliveryOptionCard}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        id="credit-card"
                                        className={styles.deliveryRadio}
                                        checked={formData.paymentMethod === 'credit'}
                                        onChange={() => handleInputChange('paymentMethod', 'credit')}
                                    />
                                    <label htmlFor="credit-card" className={styles.deliveryOptionLabel}>
                                        <span>信用卡</span>
                                        <div className="d-flex gap-2">
                                            <Image
                                                src="/images/payment/visa.svg"
                                                alt="Visa"
                                                width={38}
                                                height={24}
                                                unoptimized
                                            />
                                            <Image
                                                src="/images/payment/mastercard.svg"
                                                alt="Mastercard"
                                                width={38}
                                                height={24}
                                                unoptimized
                                            />
                                            <Image
                                                src="/images/payment/jcb.svg"
                                                alt="JCB"
                                                width={38}
                                                height={24}
                                                unoptimized
                                            />
                                        </div>
                                    </label>
                                </div>

                                {/* 信用卡資訊表單 (當選擇信用卡時顯示) */}
                                {formData.paymentMethod === 'credit' && (
                                    <div className={styles.creditCardForm}>
                                        {/* 卡號 */}
                                        <div className={styles.formFieldContainer}>
                                            <label className={styles.formFieldLabel}>
                                                卡號<span className={styles.requiredAsterisk}>*</span>
                                            </label>
                                            <input
                                                className={styles.formFieldInput}
                                                type="text"
                                                placeholder="XXXX XXXX XXXX XXXX"
                                                value={formData.cardNumber}
                                                onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                                            />
                                        </div>

                                        {/* 有效期限和安全碼 */}
                                        <div className={styles.creditCardRow}>
                                            <div className={styles.creditCardField}>
                                                <div className={styles.formFieldContainer}>
                                                    <label className={styles.formFieldLabel}>
                                                        有效期限
                                                        <span className={styles.requiredAsterisk}>*</span>
                                                    </label>
                                                    <input
                                                        className={styles.formFieldInput}
                                                        type="text"
                                                        placeholder="99/99"
                                                        value={formData.expiryDate}
                                                        onChange={(e) =>
                                                            handleInputChange('expiryDate', e.target.value)
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.creditCardField}>
                                                <div className={styles.formFieldContainer}>
                                                    <label className={styles.formFieldLabel}>
                                                        安全碼
                                                        <span className={styles.requiredAsterisk}>*</span>
                                                    </label>
                                                    <input
                                                        className={styles.formFieldInput}
                                                        type="text"
                                                        placeholder="XXX"
                                                        value={formData.cvv}
                                                        onChange={(e) => handleInputChange('cvv', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 持卡人姓名 */}
                                        <div className={styles.formFieldContainer}>
                                            <label className={styles.formFieldLabel}>
                                                持卡人姓名
                                                <span className={styles.requiredAsterisk}>*</span>
                                            </label>
                                            <input
                                                className={styles.formFieldInput}
                                                type="text"
                                                value={formData.cardholderName}
                                                onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                                                placeholder={user?.name || user?.nickname || '請輸入持卡人姓名'}
                                            />
                                        </div>

                                        {/* 同收件地址作為帳單地址 */}
                                        <div className={styles.addressCheckboxRow}>
                                            <input
                                                type="checkbox"
                                                id="use-saved-address"
                                                className={styles.customCheckbox}
                                                checked={formData.sameAddress}
                                                onChange={(e) => handleInputChange('sameAddress', e.target.checked)}
                                            />
                                            <label htmlFor="use-saved-address" className={styles.addressCheckboxLabel}>
                                                同收件地址作為帳單地址
                                            </label>
                                        </div>
                                    </div>
                                )}
                                {/* 同意條款 - 只在非快速付款時顯示 */}
                                {formData.paymentMethod !== 'linepay' &&
                                    formData.paymentMethod !== 'ecpay' &&
                                    formData.paymentMethod !== 'quick' && (
                                        <div className={styles.termsAgreement}>
                                            <div className={styles.addressCheckboxRow}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.customCheckbox}
                                                    id="use-saved-address"
                                                    checked={formData.agreeTerms}
                                                    onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
                                                />
                                                <div className="flex-1">
                                                    <label className={styles.termsLabel} htmlFor="use-saved-address">
                                                        我已閱讀並同意ECHO&FLOW會員的條款與條件
                                                    </label>
                                                    <div className={styles.termsNotice}>
                                                        ※我們會使用你的個人資料來處理你的訂單、支援你在本網站中的使用體驗，以及用於隱私權政策中說明的其他用途。
                                                        <br />
                                                        ※結帳即表示同意ECHO&FLOW的服務條款與隱私政策
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                {/* 結帳按鈕 - 只在非快速付款時顯示 */}
                                {formData.paymentMethod !== 'linepay' &&
                                    formData.paymentMethod !== 'ecpay' &&
                                    formData.paymentMethod !== 'quick' && (
                                        <div className={styles.buttonLoginWrapper}>
                                            <button
                                                className={`btn ${styles.checkoutBtn}`}
                                                disabled={!formData.agreeTerms || submitting}
                                                onClick={handleCheckoutSubmit}
                                                aria-busy={submitting}
                                            >
                                                {submitting ? '處理中...' : '立即付款'}
                                            </button>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* 右側：商品明細 (重用 cart 的右側佈局) */}
                    <div className="col-lg-5 col-xl-4 order-1 order-lg-2">
                        <div className={styles.stickySidebar}>
                            <div className={styles.cartSummaryPanel}>
                                {/* 收合式容器 - 只在 992px 以下顯示 */}
                                <div className={styles.collapsibleSummaryContainer}>
                                    <div
                                        className={styles.collapsibleSummaryHeader}
                                        onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                                    >
                                        <div className={styles.collapsibleSummaryTitle}>
                                            <span>商品明細</span>
                                            <span className={styles.totalAmountDisplay}>
                                                NT${' '}
                                                {Math.max(
                                                    0,
                                                    Math.round(subtotal - couponDiscount - pointsDiscount + shippingFee)
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                        <span
                                            className={`${styles.collapseIcon} ${
                                                isSummaryCollapsed ? '' : styles.rotated
                                            }`}
                                        >
                                            ▼
                                        </span>
                                    </div>

                                    {/* 桌面版標題 - 只在 992px 以上顯示 */}
                                    <div className={styles.desktopSummaryTitle}>
                                        <div className={styles.sectionTitle}>
                                            <h6 className={styles.sectionTitleText}>商品明細</h6>
                                        </div>
                                    </div>
                                    {/* 收合式內容容器 */}
                                    <div
                                        className={`${styles.collapsibleSummaryContent} ${
                                            !isSummaryCollapsed ? styles.expanded : ''
                                        }`}
                                    >
                                        {/* 商品明細內容 */}
                                        {/* 分隔線 (Figma PropertyDefault) */}
                                        <div className={styles.property1Default}>
                                            <hr className={styles.sectionDivider} />
                                        </div>

                                        {/* 選中商品列表 */}
                                        <div className={styles.selectedItemsView}>
                                            {checkoutItems.map((item, index) => (
                                                <div key={item.id || item.vinyl_id || `item-${index}`}>
                                                    <div
                                                        className={`${styles.selectedItemFrame} d-flex align-items-center`}
                                                    >
                                                        <Image
                                                            src={renderProductImage(item)}
                                                            alt={getProductName(item)}
                                                            width={40}
                                                            height={40}
                                                            className="me-3"
                                                            style={{ objectFit: 'cover' }}
                                                            unoptimized
                                                        />
                                                        <div className="flex-grow-1">
                                                            <div className={styles.itemNameSmall}>
                                                                {getProductName(item)}
                                                            </div>
                                                            <div className={styles.itemArtistSmall}>
                                                                {getProductArtist(item)}
                                                            </div>
                                                            <div className={`${styles.itemQuantitySmall} text-muted`}>
                                                                數量：{item.quantity}
                                                            </div>
                                                        </div>
                                                        <div className="d-flex align-items-center">
                                                            <div className={`${styles.itemPriceSmall} fw-bold me-2`}>
                                                                {/* 🎯 使用統一的價格獲取函數 */}
                                                                NT$
                                                                {(
                                                                    getProductPrice(item) * item.quantity
                                                                ).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* 商品間分隔線 */}
                                                    {index < checkoutItems.length - 1 && (
                                                        <div className={styles.propertyDefaultInstance}>
                                                            <hr className={styles.sectionDivider} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* 分隔線 */}
                                        <div className={styles.propertyDefaultInstance}>
                                            <hr className={styles.sectionDivider} />
                                        </div>

                                        {/* 付款方式圖標 */}
                                        <div className={styles.paymentMethodsSection}>
                                            <div
                                                className={`${styles.paymentIconsContainer} d-flex align-items-center`}
                                            >
                                                <Image
                                                    src="/images/payment/mastercard.svg"
                                                    alt="Mastercard"
                                                    width={50}
                                                    height={50}
                                                    className={`${styles.paymentIconImg} me-2`}
                                                    unoptimized
                                                />
                                                <Image
                                                    src="/images/payment/visa.svg"
                                                    alt="Visa"
                                                    width={50}
                                                    height={50}
                                                    className={`${styles.paymentIconImg} me-2`}
                                                    unoptimized
                                                />
                                                <Image
                                                    src="/images/payment/jcb.svg"
                                                    alt="JCB"
                                                    width={50}
                                                    height={50}
                                                    className={`${styles.paymentIconImg} me-2`}
                                                    unoptimized
                                                />
                                                <Image
                                                    src="/images/payment/linepay.svg"
                                                    alt="LINE Pay"
                                                    width={50}
                                                    height={50}
                                                    className={`${styles.paymentIconImg} me-2`}
                                                    unoptimized
                                                />
                                                <Image
                                                    src="/images/payment/ecpay.svg"
                                                    alt="綠界科技"
                                                    width={50}
                                                    height={50}
                                                    className={`${styles.paymentIconImg} me-2`}
                                                    unoptimized
                                                />
                                            </div>
                                            <div className={styles.paymentMethodsDescription}>
                                                <div className={styles.paymentSupportText}>支援以上付款方式</div>
                                            </div>
                                        </div>

                                        {/* 分隔線 */}
                                        <div className={styles.propertyDefaultInstance}>
                                            <hr className={styles.sectionDivider} />
                                        </div>

                                        {/* 優惠券區域 */}
                                        <div className={styles.frameWrapper}>
                                            <div className={styles.couponSection}>
                                                <label className={styles.couponLabel}>優惠代碼</label>

                                                {/* 優惠券代碼輸入 */}
                                                <div className={styles.couponInputRow}>
                                                    <input
                                                        type="text"
                                                        className={styles.couponInput}
                                                        placeholder="請輸入優惠券代碼"
                                                        value={couponCode}
                                                        onChange={(e) => setCouponCode(e.target.value)}
                                                        disabled={loading}
                                                    />
                                                    <button
                                                        className={styles.couponApplyButton}
                                                        onClick={handleCouponCodeApply}
                                                        disabled={loading}
                                                    >
                                                        套用
                                                    </button>
                                                </div>

                                                {/* 選擇優惠券連結 */}
                                                <div className={styles.couponSelectLinkContainer}>
                                                    <button
                                                        className={styles.couponSelectLink}
                                                        onClick={handleShowCouponModal}
                                                        disabled={loading}
                                                    >
                                                        選擇優惠券
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 點數設定區域 */}
                                        <div className={styles.frameWrapper}>
                                            <div className={styles.pointsSection}>
                                                <label className={styles.pointsLabel}>點數折扣</label>

                                                <div className={styles.pointsInputRow}>
                                                    <div className={styles.pointsInputWrapper}>
                                                        {pointsInput !== '' && (
                                                            <button
                                                                className={styles.pointsClearBtn}
                                                                onClick={() => {
                                                                    setPointsInput('')
                                                                    setPointsToUse(0)
                                                                    setPointsDiscount(0)
                                                                }}
                                                                type="button"
                                                                disabled={loading}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                        <input
                                                            type="number"
                                                            className={`${styles.pointsInput} ${
                                                                pointsInput !== '' ? styles.hasValue : ''
                                                            }`}
                                                            placeholder="輸入要使用的點數"
                                                            value={pointsInput}
                                                            onChange={(e) => handlePointsChange(e.target.value)}
                                                            onFocus={(e) => {
                                                                setIsPointsInputFocused(true)
                                                                e.target.select()
                                                            }}
                                                            onBlur={() => setIsPointsInputFocused(false)}
                                                            max={syncAvailablePoints}
                                                            min={0}
                                                            title={`輸入要使用的點數（最多 ${syncAvailablePoints.toLocaleString()} 點）`}
                                                            disabled={loading}
                                                        />
                                                    </div>
                                                    <button
                                                        className={styles.pointsApplyButton}
                                                        onClick={handleApplyPoints}
                                                        disabled={pointsInput === '' || pointsInput === '0' || loading}
                                                        title={`套用 ${pointsInput || 0} 點數折扣`}
                                                    >
                                                        套用
                                                    </button>
                                                </div>

                                                {/* 快速設定按鈕 */}
                                                <div className={styles.pointsQuickSet}>
                                                    <span className={styles.quickSetLabel}>快速設定：</span>
                                                    <button
                                                        className={styles.quickSetBtn}
                                                        onClick={() => handleQuickSetPoints(1000)}
                                                        disabled={getMaxUsablePoints() < 1000 || loading}
                                                    >
                                                        1,000點
                                                    </button>
                                                    <button
                                                        className={styles.quickSetBtn}
                                                        onClick={() => handleQuickSetPoints(5000)}
                                                        disabled={getMaxUsablePoints() < 5000 || loading}
                                                    >
                                                        5,000點
                                                    </button>
                                                    <button
                                                        className={styles.quickSetBtn}
                                                        onClick={() => handleQuickSetPoints(getMaxUsablePoints())}
                                                        disabled={getMaxUsablePoints() === 0 || loading}
                                                    >
                                                        全部使用
                                                    </button>
                                                </div>

                                                <div className={styles.pointsInfoContainer}>
                                                    <div className={styles.pointsInfo}>
                                                        紅利點數：剩餘
                                                        <span
                                                            className={`${styles.pointsNumber} ${
                                                                pointsToUse > 0 ? styles.pointsChanging : ''
                                                            }`}
                                                        >
                                                            {(syncAvailablePoints - pointsToUse).toLocaleString()}
                                                        </span>
                                                        點
                                                        <span className={styles.pointsMaxInfo}>
                                                            （最多可用: {getMaxUsablePoints().toLocaleString()} 點）
                                                        </span>
                                                    </div>
                                                    {pointsToUse > 0 && (
                                                        <div className={styles.pointsDiscountPreview}>
                                                            已套用 {pointsToUse.toLocaleString()} 點數，折抵 NT${' '}
                                                            {pointsDiscount.toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 分隔線 */}
                                        <div className={styles.propertyDefaultInstance}>
                                            <hr className={styles.sectionDivider} />
                                        </div>

                                        {/* 價格明細框架 */}
                                        <div className={styles.cartPriceSummary}>
                                            <div className={styles.priceRow}>
                                                <div className={styles.priceLabel}>小計：</div>
                                                <div className={styles.priceValue}>NT${subtotal.toLocaleString()}</div>
                                            </div>

                                            {couponDiscount > 0 && (
                                                <div className={styles.priceRow}>
                                                    <div className={styles.discountWrapper}>
                                                        <div className={styles.priceLabel}>優惠券折抵：</div>
                                                    </div>

                                                    <div className={styles.discountWrapper}>
                                                        <div className={styles.discountDescription}>
                                                            {selectedCoupon === 'code-applied'
                                                                ? syncAvailableCoupons.find(
                                                                      (c) => c.code === couponCode
                                                                  )?.name || '優惠代碼'
                                                                : syncAvailableCoupons.find(
                                                                      (c) => c.id === parseInt(selectedCoupon, 10)
                                                                  )?.name || '優惠券'}
                                                            {/* selectedCoupon 是字符串（來自 HTML select 的 value）
                            coupon.id 是數字（來自 couponData.js）所以需要使用
                            parseInt() 進行類型轉換 */}
                                                            <br />
                                                            (-NT${couponDiscount.toLocaleString()})
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {pointsDiscount > 0 && (
                                                <div className={styles.priceRow}>
                                                    <div className={styles.priceLabel}>點數折抵：</div>
                                                    <div className={styles.priceValue}>
                                                        {pointsToUse.toLocaleString()}點（-NT$
                                                        {pointsDiscount.toLocaleString()}）
                                                    </div>
                                                </div>
                                            )}

                                            <div className={styles.priceRow}>
                                                <div className={styles.priceLabel}>運費：</div>
                                                <div className={styles.priceValue}>
                                                    NT${shippingFee.toLocaleString()}
                                                </div>
                                            </div>

                                            <div className={styles.priceRow}>
                                                <div className={styles.totalLabel}>合計：</div>

                                                <p className={styles.totalAmount}>
                                                    <span className={styles.currencySymbol}>NT</span>

                                                    <span className={styles.totalPrice}>
                                                        $
                                                        {Math.max(
                                                            0,
                                                            Math.round(
                                                                subtotal - couponDiscount - pointsDiscount + shippingFee
                                                            )
                                                        ).toLocaleString()}
                                                    </span>
                                                </p>
                                            </div>

                                            {/* 🚀 新增：點數回饋顯示 */}
                                            {(() => {
                                                const totalAmount = Math.max(
                                                    0,
                                                    Math.round(subtotal - couponDiscount - pointsDiscount + shippingFee)
                                                )
                                                const pointsReward = Math.floor(totalAmount / 10)

                                                if (pointsReward > 0) {
                                                    return (
                                                        <div className={styles.pointsRewardRow}>
                                                            <div className={styles.pointsRewardLabel}>
                                                                本次回饋點數：
                                                            </div>
                                                            <div className={styles.pointsRewardValue}>
                                                                {pointsReward} 點
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            })()}

                                            <div className={styles.taxNotice}>※本訂單金額已含稅</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 地址選擇器彈出視窗 */}
            <AddressSelector
                isOpen={showAddressSelector}
                onClose={closeAddressSelector}
                addresses={addresses}
                onSelectAddress={handleAddressSelect}
                currentAddress={selectedAddress}
                loading={addressesLoading}
            />

            {/* 優惠券選擇 Modal */}
            <CouponSelectModal
                isOpen={showCouponModal}
                onClose={handleCloseCouponModal}
                availableCoupons={syncAvailableCoupons}
                onSelectCoupon={handleModalCouponSelect}
                loading={loading}
            />

            {/* 訂單預覽 Modal */}
            <OrderPreviewModal
                isOpen={showOrderPreview}
                onClose={() => setShowOrderPreview(false)}
                onConfirm={handleOrderPreviewConfirm}
                orderData={null}
                paymentMethod={previewPaymentMethod}
                checkoutItems={checkoutItems}
                subtotal={subtotal}
                couponDiscount={couponDiscount}
                pointsDiscount={pointsDiscount}
                shippingFee={100}
                selectedAddress={selectedAddress}
                store711={store711}
                formData={formData}
            />

            {/* LINE Pay 確認 Modal */}
            <LinePayConfirmModal
                isOpen={showLinepayConfirm}
                onClose={handleLinepayCancel}
                onConfirm={handleLinepayConfirm}
                orderData={linepayOrderData}
            />

            {/* ECPay 確認 Modal */}
            <EcPayConfirmModal
                isOpen={showEcpayConfirm}
                onClose={handleEcpayCancel}
                onConfirm={handleEcpayConfirm}
                orderData={ecpayOrderData}
            />
        </div>
    )
}
