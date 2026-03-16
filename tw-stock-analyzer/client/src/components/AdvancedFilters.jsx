import React, { useState } from 'react';

export function AdvancedFilters({ filters, onChange, isPro }) {
  const [localFilters, setLocalFilters] = useState({
    // Institutional trading
    foreignConsecutiveDays: '0', // 3, 5, 10 days
    foreignNetAmount: '0', // minimum net amount
    
    // Short selling
    shortInterestRatio: '0', // margin balance / volume
    shortChangeRate: '0', // short change rate
    
    // Main force
    mainForceConsecutiveDays: '0',
    mainForceNetAmount: '0',
    
    // Holdings
    foreignHoldingRatio: '0', // foreign holdings ratio
    
    // Price range
    priceHighDays: '20',
    priceHighValue: '0',
    priceLowDays: '20',
    priceLowValue: '0',
    ...filters,
  });

  const handleChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  if (!isPro) {
    return (
      <div className="card bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              Pro 會員專屬功能
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
              升級至 Pro 會員解鎖進階篩選條件
            </p>
            <button className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
              立即升級 Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">進階篩選條件</h3>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Institutional Trading Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
            法人連續買賣超
          </h4>
          
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              連續天數
            </label>
            <select
              value={localFilters.foreignConsecutiveDays}
              onChange={(e) => handleChange('foreignConsecutiveDays', e.target.value)}
              className="input-field"
            >
              <option value="0">不限</option>
              <option value="3">連續 3 日買超</option>
              <option value="5">連續 5 日買超</option>
              <option value="10">連續 10 日買超</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              買賣超金額 (萬)
            </label>
            <select
              value={localFilters.foreignNetAmount}
              onChange={(e) => handleChange('foreignNetAmount', e.target.value)}
              className="input-field"
            >
              <option value="0">不限</option>
              <option value="1000">大於 1000 萬</option>
              <option value="3000">大於 3000 萬</option>
              <option value="5000">大於 5000 萬</option>
            </select>
          </div>
        </div>

        {/* Short Selling Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
            融券券增比
          </h4>
          
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              券增比 (%)
            </label>
            <select
              value={localFilters.shortInterestRatio}
              onChange={(e) => handleChange('shortInterestRatio', e.target.value)}
              className="input-field"
            >
              <option value="0">不限</option>
              <option value="5">大於 5%</option>
              <option value="10">大於 10%</option>
              <option value="20">大於 20%</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              融券變化率 (%)
            </label>
            <select
              value={localFilters.shortChangeRate}
              onChange={(e) => handleChange('shortChangeRate', e.target.value)}
              className="input-field"
            >
              <option value="0">不限</option>
              <option value="10">大於 10%</option>
              <option value="20">大於 20%</option>
              <option value="30">大於 30%</option>
            </select>
          </div>
        </div>

        {/* Main Force Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
            主力連續買賣超
          </h4>
          
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              連續天數
            </label>
            <select
              value={localFilters.mainForceConsecutiveDays}
              onChange={(e) => handleChange('mainForceConsecutiveDays', e.target.value)}
              className="input-field"
            >
              <option value="0">不限</option>
              <option value="3">連續 3 日</option>
              <option value="5">連續 5 日</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              主力買賣超 (萬)
            </label>
            <select
              value={localFilters.mainForceNetAmount}
              onChange={(e) => handleChange('mainForceNetAmount', e.target.value)}
              className="input-field"
            >
              <option value="0">不限</option>
              <option value="500">大於 500 萬</option>
              <option value="1000">大於 1000 萬</option>
              <option value="2000">大於 2000 萬</option>
            </select>
          </div>
        </div>

        {/* Foreign Holdings */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
            法人持股比率
          </h4>
          
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              外資持股比率 (%)
            </label>
            <select
              value={localFilters.foreignHoldingRatio}
              onChange={(e) => handleChange('foreignHoldingRatio', e.target.value)}
              className="input-field"
            >
              <option value="0">不限</option>
              <option value="10">大於 10%</option>
              <option value="20">大於 20%</option>
              <option value="30">大於 30%</option>
            </select>
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
            股價波段高點
          </h4>
          
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              計算天數
            </label>
            <select
              value={localFilters.priceHighDays}
              onChange={(e) => handleChange('priceHighDays', e.target.value)}
              className="input-field"
            >
              <option value="20">20 日</option>
              <option value="60">60 日</option>
              <option value="120">120 日</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              接近高點 (%)
            </label>
            <select
              value={localFilters.priceHighValue}
              onChange={(e) => handleChange('priceHighValue', e.target.value)}
              className="input-field"
            >
              <option value="0">不限</option>
              <option value="5">距離 5% 以內</option>
              <option value="10">距離 10% 以內</option>
            </select>
          </div>
        </div>

        {/* Price Low */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
            股價波段低點
          </h4>
          
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              計算天數
            </label>
            <select
              value={localFilters.priceLowDays}
              onChange={(e) => handleChange('priceLowDays', e.target.value)}
              className="input-field"
            >
              <option value="20">20 日</option>
              <option value="60">60 日</option>
              <option value="120">120 日</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              接近低點 (%)
            </label>
            <select
              value={localFilters.priceLowValue}
              onChange={(e) => handleChange('priceLowValue', e.target.value)}
              className="input-field"
            >
              <option value="0">不限</option>
              <option value="5">距離 5% 以內</option>
              <option value="10">距離 10% 以內</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedFilters;
