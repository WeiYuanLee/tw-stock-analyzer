"""
Shioaji 資料快取管理模組
使用 SQLite 作為快取儲存
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from contextlib import contextmanager
import os

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 快取資料庫路徑
CACHE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DB = os.path.join(CACHE_DIR, 'cache.db')

# 快取 TTL 設定（秒）
TTL_CONFIG = {
    'quote': 10,      # 報價: 10 秒
    'kline': 3600,    # K線: 1 小時
    'chip': 3600,     # 法人籌碼: 1 小時
    'ticker': 86400   # 股票清單: 24 小時
}


def get_db_connection():
    """取得資料庫連線"""
    conn = sqlite3.connect(CACHE_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_cache_db():
    """初始化快取資料庫"""
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS stock_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stock_code TEXT NOT NULL,
                data_type TEXT NOT NULL,
                data TEXT NOT NULL,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                UNIQUE(stock_code, data_type)
            )
        ''')
        conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_cache_expires ON stock_cache(expires_at)
        ''')
        conn.commit()
    logger.info("快取資料庫初始化完成")


def get_cached_data(stock_code: str, data_type: str) -> Optional[Dict[str, Any]]:
    """
    取得快取資料
    
    Args:
        stock_code: 股票代碼
        data_type: 資料類型 (quote, kline, chip, ticker)
    
    Returns:
        快取資料或 None（如果不存在或已過期）
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.execute('''
                SELECT data, expires_at FROM stock_cache
                WHERE stock_code = ? AND data_type = ?
            ''', (stock_code, data_type))
            
            row = cursor.fetchone()
            
            if row is None:
                return None
            
            # 檢查是否過期
            expires_at = datetime.fromisoformat(row['expires_at'])
            if datetime.now() > expires_at:
                # 已過期，刪除
                conn.execute('''
                    DELETE FROM stock_cache
                    WHERE stock_code = ? AND data_type = ?
                ''', (stock_code, data_type))
                conn.commit()
                return None
            
            # 回傳資料
            return json.loads(row['data'])
    
    except Exception as e:
        logger.error(f"取得快取失敗: {stock_code}/{data_type}: {str(e)}")
        return None


def set_cached_data(stock_code: str, data_type: str, data: Any, ttl_seconds: Optional[int] = None):
    """
    儲存快取資料
    
    Args:
        stock_code: 股票代碼
        data_type: 資料類型
        data: 要快取的資料（會轉為 JSON）
        ttl_seconds: 自訂 TTL 秒數，若為 None 則使用預設值
    """
    try:
        # 使用預設 TTL
        if ttl_seconds is None:
            ttl_seconds = TTL_CONFIG.get(data_type, 60)
        
        expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
        data_json = json.dumps(data, ensure_ascii=False)
        
        with get_db_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO stock_cache 
                (stock_code, data_type, data, cached_at, expires_at)
                VALUES (?, ?, ?, datetime('now'), ?)
            ''', (stock_code, data_type, data_json, expires_at.isoformat()))
            conn.commit()
        
        logger.debug(f"快取已儲存: {stock_code}/{data_type}, TTL: {ttl_seconds}s")
    
    except Exception as e:
        logger.error(f"儲存快取失敗: {stock_code}/{data_type}: {str(e)}")


def cleanup_expired_cache():
    """
    清理過期快取
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.execute('''
                DELETE FROM stock_cache
                WHERE expires_at < datetime('now')
            ''')
            conn.commit()
            
            deleted = cursor.rowcount
            if deleted > 0:
                logger.info(f"已清理 {deleted} 筆過期快取")
            
            return deleted
    
    except Exception as e:
        logger.error(f"清理過期快取失敗: {str(e)}")
        return 0


def clear_all_cache():
    """清除所有快取"""
    try:
        with get_db_connection() as conn:
            conn.execute('DELETE FROM stock_cache')
            conn.commit()
        logger.info("已清除所有快取")
    except Exception as e:
        logger.error(f"清除快取失敗: {str(e)}")


def get_cache_stats() -> Dict[str, Any]:
    """取得快取統計"""
    try:
        with get_db_connection() as conn:
            cursor = conn.execute('''
                SELECT 
                    data_type,
                    COUNT(*) as count,
                    MIN(expires_at) as oldest,
                    MAX(expires_at) as newest
                FROM stock_cache
                WHERE expires_at > datetime('now')
                GROUP BY data_type
            ''')
            
            stats = {}
            for row in cursor.fetchall():
                stats[row['data_type']] = {
                    'count': row['count'],
                    'oldest': row['oldest'],
                    'newest': row['newest']
                }
            
            return stats
    
    except Exception as e:
        logger.error(f"取得快取統計失敗: {str(e)}")
        return {}


# 初始化資料庫
init_cache_db()
