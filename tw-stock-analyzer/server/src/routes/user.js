import { Router } from 'express';
import db from '../models/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { authenticate } from '../middleware/auth.js';
import { validate, updateProfileSchema, changePasswordSchema } from '../middleware/validate.js';

const router = Router();

// Get user profile
router.get('/profile', authenticate, (req, res) => {
  // Get subscription info
  const subscription = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? AND status = 'active' 
    ORDER BY started_at DESC LIMIT 1
  `).get(req.user.id);

  let daysRemaining = null;
  if (req.user.membership_level !== 'free' && req.user.membership_expire_at) {
    const expireDate = new Date(req.user.membership_expire_at);
    const now = new Date();
    daysRemaining = Math.max(0, Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24)));
  }

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      membershipLevel: req.user.membership_level,
      membershipExpireAt: req.user.membership_expire_at,
      daysRemaining,
      subscription: subscription ? {
        plan: subscription.plan,
        amount: subscription.amount,
        startedAt: subscription.started_at,
        expiredAt: subscription.expired_at
      } : null
    }
  });
});

// Update user profile
router.put('/profile', authenticate, validate(updateProfileSchema), (req, res) => {
  const { name } = req.validated;

  db.prepare(`
    UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?
  `).run(name, req.user.id);

  res.json({
    message: '個人資料已更新',
    user: {
      id: req.user.id,
      email: req.user.email,
      name
    }
  });
});

// Change password
router.put('/password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.validated;

    // Get current password hash
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: { message: '當前密碼錯誤' } });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newPasswordHash, req.user.id);

    res.json({ message: '密碼已更新' });
  } catch (error) {
    next(error);
  }
});

export default router;
