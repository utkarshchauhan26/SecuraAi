const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const scanController = require('../controllers/scan.controller');
const { validateFileType } = require('../middleware/fileValidation');

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

// Routes
router.post('/file', upload.single('codeFile'), validateFileType, scanController.scanFile);
router.post('/repo', scanController.scanRepository);
router.get('/status/:scanId', scanController.getScanStatus);
router.get('/results/:scanId', scanController.getScanResults);

module.exports = router;