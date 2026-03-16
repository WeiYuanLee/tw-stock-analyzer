import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate, watchlistSchema } from '../middleware/validate.js';

const router = Router();

// Get user's watchlist
router.get('/', authenticate, (req, res) => {
  const watchlist = db.prepare(`
    SELECT * FROM user_watchlist 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).all(req.user.id);

  res.json({
    watchlist: watchlist.map(item => ({
      id: item.id,
      stockCode: item.stock_code,
      createdAt: item.created_at
    }))
  });
});

// Add stock to watchlist
router.post('/', authenticate, validate(watchlistSchema), (req, res) => {
  const { stockCode } = req.validated;
  const normalizedCode = stockCode.toUpperCase().trim();

  // Check if already exists
  const existing = db.prepare(`
    SELECT id FROM user_watchlist WHERE user_id = ? AND stock_code = ?
  `).get(req.user.id, normalizedCode);

  if (existing) {
    return res.status(400).json({ error: { message: '此股票已在自選股中' } });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO user_watchlist (id, user_id, stock_code, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(id, req.user.id, normalizedCode);

  res.status(201).json({
    message: '已加入自選股',
    watchlist: {
      id,
      stockCode: normalizedCode,
      createdAt: new Date().toISOString()
    }
  });
});

// Remove stock from watchlist
router.delete('/:code', authenticate, (req, res) => {
  const { code } = req.params;
  const normalizedCode = code.toUpperCase();

  const result = db.prepare(`
    DELETE FROM user_watchlist WHERE user_id = ? AND stock_code = ?
  `).run(req.user.id, normalizedCode);

  if (result.changes === 0) {
    return res.status(404).json({ error: { message: '自選股不存在' } });
  }

  res.json({ message: '已移除自選股' });
});

export default router;
