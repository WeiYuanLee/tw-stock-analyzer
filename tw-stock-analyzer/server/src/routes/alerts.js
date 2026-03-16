import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendDiscordWebhook, sendLineNotify } from '../services/webhook.js';

const router = Router();

// Valid alert types
const ALERT_TYPES = ['price_above', 'price_below', 'change_percent', 'volume'];
const CHANNELS = ['line', 'discord'];

// Validate webhook URL format
function isValidWebhookUrl(url, channel) {
  if (!url) return channel === 'line'; // Line uses notify token, not URL
  if (channel === 'discord') {
    return url.match(/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/);
  }
  return false;
}

// Check if user is VIP
function isVipUser(user) {
  return user.membership_level === 'vip';
}

// Get all alerts for user
router.get('/', authenticate, (req, res) => {
  // Check VIP membership
  if (!isVipUser(req.user)) {
    return res.status(403).json({ 
      error: { message: '此功能僅限 VIP 會員使用' } 
    });
  }

  const alerts = db.prepare(`
    SELECT * FROM price_alerts 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).all(req.user.id);

  res.json({
    alerts: alerts.map(alert => ({
      id: alert.id,
      stockCode: alert.stock_code,
      alertType: alert.alert_type,
      threshold: alert.threshold,
      channel: alert.channel,
      isActive: Boolean(alert.is_active),
      triggeredAt: alert.triggered_at,
      createdAt: alert.created_at
    }))
  });
});

// Create new alert
router.post('/', authenticate, (req, res) => {
  // Check VIP membership
  if (!isVipUser(req.user)) {
    return res.status(403).json({ 
      error: { message: '此功能僅限 VIP 會員使用' } 
    });
  }

  const { stockCode, alertType, threshold, channel, webhookUrl } = req.body;

  // Validation
  if (!stockCode || !alertType || threshold === undefined || !channel) {
    return res.status(400).json({ 
      error: { message: '缺少必要欄位' } 
    });
  }

  const normalizedCode = stockCode.toUpperCase().trim();
  
  if (!ALERT_TYPES.includes(alertType)) {
    return res.status(400).json({ 
      error: { message: '無效的提醒類型' } 
    });
  }

  if (!CHANNELS.includes(channel)) {
    return res.status(400).json({ 
      error: { message: '無效的通知渠道' } 
    });
  }

  // Validate threshold
  if (typeof threshold !== 'number' || threshold < 0) {
    return res.status(400).json({ 
      error: { message: '門檻值必須為正數' } 
    });
  }

  // Validate webhook URL for Discord
  if (channel === 'discord' && !isValidWebhookUrl(webhookUrl, 'discord')) {
    return res.status(400).json({ 
      error: { message: '無效的 Discord Webhook URL 格式' } 
    });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO price_alerts (id, user_id, stock_code, alert_type, threshold, channel, webhook_url, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `).run(id, req.user.id, normalizedCode, alertType, threshold, channel, webhookUrl || null);

  res.status(201).json({
    message: '價格提醒已建立',
    alert: {
      id,
      stockCode: normalizedCode,
      alertType,
      threshold,
      channel,
      isActive: true,
      createdAt: new Date().toISOString()
    }
  });
});

