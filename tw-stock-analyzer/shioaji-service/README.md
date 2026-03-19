# Shioaji 服務

使用 Shioaji API 取得真實台灣股票數據的 Python 微服務。

## 安裝與啟動

### 1. 安裝依賴

```bash
cd shioaji-service
pip install -r requirements.txt
```

### 2. 設定環境變數

```bash
# 複製範例設定檔
cp .env.example .env

# 編輯 .env 填入富邦期貨帳號密碼
nano .env
```

### 3. 啟動服務

```bash
# 直接啟動
python3 app.py

# 或使用啟動腳本
chmod +x start.sh
./start.sh
```

服務將在 http://localhost:5000 啟動

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/login | 登入 Shioaji |
| POST | /api/logout | 登出 Shioaji |
| GET | /api/status | 取得連線狀態 |
| GET | /api/quote/:code | 取得股票報價 |
| GET | /api/kline/:code | 取得 K 線 |
| GET | /api/chip/:code | 法人籌碼 |
| GET | /api/tickers | 股票清單 |
| GET | /health | 健康檢查 |

## 使用範例

### 登入
```bash
curl -X POST http://localhost:5000/api/login
```

### 取得報價
```bash
curl http://localhost:5000/api/quote/2330
```

### 取得 K 線
```bash
curl "http://localhost:5000/api/kline/2330?days=30"
```

## Node.js 整合

Node.js 伺服器已整合 Shioaji 路由，可透過以下端點存取：

- `GET /api/shioaji/status`
- `GET /api/shioaji/quote/:code`
- `GET /api/shioaji/kline/:code`
- `GET /api/shioaji/chip/:code`
- `GET /api/shioaji/tickers`

## 注意事項

1. **帳號權限**：需要有效的富邦期貨帳號
2. **登入狀態**：服務會自動管理登入狀態
3. **數據限制**：法人籌碼數據需要額外數據源
4. **錯誤處理**：請查看日誌輸出除錯
