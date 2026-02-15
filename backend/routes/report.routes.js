const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { requireAuth } = require('../middleware/auth');
const { validate, scanIdSchema } = require('../middleware/validation');

// Routes with input validation
router.get('/:scanId', requireAuth, validate(scanIdSchema, 'params'), reportController.getReport);
router.get('/:scanId/pdf', requireAuth, validate(scanIdSchema, 'params'), reportController.generatePdf);

module.exports = router;