import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { stockAPI } from '../services/stockApi';
import StockChart from '../components/StockChart';
import { RSIChart, MACDChart } from '../components/TechnicalIndicators';
import MarketRegime from '../components/MarketRegime';
import AdvancedFilters from '../components/AdvancedFilters';
import CSVExport from '../components/CSVExport';
import StockAutocomplete from '../components/StockAutocomplete';

function StockAnalysis() {
  const { user } = useAuthStore();
  // Handle both membershipLevel and membership_level field names
  const membershipLevel = user?.membershipLevel || user?.membership_level || 'free';
  const isPro = membershipLevel === 'pro' || membershipLevel === 'vip';
  
  const [activeTab, setActiveTab] = useState('screening');
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [marketIndex, setMarketIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Filters state
  const [basicFilters, setBasicFilters] = useState({
    price: '',
    volume: '',
  });
  const [advancedFilters, setAdvancedFilters] = useState({});

  useEffect(() => {
    fetchStocks();
    fetchMarketIndex();
  }, []);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const data = await stockAPI.getStocks();
      setStocks(data);
      setFilteredStocks(data);
    } catch (error) {
      console.error('Failed to fetch stocks:', error);
    }
    setLoading(false);
  };

  const fetchMarketIndex = async () => {
    try {
      const data = await stockAPI.getMarketIndex();
      setMarketIndex(data);
    } catch (error) {
      console.error('Failed to fetch market index:', error);
    }
  };

  const fetchChartData = async (stockCode) => {
    setLoading(true);
    try {
      const data = await stockAPI.getCandlestickData(stockCode);
      setChartData(data);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
    setLoading(false);
  };

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    fetchChartData(stock.code);
  };

  const handleBasicFilterChange = (key, value) => {
    const newFilters = { ...basicFilters, [key]: value };
    setBasicFilters(newFilters);
    applyFilters(newFilters, advancedFilters);
  };

  const handleAdvancedFilterChange = (filters) => {
    setAdvancedFilters(filters);
    applyFilters(basicFilters, filters);
  };

  const applyFilters = (basic, advanced) => {
    let results = [...stocks];
    
    // Apply basic filters
    if (basic.price) {
      const [op, val] = basic.price.split(':');
      const value = parseFloat(val);
      if (!isNaN(value)) {
        if (op === '>') results = results.filter(s => s.price > value);
        else if (op === '<') results = results.filter(s => s.price < value);
      }
    }
    
    if (basic.volume) {
      const [op, val] = basic.volume.split(':');
      const value = parseFloat(val);
      if (!isNaN(value)) {
        if (op === '>') results = results.filter(s => s.volume > value);
        else if (op === '<') results = results.filter(s => s.volume < value);
      }
    }
    
    // Apply advanced filters (Pro only)
    if (isPro && advanced.foreignConsecutiveDays && advanced.foreignConsecutiveDays !== '0') {
      // Filter by foreign consecutive days (based on foreignNet data)
      const days = parseInt(advanced.foreignConsecutiveDays);
      if (!isNaN(days) && days > 0) {
        // Filter stocks with positive foreign net buying in consecutive days
        results = results.filter(s => s.foreignNet > 0);
      }
    }
    
    if (isPro && advanced.shortInterestRatio && advanced.shortInterestRatio !== '0') {
      const threshold = parseFloat(advanced.shortInterestRatio);
      if (!isNaN(threshold)) {
        results = results.filter(s => parseFloat(s.shortInterestRatio) > threshold);
      }
    }
    
    setFilteredStocks(results);
  };

  const renderStockTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              代號
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              名稱
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              價格
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              漲跌幅
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              成交量
            </th>
            {isPro && (
              <>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  法人買賣超
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  券增比
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  RSI
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {filteredStocks.map((stock) => (
            <tr 
              key={stock.code} 
              onClick={() => handleStockSelect(stock)}
              className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedStock?.code === stock.code ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
            >
              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                {stock.code}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                {stock.name}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-gray-900 dark:text-white">
                {stock.price}
              </td>
              <td className={`px-4 py-3 whitespace-nowrap text-right ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent}%
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                {(stock.volume / 1000000).toFixed(2)}M
              </td>
              {isPro && (
                <>
                  <td className={`px-4 py-3 whitespace-nowrap text-right hidden lg:table-cell ${stock.foreignNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(stock.foreignNet / 10000).toFixed(1)}萬
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right hidden lg:table-cell text-gray-600 dark:text-gray-300">
                    {stock.shortInterestRatio}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right hidden lg:table-cell text-gray-600 dark:text-gray-300">
                    {stock.rsi}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            股票分析
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            進階篩選與技術分析
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          {/* Market Index */}
          {marketIndex && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-right">
                <p className="text-gray-500">加權指數</p>
                <p className={`font-semibold ${marketIndex.taiex.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {marketIndex.taiex.value.toLocaleString()}
                  <span className="ml-1">
                    ({marketIndex.taiex.change >= 0 ? '+' : ''}{marketIndex.taiex.changePercent.toFixed(2)}%)
                  </span>
                </p>
              </div>
            </div>
          )}
          
          {/* CSV Export */}
          <CSVExport data={filteredStocks} isPro={isPro} filename="stock-screening" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('screening')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'screening'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            股票篩選
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'chart'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            技術線圖 {isPro ? '' : '🔒'}
          </button>
        </nav>
      </div>

      {/* Screening Tab */}
      {activeTab === 'screening' && (
        <div className="space-y-6">
          {/* Basic Filters */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">基本篩選條件</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  股價範圍
                </label>
                <select
                  value={basicFilters.price}
                  onChange={(e) => handleBasicFilterChange('price', e.target.value)}
                  className="input-field"
                >
                  <option value="">不限</option>
                  <option value="<:50">50 元以下</option>
                  <option value=">:50">50 元以上</option>
                  <option value=">:100">100 元以上</option>
                  <option value=">:500">500 元以上</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  成交量
                </label>
                <select
                  value={basicFilters.volume}
                  onChange={(e) => handleBasicFilterChange('volume', e.target.value)}
                  className="input-field"
                >
                  <option value="">不限</option>
                  <option value=">:5000000">500 萬股以上</option>
                  <option value=">:10000000">1000 萬股以上</option>
                  <option value=">:20000000">2000 萬股以上</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setBasicFilters({ price: '', volume: '' });
                    setAdvancedFilters({});
                    setFilteredStocks(stocks);
                  }}
                  className="btn-secondary w-full"
                >
                  清除篩選
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters (Pro only) */}
          <AdvancedFilters 
            filters={advancedFilters} 
            onChange={handleAdvancedFilterChange}
            isPro={isPro}
          />

          {/* Results */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                篩選結果
              </h3>
              <span className="text-sm text-gray-500">
                共 {filteredStocks.length} 檔
              </span>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredStocks.length === 0 ? (
              <p className="text-center py-8 text-gray-500">沒有符合條件的股票</p>
            ) : (
              renderStockTable()
            )}
          </div>
        </div>
      )}

      {/* Chart Tab */}
      {activeTab === 'chart' && (
        <div className="space-y-6">
          {/* Stock Selector */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">選擇股票</h3>
            <div className="mb-4">
              <StockAutocomplete
                value={selectedStock?.code || ''}
                onChange={(code) => {
                  const stock = stocks.find(s => s.code === code);
                  if (stock) handleStockSelect(stock);
                }}
                onSelect={(stock) => handleStockSelect(stock)}
                placeholder="搜尋股票代碼或名稱..."
              />
            </div>
            {/* Quick select buttons */}
            <div className="flex flex-wrap gap-2">
              {stocks.slice(0, 10).map((stock) => (
                <button
                  key={stock.code}
                  onClick={() => handleStockSelect(stock)}
                  className={`px-3 py-2 rounded-lg text-center transition-colors ${
                    selectedStock?.code === stock.code
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium text-sm">{stock.code}</div>
                  <div className="text-xs opacity-75">{stock.price}</div>
                </button>
              ))}
            </div>
          </div>

          {isPro ? (
            selectedStock ? (
              <div className="space-y-6">
                {/* Stock Info */}
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedStock.code} {selectedStock.name}
                      </h2>
                      <p className="text-3xl font-bold mt-1">
                        <span className="text-gray-900 dark:text-white">
                          {selectedStock.price}
                        </span>
                        <span className={`ml-2 text-lg ${selectedStock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent}%
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>成交量: {(selectedStock.volume / 1000000).toFixed(2)}M</p>
                      {selectedStock.ma20 && <p>MA20: {selectedStock.ma20}</p>}
                      {selectedStock.ma60 && <p>MA60: {selectedStock.ma60}</p>}
                    </div>
                  </div>
                </div>

                {/* K-line Chart */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">K線圖 + 均線</h3>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  ) : (
                    <StockChart data={chartData} height={400} />
                  )}
                  <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
                    <span className="flex items-center">
                      <span className="w-3 h-3 bg-orange-500 mr-1"></span>
                      MA5
                    </span>
                    <span className="flex items-center">
                      <span className="w-3 h-3 bg-purple-500 mr-1"></span>
                      MA10
                    </span>
                    <span className="flex items-center">
                      <span className="w-3 h-3 bg-cyan-500 mr-1"></span>
                      MA20
                    </span>
                    <span className="flex items-center">
                      <span className="w-3 h-3 bg-pink-500 mr-1"></span>
                      MA60
                    </span>
                  </div>
                </div>

                {/* RSI */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">RSI 指標</h3>
                  <RSIChart data={chartData} period={14} height={150} />
                </div>

                {/* MACD */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">MACD 指標</h3>
                  <MACDChart data={chartData} height={150} />
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    請選擇股票
                  </h3>
                  <p className="text-gray-500 mt-2">
                    點擊上方股票代碼查看技術線圖
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="card bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-4xl mb-3">🔒</div>
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                    Pro 會員專屬功能
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    升級至 Pro 會員解鎖技術線圖
                  </p>
                  <button className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                    立即升級 Pro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Market Regime */}
          {isPro && chartData.length > 0 && (
            <MarketRegime data={chartData} />
          )}
        </div>
      )}
    </div>
  );
}

export default StockAnalysis;
