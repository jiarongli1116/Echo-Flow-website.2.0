import nodemailer from 'nodemailer'
import config from '../config/server.config.js'

// 建立 transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: config.smtp.provider === 'gmail' ? 'gmail' : undefined,
        host: config.smtp.host,
        port: config.smtp.provider === 'gmail' ? 587 : 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
        },
        tls: {
            rejectUnauthorized: false,
        },
    })
}

// 寄送 OTP 郵件（註冊驗證）
export const sendOtpMail = async (to, otp, username) => {
    const transporter = createTransporter()

    const mailOptions = {
        from: config.smtp.user,
        to: to,
        subject: 'Echo & Flow 註冊驗證碼',
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: rgb(0, 0, 0); color: #ffffff; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); overflow: hidden;">
        <!-- Header with Logo -->
        <div style="background: rgb(0, 0, 0); padding: 30px 20px; text-align: center; border-bottom: 2px solid; border-image: linear-gradient(135deg, rgba(253, 209, 108, 1), rgba(255, 231, 174, 1)) 1;">
         
          <div style="font-size: 28px; color: #ffffff; letter-spacing: 0.5px;">
            Echo & Flow 黑膠音樂平台
          </div>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px; background-color: rgb(0, 0, 0);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #ffffff; margin-bottom: 20px; font-size: 22px; font-weight: 600;">註冊驗證</h2>
            <p style="color: #ffffff; font-size: 16px; margin-bottom: 15px; line-height: 1.6;">親愛的貴賓您好：</p>
            <p style="color: #ffffff; font-size: 16px; margin-bottom: 25px; line-height: 1.6;">感謝您註冊 Echo & Flow，請使用以下驗證碼完成帳號驗證：</p>
          </div>
          
          <!-- OTP Code Box -->
          <div style="background: rgba(253, 209, 108, 1); color: rgb(0, 0, 0); padding: 20px; font-size: 28px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; text-align: center; box-shadow: 0 6px 20px rgba(253, 209, 108, 0.25); border: 2px solid rgba(253, 209, 108, 0.3);">
            ${otp}
          </div>
          
          <!-- Info Text -->
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #ffffff; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
              此驗證碼將在 <span style="color: rgba(253, 209, 108, 1); font-weight: bold;">10 分鐘</span> 後失效，請盡快完成驗證。
            </p>
            <p style="color: #ffffff; font-size: 12px; line-height: 1.5; margin-bottom: 25px;">
              若非您本人操作，請忽略此郵件。
            </p>
          </div>
          
          <!-- Action Button -->
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/auth/register" style="display: inline-block; background: rgba(253, 209, 108, 1); color: rgb(0, 0, 0); padding: 15px 30px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(253, 209, 108, 0.3); transition: all 0.3s ease;">
              返回註冊頁面完成驗證
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: rgb(0, 0, 0); padding: 20px; text-align: center; border-top: 1px solid; border-image: linear-gradient(135deg, rgba(253, 209, 108, 1), rgba(255, 231, 174, 1)) 1;">
          <p style="color: #ffffff; font-size: 12px; margin: 0;">
            © 2025 Echo & Flow. 保留所有權利。
          </p>
          <p style="color: #ffffff; font-size: 11px; margin: 5px 0 0 0;">
            此郵件由系統自動發送，請勿回覆。
          </p>
        </div>
      </div>
    `,
    }

    try {
        const info = await transporter.sendMail(mailOptions)
        console.log('Email sent: ', info.messageId)
        return info
    } catch (error) {
        console.error('Error sending email: ', error)
        throw error
    }
}

// 寄送 OTP 郵件（忘記密碼驗證）
export const sendForgotPasswordOtpMail = async (to, otp, username) => {
    const transporter = createTransporter()

    const mailOptions = {
        from: config.smtp.user,
        to: to,
        subject: 'Echo & Flow 忘記密碼驗證碼',
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: rgb(0, 0, 0); color: #ffffff; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); overflow: hidden;">
        <!-- Header with Logo -->
        <div style="background: rgb(0, 0, 0); padding: 30px 20px; text-align: center; border-bottom: 2px solid; border-image: linear-gradient(135deg, rgba(253, 209, 108, 1), rgba(255, 231, 174, 1)) 1;">
          <div style="font-size: 28px; color: #ffffff; letter-spacing: 0.5px;">
            Echo & Flow 黑膠音樂平台
          </div>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px; background-color: rgb(0, 0, 0);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #ffffff; margin-bottom: 20px; font-size: 22px; font-weight: 600;">忘記密碼驗證</h2>
            <p style="color: #ffffff; font-size: 16px; margin-bottom: 15px; line-height: 1.6;">親愛的 ${
                username || '用戶'
            } 您好：</p>
            <p style="color: #ffffff; font-size: 16px; margin-bottom: 25px; line-height: 1.6;">您正在申請重設密碼，請使用以下驗證碼完成驗證：</p>
          </div>
          
          <!-- OTP Code Box -->
          <div style="background: rgba(253, 209, 108, 1); color: rgb(0, 0, 0); padding: 20px; font-size: 28px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; text-align: center; box-shadow: 0 6px 20px rgba(253, 209, 108, 0.25); border: 2px solid rgba(253, 209, 108, 0.3);">
            ${otp}
          </div>
          
          <!-- Info Text -->
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #ffffff; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
              此驗證碼將在 <span style="color: rgba(253, 209, 108, 1); font-weight: bold;">10 分鐘</span> 後失效，請盡快完成驗證。
            </p>
            <p style="color: #ffffff; font-size: 12px; line-height: 1.5; margin-bottom: 25px;">
              若非您本人操作，請立即忽略此郵件並重新登入帳號。
            </p>
          </div>
          
          <!-- Action Button -->
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/auth/login" style="display: inline-block; background: rgba(253, 209, 108, 1); color: rgb(0, 0, 0); padding: 15px 30px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(253, 209, 108, 0.3); transition: all 0.3s ease;">
              前往登入頁面
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: rgb(0, 0, 0); padding: 20px; text-align: center; border-top: 1px solid; border-image: linear-gradient(135deg, rgba(253, 209, 108, 1), rgba(255, 231, 174, 1)) 1;">
          <p style="color: #ffffff; font-size: 12px; margin: 0;">
            © 2025 Echo & Flow. 保留所有權利。
          </p>
          <p style="color: #ffffff; font-size: 11px; margin: 5px 0 0 0;">
            此郵件由系統自動發送，請勿回覆。
          </p>
        </div>
      </div>
    `,
    }

    try {
        const info = await transporter.sendMail(mailOptions)
        console.log('Email sent: ', info.messageId)
        return info
    } catch (error) {
        console.error('Error sending email: ', error)
        throw error
    }
}

