'use client'

import { useState, useEffect } from 'react'
import { UserEditForm } from './UserEditForm'
import { UserEditActionButtons } from './UserEditActionButtons'
import styles from './UserEdit.module.css'

export const UserEditModal = ({ 
  isOpen, 
  user, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    phone: '',
    email: '',
    gender: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    level: '',
    points: 0,
    status: 'active'
  })
  
  const [originalData, setOriginalData] = useState(null)
  const [isModified, setIsModified] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  // 當用戶資料載入時，更新表單資料
  useEffect(() => {
    if (user && isOpen) {
      // 處理生日欄位 - 將 YYYY-MM-DD 格式轉換為年、月、日
      let birthYear = '', birthMonth = '', birthDay = ''
      if (user.birthday) {
        const birthdayParts = user.birthday.split('-')
        if (birthdayParts.length === 3) {
          birthYear = birthdayParts[0]
          birthMonth = birthdayParts[1]
          birthDay = birthdayParts[2]
        }
      }

      const newFormData = {
        name: user.name || '',
        nickname: user.nickname || '',
        phone: user.phone || '',
        email: user.email || '',
        gender: user.gender || '',
        birthYear,
        birthMonth,
        birthDay,
        level: user.level || '',
        points: user.points || 0,
        status: user.status || 'active'
      }

      setFormData(newFormData)
      setOriginalData(newFormData)
      setIsModified(false)
      setValidationErrors({})
    }
  }, [user, isOpen])

  // 檢查是否有修改
  useEffect(() => {
    if (originalData) {
      const hasChanges = Object.keys(formData).some((key) => {
        // 特殊處理生日欄位
        if (key === 'birthYear' || key === 'birthMonth' || key === 'birthDay') {
          const currentBirthday = formData.birthYear && formData.birthMonth && formData.birthDay
            ? `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`
            : null
          const originalBirthday = originalData.birthYear && originalData.birthMonth && originalData.birthDay
            ? `${originalData.birthYear}-${originalData.birthMonth}-${originalData.birthDay}`
            : null
          return currentBirthday !== originalBirthday
        }
        return formData[key] !== originalData[key]
      })
      setIsModified(hasChanges)
    }
  }, [formData, originalData])

  const handleInputChange = (field, value) => {
    let processedValue = value

    // 手機號碼自動格式化為 09xx-xxxxxx 格式
    if (field === 'phone') {
      const digits = value.replace(/\D/g, '')
      const limitedDigits = digits.slice(0, 10)

      // 確保以 09 開頭
      if (limitedDigits.length >= 2 && limitedDigits.slice(0, 2) !== '09') {
        processedValue = '09' + limitedDigits.slice(2)
      } else {
        processedValue = limitedDigits
      }

      // 格式化為 09xx-xxxxxx
      if (processedValue.length >= 4) {
        processedValue = `${processedValue.slice(0, 4)}-${processedValue.slice(4)}`
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))

    // 清除該欄位的驗證錯誤
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // 表單驗證
  const validateForm = () => {
    const errors = {}

    // 必填欄位驗證
    if (!formData.name.trim()) {
      errors.name = '姓名為必填欄位'
    }

    // 暱稱驗證
    if (formData.nickname && formData.nickname.trim().length > 20) {
      errors.nickname = '暱稱不能超過20個字元'
    }

    if (!formData.phone.trim()) {
      errors.phone = '手機號碼為必填欄位'
    } else {
      const phoneDigits = formData.phone.replace(/\D/g, '')
      if (!/^09\d{8}$/.test(phoneDigits)) {
        errors.phone = '請輸入正確的手機號碼格式 (09xx-xxxxxx)'
      }
    }

    // 信箱格式驗證
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '請輸入正確的信箱格式'
    }

    // 生日驗證
    if (formData.birthYear || formData.birthMonth || formData.birthDay) {
      if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
        errors.birthday = '請完整填寫生日資訊'
      } else {
        const birthDate = new Date(formData.birthYear, formData.birthMonth - 1, formData.birthDay)
        const today = new Date()
        if (birthDate > today) {
          errors.birthday = '生日不能是未來日期'
        }
      }
    }

            // 移除點數驗證，因為點數欄位不可修改

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

      // 準備更新資料
    const prepareUpdateData = () => {
        let birthday = null
        if (formData.birthYear && formData.birthMonth && formData.birthDay) {
            birthday = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`
        }

        const updateData = {
            name: formData.name.trim(),
            nickname: formData.nickname.trim(),
            email: formData.email.trim(),
            phone: formData.phone,
            gender: formData.gender,
            birthday: birthday,
            status: formData.status
            // 移除 level 和 points，因為這些欄位不可修改
        }

        // 只保留真正有變更的欄位
        const changedFields = {}
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === '' || updateData[key] === null) {
                return // 跳過空值
            }

            // 比較原始資料和當前資料
            let originalValue = originalData[key]

            // 特殊處理生日欄位
            if (key === 'birthday') {
                const originalBirthday = originalData.birthYear && originalData.birthMonth && originalData.birthDay
                    ? `${originalData.birthYear}-${originalData.birthMonth}-${originalData.birthDay}`
                    : null
                originalValue = originalBirthday
            }

            // 只有當值真正改變時才加入更新資料
            if (updateData[key] !== originalValue) {
                changedFields[key] = updateData[key]
            }
        })

        return changedFields
    }

  // 獲取變更的欄位名稱（用於顯示）
  const getChangedFieldNames = () => {
    const updateData = prepareUpdateData()
    const fieldNameMap = {
      name: '姓名',
      nickname: '暱稱',
      email: '聯絡信箱',
      phone: '手機號碼',
      gender: '性別',
      birthday: '生日',
      status: '狀態'

    }

    return Object.keys(updateData).map(field => fieldNameMap[field] || field)
  }

  const handleSave = async () => {
    if (!validateForm()) {
      alert('請檢查表單錯誤')
      return
    }

    // 檢查是否有實際變更
    const updateData = prepareUpdateData()
    const changedFieldNames = getChangedFieldNames()
    
    if (Object.keys(updateData).length === 0) {
      alert('沒有需要更新的資料')
      return
    }

    if (!confirm(`確定要儲存以下修改嗎？\n變更的欄位：${changedFieldNames.join('、')}`)) {
      return
    }

    setIsSaving(true)
    
    try {
      const result = await onSave(user.id, updateData)
      
      if (result.success) {
        alert(`更新成功！\n更新的欄位：${changedFieldNames.join('、')}`)
        onClose()
      } else {
        alert(`儲存失敗：${result.message}`)
      }
    } catch (error) {
      alert(`儲存失敗：${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (isModified && confirm('確定要取消修改嗎？未儲存的修改將會遺失。')) {
      onClose()
    } else {
      onClose()
    }
  }

  const handleReset = () => {
    if (confirm('確定要重置表單嗎？所有修改將會遺失。')) {
      setFormData(originalData)
      setIsModified(false)
      setValidationErrors({})
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>編輯會員資料</h2>
          <button 
            className={styles.closeButton}
            onClick={handleCancel}
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <UserEditForm 
            formData={formData}
            validationErrors={validationErrors}
            onInputChange={handleInputChange}
          />
        </div>

        <div className={styles.modalFooter}>
          <UserEditActionButtons 
            isModified={isModified}
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={handleCancel}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  )
}
