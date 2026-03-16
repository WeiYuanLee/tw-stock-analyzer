import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import db from '../models/db.js';
import aiService, { AI_TEMPLATES, TEMPLATES_BY_LEVEL } from '../services/ai.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get today's date string (YYYY-MM-DD)
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Generate SHA-256 hash of a string
function generateHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Check cache for a question
function getCachedResponse(userId, question) {
  const today = getTodayDate();
  const questionHash = generateHash(question);
  
  const cached = db.prepare(`
    SELECT answer, model_used, tokens_used FROM ai_cache 
    WHERE user_id = ? AND cache_date = ? AND question_hash = ?
  `).get(userId, today, questionHash);
  
  return cached;
}

// Save response to cache
function saveToCache(userId, question, answer, modelUsed = null, tokensUsed = null) {
  const today = getTodayDate();
  const questionHash = generateHash(question);
  const id = crypto.randomUUID();
  
  try {
    db.prepare(`
      INSERT INTO ai_cache (id, user_id, cache_date, question_hash, question, answer, model_used, tokens_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, today, questionHash, question, answer, modelUsed, tokensUsed);
  } catch (error) {
    // Ignore duplicate key errors (same question same day)
    if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
      console.error('Cache save error:', error);
    }
  }
}

// Check and increment usage
function checkAndIncrementUsage(userId, requiredLevel) {
  const today = getTodayDate();
  
  // For VIP users, no limit
  if (userId.membership_level === 'vip') {
    return { allowed: true, remaining: -1 };
  }

  // Pro users have daily limit
  const dailyLimit = parseInt(process.env.PRO_DAILY_LIMIT) || 50;
  
  // Get or create usage record
  let usage = db.prepare('SELECT * FROM ai_usage WHERE user_id = ? AND date = ?').get(userId.id, today);
  
  if (!usage) {
    // Create new usage record
    const id = require('crypto').randomUUID();
    db.prepare('INSERT INTO ai_usage (id, user_id, date, usage_count) VALUES (?, ?, ?, 0)').run(id, userId.id, today);
    usage = { usage_count: 0 };
  }

  const remaining = dailyLimit - usage.usage_count;
  
  if (remaining <= 0) {
    return { allowed: false, remaining: 0, limit: dailyLimit };
  }

  // Increment usage
  db.prepare('UPDATE ai_usage SET usage_count = usage_count + 1, updated_at = datetime("now") WHERE user_id = ? AND date = ?')
    .run(userId.id, today);

  return { allowed: true, remaining: remaining - 1, limit: dailyLimit };
}

// Check template access permission
function checkTemplateAccess(userLevel, templateId) {
  const template = AI_TEMPLATES[templateId];
  if (!template) {
    return { allowed: false, reason: '無效的模板 ID' };
  }

  // VIP can access everything
  if (userLevel === 'vip') {
    return { allowed: true };
  }

  // Pro can access pro templates
  if (userLevel === 'pro' && template.requiredLevel === 'pro') {
    return { allowed: true };
  }

  return { 
    allowed: false, 
    reason: template.requiredLevel === 'vip' ? '此功能僅限 VIP 會員使用' : '此功能僅限 Pro 以上會員使用' 
  };
}

// Get usage status
router.get('/usage', (req, res) => {
  const userLevel = req.user.membership_level;
  const today = getTodayDate();
  
  if (userLevel === 'vip') {
    return res.json({
      level: 'vip',
      limit: 'unlimited',
      used: 0,
      remaining: 'unlimited'
    });
  }

  const dailyLimit = parseInt(process.env.PRO_DAILY_LIMIT) || 50;
  const usage = db.prepare('SELECT usage_count FROM ai_usage WHERE user_id = ? AND date = ?')
    .get(req.user.id, today);

  const used = usage?.usage_count || 0;
  
  res.json({
    level: userLevel,
    limit: dailyLimit,
    used,
    remaining: Math.max(0, dailyLimit - used)
  });
});

// Get all templates
router.get('/templates', (req, res) => {
  const userLevel = req.user.membership_level;
  const templates = aiService.getAllTemplates();
  
  // Mark accessible templates for user
  const templatesWithAccess = templates.map(t => ({
    ...t,
    accessible: userLevel === 'vip' || (userLevel === 'pro' && t.requiredLevel === 'pro')
  }));

  res.json({ templates: templatesWithAccess });
});

// Get chat history
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const history = db.prepare(`
    SELECT * FROM ai_chat_history 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);

  // Group by conversation sessions (simple grouping by time proximity)
  const groupedHistory = [];
  let currentSession = [];
  let lastTime = null;

  // Reverse to show oldest first
  const reversedHistory = [...history].reverse();

  reversedHistory.forEach((msg, index) => {
    const msgTime = new Date(msg.created_at);
    
    if (lastTime && (msgTime - lastTime) > 30 * 60 * 1000) {
      // More than 30 minutes gap = new session
      if (currentSession.length > 0) {
        groupedHistory.push(currentSession);
      }
      currentSession = [];
    }
    
    currentSession.push(msg);
    lastTime = msgTime;
  });

  if (currentSession.length > 0) {
    groupedHistory.push(currentSession);
  }

  res.json({ history: groupedHistory.reverse() });
});

