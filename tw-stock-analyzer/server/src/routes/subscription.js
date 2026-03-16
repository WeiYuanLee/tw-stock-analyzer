import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import paymentService, { PLANS } from '../services/payment.js';

const router = Router();

// Get subscription status
router.get('/status', authenticate, (req, res) => {
  const subscription = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? AND status = 'active' 
    ORDER BY started_at DESC LIMIT 1
  `).get(req.user.id);

  const user = db.prepare(`
    SELECT membership_level, membership_expire_at FROM users WHERE id = ?
  `).get(req.user.id);

  let daysRemaining = null;
  if (user.membership_level !== 'free' && user.membership_expire_at) {
    const expireDate = new Date(user.membership_expire_at);
    const now = new Date();
    daysRemaining = Math.max(0, Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24)));
  }

  res.json({
    subscription: subscription ? {
      plan: subscription.plan,
      amount: subscription.amount,
      status: subscription.status,
      startedAt: subscription.started_at,
      expiredAt: subscription.expired_at
    } : null,
    membershipLevel: user.membership_level,
    membershipExpireAt: user.membership_expire_at,
    daysRemaining
  });
});

// Upgrade subscription (redirects to payment)
router.post('/upgrade', authenticate, (req, res, next) => {
  try {
    const { plan } = req.body;

    // Validate plan
    if (!PLANS[plan]) {
      return res.status(400).json({ error: { message: '無效的訂閱方案' } });
    }

    // Create order
    const order = paymentService.createOrder(req.user.id, plan);

    res.json({
      message: '請透過 /api/payment/create 或前端頁面完成支付',
      orderId: order.id,
      orderNo: order.orderNo,
      amount: order.amount,
      plan,
      isDevelopment: process.env.PAYMENT_MODE !== 'production'
    });
  } catch (error) {
    next(error);
  }
});

// Cancel subscription (now redirects to payment service)
router.post('/cancel', authenticate, (req, res, next) => {
  try {
    const result = paymentService.cancelSubscription(req.user.id);
    
    if (!result.success) {
      return res.status(400).json({ error: { message: result.message } });
    }
    
    res.json({
      message: result.message,
      expiredAt: result.expiredAt
    });
  } catch (error) {
    next(error);
  }
});

export default router;
