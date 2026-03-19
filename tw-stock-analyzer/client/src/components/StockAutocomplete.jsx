import React, { useState, useEffect, useRef } from 'react';
import { stockAPI } from '../services/stockApi';

// Mock stock list with category (上市/上櫃)
const mockStockList = [
  { code: '2330', name: '台積電', category: '上市' },
  { code: '2317', name: '鴻海', category: '上市' },
  { code: '2454', name: '聯發科', category: '上市' },
  { code: '2881', name: '富邦金', category: '上市' },
  { code: '2891', name: '中信金', category: '上市' },
  { code: '2609', name: '陽明', category: '上市' },
  { code: '2615', name: '萬海', category: '上市' },
  { code: '2002', name: '中鋼', category: '上市' },
  { code: '9919', name: '統一', category: '上市' },
  { code: '2618', name: '長榮航', category: '上市' },
  { code: '2409', name: '友達', category: '上市' },
  { code: '3481', name: '群創', category: '上市' },
  { code: '2303', name: '聯電', category: '上市' },
  { code: '3034', name: '聯詠', category: '上市' },
  { code: '3711', name: '日月光', category: '上市' },
  { code: '2478', name: '大毅', category: '上櫃' },
  { code: '3105', name: '穩懋', category: '上櫃' },
  { code: '6412', name: '群星', category: '上櫃' },
  { code: '6464', name: '雲豹能源', category: '上櫃' },
  { code: '6512', name: '信驊', category: '上櫃' },
  { code: '6552', name: '易華電', category: '上櫃' },
  { code: '6706', name: '惠特', category: '上櫃' },
  { code: '6733', name: '博晟生醫', category: '上櫃' },
  { code: '6815', name: '巨有科技', category: '上櫃' },
  { code: '8011', name: '台通', category: '上櫃' },
  { code: '8081', name: '乾坤', category: '上櫃' },
  { code: '6223', name: '旺矽', category: '上櫃' },
  { code: '4953', name: '鼎天', category: '上櫃' },
  { code: '6166', name: '虹光', category: '上櫃' },
  { code: '6238', name: '勝麗', category: '上櫃' },
];

const StockAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = '輸入股票代碼或名稱', 
  className = '',
  onSelect 
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [stocks, setStocks] = useState([]);
  const wrapperRef = useRef(null);

  // Fetch stocks on mount
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const data = await stockAPI.getStocks();
        // Merge API data with category info
        const stocksWithCategory = data.map(stock => {
          const existing = mockStockList.find(s => s.code === stock.code);
          return {
            code: stock.code,
            name: stock.name,
            category: existing?.category || '上市',
            price: stock.price,
            changePercent: stock.changePercent,
            volume: stock.volume,
          };
        });
        setStocks(stocksWithCategory);
      } catch (error) {
        // Fallback to mock list
        setStocks(mockStockList.map(s => ({
          ...s,
          price: 0,
          changePercent: 0,
          volume: 0,
        })));
      }
    };
    fetchStocks();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fuzzy search
  const searchStocks = (query) => {
    if (!query.trim()) {
      return [];
    }
    const lowerQuery = query.toLowerCase();
    return stocks
      .filter(stock => 
        stock.code.toLowerCase().includes(lowerQuery) ||
        stock.name.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 10); // Limit to 10 results
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setInputValue(value);
    const results = searchStocks(value);
    setSuggestions(results);
    setShowDropdown(results.length > 0);
    setHighlightedIndex(-1);
    onChange?.(value);
  };

  const handleSelect = (stock) => {
    setInputValue(stock.code);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    onSelect?.(stock);
    onChange?.(stock.code);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Sync external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            const results = searchStocks(inputValue);
            setSuggestions(results);
            setShowDropdown(results.length > 0);
          }}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:text-white text-sm"
          autoComplete="off"
        />
        {/* Search icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {suggestions.map((stock, index) => (
            <li
              key={stock.code}
              onClick={() => handleSelect(stock)}
              className={`px-4 py-3 cursor-pointer flex items-center gap-4 transition-colors duration-150 ${
                index === highlightedIndex
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="font-mono font-semibold text-primary-600 dark:text-primary-400 min-w-[48px]">
                {stock.code}
              </span>
              <span className="flex-1 truncate text-gray-900 dark:text-gray-100 font-medium">
                {stock.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {stock.category}
              </span>
              {stock.price > 0 && (
                <span className={`text-sm font-medium ${
                  stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent}%
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StockAutocomplete;
