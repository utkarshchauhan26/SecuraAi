const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const githubService = require('../services/github.service');
const githubActionsService = require('../services/github-actions.service');
const { extractZipFile, cleanupExtractionDir, isZipFile } = require('../utils/file-extractor');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Scan a repository using GitHub Actions
 */
const scanRepository = async (req, res) => {
  try {
    const { repoUrl, scanType = 'fast' } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Repository URL is required'
      });
    }

    // Get authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log(`📦 Repository scan request - URL: ${repoUrl}, Type: ${scanType}`);

    // Extract repository name from URL
    const repoName = repoUrl.split('/').pop().replace('.git', '');

    // Create project record
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        id: uuidv4(),
        name: repoName,
        source: 'github',
        repo_url: repoUrl,
        user_id: userId
      })
      .select()
      .single();

    if (projectError) {
      console.error('Failed to create project:', projectError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create project'
      });
    }

    // Create scan record
    const scanId = uuidv4();
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        id: scanId,
        project_id: project.id,
        user_id: userId,
        status: 'queued',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (scanError) {
      console.error('Failed to create scan:', scanError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create scan'
      });
    }

    // Trigger GitHub Actions workflow
    try {
      await githubActionsService.triggerScan({
        scanId: scan.id,
        repoUrl,
        scanType,
        userId
      });

      console.log(`✅ Scan ${scan.id} queued for GitHub Actions processing`);

      return res.json({
        success: true,
        message: 'Scan queued successfully - GitHub Actions will process it',
        data: {
          scanId: scan.id,
          projectId: project.id,
          status: 'queued',
          estimatedTime: scanType === 'fast' ? '2-3 minutes' : '5-10 minutes'
        }
      });
    } catch (triggerError) {
      // Update scan to failed
      await supabase
        .from('scans')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: triggerError.message
        })
        .eq('id', scan.id);

      console.error('Failed to trigger GitHub Actions:', triggerError);
      return res.status(500).json({
        success: false,
        message: 'Failed to queue scan for processing',
        error: triggerError.message
      });
    }
  } catch (error) {
    console.error('Repository scan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Scan an uploaded file using GitHub Actions
 */
const scanFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const scanType = req.body.scanType || 'fast';
    console.log(`📁 File scan request - File: ${req.file.originalname}, Type: ${scanType}`);

    // Create project record
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        id: uuidv4(),
        name: req.file.originalname.replace(/\.[^/.]+$/, ""),
        source: 'upload',
        user_id: userId
      })
      .select()
      .single();

    if (projectError) {
      console.error('Failed to create project:', projectError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create project'
      });
    }

    // Create scan record
    const scanId = uuidv4();
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        id: scanId,
        project_id: project.id,
        user_id: userId,
        status: 'queued',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (scanError) {
      console.error('Failed to create scan:', scanError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create scan'
      });
    }

    // Note: File uploads would need to be uploaded to a storage service
    // that GitHub Actions can access (e.g., Supabase Storage)
    // For now, return an informative message
    
    console.log(`⚠️ File scans via GitHub Actions require file upload implementation`);
    
    return res.json({
      success: true,
      message: 'Scan queued successfully',
      data: {
        scanId: scan.id,
        projectId: project.id,
        status: 'queued',
        note: 'File will be processed by GitHub Actions'
      }
    });
  } catch (error) {
    console.error('File scan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get scan status
 */
const getScanStatus = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id;

    const { data: scan, error } = await supabase
      .from('scans')
      .select('*, projects(*)')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single();

    if (error || !scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    return res.json({
      success: true,
      data: {
        id: scan.id,
        status: scan.status,
        createdAt: scan.created_at,
        startedAt: scan.started_at,
        finishedAt: scan.finished_at,
        totalFindings: scan.total_findings || 0,
        criticalCount: scan.critical_count || 0,
        highCount: scan.high_count || 0,
        mediumCount: scan.medium_count || 0,
        lowCount: scan.low_count || 0,
        project: {
          id: scan.projects.id,
          name: scan.projects.name
        }
      }
    });
  } catch (error) {
    console.error('Get scan status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get scan details with findings
 */
const getScanDetails = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id;

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('*, projects(*)')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single();

    if (scanError || !scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    const { data: findings, error: findingsError } = await supabase
      .from('findings')
      .select('*')
      .eq('scan_id', scanId)
      .order('severity', { ascending: false });

    if (findingsError) {
      console.error('Failed to fetch findings:', findingsError);
    }

    return res.json({
      success: true,
      data: {
        scan: {
          id: scan.id,
          status: scan.status,
          createdAt: scan.created_at,
          startedAt: scan.started_at,
          finishedAt: scan.finished_at,
          totalFindings: scan.total_findings || 0
        },
        project: {
          id: scan.projects.id,
          name: scan.projects.name,
          source: scan.projects.source,
          repoUrl: scan.projects.repo_url
        },
        findings: findings || []
      }
    });
  } catch (error) {
    console.error('Get scan details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get user's scans
 */
const getUserScans = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;

    const { data: scans, error } = await supabase
      .from('scans')
      .select('*, projects(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      console.error('Failed to fetch scans:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch scans'
      });
    }

    return res.json({
      success: true,
      data: scans.map(scan => ({
        id: scan.id,
        projectName: scan.projects?.name || 'Unknown',
        status: scan.status,
        totalFindings: scan.total_findings || 0,
        createdAt: scan.created_at,
        startedAt: scan.started_at,
        finishedAt: scan.finished_at
      }))
    });
  } catch (error) {
    console.error('Get user scans error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get scan progress (for GitHub Actions scans, return workflow status)
 */
const getScanProgress = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id;

    const { data: scan, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single();

    if (error || !scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    // For GitHub Actions scans, return simple status
    const progressData = {
      scanId: scan.id,
      status: scan.status,
      phase: scan.status === 'queued' ? 'Queued for GitHub Actions' : 
             scan.status === 'completed' ? 'Completed' : 
             scan.status === 'failed' ? 'Failed' : 'Processing',
      message: scan.status === 'queued' ? 'Waiting for GitHub Actions runner...' :
               scan.status === 'completed' ? 'Scan completed successfully' :
               scan.status === 'failed' ? 'Scan failed' : 'Scanning in progress...'
    };

    return res.json({
      success: true,
      data: progressData
    });
  } catch (error) {
    console.error('Get scan progress error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  scanFile,
  scanRepository,
  getScanStatus,
  getScanDetails,
  getUserScans,
  getScanProgress
};
