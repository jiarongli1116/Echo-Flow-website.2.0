'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleIcon } from '@/components/icons/Icons'
import PasswordToggle from './PasswordToggle'
import ForgetPasswordModal from './ForgetPasswordModal'
import { useAuth } from '@/hooks/use-auth'
import useFirebase from '../_hooks/use-firebase'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import styles from './Auth.module.css'

export default function LoginForm() {
    const passwordRef = useRef(null)
    const [account, setAccount] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForgetPasswordModal, setShowForgetPasswordModal] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const { login, updateUser } = useAuth()
    const { loginGoogle } = useFirebase()
    const router = useRouter()

    const handleTogglePassword = () => {
        setShowPassword(!showPassword)
    }

    // 監聽 Google 登入狀態，確保按鈕不會永久卡住
    useEffect(() => {
        if (isGoogleLoading) {
            const safetyTimeout = setTimeout(() => {
                console.log('安全機制：強制重置Google登入狀態')
                setIsGoogleLoading(false)
            }, 15000) // 15秒安全超時

            return () => clearTimeout(safetyTimeout)
        }
    }, [isGoogleLoading])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        if (!account || !password) {
            setError('請輸入帳號和密碼')
            setIsLoading(false)
            return
        }

        try {
            const result = await login(account, password)
            if (result.success) {
                // 登入成功，導向用戶面板
                router.push('/users/panel')
            } else {
                setError(result.message || '登入失敗')
            }
        } catch (error) {
            setError('登入時發生錯誤，請稍後再試')
        } finally {
            setIsLoading(false)
        }
    }

    // 處理Google登入
    const handleGoogleLogin = async () => {
        console.log('開始Google登入流程')
        setIsGoogleLoading(true)
        setError('')

        try {
            console.log('調用loginGoogle函數')
            await loginGoogle(async (providerData) => {
                console.log('Google登入資料:', providerData)

                // 檢查必要的資料是否存在
                if (!providerData || !providerData.uid || !providerData.email) {
                    throw new Error('Google登入資料不完整')
                }

                // 準備發送給後端的資料格式
                const googleData = {
                    providerId: providerData.providerId,
                    displayName: providerData.displayName,
                    email: providerData.email,
                    uid: providerData.uid,
                    photoURL: providerData.photoURL,
                }

                console.log('準備發送的資料:', googleData)

                // 向伺服器進行登入動作
                const API = 'http://localhost:3005/api/users/google-login'
                const res = await fetch(API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(googleData),
                })

                const resData = await res.json()
                console.log('伺服器回應:', resData)

                if (resData.status === 'success') {
                    console.log('Google登入成功，準備更新用戶狀態')
                    console.log('收到的用戶資料:', resData.data.user)

                    // 儲存 token
                    if (resData.data.token) {
                        localStorage.setItem('reactLoginToken', resData.data.token)
                        console.log('Token 已儲存到 localStorage')
                    }

                    // 更新用戶狀態 - 確保資料完整性
                    if (resData.data.user) {
                        const userData = {
                            ...resData.data.user,
                            // 確保 img 欄位存在且正確
                            img: resData.data.user.img || resData.data.user.photoURL || null,
                        }
                        console.log('準備更新用戶狀態，資料:', userData)

                        // 使用 Promise 來確保狀態更新完成
                        return new Promise((resolve) => {
                            updateUser(userData)
                            console.log('用戶狀態已更新')

                            // 等待一個 tick 確保狀態更新完成
                            setTimeout(() => {
                                console.log('準備導向用戶面板')
                                resolve()
                            }, 100)
                        }).then(() => {
                            // 顯示成功訊息
                            toast.success('已成功登入')
                            // 導向用戶面板
                            router.push('/users/panel')
                        })
                    } else {
                        // 顯示成功訊息
                        toast.success('已成功登入')
                        // 導向用戶面板
                        router.push('/users/panel')
                    }
                } else {
                    toast.error(resData.message || 'Google登入失敗')
                    setError(resData.message || 'Google登入失敗')
                }
            })
        } catch (error) {
            console.log('捕獲到錯誤:', error.message)
            // 如果是用戶取消登入，不顯示錯誤訊息也不記錄錯誤
            if (error.message === '您取消了Google登入') {
                console.log('用戶取消了Google登入')
                // 用戶取消是正常行為，不需要任何處理
            } else {
                console.error('Google登入錯誤:', error)
                setError(error.message || 'Google登入時發生錯誤，請稍後再試')
            }
        } finally {
            // 無論成功、失敗或取消，都要重置載入狀態
            setIsGoogleLoading(false)
        }
    }

    return (
        <>
            {/* 忘記密碼彈跳視窗 */}
            <ForgetPasswordModal show={showForgetPasswordModal} onHide={() => setShowForgetPasswordModal(false)} />

            {/* Toast訊息視窗 */}
            <ToastContainer />

            <div className={`w-50 mx-auto ${styles['login-container']}`}>
                <h4 className={`text-center mb-4 ${styles['auth-title']}`}>會員登入</h4>

                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                <form className={styles['auth-form']} onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <input
                            type="email"
                            className="form-control"
                            placeholder="輸入您的Email帳號"
                            value={account}
                            onChange={(e) => setAccount(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-3 position-relative">
                        <input
                            ref={passwordRef}
                            type={showPassword ? 'text' : 'password'}
                            className="form-control"
                            placeholder="密碼"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <PasswordToggle
                            inputRef={passwordRef}
                            width={22}
                            height={16}
                            showPassword={showPassword}
                            onToggle={handleTogglePassword}
                        />
                    </div>

                    <div className={`text-center mt-3 ${styles['forget-password']}`}>
                        <button
                            type="button"
                            className="btn btn-link p-0 border-0 text-decoration-none"
                            onClick={() => setShowForgetPasswordModal(true)}
                        >
                            忘記密碼?
                        </button>
                    </div>

                    <button type="submit" className="btn btn-block w-100 mb-2 mt-2" disabled={isLoading}>
                        {isLoading ? '登入中...' : '登入'}
                    </button>

                    <button
                        type="button"
                        className="btn btn-block w-100 d-flex align-items-center justify-content-center"
                        onClick={handleGoogleLogin}
                        disabled={isGoogleLoading}
                    >
                        <GoogleIcon style={{ marginRight: '8px' }} />
                        {isGoogleLoading ? 'Google登入中...' : '使用Google登入'}
                    </button>

                    <div className={`${styles['line-text-container']} mt-3`}>
                        <div className={styles['divider-line']}></div>
                        <div className={`${styles['register-text']} mt-3`}>
                            <a href="/auth/register" className={styles['auth-link']}>
                                還沒有會員?立即註冊
                            </a>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}
