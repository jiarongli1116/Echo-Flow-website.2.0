'use client'

import { useState, useEffect } from 'react'

export const useUserForm = (user) => {
    const [formData, setFormData] = useState({
        account: '',
        name: '',
        nickname: '',
        phone: '',
        email: '',
        gender: '',
        birthYear: '',
        birthMonth: '',
        birthDay: '',
    })

    const [originalData, setOriginalData] = useState(null)
    const [isModified, setIsModified] = useState(false)
    const [validationErrors, setValidationErrors] = useState({})

    // 轉換性別資料的函數
    const convertGender = (gender) => {
        if (!gender) return ''

        const genderMap = {
            male: '男',
            female: '女',
            other: '其他',
        }

        return genderMap[gender] || gender
    }

    // 當使用者資料載入時，更新表單資料
    useEffect(() => {
        if (user) {
            // 處理生日欄位 - 將 YYYY-MM-DD 格式轉換為年、月、日
            let birthYear = '',
                birthMonth = '',
                birthDay = ''
            if (user.birthday) {
                const birthdayParts = user.birthday.split('-')
                if (birthdayParts.length === 3) {
                    birthYear = birthdayParts[0]
                    birthMonth = birthdayParts[1]
                    birthDay = birthdayParts[2]
                }
            }

            const newFormData = {
                account: user.account || '',
                name: user.name || '',
                nickname: user.nickname || '',
                phone: user.phone || '',
                email: user.email || '',
                gender: convertGender(user.gender),
                birthYear,
                birthMonth,
                birthDay,
            }

            setFormData(newFormData)
            setOriginalData(newFormData)
            setIsModified(false)
            setValidationErrors({})
        }
    }, [user])

    // 檢查是否有修改
    useEffect(() => {
        if (originalData) {
            const hasChanges = Object.keys(formData).some((key) => {
                if (key === 'account') return false // 帳號不能修改，不納入比較

                // 特殊處理生日欄位
                if (
                    key === 'birthYear' ||
                    key === 'birthMonth' ||
                    key === 'birthDay'
                ) {
                    const currentBirthday =
                        formData.birthYear &&
                        formData.birthMonth &&
                        formData.birthDay
                            ? `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`
                            : null
                    const originalBirthday =
                        originalData.birthYear &&
                        originalData.birthMonth &&
                        originalData.birthDay
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
            if (
                limitedDigits.length >= 2 &&
                limitedDigits.slice(0, 2) !== '09'
            ) {
                processedValue = '09' + limitedDigits.slice(2)
            } else {
                processedValue = limitedDigits
            }

            // 格式化為 09xx-xxxxxx
            if (processedValue.length >= 4) {
                processedValue = `${processedValue.slice(
                    0,
                    4
                )}-${processedValue.slice(4)}`
            }
        }

        setFormData((prev) => ({
            ...prev,
            [field]: processedValue,
        }))

        // 清除該欄位的驗證錯誤
        if (validationErrors[field]) {
            setValidationErrors((prev) => ({
                ...prev,
                [field]: '',
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
            // 驗證格式：09 + 8位數字 = 10位總長度
            if (!/^09\d{8}$/.test(phoneDigits)) {
                errors.phone = '請輸入正確的手機號碼格式 (09xx-xxxxxx)'
            }
        }

        // 信箱格式驗證
        if (
            formData.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        ) {
            errors.email = '請輸入正確的信箱格式'
        }

        // 生日驗證
        if (formData.birthYear || formData.birthMonth || formData.birthDay) {
            if (
                !formData.birthYear ||
                !formData.birthMonth ||
                !formData.birthDay
            ) {
                errors.birthday = '請完整填寫生日資訊'
            } else {
                const birthDate = new Date(
                    formData.birthYear,
                    formData.birthMonth - 1,
                    formData.birthDay
                )
                const today = new Date()
                if (birthDate > today) {
                    errors.birthday = '生日不能是未來日期'
                }
            }
        }

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
        }

        // 只保留真正有變更的欄位
        const changedFields = {}
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === '' || updateData[key] === null) {
                return // 跳過空值
            }

            // 比較原始資料和當前資料
            let originalValue = originalData[key]

            // 特殊處理生日欄位
            if (key === 'birthday') {
                const originalBirthday =
                    originalData.birthYear &&
                    originalData.birthMonth &&
                    originalData.birthDay
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
        }

        return Object.keys(updateData).map(
            (field) => fieldNameMap[field] || field
        )
    }

    // 重置表單
    const resetForm = () => {
        setFormData(originalData)
        setIsModified(false)
        setValidationErrors({})
    }

    // 取消修改
    const cancelChanges = () => {
        if (isModified) {
            resetForm()
        }
    }

    // 更新成功後的處理
    const handleUpdateSuccess = () => {
        setOriginalData(formData)
        setIsModified(false)
    }

    return {
        formData,
        isModified,
        validationErrors,
        handleInputChange,
        validateForm,
        prepareUpdateData,
        getChangedFieldNames,
        resetForm,
        cancelChanges,
        handleUpdateSuccess,
    }
}
