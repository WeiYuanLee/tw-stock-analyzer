import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.validated;

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: { message: '此 Email 已被註冊' } });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = uuidv4();

    // Create user (emailVerified = 0 by default)
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, verification_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(userId, email, passwordHash, name || email.split('@')[0], verificationToken);

    // Send verification email (async, don't wait)
    sendVerificationEmail(email, verificationToken).catch(console.error);

    // 回應訊息 - 不發放 Token，需完成 Email 驗證後才可登入
    res.status(201).json({
      message: '註冊成功，請至 Email 驗證帳戶後登入',
      user: {
        id: userId,
        email,
        name: name || email.split('@')[0],
        membershipLevel: 'free',
        emailVerified: false
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated;

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: { message: 'Email 或密碼錯誤' } });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({ 
        error: { message: '請先完成 Email 驗證才能登入' },
        requiresVerification: true
      });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: { message: 'Email 或密碼錯誤' } });
    }

    // Generate JWT
    const token = generateToken({ userId: user.id, email: user.email });

    // Calculate membership days remaining
    let daysRemaining = null;
    if (user.membership_level !== 'free' && user.membership_expire_at) {
      const expireDate = new Date(user.membership_expire_at);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24)));
    }

    res.json({
      message: '登入成功',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        membershipLevel: user.membership_level,
        membershipExpireAt: user.membership_expire_at,
        daysRemaining,
        emailVerified: !!user.email_verified
      }
    });
  } catch (error) {
    next(error);
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: '已成功登出' });
});

// Verify token
router.get('/verify', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      membershipLevel: req.user.membership_level,
      membershipExpireAt: req.user.membership_expire_at
    }
  });
});

// Verify email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: { message: '請提供驗證 token' } });
    }

    const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
    
    if (!user) {
      return res.status(400).json({ error: { message: '無效的驗證連結' } });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.json({ message: 'Email 已經驗證過了' });
    }

    // Update user
    db.prepare(`
      UPDATE users 
      SET email_verified = 1, verification_token = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);

    res.json({ message: 'Email 驗證成功' });
  } catch (error) {
    next(error);
  }
});

// Forgot password
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.validated;

    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: '如果帳號存在，將收到密碼重設郵件' });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE users 
      SET reset_token = ?, reset_expires = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(resetToken, resetExpires, user.id);

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: '如果帳號存在，將收到密碼重設郵件' });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { password, token } = req.validated;

    const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
    
    if (!user) {
      return res.status(400).json({ error: { message: '無效的重設連結' } });
    }

    // Check if expired
    if (user.reset_expires && new Date(user.reset_expires) < new Date()) {
      return res.status(400).json({ error: { message: '重設連結已過期，請重新申請' } });
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, reset_token = NULL, reset_expires = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, user.id);

    res.json({ message: '密碼重設成功，請使用新密碼登入' });
  } catch (error) {
    next(error);
  }
});

export default router;
