import { verifyToken } from '../utils/jwt.js';
import db from '../models/db.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: '未提供認證 token' } });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: { message: '無效或已過期的 token' } });
  }

  // Check user still exists
  const user = db.prepare('SELECT id, email, name, membership_level, membership_expire_at FROM users WHERE id = ?').get(decoded.userId);
  
  if (!user) {
    return res.status(401).json({ error: { message: '使用者不存在' } });
  }

  // Check membership expiration
  if (user.membership_level !== 'free' && user.membership_expire_at) {
    const expireDate = new Date(user.membership_expire_at);
    if (expireDate < new Date()) {
      // Auto downgrade to free
      db.prepare('UPDATE users SET membership_level = ?, membership_expire_at = NULL WHERE id = ?').run('free', user.id);
      user.membership_level = 'free';
    }
  }

  req.user = user;
  next();
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (decoded) {
    const user = db.prepare('SELECT id, email, name, membership_level, membership_expire_at FROM users WHERE id = ?').get(decoded.userId);
    if (user) {
      req.user = user;
    }
  }
  
  next();
}
