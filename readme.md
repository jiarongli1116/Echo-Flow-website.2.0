# Echo Flow Website - 專案開發規範

## 📋 專案資訊

- **專案名稱**: Echo Flow Website
- **GitHub 組織**: MFEE67-TEAM3
- **主要分支**: `main` (生產), `dev` (開發)
- **技術棧**: Next.js 15.5.0, React 19.1.0, Node.js

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
https://github.com/MFEE67-TEAM3/Echo-Flow-website.2.0.git

# 進入專案目錄
cd 你在本機設定的的專案資料夾

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

---

## 📞 聯繫方式

如有問題，請聯繫：

- 專案管理員：[管理員名稱]
- GitHub Issues: [專案 Issues 頁面]
- 團隊討論: [討論平台]

---

## 📚 相關文件

- [Next.js 官方文檔](https://nextjs.org/docs)
- [React 官方文檔](https://react.dev/)
- [Git 官方文檔](https://git-scm.com/doc)

---

**版本**: 1.0
**更新日期**: 2025 年 1 月
**維護者**: MFEE67-TEAM3
**最後更新**: [更新者名稱]

---

> 💡 **提示**: 請在開始開發前仔細閱讀此規範，如有疑問請及時詢問團隊成員。
