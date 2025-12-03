'use client'

import useRegister from '../_hooks/use-register'
import FormInput from './FormInput'
import FormSelect from './FormSelect'
import PasswordInput from './PasswordInput'
import styles from './Auth.module.css'
import { useRouter } from 'next/navigation'

export default function RegisterForm() {
    const {
        formData,
        errors,
        isLoading,
        submitError,
        isAccountVerified,
        isSendingCode,
        verificationCode,
        isVerifying,
        verificationError,
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
        setVerificationCode,
    } = useRegister()

    const router = useRouter()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isAccountVerified) {
            await verifyAccount()
        } else {
            await submitRegistration()
        }
    }

    const genderOptions = [
        { value: '男', label: '男' },
        { value: '女', label: '女' },
        { value: '其他', label: '其他' },
    ]

    return (
        <div className={`w-50 mx-auto position-relative ${styles['register-container']}`}>
            <h4 className={`text-center mb-4 ${styles['auth-title']}`}>註冊帳號</h4>

            {submitError && <div className={`alert alert-danger ${styles['error-alert']}`}>{submitError}</div>}

            <form className={styles['auth-form']} onSubmit={handleSubmit}>
                {/* 姓名 */}
                <FormInput
                    type="text"
                    name="name"
                    placeholder="姓名"
                    value={formData.name}
                    onChange={updateFormData}
                    onBlur={handleFieldBlur}
                    error={errors.name}
                    required
                />

                {/* 帳號（email）和驗證碼發送 */}
                <div className="mb-3">
                    <label className="form-label">帳號</label>
                    <div className="d-flex gap-2 align-items-center">
                        <div className="flex-grow-1">
                            <input
                                type="email"
                                className={`form-control ${errors.account ? styles['input-error'] : ''}`}
                                placeholder="請輸入email格式的帳號"
                                value={formData.account}
                                onChange={(e) => updateFormData('account', e.target.value)}
                                onBlur={(e) => handleFieldBlur('account', e.target.value)}
                                disabled={isAccountVerified}
                                required
                            />
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline-dark"
                            style={{
                                minWidth: '120px',
                                maxWidth: '120px',
                                height: '38px',
                                whiteSpace: 'nowrap',
                                border: '1px solid #000',
                                color: '#000',
                                backgroundColor: 'transparent',
                                flexShrink: 0,
                            }}
                            onClick={sendVerificationCode}
                            disabled={isSendingCode || isAccountVerified || !formData.account || isCountdownActive}
                        >
                            {isSendingCode
                                ? '發送中...'
                                : isCountdownActive
                                ? `重新發送 (${countdown}s)`
                                : '發送驗證碼'}
                        </button>
                    </div>
                    {errors.account && <div className={styles['error-message']}>{errors.account}</div>}
                    {/* 成功訊息顯示 */}
                    {successMessage.type === 'success' && (
                        <div className="mt-2 d-flex align-items-center">
                            <i className="bi bi-check-circle-fill text-success me-2"></i>
                            <span className="text-success small">{successMessage.text}</span>
                        </div>
                    )}
                    {/* 錯誤訊息顯示 */}
                    {errorMessage.type === 'error' && (
                        <div className="mt-2 d-flex align-items-center">
                            <i className="bi bi-exclamation-circle-fill text-danger me-2"></i>
                            <span className="text-danger small">{errorMessage.text}</span>
                        </div>
                    )}
                </div>

                {/* 帳號驗證狀態 */}
                {isAccountVerified && (
                    <div className={`alert alert-success ${styles['success-alert']} mb-3`}>
                        <i className="bi bi-check-circle-fill me-2"></i>
                        帳號驗證成功！
                    </div>
                )}

                {/* 驗證碼輸入（僅在發送驗證碼後顯示，且未驗證成功時） */}
                {!isAccountVerified && formData.account && (
                    <div className="mb-3">
                        <label className="form-label">驗證碼</label>
                        <div className="d-flex gap-2">
                            <input
                                type="text"
                                className={`form-control ${verificationError ? styles['input-error'] : ''}`}
                                placeholder="請輸入驗證碼"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="btn btn-dark"
                                style={{
                                    minWidth: '80px',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: '#000',
                                    border: '1px solid #000',
                                    color: '#fff',
                                }}
                                onClick={verifyAccount}
                                disabled={isVerifying || !verificationCode.trim()}
                            >
                                {isVerifying ? '驗證中...' : '驗證'}
                            </button>
                        </div>
                        {verificationError && <div className={styles['error-message']}>{verificationError}</div>}
                    </div>
                )}

                {/* 其他資料（僅在帳號驗證成功後顯示） */}
                {isAccountVerified && (
                    <>
                        {/* 密碼 */}
                        <PasswordInput
                            name="password"
                            placeholder="密碼(至少6個字元)"
                            value={formData.password}
                            onChange={updateFormData}
                            onBlur={handleFieldBlur}
                            error={errors.password}
                            required
                        />

                        {/* 確認密碼 */}
                        <PasswordInput
                            name="confirmPassword"
                            placeholder="確認密碼"
                            value={formData.confirmPassword}
                            onChange={updateFormData}
                            onBlur={handleFieldBlur}
                            error={errors.confirmPassword}
                            required
                        />

                        {/* 手機號碼 */}
                        <FormInput
                            type="tel"
                            name="phone"
                            placeholder="手機號碼"
                            value={formData.phone}
                            onChange={updateFormData}
                            onBlur={handleFieldBlur}
                            error={errors.phone}
                            required
                        />

                        {/* 生日 */}
                        <FormInput
                            type="date"
                            name="birthday"
                            value={formData.birthday}
                            onChange={updateFormData}
                            onBlur={handleFieldBlur}
                            error={errors.birthday}
                            required
                        />

                        {/* 性別 */}
                        <FormSelect
                            name="gender"
                            value={formData.gender}
                            onChange={updateFormData}
                            onBlur={handleFieldBlur}
                            options={genderOptions}
                            placeholder="請選擇性別"
                            error={errors.gender}
                            required
                        />

                        {/* 註冊按鈕 */}
                        <button type="submit" className="btn btn-block w-100 mb-3 mt-2" disabled={isLoading}>
                            {isLoading ? '註冊中...' : '註冊'}
                        </button>
                    </>
                )}

                {/* 登入連結 */}
                <div className={styles['line-text-container']}>
                    <div className={styles['divider-line']}></div>
                    <div className={`${styles['login-text']} mt-3`}>
                        <a href="/auth/login" className={styles['auth-link']}>
                            已有帳號？立即登入
                        </a>
                    </div>
                </div>
            </form>
        </div>
    )
}
