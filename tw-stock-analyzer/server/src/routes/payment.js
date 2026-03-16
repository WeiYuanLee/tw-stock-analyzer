import { Router } from 'express';
import paymentService, { PLANS } from '../services/payment.js';
import { authenticate } from '../middleware/auth.js';
import db from '../models/db.js';

const router = Router();

// Get available plans
router.get('/plans', (req, res) => {
  res.json({
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      price: plan.price,
      periodDays: plan.periodDays,
      features: plan.features
    }))
  });
});

// Create payment order
router.post('/create', authenticate, async (req, res, next) => {
  try {
    const { plan } = req.body;
    
    // Validate plan
    if (!PLANS[plan]) {
      return res.status(400).json({ error: { message: '無效的訂閱方案' } });
    }
    
    // Get user email
    const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: { message: '用戶不存在' } });
    }
    
    // Check for existing pending order
    const existingOrder = db.prepare(`
      SELECT * FROM orders 
      WHERE user_id = ? AND status = 'pending' AND plan = ?
      AND created_at > datetime('now', '-30 minutes')
    `).get(req.user.id, plan);
    
    if (existingOrder) {
      // Return existing order
      const paymentForm = paymentService.createPaymentForm(
        existingOrder.order_no,
        PLANS[plan].price,
        plan,
        user.email
      );
      
      return res.json({
        orderId: existingOrder.id,
        orderNo: existingOrder.order_no,
        amount: existingOrder.amount,
        plan,
        paymentForm,
        isDevelopment: process.env.PAYMENT_MODE !== 'production'
      });
    }
    
    // Create new order
    const order = paymentService.createOrder(req.user.id, plan);
    
    // Check if in development mode
    if (process.env.PAYMENT_MODE !== 'production') {
      // In development, return mock payment info
      return res.json({
        orderId: order.id,
        orderNo: order.orderNo,
        amount: order.amount,
        plan,
        isDevelopment: true,
        message: '開發模式：可直接調用 /api/payment/mock-pay 測試支付'
      });
    }
    
    // Generate 藍新金流 payment form
    const paymentForm = paymentService.createPaymentForm(
      order.orderNo,
      order.amount,
      plan,
      user.email
    );
    
    res.json({
      orderId: order.id,
      orderNo: order.orderNo,
      amount: order.amount,
      plan,
      paymentForm,
      isDevelopment: false
    });
  } catch (error) {
    next(error);
  }
});

// Mock payment for development
router.post('/mock-pay', authenticate, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: { message: '缺少 orderId' } });
    }
    
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    
    if (!order) {
      return res.status(404).json({ error: { message: '訂單不存在' } });
    }
    
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: { message: '無權限操作此訂單' } });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({ error: { message: '訂單狀態不是待支付' } });
    }
    
    // Process mock payment
    const result = paymentService.processMockPayment(orderId);
    
    res.json({
      success: true,
      message: `已成功升級為 ${PLANS[order.plan].name} 會員`,
      subscription: result.subscription
    });
  } catch (error) {
    next(error);
  }
});

// 藍新金流 payment notification callback
router.post('/notify', async (req, res, next) => {
  try {
    const { TradeInfo, TradeSha } = req.body;
    
    // Verify signature
    if (!paymentService.verifyCallback(TradeInfo, TradeSha)) {
      console.error('Invalid payment callback signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }
    
    // Decrypt data
    const payment = paymentService.aesDecrypt(
      TradeInfo,
      process.env.NEWEBPAY_HASH_KEY || 'vFSKQD3p7gPLChj3tN2sEzp9oJqR4YhW',
      process.env.NEWEBPAY_HASH_IV || 'xKjL6pN9vRsTuWqX'
    );
    
    console.log('Payment callback received:', payment);
    
    // Find order
    const order = db.prepare(`
      SELECT * FROM orders WHERE order_no = ?
    `).get(payment.MerchantOrderNo);
    
    if (!order) {
      console.error('Order not found:', payment.MerchantOrderNo);
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check payment status
    if (payment.Status === 'SUCCESS' || payment.Status === 'PAID') {
      // Update order status
      paymentService.updateOrderStatus(order.id, 'paid', {
        paymentNo: payment.PaymentNo,
        newebpayOrderNo: payment.MerchantOrderNo,
        tradeNo: payment.TradeNo,
        recurringId: payment.RecurringID
      });
      
      // Activate subscription
      paymentService.activateSubscription(order.user_id, order.plan, order.id);
      
      console.log(`Order ${order.order_no} paid successfully`);
    } else {
      // Payment failed
      paymentService.updateOrderStatus(order.id, 'failed');
      console.log(`Order ${order.order_no} payment failed:`, payment.Status);
    }
    
    // Return success to 藍新金流
    res.json({ message: 'OK' });
  } catch (error) {
    console.error('Payment callback error:', error);
    next(error);
  }
});

// Get order status
router.get('/status/:orderId', authenticate, async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR order_no = ?').get(orderId, orderId);
    
    if (!order) {
      return res.status(404).json({ error: { message: '訂單不存在' } });
    }
    
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: { message: '無權限查看此訂單' } });
    }
    
    res.json({
      orderId: order.id,
      orderNo: order.order_no,
      plan: order.plan,
      amount: order.amount,
      status: order.status,
      paidAt: order.paid_at,
      createdAt: order.created_at
    });
  } catch (error) {
    next(error);
  }
});

// Get user order history
router.get('/orders', authenticate, async (req, res, next) => {
  try {
    const orders = paymentService.getUserOrders(req.user.id);
    
    res.json({
      orders: orders.map(order => ({
        orderId: order.id,
        orderNo: order.order_no,
        plan: order.plan,
        amount: order.amount,
        status: order.status,
        paidAt: order.paid_at,
        createdAt: order.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Cancel subscription
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