// Delete chat history
router.delete('/history/:id', (req, res) => {
  const { id } = req.params;

  const result = db.prepare('DELETE FROM ai_chat_history WHERE id = ? AND user_id = ?')
    .run(id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: { message: '對話記錄不存在' } });
  }

  res.json({ message: '對話記錄已刪除' });
});

// Clear all chat history
router.delete('/history', (req, res) => {
  db.prepare('DELETE FROM ai_chat_history WHERE user_id = ?').run(req.user.id);
  res.json({ message: '所有對話記錄已清除' });
});

// Send chat message
router.post('/chat', async (req, res) => {
  try {
    const { message, templateId, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: { message: '請提供有效的訊息' } });
    }

    // Build cache key (include templateId if present)
    const cacheKey = templateId ? `${templateId}:${message}` : message;
    let usageCheck = null;

    // If using a template, check access and usage limit
    if (templateId) {
      const accessCheck = checkTemplateAccess(req.user.membership_level, templateId);
      if (!accessCheck.allowed) {
        return res.status(403).json({ error: { message: accessCheck.reason } });
      }

      // Check usage limit
      usageCheck = checkAndIncrementUsage(req.user, templateId);
      if (!usageCheck.allowed) {
        return res.status(429).json({ 
          error: { message: '每日使用次數已用完', limit: usageCheck.limit } 
        });
      }

      // Check cache first (for template-based queries)
      const cachedResponse = getCachedResponse(req.user.id, cacheKey);
      if (cachedResponse) {
        // Save to history anyway for continuity
        const userMsgId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        db.prepare(`
          INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
          VALUES (?, ?, 'user', ?, ?, ?)
        `).run(userMsgId, req.user.id, message, templateId, timestamp);

        const aiMsgId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
          VALUES (?, ?, 'assistant', ?, ?, ?)
        `).run(aiMsgId, req.user.id, cachedResponse.answer, templateId, timestamp);

        return res.json({
          message: cachedResponse.answer,
          fromCache: true,
          timestamp,
          usage: {
            remaining: usageCheck.remaining
          }
        });
      }
    } else {
      // Check cache for non-template chats too
      const cachedResponse = getCachedResponse(req.user.id, cacheKey);
      if (cachedResponse) {
        const timestamp = new Date().toISOString();
        
        // Save to history for continuity
        const userMsgId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
          VALUES (?, ?, 'user', ?, ?, ?)
        `).run(userMsgId, req.user.id, message, null, timestamp);

        const aiMsgId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
          VALUES (?, ?, 'assistant', ?, ?, ?)
        `).run(aiMsgId, req.user.id, cachedResponse.answer, null, timestamp);

        return res.json({
          message: cachedResponse.answer,
          fromCache: true,
          timestamp
        });
      }
    }

    // Get conversation history for context
    let conversationHistory = [];
    if (conversationId) {
      conversationHistory = db.prepare(`
        SELECT * FROM ai_chat_history 
        WHERE user_id = ? 
        AND created_at LIKE ?
        ORDER BY created_at ASC
      `).all(req.user.id, `${conversationId}%`);
    }

    // Save user message
    const userMsgId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    db.prepare(`
      INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
      VALUES (?, ?, 'user', ?, ?, ?)
    `).run(userMsgId, req.user.id, message, templateId || null, timestamp);

    // Call AI service
    let aiResponse;
    if (templateId) {
      aiResponse = await aiService.chatWithTemplate(templateId, message, conversationHistory);
    } else {
      aiResponse = await aiService.chat([
        ...conversationHistory.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message }
      ]);
    }

    // Extract response content
    const responseContent = aiResponse.content || aiResponse.message?.content || '';

    // Save to cache
    saveToCache(req.user.id, cacheKey, responseContent, aiResponse.model || null, aiResponse.tokens || null);

    // Save AI response
    const aiMsgId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
      VALUES (?, ?, 'assistant', ?, ?, ?)
    `).run(aiMsgId, req.user.id, responseContent, templateId || null, timestamp);

    res.json({
      message: responseContent,
      fromCache: false,
      timestamp,
      usage: {
        remaining: usageCheck?.remaining ?? 'unlimited'
      }
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: { message: error.message || 'AI 服務發生錯誤' } });
  }
});

