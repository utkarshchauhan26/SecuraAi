const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { promisify } = require('util');
const rimraf = promisify(require('util').callbackify(async (dir) => {
  await fs.rm(dir, { recursive: true, force: true });
}));

/**
 * Service for cloning and managing GitHub repositories
 */
class GitHubService {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp/repos');
    this.cloneTimeout = 120000; // 2 minutes
    this.maxRepoSize = 500 * 1024 * 1024; // 500MB
    
    // Ensure temp directory exists
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Clone a GitHub repository
   * @param {string} repoUrl - GitHub repository URL
   * @param {Object} options - Clone options
   * @returns {Promise<Object>} - Clone information
   */
  async cloneRepository(repoUrl, options = {}) {
    const {
      branch = null,
      accessToken = null,
      shallow = true
    } = options;

    // Validate URL
    const validation = this._validateRepoUrl(repoUrl);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate unique clone directory
    const cloneId = crypto.randomBytes(16).toString('hex');
    const clonePath = path.join(this.tempDir, cloneId);

    console.log(`📦 Cloning repository: ${repoUrl}`);
    console.log(`📁 Clone path: ${clonePath}`);

    try {
      // Create clone directory
      await fs.mkdir(clonePath, { recursive: true });

      // Prepare clone URL with access token if provided
      let cloneUrl = repoUrl;
      if (accessToken) {
        cloneUrl = this._addTokenToUrl(repoUrl, accessToken);
      }

      // Initialize git
      const git = simpleGit({
        timeout: {
          block: this.cloneTimeout
        }
      });

      // Build clone options
      const cloneOptions = [];
      
      if (shallow) {
        cloneOptions.push('--depth', '1'); // Shallow clone (faster, less data)
      }
      
      if (branch) {
        cloneOptions.push('--branch', branch);
        cloneOptions.push('--single-branch');
      }

      // Clone the repository
      await git.clone(cloneUrl, clonePath, cloneOptions);

      console.log(`✅ Repository cloned successfully`);

      // Get repository info
      const repoGit = simpleGit(clonePath);
      const log = await repoGit.log({ maxCount: 1 });
      const status = await repoGit.status();

      // Check repository size
      const size = await this._getDirectorySize(clonePath);
      if (size > this.maxRepoSize) {
        await this.cleanup(cloneId);
        throw new Error(`Repository size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${this.maxRepoSize / 1024 / 1024}MB)`);
      }

      return {
        cloneId,
        clonePath,
        repoUrl: validation.cleanUrl,
        owner: validation.owner,
        repo: validation.repo,
        branch: status.current || branch || 'main',
        latestCommit: log.latest ? {
          hash: log.latest.hash,
          message: log.latest.message,
          author: log.latest.author_name,
          date: log.latest.date
        } : null,
        size: size,
        files: await this._countFiles(clonePath)
      };
    } catch (error) {
      console.error(`❌ Failed to clone repository:`, error.message);
      
      // Cleanup on error
      try {
        await this.cleanup(cloneId);
      } catch (cleanupError) {
        console.warn('Failed to cleanup after error:', cleanupError.message);
      }

      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Cleanup cloned repository
   * @param {string} cloneId - Clone identifier
   */
  async cleanup(cloneId) {
    const clonePath = path.join(this.tempDir, cloneId);
    
    try {
      await fs.rm(clonePath, { recursive: true, force: true });
      console.log(`🗑️  Cleaned up clone: ${cloneId}`);
    } catch (error) {
      console.error(`Failed to cleanup clone ${cloneId}:`, error.message);
      throw error;
    }
  }

  /**
   * Cleanup old clones (older than 1 hour)
   */
  async cleanupOldClones() {
    try {
      const entries = await fs.readdir(this.tempDir, { withFileTypes: true });
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(this.tempDir, entry.name);
          const stats = await fs.stat(dirPath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            await fs.rm(dirPath, { recursive: true, force: true });
            console.log(`🗑️  Cleaned up old clone: ${entry.name} (age: ${(age / 1000 / 60).toFixed(0)} min)`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old clones:', error.message);
    }
  }

  /**
   * Validate repository URL
   * @param {string} repoUrl - Repository URL
   * @returns {Object} - Validation result
   */
  _validateRepoUrl(repoUrl) {
    if (!repoUrl) {
      return { valid: false, error: 'Repository URL is required' };
    }

    // Support multiple formats:
    // - https://github.com/owner/repo
    // - https://github.com/owner/repo.git
    // - git@github.com:owner/repo.git
    // - github.com/owner/repo

    let cleanUrl = repoUrl.trim();
    
    // Remove .git suffix for parsing
    const urlWithoutGit = cleanUrl.replace(/\.git$/, '');
    
    // Extract owner and repo
    let owner, repo;
    
    // HTTPS URL
    const httpsMatch = urlWithoutGit.match(/https?:\/\/github\.com\/([^\/]+)\/([^\/\s]+)/);
    if (httpsMatch) {
      owner = httpsMatch[1];
      repo = httpsMatch[2];
      cleanUrl = `https://github.com/${owner}/${repo}`;
    } else {
      // SSH URL
      const sshMatch = urlWithoutGit.match(/git@github\.com:([^\/]+)\/([^\/\s]+)/);
      if (sshMatch) {
        owner = sshMatch[1];
        repo = sshMatch[2];
        cleanUrl = `https://github.com/${owner}/${repo}`;
      } else {
        // Short format: github.com/owner/repo
        const shortMatch = urlWithoutGit.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
        if (shortMatch) {
          owner = shortMatch[1];
          repo = shortMatch[2];
          cleanUrl = `https://github.com/${owner}/${repo}`;
        } else {
          return { valid: false, error: 'Invalid GitHub repository URL format' };
        }
      }
    }

    if (!owner || !repo) {
      return { valid: false, error: 'Could not extract owner and repository name from URL' };
    }

    return {
      valid: true,
      cleanUrl: cleanUrl + '.git',
      owner,
      repo
    };
  }

  /**
   * Add access token to repository URL
   * @param {string} repoUrl - Repository URL
   * @param {string} token - GitHub personal access token
   * @returns {string} - URL with token
   */
  _addTokenToUrl(repoUrl, token) {
    // Convert to HTTPS URL with token
    // Format: https://TOKEN@github.com/owner/repo.git
    const validation = this._validateRepoUrl(repoUrl);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return `https://${token}@github.com/${validation.owner}/${validation.repo}.git`;
  }

  /**
   * Get directory size recursively
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>} - Size in bytes
   */
  async _getDirectorySize(dirPath) {
    let totalSize = 0;

    const getSize = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip .git directory for size calculation
          if (entry.name !== '.git') {
            await getSize(fullPath);
          }
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    };

    await getSize(dirPath);
    return totalSize;
  }

  /**
   * Count files in directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>} - Number of files
   */
  async _countFiles(dirPath) {
    let fileCount = 0;

    const count = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') {
          continue; // Skip .git and node_modules
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await count(fullPath);
        } else {
          fileCount++;
        }
      }
    };

    await count(dirPath);
    return fileCount;
  }

  /**
   * Check if GitHub CLI is available
   */
  async checkGitInstallation() {
    try {
      const git = simpleGit();
      await git.version();
      return true;
    } catch (error) {
      console.error('Git is not installed or not in PATH');
      return false;
    }
  }
}

module.exports = new GitHubService();
