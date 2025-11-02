const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { requireAuth } = require('../middleware/auth');

// Routes
router.get('/:scanId', requireAuth, reportController.getReport);
router.get('/:scanId/pdf', requireAuth, reportController.generatePdf);

module.exports = router;