#!/bin/bash
# Shioaji 服務啟動腳本

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}啟動 Shioaji Python 服務...${NC}"

# 檢查 Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}錯誤: 未找到 Python3${NC}"
    exit 1
fi

# 檢查虛擬環境
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}建立虛擬環境...${NC}"
    python3 -m venv venv
fi

# 啟動虛擬環境
source venv/bin/activate

# 安裝依賴
echo -e "${YELLOW}安裝 Python 依賴...${NC}"
pip install -r requirements.txt

# 複製 .env 檔案（如果不存在）
if [ ! -f .env ]; then
    echo -e "${YELLOW}複製 .env.example 為 .env${NC}"
    cp .env.example .env
    echo -e "${RED}請編輯 .env 檔案填入 Shioaji 帳號密碼${NC}"
fi

# 啟動 Flask 服務
echo -e "${GREEN}啟動 Flask 服務...${NC}"
python3 app.py
