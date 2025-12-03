import express from 'express'
const router = express.Router()

// 寄送email函式
import { sendOtpMail, sendContactMail } from '../lib/mail.js'

router.post('/', async function (req, res) {
    // 寄送email
    try {
        const { to, otp, username } = req.body

        // 如果沒有提供參數，使用預設值進行測試
        const emailTo = to || 'reynold.reichel30@ethereal.email'
        const emailOtp = otp || '123456'
        const emailUsername = username || '測試用戶'

        console.log('準備發送郵件到:', emailTo)

        // 寄送otp信件(注意這個操作會耗時)
        // 如果要使用ethereal收信測試: https://ethereal.email/login
        // user: 'mittie.daniel91@ethereal.email',pass: 'b6en9s7EqjP9EPVKkd'
        // 使用gmail前要先設定應用程式密碼，並在server.config.js中設定好
        await sendOtpMail(emailTo, emailOtp, emailUsername)

        return res.status(200).json({
            status: 'success',
            message: '郵件發送成功',
            data: { to: emailTo, otp: emailOtp, username: emailUsername },
        })
    } catch (err) {
        console.log('郵件發送錯誤:', err)
        return res.status(500).json({ status: 'error', message: '無法寄送email', error: err.message })
    }
})

// 聯絡表單寄信路由
router.post('/contact', async function (req, res) {
    try {
        const { name, email, subject, message } = req.body

        // 驗證必填欄位
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                status: 'error',
                message: '請填寫所有必填欄位',
            })
        }

        // 驗證電子郵件格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: '請輸入有效的電子郵件地址',
            })
        }

        console.log('準備發送聯絡表單郵件:', { name, email, subject })

        // 寄送聯絡表單郵件
        await sendContactMail({ name, email, subject, message })

        return res.status(200).json({
            status: 'success',
            message: '聯絡表單已成功送出，我們會盡快回覆您！',
        })
    } catch (err) {
        console.log('聯絡表單郵件發送錯誤:', err)
        return res.status(500).json({
            status: 'error',
            message: '無法寄送聯絡表單，請稍後再試',
            error: err.message,
        })
    }
})

export default router
