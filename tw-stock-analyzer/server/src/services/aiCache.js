import crypto from 'crypto';
import db from '../models/db.js';

// SHA-256 hash function
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Get today's date string (YYYY-MM-DD)
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

class AICacheService {
  /**
   * Generate a cache key from question and optional context
   */
  generateCacheKey(question, templateId = null, context = null) {
    const parts = [question];
    if (templateId) parts.push(templateId);
    if (context) parts.push(JSON.stringify(context));
    return sha256(parts.join('|'));
  }

  /**
   * Get cached response if exists
   */
  getCachedResponse(userId, question, templateId = null) {
    try {
      const today = getTodayDate();
      const questionHash = this.generateCacheKey(question, templateId);

      const cached = db.prepare(`
        SELECT answer, model_used, tokens_used, created_at 
        FROM ai_cache 
        WHERE user_id = ? AND cache_date = ? AND question_hash = ?
      `).get(userId, today, questionHash);

      if (cached) {
        return {
          cached: true,
          answer: cached.answer,
          modelUsed: cached.model_used,
          tokensUsed: cached.tokens_used,
          createdAt: cached.created_at
        };
      }

      return null;
    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Save response to cache
   */
  saveToCache(userId, question, answer, templateId = null, modelUsed = null, tokensUsed = null) {
    try {
      const today = getTodayDate();
      const questionHash = this.generateCacheKey(question, templateId);
      const id = crypto.randomUUID();

      db.prepare(`
        INSERT INTO ai_cache (id, user_id, cache_date, question_hash, question, answer, model_used, tokens_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, today, questionHash, question, answer, modelUsed, tokensUsed);

      return true;
    } catch (error) {
      console.error('Cache save error:', error);
      return false;
    }
  }

  /**
   * Clear old cache entries (older than specified days)
   */
  cleanupOldCache(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const result = db.prepare(`
        DELETE FROM ai_cache WHERE cache_date < ?
      `).run(cutoffStr);

      console.log(`🗑️  Cleared ${result.changes} old cache entries`);
      return result.changes;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics for a user
   */
  getUserCacheStats(userId) {
    try {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(DISTINCT cache_date) as active_days,
          SUM(tokens_used) as total_tokens
        FROM ai_cache 
        WHERE user_id = ?
      `).get(userId);

      return stats;
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }
}

export default new AICacheService();
