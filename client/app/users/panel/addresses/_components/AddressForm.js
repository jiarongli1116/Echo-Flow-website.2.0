import { useState, useEffect } from 'react'
import styles from '@/app/users/panel/_components/UserPanel.module.css'
import { getCities, getDistricts, getZipcode } from './taiwanRegions'

export default function AddressForm({
    address = null,
    onSubmit,
    onCancel,
    loading = false,
    addresses = [], // 新增 addresses 參數
}) {
    const [formData, setFormData] = useState({
        zipcode: '',
        city: '',
        district: '',
        address: '',
        recipient_name: '',
        recipient_phone: '',
        isDefault: false,
    })

    const [availableDistricts, setAvailableDistricts] = useState([])
    const [phoneError, setPhoneError] = useState('') // 新增手機號碼錯誤狀態
    const cities = getCities()

    // 計算當前地址總數和預設地址數
    const addressesArray = Array.isArray(addresses) ? addresses : []
    const totalAddresses = addressesArray.length
    const defaultAddressesCount = addressesArray.filter((addr) => addr.isDefault).length
    const isOnlyAddress = totalAddresses === 1
    const isOnlyDefaultAddress = defaultAddressesCount === 1 && address?.isDefault

    // 如果是編輯模式，初始化表單數據
    useEffect(() => {
        if (address) {
            // 先設定縣市和區域選項
            if (address.city) {
                const districts = getDistricts(address.city)
                setAvailableDistricts(districts)
            }

            // 計算郵遞區號
            let zipcode = address.zipcode || ''
            if (address.city && address.district && !zipcode) {
                zipcode = getZipcode(address.city, address.district)
            }

            // 設定表單資料
            setFormData({
                zipcode: zipcode,
                city: address.city || '',
                district: address.district || '',
                address: address.address || '',
                recipient_name: address.recipient_name || '',
                recipient_phone: address.recipient_phone || '',
                isDefault: address.isDefault || false,
            })

            // 清除手機號碼錯誤狀態
            setPhoneError('')
        } else {
            // 如果是新增模式，清空表單
            setFormData({
                zipcode: '',
                city: '',
                district: '',
                address: '',
                recipient_name: '',
                recipient_phone: '',
                isDefault: totalAddresses === 0, // 如果沒有地址，第一個自動設為預設
            })
            setAvailableDistricts([])

            // 清除手機號碼錯誤狀態
            setPhoneError('')
        }
    }, [address, totalAddresses])

    // 當縣市改變時，更新區域選項並清空區域和郵遞區號
    useEffect(() => {
        // 只有在非編輯模式或縣市確實改變時才執行
        if (formData.city) {
            const districts = getDistricts(formData.city)
            setAvailableDistricts(districts)

            // 只有在用戶主動改變縣市時才清空區域和郵遞區號
            // 避免在編輯模式初始化時清空資料
            if (!address || formData.city !== address.city) {
                setFormData((prev) => ({
                    ...prev,
                    district: '',
                    zipcode: '',
                }))
            }
        } else {
            setAvailableDistricts([])
        }
    }, [formData.city, address])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target

        if (name === 'city') {
            // 縣市改變時，清空區域和郵遞區號
            setFormData((prev) => ({
                ...prev,
                city: value,
                district: '',
                zipcode: '',
            }))
        } else if (name === 'district') {
            // 區域改變時，自動填入郵遞區號
            const zipcode = getZipcode(formData.city, value)
            setFormData((prev) => ({
                ...prev,
                district: value,
                zipcode: zipcode,
            }))
        } else if (name === 'recipient_phone') {
            // 手機號碼處理 - 簡化版本
            const filteredValue = value.replace(/[^\d-]/g, '')
            const limitedValue = filteredValue.slice(0, 11)

            // 即時驗證手機號碼格式
            let errorMessage = ''
            const phoneDigits = limitedValue.replace(/\D/g, '')

            // 驗證邏輯
            if (limitedValue.length > 0) {
                // 檢查是否包含非數字字符（除了連字符）
                if (limitedValue.replace(/[\d-]/g, '').length > 0) {
                    errorMessage = '手機號碼只能包含數字和連字符'
                }
                // 檢查連字符格式（優先檢查）
                else if (limitedValue.includes('-')) {
                    const parts = limitedValue.split('-')
                    if (parts.length !== 2) {
                        errorMessage = '連字符格式錯誤，應為：09xx-xxxxxx'
                    } else if (parts[0].length !== 4 || parts[1].length !== 6) {
                        errorMessage = '請使用正確的格式：09xx-xxxxxx'
                    } else if (parts[0].slice(0, 2) !== '09') {
                        errorMessage = '手機號碼必須以 09 開頭'
                    }
                }
                // 檢查是否以 09 開頭
                else if (phoneDigits.length >= 2 && phoneDigits.slice(0, 2) !== '09') {
                    errorMessage = '手機號碼必須以 09 開頭'
                }
                // 檢查長度
                else if (phoneDigits.length > 0 && phoneDigits.length < 10) {
                    errorMessage = '手機號碼必須是 10 位數字'
                }
                // 檢查完整格式
                else if (phoneDigits.length === 10) {
                    if (!/^09\d{8}$/.test(phoneDigits)) {
                        errorMessage = '請輸入正確的手機號碼格式 (09xx-xxxxxx)'
                    } else {
                        // 檢查是否需要格式化
                        const expectedFormat = `${phoneDigits.slice(0, 4)}-${phoneDigits.slice(4)}`
                        if (limitedValue === phoneDigits) {
                            errorMessage = '請使用正確的格式：09xx-xxxxxx'
                        }
                    }
                }
                // 檢查是否超過10位
                else if (phoneDigits.length > 10) {
                    errorMessage = '手機號碼不能超過 10 位數字'
                }
            }

            setPhoneError(errorMessage)

            setFormData((prev) => ({
                ...prev,
                [name]: limitedValue,
            }))
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
            }))
        }
    }

    // 表單驗證
    const validateForm = () => {
        const errors = {}

        // 必填欄位驗證
        if (!formData.recipient_name.trim()) {
            errors.recipient_name = '收件人姓名為必填欄位'
        }

        if (!formData.recipient_phone.trim()) {
            errors.recipient_phone = '手機號碼為必填欄位'
        } else {
            const phoneDigits = formData.recipient_phone.replace(/\D/g, '')
            // 驗證格式：09 + 8位數字 = 10位總長度
            if (!/^09\d{8}$/.test(phoneDigits)) {
                errors.recipient_phone = '請輸入正確的手機號碼格式 (09xx-xxxxxx)'
            }
        }

        if (!formData.zipcode.trim()) {
            errors.zipcode = '郵遞區號為必填欄位'
        }

        if (!formData.city) {
            errors.city = '請選擇縣市'
        }

        if (!formData.district) {
            errors.district = '請選擇區域'
        }

        if (!formData.address.trim()) {
            errors.address = '詳細地址為必填欄位'
        }

        return errors
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        // 檢查手機號碼錯誤
        if (phoneError) {
            alert('請修正手機號碼格式錯誤')
            return
        }

        // 執行表單驗證
        const errors = validateForm()

        if (Object.keys(errors).length > 0) {
            return
        }

        // 確保至少有一個預設地址的邏輯
        let finalFormData = { ...formData }

        if (address) {
            // 編輯模式
            if (isOnlyAddress && !formData.isDefault) {
                // 如果這是唯一的地址且用戶要取消預設，不允許
                alert('至少需要保留一個預設地址，無法取消預設設定')
                return
            }

            // 只發送實際改變的欄位，避免不必要的更新
            const changedFields = {}
            let hasChanges = false

            // 檢查哪些欄位有實際改變 - 使用嚴格比較，避免類型不匹配
            if (String(formData.zipcode || '') !== String(address.zipcode || '')) {
                changedFields.zipcode = formData.zipcode
                hasChanges = true
            }

            if (String(formData.city || '') !== String(address.city || '')) {
                changedFields.city = formData.city
                hasChanges = true
            }

            if (String(formData.district || '') !== String(address.district || '')) {
                changedFields.district = formData.district
                hasChanges = true
            }

            if (String(formData.address || '') !== String(address.address || '')) {
                changedFields.address = formData.address
                hasChanges = true
            }

            if (String(formData.recipient_name || '') !== String(address.recipient_name || '')) {
                changedFields.recipient_name = formData.recipient_name
                hasChanges = true
            }

            if (String(formData.recipient_phone || '') !== String(address.recipient_phone || '')) {
                changedFields.recipient_phone = formData.recipient_phone
                hasChanges = true
            }

            // 只有當 isDefault 明確改變時才更新
            // 將布林值轉換為數字進行比較，避免類型不匹配
            const originalIsDefault = address.isDefault ? 1 : 0
            const formIsDefault = formData.isDefault ? 1 : 0

            if (formIsDefault !== originalIsDefault) {
                changedFields.isDefault = formData.isDefault
                hasChanges = true
            }

            // 如果沒有實際改變，提示用戶
            if (!hasChanges) {
                alert('沒有檢測到任何改變，請修改後再提交')
                return
            }

            // 使用改變的欄位作為最終數據
            finalFormData = changedFields
        } else {
            // 新增模式
            if (totalAddresses === 0) {
                // 如果是第一個地址，強制設為預設
                finalFormData.isDefault = true
            } else if (totalAddresses > 0 && !formData.isDefault && defaultAddressesCount === 0) {
                // 如果已有地址但沒有預設地址，且新地址不設為預設，則強制設為預設
                finalFormData.isDefault = true
            }
        }

        onSubmit(finalFormData)
    }

    const isEditing = !!address

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>{isEditing ? '編輯地址' : '新增地址'}</h3>

                <form onSubmit={handleSubmit} className={styles.addressForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="recipient_name" className={styles.formLabel}>
                            收件人姓名 *
                        </label>
                        <input
                            type="text"
                            id="recipient_name"
                            name="recipient_name"
                            value={formData.recipient_name}
                            onChange={handleChange}
                            className={styles.formInput}
                            required
                            disabled={loading}
                            maxLength="50"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="recipient_phone" className={styles.formLabel}>
                            手機號碼 *
                        </label>
                        <input
                            type="tel"
                            id="recipient_phone"
                            name="recipient_phone"
                            value={formData.recipient_phone}
                            onChange={handleChange}
                            className={styles.formInput}
                            required
                            disabled={loading}
                            maxLength="11"
                            placeholder="請輸入手機號碼，格式為09xx-xxxxxx"
                        />
                        {phoneError && (
                            <div
                                style={{
                                    color: 'red',
                                    fontSize: '0.8rem',
                                    marginTop: '0.2rem',
                                    padding: '0.3rem',
                                }}
                            >
                                ⚠️ {phoneError}
                            </div>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="zipcode" className={styles.formLabel}>
                            郵遞區號 *
                        </label>
                        <input
                            type="text"
                            id="zipcode"
                            name="zipcode"
                            value={formData.zipcode}
                            onChange={handleChange}
                            className={styles.formInput}
                            required
                            disabled={loading}
                            maxLength="10"
                            readOnly
                            placeholder="選擇縣市和區域後自動填入"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="city" className={styles.formLabel}>
                            縣市 *
                        </label>
                        <select
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className={styles.formSelect}
                            required
                            disabled={loading}
                        >
                            <option value="">請選擇縣市</option>
                            {cities.map((city) => (
                                <option key={city} value={city}>
                                    {city}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="district" className={styles.formLabel}>
                            區域 *
                        </label>
                        <select
                            id="district"
                            name="district"
                            value={formData.district}
                            onChange={handleChange}
                            className={styles.formSelect}
                            required
                            disabled={loading || !formData.city}
                        >
                            <option value="">請選擇區域</option>
                            {availableDistricts.map((district) => (
                                <option key={district} value={district}>
                                    {district}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="address" className={styles.formLabel}>
                            詳細地址 *
                        </label>
                        <textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className={styles.formTextarea}
                            rows="3"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                name="isDefault"
                                checked={formData.isDefault}
                                onChange={handleChange}
                                disabled={loading || (address && isOnlyAddress && formData.isDefault)}
                            />
                            <span>設為預設地址</span>
                            {address && isOnlyAddress && formData.isDefault && (
                                <span
                                    style={{
                                        color: '#666',
                                        fontSize: '0.9rem',
                                        marginLeft: '0.5rem',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    (至少需要保留一個預設地址)
                                </span>
                            )}
                        </label>
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" onClick={onCancel} className={styles.cancelBtn} disabled={loading}>
                            取消
                        </button>
                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? '處理中...' : isEditing ? '更新' : '新增'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
