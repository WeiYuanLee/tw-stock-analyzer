"""
Shioaji Client - 富邦期貨 API 包裝
用於取得台灣股票真實數據
"""

import os
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

import shioaji as sj
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ShioajiClient:
    """Shioaji API 客戶端"""
    
    def __init__(self):
        self.api: Optional[sj.Shioaji] = None
        self.connected = False
        self.last_login_time: Optional[datetime] = None
        self.login_timeout = 3600  # 1小時後需要重新登入
        
        # 從環境變數取得帳號密碼
        self.account = os.getenv('SHIOAJI_ACCOUNT', '')
        self.password = os.getenv('SHIOAJI_PASSWORD', '')
        self.api_key = os.getenv('SHIOAJI_API_KEY', '')
        self.secret_key = os.getenv('SHIOAJI_SECRET_KEY', '')
        
    def is_login_valid(self) -> bool:
        """檢查登入是否有效"""
        if not self.connected or not self.last_login_time:
            return False
        elapsed = (datetime.now() - self.last_login_time).total_seconds()
        return elapsed < self.login_timeout
    
    def login(self) -> Dict[str, Any]:
        """
        登入 Shioaji
        """
        try:
            if self.is_login_valid():
                return {'success': True, 'message': 'Already logged in', 'connected': True}
            
            # 檢查帳號密碼是否存在
            if not self.account or not self.password:
                return {
                    'success': False, 
                    'error': 'Missing credentials',
                    'message': '請在 .env 檔案中設定 SHIOAJI_ACCOUNT 和 SHIOAJI_PASSWORD'
                }
            
            # 建立 API 實例
            self.api = sj.Shioaji()
            
            # 登入
            self.api.login(
                person_id=self.account,
                passwd=self.password,
                contracts=False
            )
            
            self.connected = True
            self.last_login_time = datetime.now()
            
            logger.info(f"Shioaji 登入成功 - 帳號: {self.account}")
            
            return {
                'success': True, 
                'message': 'Login successful',
                'connected': True,
                'login_time': self.last_login_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Shioaji 登入失敗: {str(e)}")
            self.connected = False
            return {
                'success': False,
                'error': str(e),
                'message': f'登入失敗: {str(e)}'
            }
    
    def logout(self) -> Dict[str, Any]:
        """
        登出 Shioaji
        """
        try:
            if self.api:
                self.api.logout()
            
            self.connected = False
            self.last_login_time = None
            
            logger.info("Shioaji 已登出")
            
            return {'success': True, 'message': 'Logout successful'}
            
        except Exception as e:
            logger.error(f"登出失敗: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_quote(self, code: str) -> Dict[str, Any]:
        """
        取得股票報價
        
        Args:
            code: 股票代碼（如 '2330'）
        """
        try:
            if not self.is_login_valid():
                login_result = self.login()
                if not login_result.get('success'):
                    return login_result
            
            # 確保登入
            self.login()
            
            # 取得合約
            contract = self.api.Contracts.Stocks[code]
            
            if not contract:
                return {'success': False, 'error': f'找不到股票代碼: {code}'}
            
            # 取得報價
            quote = self.api.quote(contract)
            
            # 解析報價數據
            result = {
                'success': True,
                'code': code,
                'name': contract.name,
                'price': float(quote.get('close', 0)),
                'open': float(quote.get('open', 0)),
                'high': float(quote.get('high', 0)),
                'low': float(quote.get('low', 0)),
                'volume': int(quote.get('volume', 0)),
                'amount': int(quote.get('amount', 0)),
                'change': float(quote.get('change', 0)),
                'change_percent': float(quote.get('pct_chg', 0)),
                'timestamp': quote.get('datetime', '')
            }
            
            return result
            
        except Exception as e:
            logger.error(f"取得報價失敗 {code}: {str(e)}")
            return {'success': False, 'error': str(e), 'code': code}
    
    def get_kline(self, code: str, days: int = 30) -> Dict[str, Any]:
        """
        取得 K 線數據
        
        Args:
            code: 股票代碼（如 '2330'）
            days: 天數
        """
        try:
            if not self.is_login_valid():
                self.login()
            
            # 取得合約
            contract = self.api.Contracts.Stocks[code]
            
            if not contract:
                return {'success': False, 'error': f'找不到股票代碼: {code}'}
            
            # 計算日期範圍
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days * 2)  # 多抓一些以防假日的數據
            
            # 取得 K 線
            kbars = self.api.kbars(
                contract=contract,
                start=start_date.strftime('%Y-%m-%d'),
                end=end_date.strftime('%Y-%m-%d')
            )
            
            # 轉換為列表
            kline_data = []
            for i in range(len(kbars['ts'])):
                kline_data.append({
                    'date': kbars['ts'][i],
                    'open': float(kbars['Open'][i]),
                    'high': float(kbars['High'][i]),
                    'low': float(kbars['Low'][i]),
                    'close': float(kbars['Close'][i]),
                    'volume': int(kbars['Volume'][i])
                })
            
            # 只保留最後 days 筆
            kline_data = kline_data[-days:]
            
            return {
                'success': True,
                'code': code,
                'name': contract.name,
                'kline': kline_data,
                'count': len(kline_data)
            }
            
        except Exception as e:
            logger.error(f"取得K線失敗 {code}: {str(e)}")
            return {'success': False, 'error': str(e), 'code': code}
    
    def get_chip(self, code: str) -> Dict[str, Any]:
        """
        取得法人籌碼數據
        
        Args:
            code: 股票代碼（如 '2330'）
        """
        try:
            if not self.is_login_valid():
                self.login()
            
            # 取得法人買賣
            # 注意: Shioaji 的法人數據需要訂閱
            # 這裡模擬返回結構，實際數據需要從 quote 获取
            
            contract = self.api.Contracts.Stocks[code]
            
            if not contract:
                return {'success': False, 'error': f'找不到股票代碼: {code}'}
            
            # 嘗試獲取籌碼數據
            # Shioaji 目前沒有直接的法人數據 API，這裡返回模擬結構
            # 實際實現可能需要使用其他數據源
            
            return {
                'success': True,
                'code': code,
                'name': contract.name,
                'message': '法人籌碼數據需要額外數據源',
                # 預留欄位結構
                'foreign_buy': 0,
                'foreign_sell': 0,
                'foreign_net': 0,
                'dealer_buy': 0,
                'dealer_sell': 0,
                'dealer_net': 0,
                'main_force_buy': 0,
                'main_force_sell': 0,
                'main_force_net': 0,
                'date': datetime.now().strftime('%Y-%m-%d')
            }
            
        except Exception as e:
            logger.error(f"取得法人籌碼失敗 {code}: {str(e)}")
            return {'success': False, 'error': str(e), 'code': code}
    
    def get_tickers(self) -> Dict[str, Any]:
        """
        取得股票清單
        """
        try:
            if not self.is_login_valid():
                self.login()
            
            # 取得所有股票
            stocks = self.api.Contracts.Stocks
            
            tickers = []
            for code, contract in stocks.items():
                if hasattr(contract, 'name') and contract.name:
                    tickers.append({
                        'code': code,
                        'name': contract.name,
                        'category': getattr(contract, 'category', '股票')
                    })
            
            return {
                'success': True,
                'tickers': tickers,
                'count': len(tickers)
            }
            
        except Exception as e:
            logger.error(f"取得股票清單失敗: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_status(self) -> Dict[str, Any]:
        """
        取得連線狀態
        """
        return {
            'connected': self.connected,
            'is_login_valid': self.is_login_valid(),
            'last_login_time': self.last_login_time.isoformat() if self.last_login_time else None,
            'account': self.account[:4] + '****' if self.account else None
        }


# 全域客戶端實例
_client: Optional[ShioajiClient] = None


def get_client() -> ShioajiClient:
    """取得全域客戶端"""
    global _client
    if _client is None:
        _client = ShioajiClient()
    return _client


def login() -> Dict[str, Any]:
    """登入"""
    return get_client().login()


def logout() -> Dict[str, Any]:
    """登出"""
    return get_client().logout()


def get_quote(code: str) -> Dict[str, Any]:
    return get_client().logout()


def get_quote(code: str) -> Dict[str, Any]:
    """取得報價"""
    return get_client().get_quote(code)


def get_kline(code: str, days: int = 30) -> Dict[str, Any]:
    """取得 K 線"""
    return get_client().get_kline(code, days)


def get_chip(code: str) -> Dict[str, Any]:
    """取得法人籌碼"""
    return get_client().get_chip(code)


def get_tickers() -> Dict[str, Any]:
    """取得股票清單"""
    return get_client().get_tickers()


def get_status() -> Dict[str, Any]:
    """取得狀態"""
    return get_client().get_status()
