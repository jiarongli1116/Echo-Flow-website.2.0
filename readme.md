# Echo Flow Website

> 一個專屬於黑膠音樂愛好者的電商平台與交流社群

---

## 📖 專案介紹

### 關於 Echo Flow

隨著黑膠音樂文化的復興，越來越多人重新追求音樂的純粹與溫度。**ECHO & FLOW** 的誕生，正是希望為這份美好的文化注入更多人情味與歸屬感。我們不只是販售黑膠唱片的電商平台，更是一個專屬於音樂愛好者的交流社群。

在這裡，資深收藏家可以分享珍藏的故事，新手也能找到入門的引路人，每個人都能在音樂中找到共鳴。透過整合 Spotify API 的完整曲目與試聽、排行榜、優惠活動，我們讓收藏體驗兼具便利與樂趣。平台同時提供會員等級制度、互動社群與多元支付配送，致力於讓每一次購買，都成為一次與音樂的深度連結。

**ECHO & FLOW 相信，黑膠不只是聲音的載體，而是記憶、情感與文化的延續。**

---

## ✨ 專案功能特色

### 🛒 電商功能
- **商品管理**: 完整的黑膠唱片商品展示與管理系統
- **購物車系統**: 支援多商品購物車與即時更新
- **訂單管理**: 完整的訂單流程，從下單到出貨追蹤
- **優惠券系統**: 靈活的優惠券與折扣管理
- **會員積分**: 會員等級制度與積分回饋系統
- **多元支付**: 整合 ECPay、LINE Pay 等支付方式
- **7-11 配送**: 整合 7-11 超商取貨服務

### 🎵 音樂體驗
- **Spotify 整合**: 整合 Spotify API 提供完整曲目資訊
- **線上試聽**: 在購買前試聽黑膠唱片內容
- **音樂排行榜**: 即時更新的熱門音樂排行榜
- **專輯資訊**: 詳細的專輯與藝術家資訊

### 👥 社群功能
- **論壇系統**: 完整的討論區功能，支援文章發布與互動
- **即時聊天**: WebSocket 即時聊天系統
- **用戶互動**: 評論、按讚、分享等社群互動功能
- **個人檔案**: 個人化用戶資料與收藏展示

### 🔐 用戶系統
- **會員註冊/登入**: Firebase 認證系統
- **個人中心**: 完整的用戶資料管理
- **訂單歷史**: 查看歷史訂單與配送狀態
- **收藏清單**: 個人收藏與願望清單

### 🛠️ 管理後台
- **商品管理**: 商品的新增、編輯、刪除
- **用戶管理**: 用戶資料查詢與管理
- **優惠券管理**: 優惠券的建立與發放
- **訂單管理**: 訂單處理與狀態更新

---

## 🛠️ 技術棧

### 前端 (Client)
- **框架**: Next.js 15.5.0 (App Router)
- **UI 框架**: React 19.1.0
- **樣式**: CSS Modules, Bootstrap 5.3.7
- **動畫**: Framer Motion 12.23.12
- **富文本編輯**: Tiptap 3.3.0
- **認證**: Firebase 12.2.1
- **通知**: React Toastify 11.0.5
- **其他**: React Bootstrap, SweetAlert2

### 後端 (Server)
- **框架**: Express 5.1.0
- **資料庫**: MySQL 2 (mysql2 3.14.3)
- **認證**: JWT (jsonwebtoken 9.0.2), bcrypt 6.0.0
- **檔案上傳**: Multer 2.0.2
- **即時通訊**: WebSocket (ws 8.18.3)
- **支付整合**: LINE Pay Merchant SDK, ECPay
- **郵件服務**: Nodemailer 7.0.6
- **OTP**: otpauth 9.4.1

### 開發工具
- **Node.js**: 最新 LTS 版本
- **套件管理**: npm
- **建置工具**: Next.js Turbopack

---

## 📁 專案結構