// Quick analyze endpoint
router.post('/analyze/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { input } = req.body;

    // Check template access
    const accessCheck = checkTemplateAccess(req.user.membership_level, type);
    if (!accessCheck.allowed) {
      return res.status(403).json({ error: { message: accessCheck.reason } });
    }

    // Check usage limit
    const usageCheck = checkAndIncrementUsage(req.user, type);
    if (!usageCheck.allowed) {
      return res.status(429).json({ 
        error: { message: '每日使用次數已用完', limit: usageCheck.limit } 
      });
    }

    const template = aiService.getTemplate(type);
    const userInput = input || '台灣整體市場';

    // Check cache first
    const cacheKey = userInput + '|' + type;
    const cachedResponse = getCachedResponse(req.user.id, cacheKey);
    if (cachedResponse) {
      const timestamp = new Date().toISOString();
      
      // Save to history for continuity
      const msgId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
        VALUES (?, ?, 'user', ?, ?, ?)
      `).run(msgId, req.user.id, userInput, type, timestamp);

      const aiMsgId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
        VALUES (?, ?, 'assistant', ?, ?, ?)
      `).run(aiMsgId, req.user.id, cachedResponse.answer, type, timestamp);

      return res.json({
        analysis: cachedResponse.answer,
        type: type,
        input: userInput,
        timestamp,
        fromCache: true,
        usage: {
          remaining: usageCheck.remaining
        }
      });
    }

    const aiResponse = await aiService.chatWithTemplate(type, userInput);
    const responseContent = aiResponse.content || aiResponse.message?.content || '';

    // Save to cache
    saveToCache(req.user.id, cacheKey, responseContent);

    // Save to history
    const timestamp = new Date().toISOString();
    const msgId = require('crypto').randomUUID();
    
    db.prepare(`
      INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
      VALUES (?, ?, 'user', ?, ?, ?)
    `).run(msgId, req.user.id, userInput, type, timestamp);

    const aiMsgId = require('crypto').randomUUID();
    db.prepare(`
      INSERT INTO ai_chat_history (id, user_id, role, content, template_type, created_at)
      VALUES (?, ?, 'assistant', ?, ?, ?)
    `).run(aiMsgId, req.user.id, responseContent, type, timestamp);

    res.json({
      analysis: responseContent,
      type: type,
      input: userInput,
      fromCache: false,
      timestamp,
      usage: {
        remaining: usageCheck.remaining
      }
    });
  } catch (error) {
    console.error('AI Analyze Error:', error);
    res.status(500).json({ error: { message: error.message || '分析發生錯誤' } });
  }
});

// Cache management endpoints
router.delete('/cache', (req, res) => {
  const daysToKeep = parseInt(req.query.days) || 0;
  
  if (daysToKeep > 0) {
    // Delete cache older than specified days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    const result = db.prepare('DELETE FROM ai_cache WHERE cache_date < ? AND user_id = ?')
      .run(cutoffStr, req.user.id);
    
    return res.json({ 
      message: `已清除 ${result.changes} 筆記錄`,
      deletedCount: result.changes
    });
  }
  
  // Clear all cache for user
  db.prepare('DELETE FROM ai_cache WHERE user_id = ?').run(req.user.id);
  res.json({ message: '已清除所有快取記錄' });
});

// Get cache stats
router.get('/cache/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_entries,
      COUNT(DISTINCT cache_date) as active_days,
      MIN(cache_date) as oldest_date,
      MAX(cache_date) as newest_date
    FROM ai_cache 
    WHERE user_id = ?
  `).get(req.user.id);

  res.json({ stats });
});

export default router;
