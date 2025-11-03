const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const scanController = require('../controllers/scan-controller-github-actions'); // Use GitHub Actions controller
const { validateFileType } = require('../middleware/fileValidation');
const { requireAuthSupabase } = require('../middleware/auth-supabase');

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

// Routes
router.post('/file', upload.single('codeFile'), validateFileType, scanController.scanFile);
router.post('/repo', scanController.scanRepository);
router.get('/status/:scanId', scanController.getScanStatus); // Get scan status
router.get('/progress/:scanId', scanController.getScanProgress); // Get real-time progress
router.get('/details/:scanId', scanController.getScanDetails);
router.get('/list', scanController.getUserScans); // Get all user scans

module.exports = router;