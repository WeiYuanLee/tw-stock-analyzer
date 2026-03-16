import React from 'react';

export function MarketRegime({ data }) {
  // Determine market regime based on technical analysis
  const regime = calculateRegime(data);

  const getRegimeConfig = () => {
    switch (regime.type) {
      case 'bull':
        return {
          label: '多頭市場',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
          icon: '📈',
          description: '季線 > 半年線 > 年線，趨勢向上',
        };
      case 'bear':
        return {
          label: '空頭市場',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
          icon: '📉',
          description: '季線 < 半年線 < 年線，趨勢向下',
        };
      case 'range':
        return {
          label: '盤整市場',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
          icon: '➡️',
          description: '均線糾結，市場方向不明',
        };
      default:
        return {
          label: '分析中',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
          icon: '🔄',
          description: '資料不足，無法判斷',
        };
    }
  };

  const config = getRegimeConfig();

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h3 className="text-lg font-semibold">市場環境判斷</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full font-semibold ${config.color}`}>
          {config.label}
        </div>
      </div>

      {/* Technical Signals */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">短期趨勢</p>
          <p className={`font-semibold ${regime.shortTerm === 'up' ? 'text-green-600' : regime.shortTerm === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
            {regime.shortTerm === 'up' ? '↑ 上升' : regime.shortTerm === 'down' ? '↓ 下降' : '→ 盤整'}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">中期趨勢</p>
          <p className={`font-semibold ${regime.midTerm === 'up' ? 'text-green-600' : regime.midTerm === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
            {regime.midTerm === 'up' ? '↑ 上升' : regime.midTerm === 'down' ? '↓ 下降' : '→ 盤整'}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">成交量</p>
          <p className={`font-semibold ${regime.volume === 'high' ? 'text-green-600' : regime.volume === 'low' ? 'text-red-600' : 'text-gray-600'}`}>
            {regime.volume === 'high' ? '↑ 放量' : regime.volume === 'low' ? '↓ 縮量' : '→ 持平'}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">法人籌碼</p>
          <p className={`font-semibold ${regime.foreign === 'buy' ? 'text-green-600' : regime.foreign === 'sell' ? 'text-red-600' : 'text-gray-600'}`}>
            {regime.foreign === 'buy' ? '↑ 買超' : regime.foreign === 'sell' ? '↓ 賣超' : '→ 中性'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Calculate market regime based on technical indicators
function calculateRegime(data) {
  if (!data || data.length < 60) {
    return {
      type: 'unknown',
      shortTerm: 'neutral',
      midTerm: 'neutral',
      volume: 'neutral',
      foreign: 'neutral',
    };
  }

  // Calculate moving averages
  const ma20 = calculateMAValue(data.slice(-20), 'close');
  const ma60 = calculateMAValue(data.slice(-60), 'close');
  const ma120 = calculateMAValue(data.slice(-120), 'close');
  const ma240 = calculateMAValue(data.slice(-240), 'close');

  // Determine trend
  let type = 'range';
  if (ma20 > ma60 && ma60 > ma120 && ma120 > ma240) {
    type = 'bull';
  } else if (ma20 < ma60 && ma60 < ma120 && ma120 < ma240) {
    type = 'bear';
  }

  // Short-term trend (last 5 days)
  const last5 = data.slice(-5);
  const shortTerm = last5[4].close > last5[0].close ? 'up' : last5[4].close < last5[0].close ? 'down' : 'neutral';

  // Mid-term trend (last 20 days)
  const last20 = data.slice(-20);
  const midTerm = last20[19].close > last20[0].close ? 'up' : last20[19].close < last20[0].close ? 'down' : 'neutral';

  // Volume analysis
  const avgVolume = data.slice(-60).reduce((sum, d) => sum + d.volume, 0) / 60;
  const recentVolume = data.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5;
  const volume = recentVolume > avgVolume * 1.2 ? 'high' : recentVolume < avgVolume * 0.8 ? 'low' : 'neutral';

  // Foreign investor (simulated)
  const foreignNet = data.slice(-5).reduce((sum, d) => sum + (d.foreignNet || 0), 0);
  const foreign = foreignNet > 0 ? 'buy' : foreignNet < 0 ? 'sell' : 'neutral';

  return { type, shortTerm, midTerm, volume, foreign };
}

function calculateMAValue(data, field) {
  if (data.length === 0) return 0;
  return data.reduce((sum, d) => sum + d[field], 0) / data.length;
}

export default MarketRegime;
