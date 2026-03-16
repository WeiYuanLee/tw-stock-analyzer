# 台股分析系統 (tw-stock-analyzer)

![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

付費會員制的台股技術分析工具，提供股票篩選、技術分析、AI 助手等功能。

---

## 功能特色

### 會員系統
- 📧 Email 註冊/登入
- 🔐 JWT 認證
- ✉️ Email 驗證

### 會員分級
| 等級 | 價格 | 功能 |
|------|------|------|
| Free | 免費 | 基本篩選、單股健檢、廣告 |
| Pro | NT$199/月 | 無廣告、進階篩選、法人籌碼、技術線圖 |
| VIP | NT$399/月 | Pro 功能 + AI 助手、價格提醒、Line/Discord 通知 |

### 核心功能
- 🩺 單股快速健檢
- 🔍 進階篩選條件（法人連續買賣超、券增比、融券變化）
- 📈 技術線圖（K線圖、均線、RSI、MACD）
- 📊 多空 Regime 判斷
- 💾 自選股/書籤（雲端同步）
- 📦 篩選結果匯出 CSV
- 🤖 AI 助手（10 種分析功能）
- 🔔 價格異常提醒（Line/Discord Webhook）
- 🎨 深色/淺色主題

### 後台管理
- 📊 儀表板統計
- 👥 會員管理
- 🛒 訂單管理
- 📋 訂閱管理

---

## 技術架構

### 前端
- React 18 + Vite
- Tailwind CSS
- Zustand (狀態管理)
- Axios (HTTP Client)
- Lightweight Charts (K線圖)

### 後端
- Node.js + Express
- SQLite (開發) / PostgreSQL (生產)
- JWT (認證)
- Zod (驗證)
- Nodemailer (郵件)

### 金流
- 藍新金流 (NewebPay)

---

## 快速開始

### 安裝

```bash
# 複製專案
git clone https://github.com/WeiYuanLee/tw-stock-analyzer.git
cd tw-stock-analyzer

# 安裝後端依賴
cd server
npm install

# 安裝前端依賴
cd ../client
pnpm install
```

### 環境設定

```bash
# 後端
cd server
cp .env.example .env
# 編輯 .env 設定環境變數

# 前端
# 設定 API URL
```

### 啟動

```bash
# 啟動後端 (Port 3001)
cd server
npm start

# 啟動前端 (Port 5173)
cd client
pnpm dev
```

---

## 環境變數

### 後端 (.env)

```env
# Server
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Email (SMTP)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-user
SMTP_PASS=your-ethereal-pass

# 藍新金流 (Payment)
NEWEBPAY_MERCHANT_ID=your-merchant-id
NEWEBPAY_HASH_KEY=your-hash-key
NEWEBPAY_HASH_IV=your-hash-iv

# AI (OpenAI)
OPENAI_API_KEY=sk-...
```

### 管理員帳號

- Email: `admin@twstock.com`
- 密碼: `admin123`

---

## API 文件

### 會員認證
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/auth/register | 註冊會員 |
| POST | /api/auth/login | 會員登入 |
| POST | /api/auth/logout | 登出 |
| POST | /api/auth/verify-email | Email 驗證 |
| POST | /api/auth/forgot-password | 忘記密碼 |
| POST | /api/auth/reset-password | 重設密碼 |

### 會員資料
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/user/profile | 取得資料 |
| PUT | /api/user/profile | 更新資料 |

### 股票數據
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/stocks/list | 股票列表 |
| GET | /api/stocks/:code | 股票詳情 |
| GET | /api/stocks/:code/kline | K線數據 |

### AI 助手
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/ai/chat | AI 對話 |
| GET | /api/ai/history | 對話歷史 |
| GET | /api/ai/templates | 對話模板 |

### 價格提醒
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/alerts | 提醒列表 |
| POST | /api/alerts | 新增提醒 |
| DELETE | /api/alerts/:id | 刪除提醒 |

---

## 資料表

### users
- id, email, password_hash, name
- membership_level (free/pro/vip)
- membership_expire_at
- role (user/admin/superadmin)

### user_watchlist
- user_id, stock_code

### user_bookmarks
- user_id, name, filters (JSON)

### subscriptions
- user_id, plan, amount, status

### orders
- user_id, amount, status, plan

### price_alerts
- user_id, stock_code, alert_type, threshold, channel, webhook_url

### ai_cache
- user_id, cache_date, question_hash, question, answer

---

## 部署

### Vercel (前端)
```bash
cd client
vercel deploy
```

### Railway/Render (後端)
```bash
cd server
vercel deploy
# 或
railway deploy
```

---

## 開發團隊

- **開發者**: Lence
- **AI 助手**: Alex (Builder Agent)

---

## License

MIT License

---

## 贊助

如果你喜歡這個專案，歡迎贊助一杯咖啡 ☕
