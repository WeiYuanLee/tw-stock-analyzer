import React, { useState, useEffect } from 'react';

// Mock industry data - in production, this would come from an API
const mockIndustryData = [
  { id: 'electronics', name: '電子類股', change: 2.35, stockCount: 245 },
  { id: 'financial', name: '金融類股', change: 0.87, stockCount: 78 },
  { id: 'traditional', name: '傳產類股', change: -0.45, stockCount: 156 },
  { id: 'construction', name: '營建類股', change: -1.23, stockCount: 67 },
  { id: 'food', name: '食品類股', change: 0.32, stockCount: 45 },
  { id: 'plastic', name: '塑膠類股', change: -2.15, stockCount: 34 },
  { id: 'steel', name: '鋼鐵類股', change: -3.45, stockCount: 28 },
  { id: 'textile', name: '紡織類股', change: -0.78, stockCount: 42 },
  { id: 'chemical', name: '化工類股', change: 1.56, stockCount: 38 },
  { id: 'tourism', name: '觀光類股', change: 3.21, stockCount: 23 },
  { id: 'semiconductor', name: '半導體', change: 2.87, stockCount: 56 },
  { id: 'communication', name: '通信網路', change: 1.12, stockCount: 67 },
  { id: 'computer', name: '電腦週邊', change: 0.45, stockCount: 89 },
  { id: 'optical', name: '光電類股', change: -1.87, stockCount: 45 },
  { id: 'shipping', name: '航運類股', change: -4.23, stockCount: 19 },
  { id: 'automobile', name: '汽車類股', change: 0.95, stockCount: 27 },
];

// Color helper functions
const getChangeColor = (change) => {
  if (change > 3) return { bg: '#B91C1C', text: '#FFFFFF' }; // up-strong
  if (change > 1) return { bg: '#EF4444', text: '#FFFFFF' }; // up-light
  if (change >= -1) return { bg: '#6B7280', text: '#FFFFFF' }; // neutral
  if (change >= -3) return { bg: '#10B981', text: '#FFFFFF' }; // down-light
  return { bg: '#047857', text: '#FFFFFF' }; // down-strong
};

const IndustryHeatmap = ({ 
  data = mockIndustryData, 
  onIndustryClick,
  className = '' 
}) => {
  const [hoveredIndustry, setHoveredIndustry] = useState(null);
  const [localData, setLocalData] = useState(data);

  // Use provided data or default to mock data
  useEffect(() => {
    if (data && data.length > 0) {
      setLocalData(data);
    } else {
      setLocalData(mockIndustryData);
    }
  }, [data]);

  const handleClick = (industry) => {
    onIndustryClick?.(industry);
  };

  return (
    <div className={`${className}`}>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <span className="text-gray-600 dark:text-gray-400">漲跌幅：</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#B91C1C' }}></span>
          <span className="text-gray-600 dark:text-gray-400">{' > 3%'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></span>
          <span className="text-gray-600 dark:text-gray-400">{' 1-3%'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#6B7280' }}></span>
          <span className="text-gray-600 dark:text-gray-400">{'-1~1%'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }}></span>
          <span className="text-gray-600 dark:text-gray-400">{'-1~-3%'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#047857' }}></span>
          <span className="text-gray-600 dark:text-gray-400">{' < -3%'}</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {localData.map((industry) => {
          const colors = getChangeColor(industry.change);
          const isHovered = hoveredIndustry === industry.id;
          
          return (
            <button
              key={industry.id}
              onClick={() => handleClick(industry)}
              onMouseEnter={() => setHoveredIndustry(industry.id)}
              onMouseLeave={() => setHoveredIndustry(null)}
              className={`
                relative flex flex-col justify-center items-center p-3 rounded-lg 
                transition-all duration-200 cursor-pointer
                ${isHovered ? 'transform scale-105 shadow-lg z-10' : 'shadow-sm'}
              `}
              style={{ 
                backgroundColor: colors.bg,
                color: colors.text,
              }}
            >
              <span className="font-semibold text-sm truncate w-full text-center">
                {industry.name}
              </span>
              <span className="font-mono text-xs mt-1">
                {industry.change > 0 ? '+' : ''}{industry.change.toFixed(2)}%
              </span>
              {industry.stockCount && (
                <span className="text-xs opacity-75 mt-0.5">
                  {industry.stockCount}檔
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Industry Detail */}
      {hoveredIndustry && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {localData.find(i => i.id === hoveredIndustry) && (
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {localData.find(i => i.id === hoveredIndustry).name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  點擊查看類股詳細資訊
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ 
                  color: getChangeColor(localData.find(i => i.id === hoveredIndustry).change).bg 
                }}>
                  {localData.find(i => i.id === hoveredIndustry).change > 0 ? '+' : ''}
                  {localData.find(i => i.id === hoveredIndustry).change.toFixed(2)}%
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {localData.find(i => i.id === hoveredIndustry).stockCount} 檔股票
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IndustryHeatmap;
