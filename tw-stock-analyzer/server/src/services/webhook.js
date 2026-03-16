/**
 * Webhook Service - 處理 Line 和 Discord 推播
 */

// Discord Webhook 推播
export async function sendDiscordWebhook(webhookUrl, data, isTest = false) {
  if (!webhookUrl) {
    console.error('[Discord] Missing webhook URL');
    return false;
  }

  const embed = {
    title: isTest ? '🔔 測試通知' : '⚠️ 價格異常提醒',
    color: isTest ? 0x3498db : (data.triggeredType === 'price_above' ? 0x27ae60 : 0xe74c3c),
    fields: [
      {
        name: '股票代碼',
        value: `**${data.stockCode}**`,
        inline: true
      },
      {
        name: '提醒類型',
        value: getAlertTypeLabel(data.alertType),
        inline: true
      },
      {
        name: '設定門檻',
        value: formatThreshold(data.alertType, data.threshold),
        inline: true
      }
    ],
    footer: {
      text: isTest ? '測試訊息' : '台股分析系統'
    },
    timestamp: new Date().toISOString()
  };

  // Add current value if not test
  if (!isTest && data.currentValue !== undefined) {
    embed.fields.push({
      name: '目前數值',
      value: formatThreshold(data.alertType, data.currentValue),
      inline: true
    });
  }

  // Add message if provided
  if (data.message) {
    embed.description = data.message;
  }

  const payload = {
    embeds: [embed],
    username: '台股分析系統',
    avatar_url: 'https://twstock.example.com/icon.png'
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Discord] Webhook error:', response.status, errorText);
      return false;
    }

    console.log('[Discord] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Discord] Webhook error:', error.message);
    return false;
  }
}

// Line Notify 推播
export async function sendLineNotify(token, data, isTest = false) {
  if (!token) {
    console.error('[Line] Missing access token');
    return false;
  }

  const lines = [];
  lines.push(isTest ? '🔔【測試通知】' : '⚠️【價格異常提醒】');
  lines.push('');
  lines.push(`股票：${data.stockCode}`);
  lines.push(`類型：${getAlertTypeLabel(data.alertType)}`);
  lines.push(`門檻：${formatThreshold(data.alertType, data.threshold)}`);

  if (!isTest && data.currentValue !== undefined) {
    lines.push(`目前：${formatThreshold(data.alertType, data.currentValue)}`);
  }

  if (data.message) {
    lines.push('');
    lines.push(data.message);
  }

  if (isTest) {
    lines.push('');
    lines.push('這是測試訊息');
  }

  const message = lines.join('\n');

  try {
    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`
      },
      body: `message=${encodeURIComponent(message)}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Line] Notify error:', response.status, errorText);
      return false;
    }

    console.log('[Line] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Line] Notify error:', error.message);
    return false;
  }
}

// Line Messaging API (Bot) 推播
export async function sendLineMessage(lineBotToken, userId, data, isTest = false) {
  if (!lineBotToken || !userId) {
    console.error('[Line Bot] Missing token or user ID');
    return false;
  }

  const lines = [];
  lines.push(isTest ? '🔔【測試通知】' : '⚠️【價格異常提醒】');
  lines.push('');
  lines.push(`股票：${data.stockCode}`);
  lines.push(`類型：${getAlertTypeLabel(data.alertType)}`);
  lines.push(`門檻：${formatThreshold(data.alertType, data.threshold)}`);

  if (!isTest && data.currentValue !== undefined) {
    lines.push(`目前：${formatThreshold(data.alertType, data.currentValue)}`);
  }

  if (data.message) {
    lines.push('');
    lines.push(data.message);
  }

  const message = lines.join('\n');

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineBotToken}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Line Bot] Message error:', response.status, errorText);
      return false;
    }

    console.log('[Line Bot] Message sent successfully');
    return true;
  } catch (error) {
    console.error('[Line Bot] Message error:', error.message);
    return false;
  }
}

// 輔助函數：取得提醒類型標籤
function getAlertTypeLabel(alertType) {
  const labels = {
    'price_above': '價格高於',
    'price_below': '價格低於',
    'change_percent': '漲跌幅',
    'volume': '成交量'
  };
  return labels[alertType] || alertType;
}

// 輔助函數：格式化門檻值
function formatThreshold(alertType, value) {
  if (alertType === 'change_percent') {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  }
  if (alertType === 'volume') {
    return formatVolume(value);
  }
  return `$${value.toFixed(2)}`;
}

// 輔助函數：格式化成交量
function formatVolume(vol) {
  if (vol >= 100000000) {
    return `${(vol / 100000000).toFixed(2)}億`;
  }
  if (vol >= 10000) {
    return `${(vol / 10000).toFixed(0)}萬`;
  }
  return vol.toString();
}

export default {
  sendDiscordWebhook,
  sendLineNotify,
  sendLineMessage
};
