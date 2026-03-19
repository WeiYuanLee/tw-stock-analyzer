import React, { useState } from 'react';
import { useAuthStore } from '../store';
import IndustryHeatmap from '../components/IndustryHeatmap';

// Mock detailed industry stocks data
const industryStocksData = {
  electronics: {
    name: '電子類股',
    change: 2.35,
    stocks: [
      { code: '2330', name: '台積電', price: 1085, change: 2.35 },
      { code: '2317', name: '鴻海', price: 192.5, change: 1.32 },
      { code: '2454', name: '聯發科', price: 1495, change: -0.67 },
      { code: '2303', name: '聯電', price: 56.8, change: 2.11 },
      { code: '3034', name: '聯詠', price: 685, change: -0.45 },
    ]
  },
  financial: {
    name: '金融類股',
    change: 0.87,
    stocks: [
      { code: '2881', name: '富邦金', price: 78.9, change: 0.89 },
      { code: '2891', name: '中信金', price: 38.2, change: 1.45 },
      { code: '2882', name: '國泰金', price: 62.5, change: 0.45 },
      { code: '5871', name: '中租-KY', price: 215, change: -0.23 },
      { code: '6005', name: '元大金', price: 38.7, change: 0.78 },
    ]
  },
  semiconductor: {
    name: '半導體',
    change: 2.87,
    stocks: [
      { code: '2330', name: '台積電', price: 1085, change: 2.35 },
      { code: '2454', name: '聯發科', price: 1495, change: -0.67 },
      { code: '3034', name: '聯詠', price: 685, change: -0.45 },
      { code: '3711', name: '日月光', price: 158.5, change: 1.67 },
      { code: '5347', name: '世界', price: 89.3, change: 3.21 },
    ]
  },
  shipping: {
    name: '航運類股',
    change: -4.23,
    stocks: [
      { code: '2609', name: '陽明', price: 68.5, change: -2.15 },
      { code: '2615', name: '萬海', price: 89.3, change: 3.21 },
      { code: '2618', name: '長榮航', price: 38.9, change: 1.82 },
      { code: '2633', name: '台灣高鐵', price: 42.5, change: -0.45 },
      { code: '5607', name: '捷迅', price: 68.2, change: -1.23 },
    ]
  },
};

function HeatmapPage() {
  const { user } = useAuthStore();
  const membershipLevel = user?.membershipLevel || user?.membership_level || 'free';
  const isPro = membershipLevel === 'pro' || membershipLevel === 'vip';
  
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [industryStocks, setIndustryStocks] = useState(null);

  const handleIndustryClick = (industry) => {
    setSelectedIndustry(industry);
    // Get mock stocks for this industry
    const stocks = industryStocksData[industry.id] || null;
    setIndustryStocks(stocks);
  };

  const handleBackToHeatmap = () => {
    setSelectedIndustry(null);
    setIndustryStocks(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          產業熱力圖
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          類股漲跌一目了然
        </p>
      </div>

      {/* Main Content */}
      {selectedIndustry && industryStocks ? (
        /* Industry Detail View */
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={handleBackToHeatmap}
            className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回熱力圖
          </button>

          {/* Industry Header */}
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedIndustry.name}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  共 {industryStocks.stocks.length} 檔股票
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <div className={`text-3xl font-bold ${
                  selectedIndustry.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedIndustry.change > 0 ? '+' : ''}{selectedIndustry.change.toFixed(2)}%
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                  類股漲跌幅
                </p>
              </div>
            </div>
          </div>

          {/* Industry Stocks Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">類股成分股</h3>
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
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {industryStocks.stocks.map((stock) => (
                    <tr 
                      key={stock.code}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => {
                        // Navigate to stock analysis if needed
                      }}
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
                      <td className={`px-4 py-3 whitespace-nowrap text-right ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Heatmap View */
        <div className="card">
          <IndustryHeatmap onIndustryClick={handleIndustryClick} />
        </div>
      )}
    </div>
  );
}

export default HeatmapPage;
