import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../data/twstock.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
export async function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'superadmin')),
      membership_level TEXT DEFAULT 'free' CHECK(membership_level IN ('free', 'pro', 'vip')),
      membership_expire_at TEXT,
      is_active INTEGER DEFAULT 1,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_expires TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrate existing database - add missing columns
  try {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'superadmin'))`);
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`);
  } catch (e) {
    // Column already exists
  }

  // Create default admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(process.env.ADMIN_EMAIL || 'admin@twstock.com');
  if (!adminExists) {
    const { hashPassword } = await import('../utils/password.js');
    const adminPasswordHash = await hashPassword(process.env.ADMIN_PASSWORD || 'admin123');
    const adminId = 'admin-' + Date.now();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'superadmin', 1, datetime('now'), datetime('now'))
    `).run(adminId, process.env.ADMIN_EMAIL || 'admin@twstock.com', adminPasswordHash, 'Admin');
    console.log('✅ Default admin account created');
  }

  // User watchlist table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_watchlist (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      stock_code TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, stock_code),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // User bookmarks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      filters TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Subscriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan TEXT NOT NULL CHECK(plan IN ('pro', 'vip')),
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'expired')),
      started_at TEXT DEFAULT (datetime('now')),
      expired_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Orders/Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      plan TEXT NOT NULL CHECK(plan IN ('pro', 'vip')),
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'TWD',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'cancelled', 'expired')),
      payment_method TEXT,
      payment_no TEXT,
      newebpay_order_no TEXT,
      newebpay_trade_no TEXT,
      recurring_id TEXT,
      started_at TEXT,
      expired_at TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Price alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      stock_code TEXT NOT NULL,
      alert_type TEXT NOT NULL CHECK(alert_type IN ('price_above', 'price_below', 'change_percent', 'volume')),
      threshold REAL NOT NULL,
      channel TEXT NOT NULL CHECK(channel IN ('line', 'discord')),
      webhook_url TEXT,
      is_active INTEGER DEFAULT 1,
      triggered_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // AI Chat history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      template_type TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // AI Usage tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // AI Cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_cache (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      cache_date TEXT NOT NULL,
      question_hash TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      model_used TEXT,
      tokens_used INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(cache_date, question_hash),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for AI cache
  db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_cache_date ON ai_cache(cache_date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_cache(question_hash)`);

  console.log('✅ Database initialized');
}

export default db;