```
Echo-Flow-website.2.0/
├── client/                 # 前端應用程式
│   ├── app/               # Next.js App Router 頁面
│   │   ├── _components/   # 頁面專用組件
│   │   ├── admin/         # 管理後台
│   │   ├── auth/          # 認證相關頁面
│   │   ├── cart/          # 購物車與結帳
│   │   ├── forums/        # 論壇功能
│   │   ├── products/      # 商品頁面
│   │   └── users/         # 用戶中心
│   ├── components/         # 共用組件
│   ├── hooks/             # 自定義 Hooks
│   ├── config/            # 設定檔
│   └── public/            # 靜態資源
│
├── server/                 # 後端 API 服務
│   ├── routes/            # API 路由
│   ├── lib/               # 工具函式庫
│   ├── config/           # 伺服器設定
│   └── uploads/          # 上傳檔案目錄
│
└── readme.md              # 專案說明文件
```

---

## 🚀 快速開始

### 環境需求

- Node.js 18.0.0 或更高版本
- MySQL 資料庫
- npm 或 yarn

### 安裝步驟

#### 1. Clone 專案

```bash
git clone https://github.com/MFEE67-TEAM3/Echo-Flow-website.2.0.git
cd Echo-Flow-website.2.0
```

#### 2. 安裝前端依賴

```bash
cd client
npm install
```

#### 3. 安裝後端依賴

```bash
cd ../server
npm install
```

#### 4. 環境變數設定

在 `server/` 目錄下建立 `ef.env` 檔案，設定以下環境變數：

```env
# 資料庫設定
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database

# JWT 密鑰
JWT_SECRET=your_jwt_secret

# Firebase 設定
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain

# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# 支付設定
ECPAY_MERCHANT_ID=your_ecpay_merchant_id
LINE_PAY_CHANNEL_ID=your_line_pay_channel_id

# 郵件設定
MAIL_HOST=smtp.gmail.com
MAIL_USER=your_email
MAIL_PASS=your_email_password
```

#### 5. 啟動開發伺服器

**啟動後端伺服器** (在 `server/` 目錄)：

```bash
npm run dev
```

**啟動前端開發伺服器** (在 `client/` 目錄)：

```bash
npm run dev
```

前端預設運行在 `http://localhost:3000`  
後端 API 預設運行在 `http://localhost:3001` (請參考 server 設定)

---

## 📋 專案資訊

- **專案名稱**: Echo Flow Website
- **GitHub 組織**: MFEE67-TEAM3
- **主要分支**: `main` (生產), `dev` (開發)
- **技術棧**: Next.js 15.5.0, React 19.1.0, Node.js, Express, MySQL

---

## 🌿 分支策略

### 分支結構

```
main (生產分支 - 保護分支)
  ↑
dev (開發分支 - 保護分支)
  ↑
member-name (成員個人分支)
  ↑
feature/xxx (功能分支，可選)
```

### 分支說明

- **`main`**: 生產環境分支，只接受來自 `dev` 的合併
- **`dev`**: 開發環境分支，接受所有成員的 PR
- **`member-name`**: 成員個人開發分支（如：`Kouji228`, `John123`）
- **`feature/xxx`**: 具體功能分支（可選）

---

## 🚀 新成員加入流程

### 1. Clone 專案

```bash
# Clone 整個專案
git clone https://github.com/MFEE67-TEAM3/Echo-Flow-website.2.0.git

# 進入專案目錄
cd Echo-Flow-website.2.0

# 查看所有分支
git branch -a
```

### 2. 切換到 dev 分支

```bash
# 切換到 dev 分支
git checkout dev

# 拉取最新代碼
git pull origin dev
```

### 3. 建立個人分支

```bash
# 從 dev 分支建立個人分支
git checkout -b your-name

# 例如：Kouji228, John123, Mary456
git checkout -b Kouji228
```

---

## 💻 日常開發流程

### 開始開發

```bash
# 1. 確保在個人分支
git checkout your-name

# 2. 從 dev 分支更新最新代碼
git checkout dev
git pull origin dev
git checkout your-name
git merge dev

# 3. 開始開發...
```

### 開發完成後

```bash
# 1. 提交更改
git add .
git commit -m "feat: 新增某某功能"

# 2. 推送到遠端個人分支
git push -u origin your-name
```

---

## 🔄 Pull Request 流程

### 建立 PR 到 dev 分支

1. **來源分支**: `your-name` (你的個人分支)
2. **目標分支**: `dev`
3. **PR 標題格式**: `feat: 功能描述` 或 `fix: 修復描述`
4. **PR 描述**: 詳細說明更改內容和測試情況

