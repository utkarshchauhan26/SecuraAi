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
    const userEmail = req.user?.email;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log(`📦 Repository scan request - URL: ${repoUrl}, Type: ${scanType}, User: ${userEmail}`);

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

    // Create scan record with both user_id and user_email
    const scanId = uuidv4();
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        id: scanId,
        project_id: project.id,
        user_id: userId,
        user_email: userEmail,
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
    const userEmail = req.user?.email;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const scanType = req.body.scanType || 'fast';
    console.log(`📁 File scan request - File: ${req.file.originalname}, Type: ${scanType}, User: ${userEmail}`);

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

    // Create scan record with both user_id and user_email
    const scanId = uuidv4();
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        id: scanId,
        project_id: project.id,
        user_id: userId,
        user_email: userEmail,
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

    // Upload file to Supabase Storage
    try {
      const fileBuffer = await fs.readFile(req.file.path);
      const fileName = `${scanId}/${req.file.originalname}`;
      
      console.log(`📤 Uploading file to Supabase Storage: ${fileName}`);
      
      // Create scan-files bucket if it doesn't exist
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.id === 'scan-files');
      
      if (!bucketExists) {
        await supabase.storage.createBucket('scan-files', {
          public: false,
          fileSizeLimit: 10485760 // 10MB
        });
      }
      
      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('scan-files')
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: true
        });
      
      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }
      
      // Get signed URL (valid for 1 hour - enough for GitHub Actions to download)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('scan-files')
        .createSignedUrl(fileName, 3600); // 1 hour
      
      if (urlError) {
        throw new Error(`Failed to get file URL: ${urlError.message}`);
      }
      
      const fileUrl = urlData.signedUrl;
      console.log(`✅ File uploaded successfully: ${fileUrl}`);
      
      // Clean up local file
      await fs.unlink(req.file.path).catch(err => 
        console.warn('Failed to delete local file:', err)
      );
      
      // Trigger GitHub Actions workflow
      await githubActionsService.triggerScan({
        scanId: scan.id,
        fileUrl: fileUrl,
        fileName: req.file.originalname,
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
    } catch (uploadError) {
      console.error('File upload/processing error:', uploadError);
      
      // Update scan to failed
      await supabase
        .from('scans')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: uploadError.message
        })
        .eq('id', scan.id);
      
      // Clean up local file
      await fs.unlink(req.file.path).catch(() => {});
      
      return res.status(500).json({
        success: false,
        message: 'Failed to process file upload',
        error: uploadError.message
      });
    }
  } catch (error) {
    console.error('File scan error:', error);
    
    // Clean up local file if it exists
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get scan status - READS DIRECTLY FROM SUPABASE (NO CACHE)
 */
const getScanStatus = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    console.log(`🔍 getScanStatus called - scanId: ${scanId}, userId: ${userId}, email: ${userEmail}`);

    // Add cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Query Supabase directly - NO in-memory cache
    const { data: scan, error } = await supabase
      .from('scans')
      .select('*, projects(*)')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single();

    if (error || !scan) {
      console.log(`⚠️ Scan not found: ${scanId} for user ${userId}`);
      console.log(`   Error:`, error?.message, error?.code);
      
      // Try to fetch without user filter to debug
      const { data: debugScan, error: debugError } = await supabase
        .from('scans')
        .select('id, user_id, user_email, status')
        .eq('id', scanId)
        .single();
      
      if (debugScan) {
        console.log(`   🔍 Scan exists but user_id mismatch!`);
        console.log(`      Scan user_id: ${debugScan.user_id}`);
        console.log(`      Scan user_email: ${debugScan.user_email}`);
        console.log(`      Request user_id: ${userId}`);
        console.log(`      Request user_email: ${userEmail}`);
      } else {
        console.log(`   Scan does not exist in database`);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    // Normalize status to UPPERCASE for frontend
    const normalizedStatus = (scan.status || 'queued').toUpperCase();

    // Calculate progress percentage
    let progress = scan.progress || 0;
    if (!progress && normalizedStatus === 'COMPLETED') {
      progress = 100;
    } else if (!progress && normalizedStatus === 'RUNNING') {
      // Calculate from processed_files if available
      if (scan.file_count > 0 && scan.processed_files >= 0) {
        progress = Math.round((scan.processed_files / scan.file_count) * 100);
      } else {
        progress = 30; // Default for running scans
      }
    }

    const responseData = {
      id: scan.id,
      status: normalizedStatus,
      progress,
      file_count: scan.file_count || 0,
      processed_files: scan.processed_files || 0,
      current_file: scan.current_file,
      findings_count: scan.total_findings || 0,
      started_at: scan.started_at,
      finished_at: scan.finished_at,
      report_url: scan.report_url,
      criticalCount: scan.critical_count || 0,
      highCount: scan.high_count || 0,
      mediumCount: scan.medium_count || 0,
      lowCount: scan.low_count || 0,
      project: {
        id: scan.projects.id,
        name: scan.projects.name
      }
    };

    console.log(`📊 Scan status for ${scanId}: ${normalizedStatus} (${progress}%) - Findings: ${responseData.findings_count}`);

    return res.json({
      success: true,
      data: responseData
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
 * Get user's scans - with report URLs
 */
const getUserScans = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;

    const { data: scans, error } = await supabase
      .from('scans')
      .select('*, projects(name, repo_url)')
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

    console.log(`📊 Fetched ${scans?.length || 0} scans for user ${userId}`);

    // Return in format frontend expects: { success: true, data: { scans: [...] } }
    return res.json({
      success: true,
      data: {
        scans: scans.map(scan => ({
          id: scan.id,
          projectName: scan.projects?.name || 'Unknown',
          projectId: scan.project_id,
          status: scan.status.toUpperCase(), // Normalize to uppercase
          totalFindings: scan.total_findings || 0,
          criticalCount: scan.critical_count || 0,
          highCount: scan.high_count || 0,
          mediumCount: scan.medium_count || 0,
          lowCount: scan.low_count || 0,
          createdAt: scan.created_at,
          startedAt: scan.started_at,
          finishedAt: scan.finished_at,
          completedAt: scan.finished_at, // Alias
          // IMPORTANT: Include report URL for download
          reportUrl: scan.report_url,
          report_url: scan.report_url, // Both formats for compatibility
          pdfUrl: scan.report_url,
          pdf_url: scan.report_url,
          // Additional fields for reports page
          targetPath: scan.projects?.repo_url,
          riskScore: scan.risk_score || 0,
          scanType: scan.scan_type || 'fast',
          filesScanned: scan.file_count || 0
        }))
      }
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
 * Get scan progress - READS DIRECTLY FROM SUPABASE (NO CACHE)
 * Returns real-time progress for active scans
 */
const getScanProgress = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id;

    // Add cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Query Supabase directly - NO in-memory progress tracker
    const { data: scan, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single();

    if (error || !scan) {
      console.log(`⚠️ Scan not found: ${scanId}`, error?.message);
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    // Normalize status to UPPERCASE
    const normalizedStatus = (scan.status || 'queued').toUpperCase();

    // Calculate progress percentage
    let progress = scan.progress || 0;
    if (!progress && normalizedStatus === 'COMPLETED') {
      progress = 100;
    } else if (!progress && normalizedStatus === 'RUNNING') {
      if (scan.file_count > 0 && scan.processed_files >= 0) {
        progress = Math.round((scan.processed_files / scan.file_count) * 100);
      } else {
        progress = 30;
      }
    }

    // Map status to phase
    let phase = 'Initializing';
    let message = 'Starting scan...';

    switch (normalizedStatus) {
      case 'QUEUED':
        phase = 'Queued';
        message = 'Waiting for GitHub Actions runner...';
        break;
      case 'RUNNING':
        phase = 'Scanning';
        message = scan.current_file 
          ? `Processing: ${scan.current_file}` 
          : `Scanning files... (${scan.processed_files || 0}/${scan.file_count || 0})`;
        break;
      case 'COMPLETED':
        phase = 'Completed';
        message = `Scan completed successfully - ${scan.total_findings || 0} findings detected`;
        break;
      case 'FAILED':
        phase = 'Failed';
        message = scan.error_message || 'Scan failed';
        break;
    }

    const progressData = {
      scanId: scan.id,
      status: normalizedStatus,
      phase,
      message,
      percentage: progress,
      totalFiles: scan.file_count || 0,
      processedFiles: scan.processed_files || 0,
      currentFile: scan.current_file,
      findingsCount: scan.total_findings || 0,
      elapsed: scan.started_at ? Date.now() - new Date(scan.started_at).getTime() : 0,
      estimatedTimeRemaining: null, // Can calculate if needed
      report_url: scan.report_url
    };

    console.log(`📈 Progress for ${scanId}: ${normalizedStatus} (${progress}%)`);

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
