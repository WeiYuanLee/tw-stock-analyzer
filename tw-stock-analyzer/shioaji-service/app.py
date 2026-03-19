"""
Shioaji API 服務 - Flask 後端
提供 REST API 給 Node.js 調用
"""

import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

import shioaji_client

# 載入環境變數
load_dotenv()

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 建立 Flask 應用
app = Flask(__name__)

# 啟用 CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3001", "http://localhost:5173", "*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# 自動登入定時器
AUTO_LOGIN_ENABLED = os.getenv('AUTO_LOGIN_ENABLED', 'true').lower() == 'true'


def success_response(data, message='Success'):
    """成功回應格式"""
    return jsonify({
        'success': True,
        'message': message,
        'data': data
    })


def error_response(message, error=None, status_code=400):
    """錯誤回應格式"""
    response = {
        'success': False,
        'message': message
    }
    if error:
        response['error'] = str(error)
    return jsonify(response), status_code


# ==================== API 路由 ====================

@app.route('/api/login', methods=['POST'])
def login():
    """
    登入 Shioaji
    POST /api/login
    """
    try:
        result = shioaji_client.login()
        
        if result.get('success'):
            return success_response(result, '登入成功')
        else:
            return error_response(
                result.get('message', '登入失敗'),
                result.get('error'),
                401
            )
            
    except Exception as e:
        logger.error(f"登入 API 錯誤: {str(e)}")
        return error_response('登入失敗', str(e), 500)


@app.route('/api/logout', methods=['POST'])
def logout():
    """
    登出 Shioaji
    POST /api/logout
    """
    try:
        result = shioaji_client.logout()
        
        if result.get('success'):
            return success_response(result, '登出成功')
        else:
            return error_response('登出失敗', result.get('error'))
            
    except Exception as e:
        logger.error(f"登出 API 錯誤: {str(e)}")
        return error_response('登出失敗', str(e), 500)


@app.route('/api/status', methods=['GET'])
def status():
    """
    取得連線狀態
    GET /api/status
    """
    try:
        result = shioaji_client.get_status()
        return success_response(result)
        
    except Exception as e:
        logger.error(f"狀態 API 錯誤: {str(e)}")
        return error_response('取得狀態失敗', str(e), 500)


@app.route('/api/quote/<code>', methods=['GET'])
def quote(code):
    """
    取得股票報價
    GET /api/quote/:code
    
    Query Parameters:
        - code: 股票代碼（如 2330）
    """
    try:
        result = shioaji_client.get_quote(code)
        
        if result.get('success'):
            return success_response(result)
        else:
            return error_response(
                result.get('message', '取得報價失敗'),
                result.get('error'),
                404
            )
            
    except Exception as e:
        logger.error(f"報價 API 錯誤: {str(e)}")
        return error_response('取得報價失敗', str(e), 500)


@app.route('/api/kline/<code>', methods=['GET'])
def kline(code):
    """
    取得 K 線數據
    GET /api/kline/:code
    
    Query Parameters:
        - code: 股票代碼（如 2330）
        - days: 天數（預設 30）
    """
    try:
        days = request.args.get('days', 30, type=int)
        result = shioaji_client.get_kline(code, days)
        
        if result.get('success'):
            return success_response(result)
        else:
            return error_response(
                result.get('message', '取得K線失敗'),
                result.get('error'),
                404
            )
            
    except Exception as e:
        logger.error(f"K線 API 錯誤: {str(e)}")
        return error_response('取得K線失敗', str(e), 500)


@app.route('/api/chip/<code>', methods=['GET'])
def chip(code):
    """
    取得法人籌碼
    GET /api/chip/:code
    
    Query Parameters:
        - code: 股票代碼（如 2330）
    """
    try:
        result = shioaji_client.get_chip(code)
        
        if result.get('success'):
            return success_response(result)
        else:
            return error_response(
                result.get('message', '取得法人籌碼失敗'),
                result.get('error'),
                404
            )
            
    except Exception as e:
        logger.error(f"法人籌碼 API 錯誤: {str(e)}")
        return error_response('取得法人籌碼失敗', str(e), 500)


@app.route('/api/tickers', methods=['GET'])
def tickers():
    """
    取得股票清單
    GET /api/tickers
    """
    try:
        result = shioaji_client.get_tickers()
        
        if result.get('success'):
            return success_response(result)
        else:
            return error_response('取得股票清單失敗', result.get('error'))
            
    except Exception as e:
        logger.error(f"股票清單 API 錯誤: {str(e)}")
        return error_response('取得股票清單失敗', str(e), 500)


# ==================== 錯誤處理 ====================

@app.errorhandler(404)
def not_found(error):
    return error_response('API 不存在', str(error), 404)


@app.errorhandler(500)
def internal_error(error):
    return error_response('伺服器錯誤', str(error), 500)


@app.route('/health', methods=['GET'])
def health():
    """健康檢查"""
    return jsonify({
        'status': 'ok',
        'service': 'shioaji-api',
        'timestamp': __import__('datetime').datetime.now().isoformat()
    })


# ==================== 自動登入 ====================

def auto_login():
    """自動登入定時任務"""
    if AUTO_LOGIN_ENABLED:
        logger.info("執行自動登入...")
        result = shioaji_client.login()
        if result.get('success'):
            logger.info("自動登入成功")
        else:
            logger.warning(f"自動登入失敗: {result.get('message')}")


# ==================== 啟動 ====================

if __name__ == '__main__':
    PORT = int(os.getenv('SHIOAJI_PORT', 5000))
    
    # 啟動時嘗試自動登入
    auto_login()
    
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=os.getenv('DEBUG', 'false').lower() == 'true'
    )
