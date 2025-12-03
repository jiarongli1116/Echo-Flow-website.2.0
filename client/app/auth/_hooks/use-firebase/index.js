import { initializeApp } from 'firebase/app'

import {
    getAuth,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged,
} from 'firebase/auth'
import { useEffect } from 'react'

import { firebaseConfig } from './firebase-config'

// 重定向專用，用於在同頁面(firebase的登入頁會與回調頁同一頁)監聽登入情況
// getRedirectResult回調頁時用(註:重定向後，回調回來時才會呼叫)
// onAuthStateChanged監聽auth物件變化 <---(用這個就足夠，它會在頁面一啟動偵測目前登入情況)
const initApp = (callback) => {
    const auth = getAuth()

    // Result from Redirect auth flow.
    getRedirectResult(auth)
        .then((result) => {
            if (result) {
                // This gives you a Google Access Token. You can use it to access Google APIs.
                const credential = GoogleAuthProvider.credentialFromResult(result)
                const token = credential.accessToken

                // The signed-in user info.
                const user = result.user
            }
        })
        .catch((error) => {
            console.error(error)
        })

    // Listening for auth state changes.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // callback the user data
            callback(user.providerData[0])
        }
    })
}

// TODO: 目前不需要從firebase登出，firebase登出並不會登出google
const logoutFirebase = () => {
    const auth = getAuth()

    signOut(auth)
        .then(function () {
            // Sign-out successful.
            // window.location.assign('https://accounts.google.com/logout')
        })
        .catch(function (error) {
            // An error happened.
            console.error(error)
        })
}

const loginGoogle = async (callback) => {
    const provider = new GoogleAuthProvider()
    const auth = getAuth()

    try {
        const result = await signInWithPopup(auth, provider)
        const user = result.user

        // user後端寫入資料庫等等的操作
        if (user.providerData && user.providerData[0]) {
            // 等待 callback 完成
            await callback(user.providerData[0])
        } else {
            throw new Error('無法取得Google用戶資料')
        }
    } catch (error) {
        // 處理特定的 Firebase 錯誤
        if (error.code === 'auth/popup-closed-by-user') {
            // 用戶關閉視窗是正常行為，不記錄錯誤
            throw new Error('您取消了Google登入')
        } else if (error.code === 'auth/popup-blocked') {
            console.error('Firebase登入錯誤:', error)
            throw new Error('彈出視窗被瀏覽器阻擋，請允許彈出視窗後重試')
        } else if (error.code === 'auth/network-request-failed') {
            console.error('Firebase登入錯誤:', error)
            throw new Error('網路連線失敗，請檢查網路連線後重試')
        } else if (error.code === 'auth/too-many-requests') {
            console.error('Firebase登入錯誤:', error)
            throw new Error('登入嘗試次數過多，請稍後再試')
        } else {
            console.error('Firebase登入錯誤:', error)
            throw new Error('Google登入失敗，請稍後再試')
        }
    }
}

const loginGoogleRedirect = async () => {
    const provider = new GoogleAuthProvider()
    const auth = getAuth()

    // redirect to google auth
    signInWithRedirect(auth, provider)
}

// TODO: fb有許多前置設定需求，有需要使用請連絡Eddy
const loginFBRedirect = () => {
    const provider = new FacebookAuthProvider()
    const auth = getAuth()

    signInWithRedirect(auth, provider)
}

export default function useFirebase() {
    useEffect(() => {
        // 初始化
        initializeApp(firebaseConfig)
    }, [])

    return {
        loginFBRedirect,
        initApp,
        loginGoogleRedirect,
        loginGoogle,
        logoutFirebase,
    }
}
