import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../models/db.js';

const router = Router();

// Mock stock data generator
function generateMockStockData(stockCode) {
  const basePrice = 50 + Math.random() * 500;
  const volatility = 0.02 + Math.random() * 0.03;
  const change = (Math.random() - 0.5) * 2 * volatility;
  
  return {
    code: stockCode,
    name: `${stockCode} 名稱`,
    price: basePrice,
    changePercent: (change * 100).toFixed(2),
    volume: Math.floor(1000000 + Math.random() * 5000000),
    foreignNet: Math.floor((Math.random() - 0.4) * 5000000),
    mainForceNet: Math.floor((Math.random() - 0.45) * 3000000),
    shortInterestRatio: (Math.random() * 20).toFixed(2),
    shortChangeRate: (Math.random() * 30 - 10).toFixed(2),
    foreignHolding: (Math.random() * 40 + 5).toFixed(2),
    ma20: (basePrice * (1 + (Math.random() - 0.5) * 0.1)).toFixed(2),
    ma60: (basePrice * (1 + (Math.random() - 0.5) * 0.15)).toFixed(2),
    ma120: (basePrice * (1 + (Math.random() - 0.5) * 0.2)).toFixed(2),
    rsi: (Math.random() * 40 + 30).toFixed(1),
    macd: (Math.random() * 10 - 5).toFixed(2),
  };
}

// Get stock list with filters
router.get('/list', authenticate, (req, res) => {
  try {
    const { basic, advanced, page = 1, limit = 50 } = req.query;
    const user = req.user;
    
    // Get user membership level
    const userRecord = db.prepare('SELECT membership_level FROM users WHERE id = ?').get(user.id);
    const membershipLevel = userRecord?.membership_level || 'free';
    
    // Parse filters
    let filters = {};
    if (basic) {
      try {
        filters.basic = JSON.parse(basic);
      } catch (e) {
        filters.basic = {};
      }
    }
    if (advanced) {
      try {
        filters.advanced = JSON.parse(advanced);
      } catch (e) {
        filters.advanced = {};
      }
    }
    
    // Generate mock data
    const stockCodes = ['2330', '2454', '2317', '2308', '2412', '2882', '2891', '4938', '5347', '3034'];
    let stocks = stockCodes.map(code => generateMockStockData(code));
    
    // Apply basic filters
    if (filters.basic?.price) {
      const [op, val] = filters.basic.price.split(':');
      const value = parseFloat(val);
      if (!isNaN(value)) {
        if (op === '>') stocks = stocks.filter(s => s.price > value);
        else if (op === '<') stocks = stocks.filter(s => s.price < value);
      }
    }
    
    if (filters.basic?.volume) {
      const [op, val] = filters.basic.volume.split(':');
      const value = parseFloat(val);
      if (!isNaN(value)) {
        if (op === '>') stocks = stocks.filter(s => s.volume > value);
        else if (op === '<') stocks = stocks.filter(s => s.volume < value);
      }
    }
    
    // Apply advanced filters (Pro/VIP only)
    if (membershipLevel !== 'free' && filters.advanced) {
      const adv = filters.advanced;
      
      if (adv.foreignConsecutiveDays && adv.foreignConsecutiveDays !== '0') {
        stocks = stocks.filter(s => s.foreignNet > 0);
      }
      
      if (adv.shortInterestRatio && adv.shortInterestRatio !== '0') {
        const threshold = parseFloat(adv.shortInterestRatio);
        if (!isNaN(threshold)) {
          stocks = stocks.filter(s => parseFloat(s.shortInterestRatio) > threshold);
        }
      }
      
      if (adv.foreignHoldingRatio && adv.foreignHoldingRatio !== '0') {
        const threshold = parseFloat(adv.foreignHoldingRatio);
        if (!isNaN(threshold)) {
          stocks = stocks.filter(s => parseFloat(s.foreignHolding) > threshold);
        }
      }
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedStocks = stocks.slice(startIndex, startIndex + parseInt(limit));
    
    // Filter sensitive data for non-Pro users
    const sanitizedStocks = paginatedStocks.map(stock => {
      if (membershipLevel === 'free') {
        // Remove Pro-only data for free users
        return {
          code: stock.code,
          name: stock.name,
          price: stock.price,
          changePercent: stock.changePercent,
          volume: stock.volume,
        };
      }
      return stock;
    });
    
    res.json({
      data: sanitizedStocks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stocks.length,
        totalPages: Math.ceil(stocks.length / limit),
      },
      membershipLevel,
    });
  } catch (error) {
    console.error('Error fetching stock list:', error);
    res.status(500).json({ error: { message: '伺服器錯誤' } });
  }
});

// Get single stock detail
router.get('/:code', authenticate, (req, res) => {
  try {
    const { code } = req.params;
    const user = req.user;
    
    // Get user membership level
    const userRecord = db.prepare('SELECT membership_level FROM users WHERE id = ?').get(user.id);
    const membershipLevel = userRecord?.membership_level || 'free';
    
    const stockData = generateMockStockData(code);
    
    // Filter sensitive data for non-Pro users
    if (membershipLevel === 'free') {
      return res.json({
        data: {
          code: stockData.code,
          name: stockData.name,
          price: stockData.price,
          changePercent: stockData.changePercent,
          volume: stockData.volume,
        },
        membershipLevel,
        message: '升級 Pro 解鎖完整技術分析',
      });
    }
    
    res.json({
      data: stockData,
      membershipLevel,
    });
  } catch (error) {
    console.error('Error fetching stock detail:', error);
    res.status(500).json({ error: { message: '伺服器錯誤' } });
  }
});

// Get K-line data
router.get('/:code/kline', authenticate, (req, res) => {
  try {
    const { code } = req.params;
    const { period = '60' } = req.query;
    const user = req.user;
    
    // Get user membership level
    const userRecord = db.prepare('SELECT membership_level FROM users WHERE id = ?').get(user.id);
    const membershipLevel = userRecord?.membership_level || 'free';
    
    // Check Pro membership for K-line
    if (membershipLevel === 'free') {
      return res.status(403).json({ 
        error: { message: 'Pro 會員專屬功能' },
        requiresPro: true,
      });
    }
    
    // Generate mock K-line data
    const klineData = [];
    let basePrice = 100 + Math.random() * 200;
    const days = parseInt(period);
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const open = basePrice * (1 + (Math.random() - 0.5) * 0.02);
      const close = open * (1 + (Math.random() - 0.5) * 0.04);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = Math.floor(1000000 + Math.random() * 5000000);
      
      klineData.push({
        time: date.toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
      });
      
      basePrice = close;
    }
    
    res.json({
      data: klineData,
      period: days,
    });
  } catch (error) {
    console.error('Error fetching K-line:', error);
    res.status(500).json({ error: { message: '伺服器錯誤' } });
  }
});

export default router;
