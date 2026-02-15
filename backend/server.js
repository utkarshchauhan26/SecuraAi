require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    environment: {
      hasGithubToken: !!process.env.GITHUB_TOKEN,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
    }
  });
});

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://secura-ai-pink.vercel.app',
  'https://securaai.vercel.app', // Add any other Vercel preview URLs if needed
  process.env.FRONTEND_URL
].filter(Boolean);

console.log('🌐 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - Tiered limits per endpoint type
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes for general API
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Stricter rate limit for scan endpoints (expensive operations)
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 scans per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many scan requests. Please wait before starting another scan.',
    retryAfter: '15 minutes'
  }
});

// Strict rate limit for auth-related endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes'
  }
});

// Report generation rate limit
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 reports per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many report requests. Please try again later.',
    retryAfter: '15 minutes'
  }
});

app.use('/api', apiLimiter);
app.use('/api/scans/file', scanLimiter);
app.use('/api/scans/repo', scanLimiter);
app.use('/api/reports', reportLimiter);

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing