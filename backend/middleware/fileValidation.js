/**
 * Middleware to validate uploaded file types
 */
const path = require('path');

// List of allowed file extensions
const ALLOWED_EXTENSIONS = [
  // Common code file extensions
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go',
  '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', 
  
  // Config files
  '.env', '.gitignore', '.dockerignore', 'Dockerfile',
  
  // Archive files (for multiple file uploads)
  '.zip', '.tar', '.gz'
];

const validateFileType = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    // Delete the invalid file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    return res.status(400).json({
      success: false,
      message: `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    });
  }

  next();
};

module.exports = {
  validateFileType
};