import axios from 'axios';

// Mock data generator for stock charts
// In production, this would connect to real Taiwan stock APIs

const generateMockCandleData = (days = 120) => {
  const data = [];
  let basePrice = 500 + Math.random() * 500;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const volatility = 0.02 + Math.random() * 0.03;
    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = basePrice;
    const close = basePrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(1000000 + Math.random() * 5000000);
    
    data.push({
      time: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
      foreignNet: Math.floor((Math.random() - 0.4) * 500000),
    });
    
    basePrice = close;
  }
  
  return data;
};

const mockStocks = [
  { code: '2330', name: '台積電', price: 1085, changePercent: 2.35, volume: 45230891 },
  { code: '2317', name: '鴻海', price: 192.5, changePercent: 1.32, volume: 12845678 },
  { code: '2454', name: '聯發科', price: 1495, changePercent: -0.67, volume: 3845678 },
  { code: '2881', name: '富邦金', price: 78.9, changePercent: 0.89, volume: 15678234 },
  { code: '2891', name: '中信金', price: 38.2, changePercent: 1.45, volume: 22345678 },
  { code: '2609', name: '陽明', price: 68.5, changePercent: -2.15, volume: 18923456 },
  { code: '2615', name: '萬海', price: 89.3, changePercent: 3.21, volume: 9876543 },
  { code: '2002', name: '中鋼', price: 45.8, changePercent: 0.55, volume: 12345678 },
  { code: '9919', name: '統一', price: 78.2, changePercent: -0.38, volume: 5432109 },
  { code: '2618', name: '長榮航', price: 38.9, changePercent: 1.82, volume: 18765432 },
  { code: '2409', name: '友達', price: 18.7, changePercent: -1.58, volume: 25678901 },
  { code: '3481', name: '群創', price: 15.2, changePercent: 0.99, volume: 32109876 },
  { code: '2303', name: '聯電', price: 56.8, changePercent: 2.11, volume: 45678901 },
  { code: '3034', name: '聯詠', price: 685, changePercent: -0.45, volume: 2345678 },
  { code: '3711', name: '日月光', price: 158.5, changePercent: 1.67, volume: 8765432 },
];

// Stock API
export const stockAPI = {
  // Get stock list with filters
  getStocks: async (filters = {}) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let results = [...mockStocks];
    
    // Apply basic filters
    if (filters.price) {
      const [op, val] = filters.price.split(':');
      const value = parseFloat(val);
      if (op === '>') results = results.filter(s => s.price > value);
      else if (op === '<') results = results.filter(s => s.price < value);
    }
    
    if (filters.volume) {
      const [op, val] = filters.volume.split(':');
      const value = parseFloat(val);
      if (op === '>') results = results.filter(s => s.volume > value);
      else if (op === '<') results = results.filter(s => s.volume < value);
    }
    
    // Add simulated advanced data
    return results.map(stock => ({
      ...stock,
      foreignNet: Math.floor((Math.random() - 0.4) * 5000000),
      mainForceNet: Math.floor((Math.random() - 0.45) * 3000000),
      shortBalance: Math.floor(Math.random() * 500000),
      shortInterestRatio: (Math.random() * 20).toFixed(2),
      shortChangeRate: (Math.random() * 30 - 10).toFixed(2),
      foreignHolding: (Math.random() * 40 + 5).toFixed(2),
      ma20: (stock.price * (1 + (Math.random() - 0.5) * 0.1)).toFixed(2),
      ma60: (stock.price * (1 + (Math.random() - 0.5) * 0.15)).toFixed(2),
      ma120: (stock.price * (1 + (Math.random() - 0.5) * 0.2)).toFixed(2),
      rsi: (Math.random() * 40 + 30).toFixed(1),
      macd: (Math.random() * 10 - 5).toFixed(2),
    }));
  },
  
  // Get stock candlestick data
  getCandlestickData: async (stockCode) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockCandleData(120);
  },
  
  // Get market index data
  getMarketIndex: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      taiex: {
        value: 21567.89,
        change: 127.45,
        changePercent: 0.59,
      },
      weight: {
        value: 4856.78,
        change: 23.45,
        changePercent: 0.48,
      },
    };
  },
};

export default stockAPI;
