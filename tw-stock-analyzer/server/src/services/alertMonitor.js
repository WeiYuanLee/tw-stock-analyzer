/**
 * Price Alert Monitor Service
 * 定時檢查價格並觸發提醒
 */
import db from '../models/db.js';
import { sendDiscordWebhook, sendLineNotify } from '../services/webhook.js';

// 簡易的股票價格獲取（實際應從.twstock或其他來源獲取）
async function getStockPrice(stockCode) {
  try {
    const response = await fetch(`https://www.twstock.com/getStockInfo?stock_code=${stockCode}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.price || null;
  } catch (error) {
    console.error(`[AlertMonitor] Error fetching price for ${stockCode}:`, error.message);
    return null;
  }
}

// 檢查所有活躍的提醒
export async function checkPriceAlerts() {
  console.log('[AlertMonitor] Checking price alerts...');

  const alerts = db.prepare(`
    SELECT pa.*, u.membership_level 
    FROM price_alerts pa
    JOIN users u ON pa.user_id = u.id
    WHERE pa.is_active = 1
  `).all();

  console.log(`[AlertMonitor] Found ${alerts.length} active alerts`);

  for (const alert of alerts) {
    await checkAndTriggerAlert(alert);
  }
}

// 檢查單一提醒
async function checkAndTriggerAlert(alert) {
  // 獲取當前股價（這裡需要接入真實的股票API）
  // 模擬數據 - 實際使用時替換為真實 API 調用
  const mockPrice = getMockPrice(alert.stock_code);
  const currentPrice = mockPrice || await getStockPrice(alert.stock_code);

  if (!currentPrice) {
    console.log(`[AlertMonitor] Could not get price for ${alert.stock_code}`);
    return;
  }

  let triggered = false;
  let currentValue = currentPrice;

  switch (alert.alert_type) {
    case 'price_above':
      triggered = currentPrice > alert.threshold;
      break;
    case 'price_below':
      triggered = currentPrice < alert.threshold;
      break;
    case 'change_percent':
      // 需要前一天的收盤價來計算漲跌幅
      // 這裡使用模擬數據
      const mockChangePercent = Math.random() * 10 - 5; // -5% to +5%
      currentValue = mockChangePercent;
      triggered = Math.abs(mockChangePercent) > alert.threshold;
      break;
    case 'volume':
      // 需要成交量數據
      const mockVolume = Math.floor(Math.random() * 10000000);
      currentValue = mockVolume;
      triggered = mockVolume > alert.threshold;
      break;
  }

  if (triggered) {
    console.log(`[AlertMonitor] Alert triggered: ${alert.stock_code} - ${alert.alert_type}`);

    const messageData = {
      stockCode: alert.stock_code,
      alertType: alert.alert_type,
      threshold: alert.threshold,
      currentValue: currentValue,
      message: `股票 ${alert.stock_code} 已觸發價格提醒！`
    };

    try {
      let success = false;
      if (alert.channel === 'discord') {
        success = await sendDiscordWebhook(alert.webhook_url, messageData);
      } else if (alert.channel === 'line') {
        success = await sendLineNotify(alert.webhook_url, messageData);
      }

      if (success) {
        // 更新觸發時間
        db.prepare(`
          UPDATE price_alerts 
          SET triggered_at = datetime('now') 
          WHERE id = ?
        `).run(alert.id);
        console.log(`[AlertMonitor] Notification sent for alert ${alert.id}`);
      }
    } catch (error) {
      console.error(`[AlertMonitor] Error sending notification:`, error.message);
    }
  }
}

// 模擬價格數據（開發測試用）
function getMockPrice(stockCode) {
  const mockPrices = {
    '2330': 1050,
    '2317': 175,
    '2454': 2680,
    '2884': 28.5,
    '2891': 25.8
  };
  return mockPrices[stockCode] || Math.random() * 1000 + 100;
}

// 手動觸發檢查（用於調試）
export async function manualCheck() {
  console.log('[AlertMonitor] Manual check triggered');
  await checkPriceAlerts();
}

export default {
  checkPriceAlerts,
  manualCheck
};
