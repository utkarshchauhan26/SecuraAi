const path = require('path');
const fs = require('fs');
const util = require('util');
const simpleGit = require('simple-git');
const { v4: uuidv4 } = require('uuid');

// Promisify fs functions
const mkdirAsync = util.promisify(fs.mkdir);
const rmdirAsync = util.promisify(fs.rmdir);

/**
 * Clone a GitHub repository
 */
const cloneRepository = async (req, res) => {
  const { repoUrl } = req.body;
  
  if (!repoUrl) {
    return res.status(400).json({
      success: false,
      message: 'Repository URL is required'
    });
  }
  
  // Generate a unique directory name for this clone
  const cloneId = uuidv4();
  const cloneDir = path.join(__dirname, '..', 'uploads', 'repos', cloneId);
  
  try {
    // Create directory
    await mkdirAsync(cloneDir, { recursive: true });
    
    // Initialize git and clone repository
    const git = simpleGit();
    await git.clone(repoUrl, cloneDir);
    
    return res.status(200).json({
      success: true,
      message: 'Repository cloned successfully',
      cloneId,
      cloneDir
    });
  } catch (error) {
    console.error('Error cloning repository:', error);
    
    // Clean up directory if it was created
    try {
      if (fs.existsSync(cloneDir)) {
        await rmdirAsync(cloneDir, { recursive: true });
      }
    } catch (cleanupError) {
      console.error('Error cleaning up clone directory:', cleanupError);
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to clone repository',
      error: error.message
    });
  }
};

/**
 * Validate if a GitHub repository exists and is accessible
 */
const validateRepository = async (req, res) => {
  const { owner, repo } = req.params;
  
  if (!owner || !repo) {
    return res.status(400).json({
      success: false,
      message: 'Owner and repository name are required'
    });
  }
  
  try {
    // Construct repository URL
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    
    // Check if repository exists using simpleGit
    const git = simpleGit();
    await git.listRemote([repoUrl]);
    
    return res.status(200).json({
      success: true,
      message: 'Repository exists and is accessible',
      repoUrl
    });
  } catch (error) {
    console.error('Error validating repository:', error);
    
    return res.status(404).json({
      success: false,
      message: 'Repository not found or not accessible',
      error: error.message
    });
  }
};

module.exports = {
  cloneRepository,
  validateRepository
};