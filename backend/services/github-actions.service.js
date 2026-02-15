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
      console.error('❌ GITHUB_TOKEN not set in environment variables!');
      console.error('📋 To fix: Add GITHUB_TOKEN to Render environment with a GitHub PAT (repo + workflow scopes)');
    } else {
      console.log('✅ GITHUB_TOKEN is configured');
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
      fileUrl = null,
      fileName = null,
      scanType = 'fast',
      userId
    } = payload;

    if (!this.token) {
      const errorMsg = 'GitHub token not configured. Please add GITHUB_TOKEN to environment variables on Render.';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Validate that either repo_url or file_url is provided
    if (!repoUrl && !fileUrl) {
      console.warn('⚠️ No repo_url or file_url provided - scan may fail in GitHub Actions');
    }

    try {
      const scanSource = fileUrl ? 'file' : 'repository';
      console.log(`🚀 Triggering GitHub Actions ${scanSource} scan for scanId: ${scanId}`);
      console.log(`📦 Source: ${repoUrl || fileName || 'Not provided'}`);
      console.log(`🔍 Scan Type: ${scanType}`);
      console.log(`🔑 Using token: ${this.token.substring(0, 7)}...`);
      
      const clientPayload = {
        scan_id: scanId,
        repo_url: repoUrl,
        file_url: fileUrl,
        file_name: fileName,
        scan_type: scanType,
        user_id: userId,
        triggered_at: new Date().toISOString()
      };

      console.log('📤 Sending payload:', JSON.stringify(clientPayload, null, 2));
      
      const response = await axios.post(
        `https://api.github.com/repos/${this.owner}/${this.repo}/dispatches`,
        {
          event_type: 'scan-request',
          client_payload: clientPayload
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
      console.log(`📋 Response status: ${response.status}`);
      
      return {
        success: true,
        message: 'Scan workflow triggered',
        scanId,
        payload: clientPayload
      };
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      console.error('❌ Failed to trigger GitHub Actions:', errorDetails);
      console.error('📋 Status:', error.response?.status);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid GitHub token. Please check GITHUB_TOKEN on Render (needs repo + workflow scopes)');
      } else if (error.response?.status === 404) {
        throw new Error('Repository not found. Check owner/repo in github-actions.service.js');
      } else {
        throw new Error(`Failed to trigger scan: ${errorDetails.message || errorDetails}`);
      }
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
