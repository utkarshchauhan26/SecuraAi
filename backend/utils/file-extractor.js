const path = require('path');
const fs = require('fs').promises;
const StreamZip = require('node-stream-zip');

/**
 * Extract ZIP file and return the extraction directory
 * @param {string} zipPath - Path to the ZIP file
 * @returns {Promise<string>} - Path to extraction directory
 */
async function extractZipFile(zipPath) {
  const extractDir = path.join(path.dirname(zipPath), `extracted_${Date.now()}`);
  
  try {
    // Create extraction directory
    await fs.mkdir(extractDir, { recursive: true });
    
    console.log(`📦 Extracting ZIP file to: ${extractDir}`);
    
    const zip = new StreamZip.async({ file: zipPath });
    
    // Extract all files
    const count = await zip.extract(null, extractDir);
    await zip.close();
    
    console.log(`✅ Extracted ${count} files from ZIP`);
    
    return extractDir;
    
  } catch (error) {
    console.error('❌ Error extracting ZIP file:', error);
    // Clean up on error
    try {
      await fs.rm(extractDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to extract ZIP file: ${error.message}`);
  }
}

/**
 * Clean up extraction directory
 * @param {string} dirPath - Path to directory to clean up
 */
async function cleanupExtractionDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`🗑️ Cleaned up extraction directory: ${dirPath}`);
  } catch (error) {
    console.warn(`⚠️ Could not clean up extraction directory: ${error.message}`);
  }
}

/**
 * Check if file is a ZIP archive
 * @param {string} filePath - Path to file
 * @returns {boolean} - True if file is ZIP
 */
function isZipFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.zip', '.tar', '.gz'].includes(ext);
}

module.exports = {
  extractZipFile,
  cleanupExtractionDir,
  isZipFile
};