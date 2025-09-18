const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usage.controller');

// Routes
router.get('/stats', usageController.getUsageStats);

module.exports = router;