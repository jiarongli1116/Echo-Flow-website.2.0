'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { buildApiUrl } from '../../../config/api'

export default function useRegister() {
    const [formData, setFormData] = useState({
        name: '',
        account: '', // 主要帳號（信箱）
        password: '',
        confirmPassword: '',
        phone: '',
        birthday: '',
        gender: '',
    })

    const [errors, setErrors] = useState({})
    const [isLoading, setIsLoading] = useState(false)
    const [submitError, setSubmitError] = useState('')

    // 帳號驗證相關狀態
    const [isAccountVerified, setIsAccountVerified] = useState(false)
    const [isSendingCode, setIsSendingCode] = useState(false)
    const [verificationCode, setVerificationCode] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [verificationError, setVerificationError] = useState('')

    // 倒數計時相關狀態
    const [countdown, setCountdown] = useState(0)
    const [isCountdownActive, setIsCountdownActive] = useState(false)

    // 成功訊息狀態
    const [successMessage, setSuccessMessage] = useState({ type: '', text: '' })

    // 錯誤訊息狀態（用於顯示發送驗證碼的錯誤）
    const [errorMessage, setErrorMessage] = useState({ type: '', text: '' })

    // 註冊成功狀態（用於顯示彈跳視窗）
    const [registrationSuccess, setRegistrationSuccess] = useState(false)

    const router = useRouter()

    // 倒數計時效果
    useEffect(() => {
        let timer = null
        if (isCountdownActive && countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(countdown - 1)
            }, 1000)
        } else if (countdown === 0 && isCountdownActive) {
            setIsCountdownActive(false)
        }
        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [countdown, isCountdownActive])

    // 驗證帳號格式
    const validateAccount = useCallback((account) => {
        if (!account) {
            return '請輸入帳號'
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
            return '請輸入正確的信箱格式'
        }
        return ''
    }, [])

    // 檢查帳號是否已被使用（不發送驗證碼）
    const checkAccountAvailability = useCallback(async (account) => {
        if (!account || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
            return ''
        }

        try {
            // 只檢查帳號是否已被使用，不發送驗證碼
            const response = await fetch(buildApiUrl('/users'), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                // 如果無法檢查，不顯示錯誤，讓用戶可以嘗試發送驗證碼
                return ''
            }

            const data = await response.json()

            // 檢查返回的用戶列表中是否有相同的帳號
            if (data.data && Array.isArray(data.data)) {
                const existingUser = data.data.find((user) => user.account === account)
                if (existingUser) {
                    return '此帳號已被使用'
                }
            }

            return ''
        } catch (error) {
            console.error('檢查帳號可用性錯誤:', error)
            // 網路錯誤時不顯示錯誤，避免誤導用戶
            return ''
        }
    }, [])

    // 發送驗證碼到帳號
    const sendVerificationCode = useCallback(async () => {
        // 檢查是否有帳號相關的錯誤（除了「請先驗證帳號」）
        if (errors.account && errors.account !== '請先驗證帳號') {
            return false
        }

        const accountError = validateAccount(formData.account)
        if (accountError) {
            setErrors((prev) => ({ ...prev, account: accountError }))
            return false
        }

        // 先檢查帳號是否已被使用
        const availabilityError = await checkAccountAvailability(formData.account)
        if (availabilityError) {
            setErrors((prev) => ({ ...prev, account: availabilityError }))
            return false
        }

        // 開始發送前先清除錯誤訊息，避免閃現
        setErrors((prev) => ({ ...prev, account: '' }))
        setIsSendingCode(true)

        try {
            const apiUrl = buildApiUrl('/users/send-verification')

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.account,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                // 顯示錯誤訊息
                setErrorMessage({
                    type: 'error',
                    text: data.message || '發送驗證碼失敗',
                })
                // 清除成功訊息
                setSuccessMessage({ type: '', text: '' })
                setIsSendingCode(false)
                return false
            }

            // 發送成功，清除帳號欄位的錯誤訊息
            setErrors((prev) => ({
                ...prev,
                account: '',
            }))

            // 顯示成功訊息
            setSuccessMessage({
                type: 'success',
                text: '驗證碼已發送到您的電子郵件',
            })
            // 清除錯誤訊息
            setErrorMessage({ type: '', text: '' })

            // 啟動30秒倒數計時
            setCountdown(30)
            setIsCountdownActive(true)

            setIsSendingCode(false)
            return true
        } catch (error) {
            console.error('發送驗證碼錯誤:', error)

            // 根據錯誤類型顯示不同的錯誤訊息
            let errorMessage = '發送驗證碼失敗，請稍後再試'

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = '無法連接到服務器，請檢查網絡連接'
            } else if (error.message) {
                errorMessage = error.message
            }

            // 顯示錯誤訊息
            setErrorMessage({
                type: 'error',
                text: errorMessage,
            })
            // 清除成功訊息
            setSuccessMessage({ type: '', text: '' })
            setIsSendingCode(false)
            return false
        }
    }, [formData.account, validateAccount, errors.account, checkAccountAvailability])

    // 驗證驗證碼
    const verifyAccount = useCallback(async () => {
        if (!verificationCode.trim()) {
            setVerificationError('請輸入驗證碼')
            return false
        }

        setIsVerifying(true)
        setVerificationError('')

        try {
            const response = await fetch(buildApiUrl('/users/verify-email'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.account,
                    verificationCode: verificationCode.trim(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setVerificationError(data.message || '驗證失敗')
                return false
            }

            // 驗證成功
            setIsAccountVerified(true)
            setVerificationError('')
            // 停止倒數計時，因為已經驗證成功，不需要再發送驗證碼
            setCountdown(0)
            setIsCountdownActive(false)
            return true
        } catch (error) {
            console.error('帳號驗證錯誤:', error)
            setVerificationError(error.message || '驗證失敗，請稍後再試')
            return false
        } finally {
            setIsVerifying(false)
        }
    }, [verificationCode, formData.account])

    // 表單驗證 - 使用與 use-user-form.js 相同的邏輯
    const validateForm = useCallback(() => {
        const newErrors = {}

        // 姓名驗證
        if (!formData.name.trim()) {
            newErrors.name = '姓名為必填欄位'
        } else if (formData.name.trim().length < 2) {
            newErrors.name = '姓名至少需要2個字元'
        }

        // 帳號驗證（必須已驗證）
        if (!formData.account) {
            newErrors.account = '請輸入帳號'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.account)) {
            newErrors.account = '請輸入正確的信箱格式'
        } else if (!isAccountVerified) {
            newErrors.account = '請先驗證帳號'
        }

        // 密碼驗證
        if (!formData.password) {
            newErrors.password = '請輸入密碼'
        } else if (formData.password.length < 6) {
            newErrors.password = '密碼至少需要6個字元'
        } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = '密碼必須包含字母和數字'
        }

        // 確認密碼驗證
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = '請確認密碼'
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = '兩次輸入的密碼不一致'
        }

        // 手機號碼驗證
        if (!formData.phone.trim()) {
            newErrors.phone = '手機號碼為必填欄位'
        } else {
            const phoneDigits = formData.phone.replace(/\D/g, '')
            if (!/^09\d{8}$/.test(phoneDigits)) {
                newErrors.phone = '請輸入正確的手機號碼格式 (09xx-xxxxxx)'
            }
        }

        // 生日驗證
        if (formData.birthday) {
            const birthDate = new Date(formData.birthday)
            const today = new Date()
            if (birthDate > today) {
                newErrors.birthday = '生日不能是未來日期'
            }
        } else {
            newErrors.birthday = '請選擇生日'
        }

        // 性別驗證
        if (!formData.gender) {
            newErrors.gender = '請選擇性別'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }, [formData, isAccountVerified])

    // 驗證單個欄位
    const validateField = useCallback(
        (field, value) => {
            let fieldError = ''

            switch (field) {
                case 'name':
                    if (!value.trim()) {
                        fieldError = '姓名為必填欄位'
                    } else if (value.trim().length < 2) {
                        fieldError = '姓名至少需要2個字元'
                    }
                    break

                case 'account':
                    if (!value) {
                        fieldError = '請輸入帳號'
                    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        fieldError = '請輸入正確的信箱格式'
                    } else if (!isAccountVerified) {
                        fieldError = '請先驗證帳號'
                    }
                    break

                case 'password':
                    if (!value) {
                        fieldError = '請輸入密碼'
                    } else if (value.length < 6) {
                        fieldError = '密碼至少需要6個字元'
                    } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
                        fieldError = '密碼必須包含字母和數字'
                    }
                    break

                case 'confirmPassword':
                    if (!value) {
                        fieldError = '請確認密碼'
                    } else if (formData.password !== value) {
                        fieldError = '兩次輸入的密碼不一致'
                    }
                    break

                case 'phone':
                    if (!value.trim()) {
                        fieldError = '手機號碼為必填欄位'
                    } else {
                        const phoneDigits = value.replace(/\D/g, '')
                        if (!/^09\d{8}$/.test(phoneDigits)) {
                            fieldError = '請輸入正確的手機號碼格式 (09xx-xxxxxx)'
                        }
                    }
                    break

                case 'birthday':
                    if (value) {
                        const birthDate = new Date(value)
                        const today = new Date()
                        if (birthDate > today) {
                            fieldError = '生日不能是未來日期'
                        }
                    } else {
                        fieldError = '請選擇生日'
                    }
                    break

                case 'gender':
                    if (!value) {
                        fieldError = '請選擇性別'
                    }
                    break

                default:
                    break
            }

            return fieldError
        },
        [formData.password, isAccountVerified]
    )

    // 更新表單數據
    const updateFormData = useCallback(
        (field, value) => {
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

            setFormData((prev) => ({
                ...prev,
                [field]: processedValue,
            }))

            // 清除該欄位的錯誤
            if (errors[field]) {
                setErrors((prev) => ({
                    ...prev,
                    [field]: '',
                }))
            }
        },
        [errors]
    )

    // 處理欄位失去焦點時的驗證
    const handleFieldBlur = useCallback(
        async (field, value) => {
            // 如果正在發送驗證碼，不執行任何驗證，避免干擾
            if (isSendingCode) {
                return
            }

            // 如果是帳號欄位且尚未驗證，只檢查格式，不檢查可用性
            if (field === 'account' && !isAccountVerified) {
                // 只檢查基本格式
                const formatError = validateAccount(value)
                setErrors((prev) => ({
                    ...prev,
                    [field]: formatError,
                }))
            } else {
                // 對於其他欄位或已驗證的帳號，使用正常的驗證邏輯
                const fieldError = validateField(field, value)
                setErrors((prev) => ({
                    ...prev,
                    [field]: fieldError,
                }))
            }
        },
        [validateField, validateAccount, isAccountVerified, isSendingCode]
    )

    // 完成註冊
    const submitRegistration = useCallback(async () => {
        if (!validateForm()) {
            return false
        }

        setIsLoading(true)
        setSubmitError('')

        try {
            const response = await fetch(buildApiUrl('/users'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    account: formData.account,
                    password: formData.password,
                    phone: formData.phone,
                    birthday: formData.birthday,
                    gender: formData.gender,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setSubmitError(data.message || '註冊失敗')
                return false
            }

            // 註冊成功，直接跳轉到登入頁面
            router.replace('/auth/login?registered=true')
            return true
        } catch (error) {
            console.error('註冊錯誤:', error)
            setSubmitError(error.message || '註冊失敗，請稍後再試')
            return false
        } finally {
            setIsLoading(false)
        }
    }, [formData, validateForm, router])

    // 重置表單
    const resetForm = useCallback(() => {
        setFormData({
            name: '',
            account: '',
            password: '',
            confirmPassword: '',
            phone: '',
            birthday: '',
            gender: '',
        })
        setErrors({})
        setSubmitError('')
        setIsAccountVerified(false)
        setVerificationCode('')
        setVerificationError('')
        setRegistrationSuccess(false)
        setCountdown(0)
        setIsCountdownActive(false)
        setSuccessMessage({ type: '', text: '' })
        setErrorMessage({ type: '', text: '' })
    }, [])

    return {
        formData,
        errors,
        isLoading,
        submitError,
        isAccountVerified,
        isSendingCode,
        verificationCode,
        isVerifying,
        verificationError,
        registrationSuccess,
        countdown,
        isCountdownActive,
        successMessage,
        errorMessage,
        updateFormData,
        handleFieldBlur,
        sendVerificationCode,
        verifyAccount,
        submitRegistration,
        resetForm,
        validateForm,
        setVerificationCode,
        setRegistrationSuccess,
        checkAccountAvailability,
    }
}
