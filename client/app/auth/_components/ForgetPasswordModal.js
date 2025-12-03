// 忘記密碼彈跳視窗組件
// 提供用戶重設密碼的功能，包含表單驗證和狀態管理

'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Form, Spinner, Row, Col } from 'react-bootstrap'
import styles from './Auth.module.css'

export default function ForgetPasswordModal({ show, onHide }) {
    // 當模態框顯示狀態改變時，重置所有狀態
    useEffect(() => {
        if (!show) {
            // 模態框關閉時重置所有狀態
            setStep(1)
            setEmail('')
            setOtp('')
            setNewPassword('')
            setConfirmPassword('')
            setMessage({ type: '', text: '' })
            setErrors({})
            setHash('')
            setExpiredAt(null)
            setCountdown(0)
            setCanResend(true)
            setOtpValidation({ status: '', message: '' })
            if (otpValidationTimeout) {
                clearTimeout(otpValidationTimeout)
                setOtpValidationTimeout(null)
            }
        }
    }, [show])
    // 狀態管理
    const [step, setStep] = useState(1) // 1: 輸入 email, 2: 輸入 OTP 和新密碼
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [errors, setErrors] = useState({})
    const [hash, setHash] = useState('')
    const [expiredAt, setExpiredAt] = useState(null)
    const [countdown, setCountdown] = useState(0)
    const [canResend, setCanResend] = useState(true)
    const [otpValidation, setOtpValidation] = useState({ status: '', message: '' })
    const [otpValidationTimeout, setOtpValidationTimeout] = useState(null)

    // 倒數計時器
    useEffect(() => {
        let timer
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000)
        } else {
            setCanResend(true)
        }
        return () => clearTimeout(timer)
    }, [countdown])

    // 關閉彈跳視窗並重置所有狀態
    const handleClose = () => {
        onHide()
    }

    // 表單驗證函數
    const validateEmailForm = () => {
        const newErrors = {}

        if (!email) {
            newErrors.email = '請輸入電子郵件地址'
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = '請輸入有效的電子郵件地址'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const validateOtpForm = () => {
        const newErrors = {}

        if (!otp) {
            newErrors.otp = '請輸入驗證碼'
        } else if (!/^\d{6}$/.test(otp)) {
            newErrors.otp = '驗證碼應為6位數字'
        }

        if (!newPassword) {
            newErrors.newPassword = '請輸入新密碼'
        } else if (newPassword.length < 6) {
            newErrors.newPassword = '密碼至少需要6個字元'
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = '請確認新密碼'
        } else if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = '兩次輸入的密碼不一致'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // 驗證 OTP 格式和正確性
    const validateOtpFormat = async (otpValue) => {
        if (!otpValue) {
            setOtpValidation({ status: '', message: '' })
            return
        }

        if (!/^\d{6}$/.test(otpValue)) {
            setOtpValidation({ status: 'error', message: '驗證碼應為6位數字' })
            return
        }

        // 如果格式正確，驗證驗證碼是否正確
        if (otpValue.length === 6) {
            try {
                const response = await fetch('http://localhost:3005/api/users/forgot-password/verify-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, otp: otpValue, hash }),
                })

                const data = await response.json()

                if (response.ok) {
                    setOtpValidation({ status: 'success', message: '驗證碼正確' })
                } else {
                    setOtpValidation({ status: 'error', message: data.message || '驗證碼錯誤' })
                }
            } catch (error) {
                setOtpValidation({ status: 'error', message: '驗證失敗，請稍後再試' })
            }
        }
    }

    // 處理 OTP 輸入變化
    const handleOtpChange = (e) => {
        const value = e.target.value
        setOtp(value)

        // 清除之前的定時器
        if (otpValidationTimeout) {
            clearTimeout(otpValidationTimeout)
        }

        // 如果輸入為空或格式不正確，立即顯示
        if (!value || !/^\d{6}$/.test(value)) {
            validateOtpFormat(value)
            return
        }

        // 如果格式正確，延遲 500ms 後驗證（防抖）
        const timeout = setTimeout(() => {
            validateOtpFormat(value)
        }, 500)

        setOtpValidationTimeout(timeout)
    }

    // 發送 OTP
    const handleSendOTP = async (e) => {
        e.preventDefault()

        if (!validateEmailForm()) {
            return
        }

        setIsLoading(true)
        setMessage({ type: '', text: '' })

        try {
            const response = await fetch('http://localhost:3005/api/users/forgot-password/otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: '驗證碼已發送到您的電子郵件',
                })
                setHash(data.data.hash)
                setExpiredAt(data.data.expiredAt)
                setStep(2)
                setCountdown(60)
                setCanResend(false)
            } else {
                setMessage({
                    type: 'error',
                    text: data.message || '發送失敗，請稍後再試',
                })
                if (data.remainingTime) {
                    setCountdown(data.remainingTime)
                    setCanResend(false)
                }
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: '發送失敗，請稍後再試',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // 重新發送 OTP
    const handleResendOTP = async () => {
        if (!canResend) return

        setIsLoading(true)
        setMessage({ type: '', text: '' })

        try {
            const response = await fetch('http://localhost:3005/api/users/forgot-password/otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: '驗證碼已重新發送',
                })
                setHash(data.data.hash)
                setExpiredAt(data.data.expiredAt)
                setCountdown(60)
                setCanResend(false)
            } else {
                setMessage({
                    type: 'error',
                    text: data.message || '發送失敗，請稍後再試',
                })
                if (data.remainingTime) {
                    setCountdown(data.remainingTime)
                    setCanResend(false)
                }
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: '發送失敗，請稍後再試',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // 重設密碼
    const handleResetPassword = async (e) => {
        e.preventDefault()

        if (!validateOtpForm()) {
            return
        }

        setIsLoading(true)
        setMessage({ type: '', text: '' })

        try {
            const response = await fetch('http://localhost:3005/api/users/forgot-password/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp, newPassword, hash }),
            })

            const data = await response.json()

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: '密碼重設成功！3秒後自動關閉',
                })
                setTimeout(() => {
                    handleClose()
                }, 3000)
            } else {
                setMessage({
                    type: 'error',
                    text: data.message || '重設失敗，請稍後再試',
                })
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: '重設失敗，請稍後再試',
            })
        } finally {
            setIsLoading(false)
        }
    }

    // 返回第一步
    const handleBackToStep1 = () => {
        setStep(1)
        setOtp('')
        setNewPassword('')
        setConfirmPassword('')
        setMessage({ type: '', text: '' })
        setErrors({})
    }

    // 格式化時間剩餘
    const formatTimeLeft = (expiredAt) => {
        const now = new Date()
        const diff = new Date(expiredAt) - now
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        return `${minutes}分鐘${seconds}秒`
    }

    return (
        <Modal show={show} onHide={onHide} centered size="md">
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className={styles['modal-title-black']}>重設密碼</Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-2">
                {/* 說明文字 */}
                <div className="text-center mb-2">
                    <p className="text-muted mb-0">請輸入你的帳號Email，按下"取得驗証碼"按鈕後，</p>
                    <p className="text-muted">我們會將密碼重設指示寄送給你。</p>
                </div>

                {/* 表單 */}
                <Form onSubmit={step === 1 ? handleSendOTP : handleResetPassword} className={styles['auth-form']}>
                    {/* 步驟 1：輸入 Email */}
                    {step === 1 ? (
                        <Form.Group className="mb-4">
                            <Form.Label className={styles['form-label']}>電子郵件地址</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="請輸入您的電子郵件地址"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                isInvalid={!!errors.email}
                                disabled={isLoading}
                                className="py-3"
                            />
                            <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                            {/* 成功訊息顯示 */}
                            {message.type === 'success' && (
                                <div className="mt-2 d-flex align-items-center">
                                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                                    <span className="text-success small">{message.text}</span>
                                </div>
                            )}
                            {/* 錯誤訊息顯示 */}
                            {message.type === 'error' && (
                                <div className="mt-2 d-flex align-items-center">
                                    <i className="bi bi-exclamation-circle-fill text-danger me-2"></i>
                                    <span className="text-danger small">{message.text}</span>
                                </div>
                            )}
                        </Form.Group>
                    ) : (
                        <>
                            {/* 步驟 2：輸入 OTP 和新密碼 */}

                            {/* 電子郵件驗證碼 */}
                            <Form.Group className="mb-4">
                                <Form.Label className={styles['form-label']}>驗證碼</Form.Label>
                                <div className="d-flex gap-2">
                                    <Form.Control
                                        type="text"
                                        placeholder="請輸入驗證碼"
                                        value={otp}
                                        onChange={handleOtpChange}
                                        maxLength={6}
                                        className="py-3"
                                        style={{ flex: '2' }}
                                        isInvalid={!!errors.otp}
                                    />
                                    <Button
                                        variant="outline-secondary"
                                        onClick={handleResendOTP}
                                        disabled={isLoading || countdown > 0}
                                        className="py-3 px-4"
                                        style={{ flex: '1' }}
                                    >
                                        {countdown > 0 ? `${countdown}s` : '取得驗証碼'}
                                    </Button>
                                </div>
                                <Form.Control.Feedback type="invalid">{errors.otp}</Form.Control.Feedback>
                                {/* OTP 即時驗證提示 */}
                                {otpValidation.status && (
                                    <div className="mt-2 d-flex align-items-center">
                                        {otpValidation.status === 'success' ? (
                                            <>
                                                <i className="bi bi-check-circle-fill text-success me-2"></i>
                                                <span className="text-success small">{otpValidation.message}</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-exclamation-circle-fill text-danger me-2"></i>
                                                <span className="text-danger small">{otpValidation.message}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </Form.Group>

                            {/* 密碼 */}
                            <Form.Group className="mb-4">
                                <Form.Label className={styles['form-label']}>密碼</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="請輸入新密碼"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="py-3"
                                    isInvalid={!!errors.newPassword}
                                />
                                <Form.Control.Feedback type="invalid">{errors.newPassword}</Form.Control.Feedback>
                            </Form.Group>

                            {/* 確認密碼 */}
                            <Form.Group className="mb-4">
                                <Form.Label className={styles['form-label']}>確認密碼</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="請再次輸入新密碼"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="py-3"
                                    isInvalid={!!errors.confirmPassword}
                                />
                                <Form.Control.Feedback type="invalid">{errors.confirmPassword}</Form.Control.Feedback>
                            </Form.Group>
                        </>
                    )}

                    {/* 主要操作按鈕 */}
                    <div className="d-grid gap-2 mb-3">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className={`py-3 fw-semibold ${styles['btn-block']}`}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                        className="me-2"
                                    />
                                    {step === 1 ? '發送中...' : '重設中...'}
                                </>
                            ) : step === 1 ? (
                                '取得驗証碼'
                            ) : (
                                '確定'
                            )}
                        </Button>
                    </div>

                    {/* 返回按鈕（僅在步驟 2 顯示） */}
                    {step === 2 && (
                        <div className="text-center">
                            <Button
                                variant="link"
                                onClick={() => setStep(1)}
                                disabled={isLoading}
                                className="text-muted p-0"
                                style={{ textDecoration: 'none' }}
                            >
                                返回上一步
                            </Button>
                        </div>
                    )}
                </Form>
            </Modal.Body>
        </Modal>
    )
}