// 寄送聯絡表單郵件
export const sendContactMail = async (contactData) => {
    const transporter = createTransporter()
    const { name, email, subject, message } = contactData

    const mailOptions = {
        from: config.smtp.user,
        to: config.smtp.user, // 寄給自己
        subject: `[聯絡表單] ${subject}`,
        text: `
親愛的管理者您好！
您收到了一封，來自${name}聯絡表單的訊息!

聯絡人資訊：
姓名：${name}
電子郵件：${email}
主旨：${subject}

訊息內容：
${message}

請回覆至：${email}

此郵件由網站聯絡表單自動發送，發送時間：${new Date().toLocaleString('zh-TW')}

        `,
    }

    try {
        const info = await transporter.sendMail(mailOptions)
        console.log('Contact email sent: ', info.messageId)
        return info
    } catch (error) {
        console.error('Error sending contact email: ', error)
        throw error
    }
}

// 寄送一般郵件
export const sendMail = async (to, subject, html) => {
    const transporter = createTransporter()

    const mailOptions = {
        from: config.smtp.user,
        to: to,
        subject: subject,
        html: html,
    }

    try {
        const info = await transporter.sendMail(mailOptions)
        console.log('Email sent: ', info.messageId)
        return info
    } catch (error) {
        console.error('Error sending email: ', error)
        throw error
    }
}
