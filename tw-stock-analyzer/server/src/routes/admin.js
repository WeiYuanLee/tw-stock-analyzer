import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { adminAuthenticate, requireSuperAdmin } from '../middleware/adminAuth.js';

const router = Router();

// Admin login
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: '請提供 Email 和密碼' } });
    }

    // Find admin user
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND role IN (?, ?)').get(email, 'admin', 'superadmin');
    if (!user) {
      return res.status(401).json({ error: { message: 'Email 或密碼錯誤' } });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: { message: 'Email 或密碼錯誤' } });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: { message: '帳號已被停用' } });
    }

    // Generate JWT with role
    const token = generateToken({ 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    });

    res.json({
      message: '登入成功',
      token,
      admin: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Dashboard statistics
router.get('/dashboard', adminAuthenticate, (req, res, next) => {
  try {
    // Total users
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;
    
    // Active users (registered in last 30 days)
    const activeUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE role = 'user' AND created_at >= datetime('now', '-30 days')
    `).get().count;
    
    // Paid members
    const paidMembers = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE role = 'user' AND membership_level != 'free'
    `).get().count;
    
    // This month's orders
    const thisMonthOrders = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue 
      FROM orders 
      WHERE status = 'paid' AND created_at >= datetime('now', 'start of month')
    `).get();
    
    // Total orders
    const totalOrders = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue 
      FROM orders WHERE status = 'paid'
    `).get();
    
    // Active subscriptions
    const activeSubscriptions = db.prepare(`
      SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'
    `).get().count;
    
    // Revenue by month (last 6 months)
    const monthlyRevenue = db.prepare(`
      SELECT 
        strftime('%Y-%m', paid_at) as month,
        COUNT(*) as orders,
        COALESCE(SUM(amount), 0) as revenue
      FROM orders 
      WHERE status = 'paid' AND paid_at >= datetime('now', '-6 months')
      GROUP BY strftime('%Y-%m', paid_at)
      ORDER BY month ASC
    `).all();
    
    // Recent orders
    const recentOrders = db.prepare(`
      SELECT o.*, u.email as user_email, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        paidMembers,
        thisMonthOrders: thisMonthOrders.count,
        thisMonthRevenue: thisMonthOrders.revenue,
        totalOrders: totalOrders.count,
        totalRevenue: totalOrders.revenue,
        activeSubscriptions
      },
      monthlyRevenue,
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        orderNo: o.order_no,
        userEmail: o.user_email,
        userName: o.user_name,
        plan: o.plan,
        amount: o.amount,
        status: o.status,
        paidAt: o.paid_at,
        createdAt: o.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get all users (with pagination and search)
router.get('/users', adminAuthenticate, (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', status = '', membership = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = "WHERE role = 'user'";
    const params = [];
    
    if (search) {
      whereClause += ' AND (email LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (status === 'active') {
      whereClause += ' AND is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = 0';
    }
    
    if (membership) {
      whereClause += ' AND membership_level = ?';
      params.push(membership);
    }
    
    // Get total count
    const total = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params).count;
    
    // Get users
    const users = db.prepare(`
      SELECT id, email, name, role, membership_level, membership_expire_at, is_active, email_verified, created_at, updated_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));
    
    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        membershipLevel: u.membership_level,
        membershipExpireAt: u.membership_expire_at,
        isActive: !!u.is_active,
        emailVerified: !!u.email_verified,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single user
router.get('/users/:id', adminAuthenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = db.prepare(`
      SELECT id, email, name, role, membership_level, membership_expire_at, is_active, email_verified, created_at, updated_at
      FROM users WHERE id = ?
    `).get(id);
    
    if (!user) {
      return res.status(404).json({ error: { message: '使用者不存在' } });
    }
    
    // Get user's orders
    const orders = db.prepare(`
      SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(id);
    
    // Get user's subscriptions
    const subscriptions = db.prepare(`
      SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(id);
    
    // Get user's price alerts
    const alerts = db.prepare(`
      SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        membershipLevel: user.membership_level,
        membershipExpireAt: user.membership_expire_at,
        isActive: !!user.is_active,
        emailVerified: !!user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      orders: orders.map(o => ({
        id: o.id,
        orderNo: o.order_no,
        plan: o.plan,
        amount: o.amount,
        status: o.status,
        paidAt: o.paid_at,
        createdAt: o.created_at
      })),
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        plan: s.plan,
        amount: s.amount,
        status: s.status,
        startedAt: s.started_at,
        expiredAt: s.expired_at,
        createdAt: s.created_at
      })),
      alerts: alerts.map(a => ({
        id: a.id,
        stockCode: a.stock_code,
        alertType: a.alert_type,
        threshold: a.threshold,
        channel: a.channel,
        isActive: !!a.is_active,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/users/:id', adminAuthenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, membershipLevel, membershipExpireAt, isActive } = req.body;
    
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: { message: '使用者不存在' } });
    }
    
    // Build update query
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (membershipLevel !== undefined) {
      updates.push('membership_level = ?');
      params.push(membershipLevel);
    }
    if (membershipExpireAt !== undefined) {
      updates.push('membership_expire_at = ?');
      params.push(membershipExpireAt || null);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = datetime("now")');
      params.push(id);
      
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    
    // Log admin action
    console.log(`[ADMIN] User ${id} updated by admin ${req.user.email}:`, { name, membershipLevel, membershipExpireAt, isActive });
    
    res.json({ message: '使用者資料已更新' });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:id', adminAuthenticate, requireSuperAdmin, (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: { message: '使用者不存在' } });
    }
    
    // Delete user (cascade will delete related data)
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    // Log admin action
    console.log(`[ADMIN] User ${id} (${user.email}) deleted by superadmin ${req.user.email}`);
    
    res.json({ message: '使用者已刪除' });
  } catch (error) {
    next(error);
  }
});

// Get all orders
router.get('/orders', adminAuthenticate, (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = '', plan = '', startDate = '', endDate = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (status) {
      whereClause = 'WHERE o.status = ?';
      params.push(status);
    }
    
    if (plan) {
      whereClause += whereClause ? ' AND o.plan = ?' : 'WHERE o.plan = ?';
      params.push(plan);
    }
    
    if (startDate) {
      whereClause += whereClause ? ' AND o.created_at >= ?' : 'WHERE o.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += whereClause ? ' AND o.created_at <= ?' : 'WHERE o.created_at <= ?';
      params.push(endDate);
    }
    
    // Get total count
    const total = db.prepare(`SELECT COUNT(*) as count FROM orders o ${whereClause}`).get(...params).count;
    
    // Get orders
    const orders = db.prepare(`
      SELECT o.*, u.email as user_email, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));
    
    res.json({
      orders: orders.map(o => ({
        id: o.id,
        orderNo: o.order_no,
        userId: o.user_id,
        userEmail: o.user_email,
        userName: o.user_name,
        plan: o.plan,
        amount: o.amount,
        currency: o.currency,
        status: o.status,
        paymentMethod: o.payment_method,
        paymentNo: o.payment_no,
        paidAt: o.paid_at,
        createdAt: o.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single order
router.get('/orders/:id', adminAuthenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    
    const order = db.prepare(`
      SELECT o.*, u.email as user_email, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(id);
    
    if (!order) {
      return res.status(404).json({ error: { message: '訂單不存在' } });
    }
    
    res.json({
      order: {
        id: order.id,
        orderNo: order.order_no,
        userId: order.user_id,
        userEmail: order.user_email,
        userName: order.user_name,
        plan: order.plan,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        paymentMethod: order.payment_method,
        paymentNo: order.payment_no,
        newebpayOrderNo: order.newebpay_order_no,
        newebpayTradeNo: order.newebpay_trade_no,
        recurringId: order.recurring_id,
        startedAt: order.started_at,
        expiredAt: order.expired_at,
        paidAt: order.paid_at,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all subscriptions
router.get('/subscriptions', adminAuthenticate, (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = '', plan = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (status) {
      whereClause = 'WHERE s.status = ?';
      params.push(status);
    }
    
    if (plan) {
      whereClause += whereClause ? ' AND s.plan = ?' : 'WHERE s.plan = ?';
      params.push(plan);
    }
    
    // Get total count
    const total = db.prepare(`SELECT COUNT(*) as count FROM subscriptions s ${whereClause}`).get(...params).count;
    
    // Get subscriptions
    const subscriptions = db.prepare(`
      SELECT s.*, u.email as user_email, u.name as user_name
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));
    
    res.json({
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        userId: s.user_id,
        userEmail: s.user_email,
        userName: s.user_name,
        plan: s.plan,
        amount: s.amount,
        status: s.status,
        startedAt: s.started_at,
        expiredAt: s.expired_at,
        createdAt: s.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get price alerts
router.get('/alerts', adminAuthenticate, (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (status === 'active') {
      whereClause = 'WHERE a.is_active = 1';
    } else if (status === 'inactive') {
      whereClause = 'WHERE a.is_active = 0';
    }
    
    // Get total count
    const total = db.prepare(`SELECT COUNT(*) as count FROM price_alerts a ${whereClause}`).get(...params).count;
    
    // Get alerts
    const alerts = db.prepare(`
      SELECT a.*, u.email as user_email
      FROM price_alerts a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));
    
    res.json({
      alerts: alerts.map(a => ({
        id: a.id,
        userId: a.user_id,
        userEmail: a.user_email,
        stockCode: a.stock_code,
        alertType: a.alert_type,
        threshold: a.threshold,
        channel: a.channel,
        webhookUrl: a.webhook_url,
        isActive: !!a.is_active,
        triggeredAt: a.triggered_at,
        createdAt: a.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Toggle alert status
router.put('/alerts/:id/toggle', adminAuthenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    
    const alert = db.prepare('SELECT id, is_active FROM price_alerts WHERE id = ?').get(id);
    if (!alert) {
      return res.status(404).json({ error: { message: '提醒不存在' } });
    }
    
    db.prepare('UPDATE price_alerts SET is_active = ? WHERE id = ?').run(alert.is_active ? 0 : 1, id);
    
    res.json({ message: `提醒已${alert.is_active ? '停用' : '啟用'}` });
  } catch (error) {
    next(error);
  }
});

// AI usage statistics
router.get('/ai-stats', adminAuthenticate, (req, res, next) => {
  try {
    // Daily usage for last 30 days
    const dailyUsage = db.prepare(`
      SELECT 
        date,
        COUNT(*) as usage_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM ai_usage
      WHERE date >= date('now', '-30 days')
      GROUP BY date
      ORDER BY date ASC
    `).all();
    
    // Total usage
    const totalUsage = db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT user_id) as total_users,
        SUM(usage_count) as total_count
      FROM ai_usage
    `).get();
    
    // Cache hit rate
    const cacheStats = db.prepare(`
      SELECT 
        COUNT(*) as total_caches,
        COUNT(DISTINCT question_hash) as unique_questions
      FROM ai_cache
    `).get();
    
    // Top users
    const topUsers = db.prepare(`
      SELECT 
        u.email,
        u.name,
        SUM(a.usage_count) as total_usage
      FROM ai_usage a
      LEFT JOIN users u ON a.user_id = u.id
      GROUP BY a.user_id
      ORDER BY total_usage DESC
      LIMIT 10
    `).all();
    
    res.json({
      dailyUsage,
      totalRequests: totalUsage.total_requests || 0,
      totalUsers: totalUsage.total_users || 0,
      totalCount: totalUsage.total_count || 0,
      cacheStats: {
        totalCaches: cacheStats.total_caches || 0,
        uniqueQuestions: cacheStats.unique_questions || 0
      },
      topUsers
    });
  } catch (error) {
    next(error);
  }
});

export default router;
