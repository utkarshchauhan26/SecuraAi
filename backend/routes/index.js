const express = require('express');
const router = express.Router();

// Import route modules
const scanRoutes = require('./scan.routes');
const githubRoutes = require('./github.routes');
const reportRoutes = require('./report.routes');
const usageRoutes = require('./usage.routes');

// Mount routes
router.use('/scans', scanRoutes); // Changed from /scan to /scans
router.use('/github', githubRoutes);
router.use('/reports', reportRoutes); // Changed from /report to /reports
router.use('/usage', usageRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

module.exports = router;