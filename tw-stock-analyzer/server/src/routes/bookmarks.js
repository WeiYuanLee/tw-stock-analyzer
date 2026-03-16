import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate, bookmarkSchema } from '../middleware/validate.js';

const router = Router();

// Get user's bookmarks
router.get('/', authenticate, (req, res) => {
  const bookmarks = db.prepare(`
    SELECT * FROM user_bookmarks 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).all(req.user.id);

  res.json({
    bookmarks: bookmarks.map(item => ({
      id: item.id,
      name: item.name,
      filters: JSON.parse(item.filters),
      createdAt: item.created_at
    }))
  });
});

// Create bookmark
router.post('/', authenticate, validate(bookmarkSchema), (req, res) => {
  const { name, filters } = req.validated;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO user_bookmarks (id, user_id, name, filters, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(id, req.user.id, name, JSON.stringify(filters));

  res.status(201).json({
    message: '書籤已建立',
    bookmark: {
      id,
      name,
      filters,
      createdAt: new Date().toISOString()
    }
  });
});

// Delete bookmark
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;

  const result = db.prepare(`
    DELETE FROM user_bookmarks WHERE id = ? AND user_id = ?
  `).run(id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: { message: '書籤不存在' } });
  }

  res.json({ message: '書籤已刪除' });
});

export default router;