### PR 標題範例

- `feat: 新增用戶登入功能`
- `fix: 修復導航欄響應式問題`
- `style: 更新按鈕樣式`
- `docs: 更新 README 文件`

---

## 📝 提交訊息規範

### 提交格式

```
type: 簡短描述

詳細描述（可選）
```

### 類型說明

- **`feat`**: 新功能
- **`fix`**: 修復 bug
- **`style`**: 樣式更改
- **`refactor`**: 重構代碼
- **`docs`**: 文件更新
- **`test`**: 測試相關
- **`chore`**: 構建過程或輔助工具的變動

---

## 📁 檔案命名慣例

為了保持專案結構的一致性和可讀性，請遵循以下檔案命名規範：

| 檔案類型   | 命名方式   | 範例             |
| ---------- | ---------- | ---------------- |
| React 組件 | 大駝峰命名 | ProductCard.js   |
| Hook       | 烤肉串命名 | use-Auth.js      |
| 工具函式   | 小駝峰     | formatPrice.js   |
| 常數       | 小駝峰     | apiEndpoints.js  |
| 樣式檔     | 烤肉串命名 | product-card.css |
| 頁面檔案   | 小駝峰     | productDetail.js |

### 命名規則說明

- **大駝峰命名 (PascalCase)**: 用於 React 組件，每個單字首字母大寫
- **小駝峰命名 (camelCase)**: 用於函式、變數、常數等，第一個單字小寫，後續單字首字母大寫
- **烤肉串命名 (kebab-case)**: 用於樣式檔和 Hook，單字間用連字號分隔

---

## 🚫 禁止事項

### ❌ 不要做的事

- 直接向 `main` 分支發送 PR
- 在 `main` 或 `dev` 分支直接開發
- 跳過 code review 直接合併
- 使用不當的提交訊息

### ✅ 應該做的事

- 在個人分支上開發
- 向 `dev` 分支發送 PR
- 等待 code review 和批准
- 使用清晰的提交訊息

---

## 🔒 分支保護規則

### main 分支

- 禁止直接推送
- 只接受來自 `dev` 的合併
- 需要至少 1 個 code review 批准

### dev 分支

- 禁止直接推送
- 接受所有成員的 PR
- 需要至少 1 個 code review 批准

---

## 📋 檢查清單

### 開發前

- [ ] 從 `dev` 分支更新個人分支
- [ ] 確認在個人分支上開發

### 開發中

- [ ] 定期提交代碼
- [ ] 使用清晰的提交訊息

### 開發完成

- [ ] 測試功能正常
- [ ] 建立 PR 到 `dev` 分支
- [ ] 等待 code review
- [ ] 解決 review 意見

### 合併後

- [ ] 刪除個人分支（可選）
- [ ] 從 `dev` 分支更新本地代碼

---

## 🆘 常見問題

### Q: 如何更新個人分支？

```bash
git checkout dev
git pull origin dev
git checkout your-name
git merge dev
```

### Q: 如何查看所有分支？

```bash
git branch -a          # 本地和遠端分支
git branch -r          # 只顯示遠端分支
```

### Q: 如何刪除已合併的分支？

```bash
# 刪除本地分支
git branch -d your-name

# 刪除遠端分支
git push origin --delete your-name
```

### Q: 如何啟動開發環境？

```bash
# 終端機 1: 啟動後端
cd server
npm run dev

# 終端機 2: 啟動前端
cd client
npm run dev
```

---

## 📚 相關文件

- [Next.js 官方文檔](https://nextjs.org/docs)
- [React 官方文檔](https://react.dev/)
- [Express 官方文檔](https://expressjs.com/)
- [MySQL 官方文檔](https://dev.mysql.com/doc/)
- [Git 官方文檔](https://git-scm.com/doc)
- [Firebase 官方文檔](https://firebase.google.com/docs)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)

---

**版本**: 2.0  
**更新日期**: 2025 年 9 月  
**維護者**: MFEE67-TEAM3  
**最後更新**: [更新者名稱]

---

> 💡 **提示**: 請在開始開發前仔細閱讀此規範，如有疑問請及時詢問團隊成員。