// Update alert
router.put('/:id', authenticate, (req, res) => {
  // Check VIP membership
  if (!isVipUser(req.user)) {
    return res.status(403).json({ 
      error: { message: '此功能僅限 VIP 會員使用' } 
    });
  }

  const { id } = req.params;
  const { stockCode, alertType, threshold, channel, webhookUrl, isActive } = req.body;

  // Check if alert exists and belongs to user
  const existing = db.prepare(`
    SELECT * FROM price_alerts WHERE id = ? AND user_id = ?
  `).get(id, req.user.id);

  if (!existing) {
    return res.status(404).json({ 
      error: { message: '提醒不存在' } 
    });
  }

  // Build update query
  const updates = [];
  const values = [];

  if (stockCode) {
    updates.push('stock_code = ?');
    values.push(stockCode.toUpperCase().trim());
  }
  if (alertType) {
    if (!ALERT_TYPES.includes(alertType)) {
      return res.status(400).json({ 
        error: { message: '無效的提醒類型' } 
      });
    }
    updates.push('alert_type = ?');
    values.push(alertType);
  }
  if (threshold !== undefined) {
    if (typeof threshold !== 'number' || threshold < 0) {
      return res.status(400).json({ 
        error: { message: '門檻值必須為正數' } 
      });
    }
    updates.push('threshold = ?');
    values.push(threshold);
  }
  if (channel) {
    if (!CHANNELS.includes(channel)) {
      return res.status(400).json({ 
        error: { message: '無效的通知渠道' } 
      });
    }
    // Validate webhook URL for Discord
    if (channel === 'discord' && webhookUrl && !isValidWebhookUrl(webhookUrl, 'discord')) {
      return res.status(400).json({ 
        error: { message: '無效的 Discord Webhook URL 格式' } 
      });
    }
    updates.push('channel = ?');
    values.push(channel);
  }
  if (webhookUrl !== undefined) {
    updates.push('webhook_url = ?');
    values.push(channel === 'discord' ? webhookUrl : (webhookUrl || null));
  }
  if (isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(isActive ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ 
      error: { message: '沒有需要更新的欄位' } 
    });
  }

  values.push(id, req.user.id);

  db.prepare(`
    UPDATE price_alerts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?
  `).run(...values);

  const updated = db.prepare('SELECT * FROM price_alerts WHERE id = ?').get(id);

  res.json({
    message: '價格提醒已更新',
    alert: {
      id: updated.id,
      stockCode: updated.stock_code,
      alertType: updated.alert_type,
      threshold: updated.threshold,
      channel: updated.channel,
      isActive: Boolean(updated.is_active),
      triggeredAt: updated.triggered_at,
      createdAt: updated.created_at
    }
  });
});

// Delete alert
router.delete('/:id', authenticate, (req, res) => {
  // Check VIP membership
  if (!isVipUser(req.user)) {
    return res.status(403).json({ 
      error: { message: '此功能僅限 VIP 會員使用' } 
    });
  }

  const { id } = req.params;

  const result = db.prepare(`
    DELETE FROM price_alerts WHERE id = ? AND user_id = ?
  `).run(id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ 
      error: { message: '提醒不存在' } 
    });
  }

  res.json({ message: '價格提醒已刪除' });
});

// Test notification
router.post('/:id/test', authenticate, async (req, res) => {
  // Check VIP membership
  if (!isVipUser(req.user)) {
    return res.status(403).json({ 
      error: { message: '此功能僅限 VIP 會員使用' } 
    });
  }

  const { id } = req.params;

  const alert = db.prepare(`
    SELECT * FROM price_alerts WHERE id = ? AND user_id = ?
  `).get(id, req.user.id);

  if (!alert) {
    return res.status(404).json({ 
      error: { message: '提醒不存在' } 
    });
  }

  // Send test notification
  const testMessage = {
    stockCode: alert.stock_code,
    alertType: alert.alert_type,
    threshold: alert.threshold,
    currentPrice: 0,
    isTest: true
  };

  let success = false;
  let error = null;

  try {
    if (alert.channel === 'discord') {
      success = await sendDiscordWebhook(
        alert.webhook_url,
        testMessage,
        true // isTest
      );
    } else if (alert.channel === 'line') {
      success = await sendLineNotify(
        alert.webhook_url,
        testMessage,
        true // isTest
      );
    }
  } catch (e) {
    error = e.message;
  }

  if (success) {
    res.json({ 
      message: '測試訊息已發送',
      status: 'success'
    });
  } else {
    res.status(500).json({ 
      error: { message: '訊息發送失敗', details: error } 
    });
  }
});

export default router;
