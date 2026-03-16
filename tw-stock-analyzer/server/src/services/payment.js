import crypto from 'crypto';
import db from '../models/db.js';

// NewebPay (藍新金流) configuration
const config = {
  // 環境: production 或 development
  mode: process.env.PAYMENT_MODE || 'development',
  
  // 藍新金流 Merchant ID
  merchantId: process.env.NEWEBPAY_MERCHANT_ID || 'MS348763883',
  
  // 藍新金流 Hash Key
  hashKey: process.env.NEWEBPAY_HASH_KEY || 'vFSKQD3p7gPLChj3tN2sEzp9oJqR4YhW',
  
  // 藍新金流 Hash IV
  hashIV: process.env.NEWEBPAY_HASH_IV || 'xKjL6pN9vRsTuWqX',
  
  // 回調網址
  notifyUrl: process.env.PAYMENT_NOTIFY_URL || 'http://localhost:3001/api/payment/notify',
  returnUrl: process.env.PAYMENT_RETURN_URL || 'http://localhost:5173/payment/result'
};

// 訂閱方案定價
export const PLANS = {
  pro: {
    name: 'Pro',
    price: 199,
    periodDays: 30,
    features: ['無廣告', '進階篩選', '法人籌碼', '即時推播']
  },
  vip: {
    name: 'VIP',
    price: 399,
    periodDays: 30,
    features: ['Pro 所有功能', '獨家選股策略', 'Line 通知', 'Discord 通知']
  }
};

/**
 * Generate order number
 */
function generateOrderNo() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TW${timestamp}${random}`;
}

/**
 * AES encrypt (藍新金流使用)
 */
function aesEncrypt(data, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * AES decrypt (藍新金流回調使用)
 */
export function aesDecrypt(encrypted, key, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

/**
 * SHA256 hash for 藍新金流
 */
function sha256Hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
}

/**
 * Generate 藍新金流 payment form data
 */
export function createPaymentForm(orderNo, amount, plan, userEmail) {
  const orderInfo = {
    MerchantID: config.merchantId,
    MerchantOrderNo: orderNo,
    Amt: amount,
    ItemDesc: `${PLANS[plan].name} 會員訂閱 - 30天`,
    Email: userEmail,
    ReturnURL: config.returnUrl,
    NotifyURL: config.notifyUrl,
    // 定期扣款參數
    RecurringFlag: 'Y', // 啟用定期扣款
    PeriodType: 'M',    // 每月扣款
    PeriodCount: 0,     // 0 = 無限次扣款
    Freq: 1,            // 間隔1次
    Phase: 1            // 首次扣款
  };

  // 將參數轉換為 URL 編碼的字串
  const tradeInfo = Object.keys(orderInfo)
    .map(key => `${key}=${orderInfo[key]}`)
    .join('&');

  // AES 加密
  const encrypted = aesEncrypt(tradeInfo, config.hashKey, config.hashIV);

  // SHA256 雜湊
  const hash = sha256Hash(`HashKey=${config.hashKey}&${encrypted}&HashIV=${config.hashIV}`);

  return {
    MerchantID: config.merchantId,
    TradeInfo: encrypted,
    TradeSha: hash,
    Version: '1.5' // 藍新金流 API 版本
  };
}

/**
 * Verify 藍新金流 callback signature
 */
export function verifyCallback(tradeInfo, tradeSha) {
  const hash = sha256Hash(`HashKey=${config.hashKey}&${tradeInfo}&HashIV=${config.hashIV}`);
  return hash === tradeSha;
}

/**
 * Create new order in database
 */
export function createOrder(userId, plan) {
  const orderNo = generateOrderNo();
  const amount = PLANS[plan].price;
  
  const orderId = crypto.randomUUID();
  
  db.prepare(`
    INSERT INTO orders (id, order_no, user_id, plan, amount, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
  `).run(orderId, orderNo, userId, plan, amount);
  
  return {
    id: orderId,
    orderNo,
    plan,
    amount,
    status: 'pending'
  };
}

/**
 * Get order by ID or order number
 */
export function getOrder(identifier) {
  return db.prepare(`
    SELECT * FROM orders WHERE id = ? OR order_no = ?
  `).get(identifier, identifier);
}

/**
 * Get orders by user ID
 */
export function getUserOrders(userId) {
  return db.prepare(`
    SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId);
}

/**
 * Update order status after payment
 */
