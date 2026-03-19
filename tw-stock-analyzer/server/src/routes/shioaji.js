/**
 * Shioaji API 路由
 * 調用 Python Shioaji 服務取得真實股票數據
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Python Shioaji 服務地址
const SHIOAJI_BASE_URL = process.env.SHIOAJI_BASE_URL || 'http://localhost:5000';

// 錯誤處理輔助函數
const handleApiError = (error, res, endpoint) => {
  console.error(`Shioaji API Error (${endpoint}):`, error.message);
  
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Shioaji 服務未啟動，請先啟動 Python 服務',
      error: 'Service unavailable'
    });
  }
  
  if (error.response) {
    return res.status(error.response.status).json({
      success: false,
      message: error.response.data?.message || 'API 錯誤',
      error: error.response.data?.error
    });
  }
  
  return res.status(500).json({
    success: false,
    message: '無法取得數據',
    error: error.message
  });
};

// ==================== API 路由 ====================

/**
 * POST /api/shioaji/login
 * 登入 Shioaji
 */
router.post('/login', async (req, res) => {
  try {
    const response = await axios.post(`${SHIOAJI_BASE_URL}/api/login`);
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res, 'login');
  }
});

/**
 * POST /api/shioaji/logout
 * 登出 Shioaji
 */
router.post('/logout', async (req, res) => {
  try {
    const response = await axios.post(`${SHIOAJI_BASE_URL}/api/logout`);
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res, 'logout');
  }
});

/**
 * GET /api/shioaji/status
 * 取得連線狀態
 */
router.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${SHIOAJI_BASE_URL}/api/status`);
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res, 'status');
  }
});

/**
 * GET /api/shioaji/quote/:code
 * 取得股票報價
 * 
 * Query:
 *   - code: 股票代碼（如 2330）
 */
router.get('/quote/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const response = await axios.get(`${SHIOAJI_BASE_URL}/api/quote/${code}`);
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res, `quote/${req.params.code}`);
  }
});

/**
 * GET /api/shioaji/kline/:code
 * 取得 K 線數據
 * 
 * Query:
 *   - code: 股票代碼（如 2330）
 *   - days: 天數（預設 30）
 */
router.get('/kline/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { days } = req.query;
    
    const url = `${SHIOAJI_BASE_URL}/api/kline/${code}${days ? `?days=${days}` : ''}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res, `kline/${req.params.code}`);
  }
});

/**
 * GET /api/shioaji/chip/:code
 * 取得法人籌碼
 * 
 * Query:
 *   - code: 股票代碼（如 2330）
 */
router.get('/chip/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const response = await axios.get(`${SHIOAJI_BASE_URL}/api/chip/${code}`);
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res, `chip/${req.params.code}`);
  }
});

/**
 * GET /api/shioaji/tickers
 * 取得股票清單
 */
router.get('/tickers', async (req, res) => {
  try {
    const response = await axios.get(`${SHIOAJI_BASE_URL}/api/tickers`);
    res.json(response.data);
  } catch (error) {
    handleApiError(error, res, 'tickers');
  }
});

/**
 * GET /api/shioaji/health
 * 健康檢查
 */
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${SHIOAJI_BASE_URL}/health`);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Shioaji service unavailable'
    });
  }
});

export default router;
