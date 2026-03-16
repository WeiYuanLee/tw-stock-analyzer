import { verifyToken } from '../utils/jwt.js';
import db from '../models/db.js';

export function adminAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: '未提供認證 token' } });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: { message: '無效或已過期的 token' } });
  }

  // Check user exists and is admin
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(decoded.userId);
  
  if (!user) {
    return res.status(401).json({ error: { message: '使用者不存在' } });
  }

  if (!['admin', 'superadmin'].includes(user.role)) {
    return res.status(403).json({ error: { message: '權限不足，需要管理員權限' } });
  }

  req.user = user;
  req.adminRole = user.role;
  next();
}

export function requireSuperAdmin(req, res, next) {
  if (req.adminRole !== 'superadmin') {
    return res.status(403).json({ error: { message: '需要超級管理員權限' } });
  }
  next();
}
