// OTP 函式庫
// 提供 TOTP 產生、驗證和管理功能

import { TOTP } from 'otpauth'
import crypto from 'crypto'
import moment from 'moment'
import serverConfig from '../config/server.config.js'

// 產生 TOTP
export const generateTOTP = (email) => {
    try {
        const totp = new TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: serverConfig.otp.step,
            secret: serverConfig.otp.secret, // 直接使用 secret，不添加 email
        })

        return totp.generate()
    } catch (error) {
        console.error('TOTP 生成錯誤:', error)
        throw new Error('TOTP 生成失敗')
    }
}

// 驗證 TOTP
export const verifyTOTP = (token, email) => {
    try {
        const totp = new TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: serverConfig.otp.step,
            secret: serverConfig.otp.secret, // 直接使用 secret，不添加 email
        })

        // 允許前後 1 個時間窗口的容錯
        return totp.validate({ token, window: 1 })
    } catch (error) {
        console.error('TOTP 驗證錯誤:', error)
        return false
    }
}

// 產生隨機 OTP（6 位數字）
export const generateRandomOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// 產生 hash 值
export const generateHash = (email, token) => {
    const data = `${email}:${token}:${Date.now()}`
    return crypto.createHash('sha256').update(data).digest('hex')
}

// 檢查 OTP 是否過期
export const isOTPExpired = (expiredAt) => {
    return moment().isAfter(moment(expiredAt))
}

// 檢查是否可以重新發送 OTP（60 秒冷卻時間）
export const canResendOTP = (lastCreatedAt) => {
    if (!lastCreatedAt) return true

    const now = Date.now()
    const lastCreated = new Date(lastCreatedAt).getTime()
    const diffInSeconds = Math.floor((now - lastCreated) / 1000)

    return diffInSeconds >= 60
}

// 格式化剩餘時間
export const formatRemainingTime = (expiredAt) => {
    const now = moment()
    const expired = moment(expiredAt)
    const diffInSeconds = Math.max(0, expired.diff(now, 'seconds'))

    const minutes = Math.floor(diffInSeconds / 60)
    const seconds = diffInSeconds % 60

    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
