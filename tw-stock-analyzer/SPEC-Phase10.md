# Phase 10: 真實股票數據串接 (Shioaji)

## 概述

使用 Shioaji API 取得真實台灣股票市場數據，取代目前的模擬數據。

---

## 1. Shioaji 介紹

**Shioaji** 是富邦期貨提供的 Python API，支援：

| 數據類型 | 說明 |
|----------|------|
| 現股行情 | 當日即時報價 |
| 歷史K線 | 日/週/月 K線 |
| 法人籌碼 | 三大法人買賣超 |
| 個股資料 | 基本資訊、財務數據 |
| 期貨選擇權 | 法人未平倉等 |

---

## 2. 架構設計

### 方案 A：Python Microservice（推薦）

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React 前端    │────▶│  Node.js 後端   │────▶│  Python 服務    │
│   (Port 5173)  │     │   (Port 3001)   │     │   (Port 5000)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                 ┌─────────────────┐
                                                 │   Shioaji API   │
                                                 │  (富邦期貨)     │
                                                 └─────────────────┘
```

### 方案 B：Child Process 直接調用

```
Node.js 後端 ──▶ spawn('python', ['shioaji_client.py']) ──▶ Shioaji
```

---

## 3. 實作項目

### 3.1 Python 服務 (shioaji-service/)

```
shioaji-service/
├── requirements.txt      # Python 依賴
├── app.py               # Flask/FastAPI 主程式
├── shioaji_client.py    # Shioaji 封裝
└── .env                # 帳號密碼
```

### 3.2 API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/stocks/quote | 取得報價 |
| GET | /api/stocks/kline/:code | 取得K線 |
| GET | /api/stocks/chip/:code | 法人籌碼 |
| GET | /api/stocks/ticker | 股票清單 |

### 3.3 Node.js 整合

- 新增 `/api/shioaji` 路由
- HTTP 調用 Python 服務
- 錯誤處理與重試
- 快取機制

---

## 4. 功能對應

| 功能 | 數據來源 | API |
|------|----------|-----|
| 單股報價 | Shioaji | Quote |
| K線圖 | Shioaji | KBar |
| 法人買賣超 | Shioaji | Institutional |
| 融券券增比 | Shioaji | Margin |
| 總體市場 | Shioaji | Index |

---

## 5. 環境需求

### Python 環境
```bash
# 需要 Python 3.8+
pip install shioaji
pip install flask
pip install python-dotenv
```

### 富邦期貨帳號
- 期貨帳號
- 期貨密碼
- 身份證字號（驗證用）

---

## 6. 實作階段

| 階段 | 內容 | 預估 |
|------|------|------|
| 1 | Python 環境設定 + Shioaji 安裝 | 30分 |
| 2 | Flask API 開發 | 2小時 |
| 3 | Node.js 整合 | 1小時 |
| 4 | 前端串接 | 1小時 |
| 5 | 測試與除錯 | 1小時 |

---

## 7. 資料對應

### K線資料
```python
{
    "code": "2330",
    "date": "2024-01-15",
    "open": 580.0,
    "high": 585.0,
    "low": 578.0,
    "close": 582.0,
    "volume": 15000000
}
```

### 法人籌碼
```python
{
    "code": "2330",
    "foreign_buy": 1500000,
    "foreign_sell": 800000,
    "foreign_net": 700000,
    "dealer_buy": 500000,
    "dealer_sell": 300000,
    "dealer_net": 200000,
    "main_force_buy": 2000000,
    "main_force_sell": 1000000,
    "main_force_net": 1000000
}
```

---

## 8. 費用說明

| 項目 | 費用 |
|------|------|
| Shioaji 基本 | 免費（盤後數據） |
| 即時報價 | 需申請（通常免費） |
| 雲端伺服器 | 自費（部署用） |

---

## 9. 風險與限制

1. **帳號權限** - 需有富邦期貨帳號
2. **API 限制** - 每秒 request 限制
3. **登入狀態** - 需定時 re-login
4. **數據延遲** - 盤後數據有延遲

---

## 10. 產出標準

- [ ] Python Shioaji 服務
- [ ] Flask/FastAPI 後端
- [ ] 報價 API
- [ ] K線 API
- [ ] 法人籌碼 API
- [ ] Node.js 整合
- [ ] 前端顯示
