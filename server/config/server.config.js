// 伺服器配置文件
const config = {
  // OTP 配置
  otp: {
    secret: 'JBSWY3DPEHPK3PXP', // 使用標準的 base32 格式
    expire: 30 * 60 * 1000, // 30 分鐘
    step: 30, // TOTP 步長（秒）
  },

  smtp: {
    provider: 'gmail',
    host: 'smtp.gmail.com',
    user: 'echoflow888@gmail.com',
    pass: 'nujzdtuf mwfzdbaf',
  },

  linePay: {
    development: {
      channelId: '2008049890',
      channelSecret: 'b64375b2bafb7a1e3923d120dc12d3c0',
      confirmUrl: 'http://localhost:3000/line-pay',
      cancelUrl: 'http://localhost:3000/line-pay/cancel',
    },
    production: {
      channelId: '2008049890',
      channelSecret: 'b64375b2bafb7a1e3923d120dc12d3c0',
      confirmUrl: 'https://next-app-raw.vercel.app/line-pay',
      cancelUrl: 'https://next-app-raw.vercel.app/line-pay/cancel',
    },
  },
};

export default config;
