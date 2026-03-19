import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import watchlistRoutes from './routes/watchlist.js';
import bookmarksRoutes from './routes/bookmarks.js';
import subscriptionRoutes from './routes/subscription.js';
import paymentRoutes from './routes/payment.js';
import alertsRoutes from './routes/alerts.js';
import stocksRoutes from './routes/stocks.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import shioajiRoutes from './routes/shioaji.js';

// Database initialization
import { initDatabase } from './models/db.js';

// Alert monitor
import { checkPriceAlerts } from './services/alertMonitor.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Initialize database
await initDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shioaji', shioajiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual trigger for price check (for testing)
app.post('/api/alerts/check', async (req, res) => {
  try {
    await checkPriceAlerts();
    res.json({ message: '價格檢查已完成' });
  } catch (error) {
    console.error('Price check error:', error);
    res.status(500).json({ error: { message: '價格檢查失敗' } });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found' } });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // 啟動價格監控定時任務（每5分鐘檢查一次）
  if (process.env.ENABLE_ALERT_MONITOR !== 'false') {
    const CHECK_INTERVAL = parseInt(process.env.ALERT_CHECK_INTERVAL) || 300000; // 5 minutes default
    setInterval(() => {
      checkPriceAlerts().catch(console.error);
    }, CHECK_INTERVAL);
    console.log(`📊 Price alert monitor started (interval: ${CHECK_INTERVAL}ms)`);
  }
});

export default app;
