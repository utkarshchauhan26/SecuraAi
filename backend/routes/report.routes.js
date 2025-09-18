const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

// Routes
router.get('/:scanId', reportController.getReport);
router.get('/:scanId/pdf', reportController.generatePdf);

module.exports = router;