export function updateOrderStatus(orderId, status, paymentData = {}) {
  const now = new Date().toISOString();
  
  const updates = ['status = ?', 'updated_at = datetime(\'now\')'];
  const params = [status];
  
  if (paymentData.paymentNo) {
    updates.push('payment_no = ?');
    params.push(paymentData.paymentNo);
  }
  
  if (paymentData.newebpayOrderNo) {
    updates.push('newebpay_order_no = ?');
    params.push(paymentData.newebpayOrderNo);
  }
  
  if (paymentData.tradeNo) {
    updates.push('newebpay_trade_no = ?');
    params.push(paymentData.tradeNo);
  }
  
  if (paymentData.recurringId) {
    updates.push('recurring_id = ?');
    params.push(paymentData.recurringId);
  }
  
  if (status === 'paid') {
    updates.push('paid_at = ?');
    params.push(now);
  }
  
  params.push(orderId);
  
  db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Activate subscription after payment
 */
export function activateSubscription(userId, plan, orderId) {
  const now = new Date();
  let expiredAt = new Date();
  expiredAt.setDate(expiredAt.getDate() + PLANS[plan].periodDays);
  
  // Get the order
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  
  // Start/extend subscription
  const subscriptionId = crypto.randomUUID();
  
  // Check existing active subscription
  const existing = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? AND status = 'active'
  `).get(userId);
  
  let startedAt;
  if (existing) {
    // Extend from existing expiration
    startedAt = new Date(existing.expired_at);
    const newExpiredAt = new Date(existing.expired_at);
    newExpiredAt.setDate(newExpiredAt.getDate() + PLANS[plan].periodDays);
    
    db.prepare(`
      UPDATE subscriptions 
      SET status = 'expired', updated_at = datetime('now')
      WHERE id = ?
    `).run(existing.id);
    
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan, amount, status, started_at, expired_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run(subscriptionId, userId, plan, PLANS[plan].price, startedAt.toISOString(), newExpiredAt.toISOString());
    
    expiredAt = newExpiredAt;
  } else {
    startedAt = now;
    
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan, amount, status, started_at, expired_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run(subscriptionId, userId, plan, PLANS[plan].price, startedAt.toISOString(), expiredAt.toISOString());
  }
  
  // Update user membership
  db.prepare(`
    UPDATE users 
    SET membership_level = ?, membership_expire_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(plan, expiredAt.toISOString(), userId);
  
  // Update order
  updateOrderStatus(orderId, 'paid', {
    paymentNo: order?.orderNo,
    newebpayOrderNo: order?.orderNo
  });
  
  return {
    subscriptionId,
    plan,
    amount: PLANS[plan].price,
    startedAt: startedAt.toISOString(),
    expiredAt: expiredAt.toISOString()
  };
}

/**
 * Cancel subscription (for recurring payments)
 */
export function cancelSubscription(userId) {
  // Find active subscription
  const subscription = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? AND status = 'active'
  `).get(userId);
  
  if (!subscription) {
    return { success: false, message: '沒有有效的訂閱' };
  }
  
  // Cancel in database
  db.prepare(`
    UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now')
    WHERE id = ?
  `).run(subscription.id);
  
  // Find and cancel the recurring order
  const order = db.prepare(`
    SELECT * FROM orders 
    WHERE user_id = ? AND status = 'paid' AND recurring_id IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `).get(userId);
  
  if (order && config.mode === 'production') {
    // TODO: Call 藍新金流取消定期扣款 API
    // In production, you would call the cancel recurring API here
  }
  
  return { 
    success: true, 
    message: '訂閱已取消，您仍可使用服務至期滿日',
    expiredAt: subscription.expired_at
  };
}

/**
 * Process mock payment (development only)
 */
export function processMockPayment(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  if (order.status !== 'pending') {
    throw new Error('Order is not pending');
  }
  
  // Simulate successful payment
  const mockPaymentData = {
    paymentNo: `MOCK_${order.orderNo}`,
    newebpayOrderNo: order.orderNo,
    tradeNo: `TRADE_${Date.now()}`,
    recurringId: `RECUR_${Date.now()}`
  };
  
  updateOrderStatus(orderId, 'paid', mockPaymentData);
  
  // Activate subscription
  const subscription = activateSubscription(order.user_id, order.plan, orderId);
  
  return {
    success: true,
    subscription
  };
}

/**
 * Check and expire subscriptions
 */
export function checkExpiredSubscriptions() {
  const now = new Date().toISOString();
  
  const expired = db.prepare(`
    UPDATE subscriptions 
    SET status = 'expired', updated_at = datetime('now')
    WHERE status = 'active' AND expired_at < ?
    RETURNING *
  `).all(now);
  
  return expired;
}

export default {
  PLANS,
  createPaymentForm,
  verifyCallback,
  aesDecrypt,
  createOrder,
  getOrder,
  getUserOrders,
  updateOrderStatus,
  activateSubscription,
  cancelSubscription,
  processMockPayment,
  checkExpiredSubscriptions
};
