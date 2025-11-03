const axios = require('axios');
require('dotenv').config();

/**
 * Service to trigger GitHub Actions workflows for scanning
 */
class GitHubActionsService {
  constructor() {
    this.owner = 'utkarshchauhan26'; // Your GitHub username
    this.repo = 'SecuraAi'; // Your repository name
    this.token = process.env.GITHUB_TOKEN;
    
    if (!this.token) {
      console.warn('⚠️ GITHUB_TOKEN not set - GitHub Actions triggers will fail');
    }
  }

  /**
   * Trigger a scan via GitHub Actions repository_dispatch
   * @param {Object} payload - Scan payload
   * @returns {Promise<Object>}
   */
  async triggerScan(payload) {
    const {
      scanId,
      repoUrl = null,
      scanType = 'fast',
      userId
    } = payload;

    if (!this.token) {
      throw new Error('GitHub token not configured');
    }

    try {
      console.log(`🚀 Triggering GitHub Actions scan for scanId: ${scanId}`);
      
      const response = await axios.post(
        `https://api.github.com/repos/${this.owner}/${this.repo}/dispatches`,
        {
          event_type: 'scan-request',
          client_payload: {
            scan_id: scanId,
            repo_url: repoUrl,
            scan_type: scanType,
            user_id: userId,
            triggered_at: new Date().toISOString()
          }
        },
        {
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${this.token}`,
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );

      console.log(`✅ GitHub Actions workflow triggered successfully for scan ${scanId}`);
      
      return {
        success: true,
        message: 'Scan workflow triggered',
        scanId
      };
    } catch (error) {
      console.error('❌ Failed to trigger GitHub Actions:', error.response?.data || error.message);
      throw new Error(`Failed to trigger scan: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check if GitHub Actions is properly configured
   * @returns {Promise<boolean>}
   */
  async isConfigured() {
    if (!this.token) {
      return false;
    }

    try {
      // Verify token has access to repository
      const response = await axios.get(
        `https://api.github.com/repos/${this.owner}/${this.repo}`,
        {
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${this.token}`,
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('GitHub token validation failed:', error.message);
      return false;
    }
  }

  /**
   * Get workflow run status
   * @param {string} scanId - Scan ID to track
   * @returns {Promise<Object>}
   */
  async getWorkflowStatus(scanId) {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs`,
        {
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${this.token}`,
            'X-GitHub-Api-Version': '2022-11-28'
          },
          params: {
            per_page: 10
          }
        }
      );

      // Find workflow run matching our scan ID
      const runs = response.data.workflow_runs || [];
      const matchingRun = runs.find(run => 
        run.name === 'SecuraAI Scan' && 
        run.head_commit?.message?.includes(scanId)
      );

      if (matchingRun) {
        return {
          status: matchingRun.status,
          conclusion: matchingRun.conclusion,
          url: matchingRun.html_url
        };
      }

      return {
        status: 'queued',
        conclusion: null,
        url: null
      };
    } catch (error) {
      console.error('Failed to get workflow status:', error.message);
      return {
        status: 'unknown',
        conclusion: null,
        url: null
      };
    }
  }
}

module.exports = new GitHubActionsService();
