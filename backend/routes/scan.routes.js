const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const scanController = require('../controllers/scan-controller-github-actions'); // Use GitHub Actions controller
const { validateFileType } = require('../middleware/fileValidation');
const { requireAuthSupabase } = require('../middleware/auth-supabase');
const { validate, sanitizeBody, repoUrlSchema, scanIdSchema, paginationSchema } = require('../middleware/validation');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// All routes require authentication
router.use(requireAuthSupabase);

// Sanitize all request bodies
router.use(sanitizeBody);

// Routes with input validation
router.post('/file', upload.single('codeFile'), validateFileType, scanController.scanFile);
router.post('/repo', validate(repoUrlSchema, 'body'), scanController.scanRepository);
router.get('/status/:scanId', validate(scanIdSchema, 'params'), scanController.getScanStatus);
router.get('/progress/:scanId', validate(scanIdSchema, 'params'), scanController.getScanProgress);
router.get('/details/:scanId', validate(scanIdSchema, 'params'), scanController.getScanDetails);
router.get('/list', validate(paginationSchema, 'query'), scanController.getUserScans);

module.exports = router;