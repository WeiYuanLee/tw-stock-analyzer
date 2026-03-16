import React from 'react';

export function CSVExport({ data, isPro, filename = 'stock-filter-results' }) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert('沒有資料可匯出');
      return;
    }

    // Define CSV headers
    const headers = [
      '股票代號',
      '股票名稱',
      '收盤價',
      '漲跌幅(%)',
      '成交量',
      '法人買賣超(萬)',
      '主力買賣超(萬)',
      '融券餘額',
      '券增比(%)',
      '外資持股(%)',
      '20日均價',
      '60日均價',
      'RSI',
    ];

    // Convert data to CSV format
    const csvRows = [headers.join(',')];

    data.forEach(stock => {
      const row = [
        stock.code || '',
        stock.name || '',
        stock.price || '0',
        stock.changePercent || '0',
        stock.volume || '0',
        stock.foreignNet || '0',
        stock.mainForceNet || '0',
        stock.shortBalance || '0',
        stock.shortInterestRatio || '0',
        stock.foreignHolding || '0',
        stock.ma20 || '0',
        stock.ma60 || '0',
        stock.rsi || '0',
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isPro) {
    return (
      <div className="inline-flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-400 cursor-not-allowed">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        CSV 匯出 (Pro)
      </div>
    );
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      匯出 CSV
    </button>
  );
}

export default CSVExport;
