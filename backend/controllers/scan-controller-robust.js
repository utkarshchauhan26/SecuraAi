const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const semgrepService = require('../services/semgrep.service');
const aiService = require('../services/ai.service');
const aiAnalysisService = require('../services/ai-analysis.service');
const scoringService = require('../services/scoring.service');
const githubService = require('../services/github.service');
const { extractZipFile, cleanupExtractionDir, isZipFile } = require('../utils/file-extractor');
const { createClient } = require('@supabase/supabase-js');
const progressTracker = require('../utils/semgrep-progress-tracker');
require('dotenv').config();

// Scan timeout configuration
const SCAN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const SCAN_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Helper function to count findings by severity
 */
function getSeverityCounts(findings) {
  const counts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };

  findings.forEach(finding => {
    const severity = finding.severity?.toUpperCase() || 'MEDIUM';
    if (counts.hasOwnProperty(severity)) {
      counts[severity]++;
    } else {
      counts['MEDIUM']++; // Default unknown severities to MEDIUM
    }
  });

  return counts;
}

/**
 * Helper function to count findings by severity
 */
function getSeverityCounts(findings) {
  return {
    CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
    HIGH: findings.filter(f => f.severity === 'HIGH').length,
    MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
    LOW: findings.filter(f => f.severity === 'LOW').length
  };
}

/**
 * Scan a single uploaded file for vulnerabilities
 * ROBUST version that handles foreign key constraints gracefully
 */
const scanFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get authenticated user from middleware (already has converted UUID)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Extract scanType from request body (default to 'fast')
    const scanType = req.body.scanType || 'fast';
    console.log('🔍 Processing scan for user:', userId, '| Scan type:', scanType);

    // Try to handle user profile with robust error handling
    let userProfile = await handleUserProfile(userId, req.user);

    // Try to create project with fallback approach
    let project = await handleProjectCreation(userId, req.file.originalname, userProfile);

    // Try to create scan record with fallback approach
    let scan = await handleScanCreation(project.id, userId);

    console.log('✅ Created scan record:', scan.id);

    // Return immediate response
    res.json({
      success: true,
      message: 'Scan started successfully',
      data: {
        scanId: scan.id,
        projectId: project.id,
        status: 'running',
        fileName: req.file.originalname
      }
    });

    // Process scan asynchronously with timeout (pass scanType)
    processScanWithTimeout(scan.id, req.file.path, userProfile, scanType);

  } catch (error) {
    console.error('Error in scanFile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Handle user profile creation with robust error handling
 */
async function handleUserProfile(userId, userData) {
  try {
    // Try to find existing user profile
    let { data: userProfile, error: findError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userProfile) {
      console.log('✅ Found existing user profile');
      return userProfile;
    }

    // Try to create user profile
    console.log('🔧 Creating new user profile...');
    
    // First, try to create in auth.users (this might fail, but let's try)
    try {
      await supabase.auth.admin.createUser({
        user_id: userId,
        email: userData.email,
        email_confirm: true,
        user_metadata: {
          name: userData.name,
          avatar_url: userData.avatar_url
        }
      });
      console.log('✅ Created user in auth.users');
    } catch (authError) {
      console.log('⚠️ Could not create in auth.users (will try profile anyway):', authError.message);
    }

    // Now try to create user profile
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: userData.email || 'unknown@example.com',
        name: userData.name || null,
        avatar_url: userData.avatar_url || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('⚠️ Could not create user profile in DB:', createError.message);
      // Return fallback user profile
      return {
        id: userId,
        email: userData.email,
        name: userData.name,
        avatar_url: userData.avatar_url,
        _fallback: true
      };
    }

    console.log('✅ Created new user profile:', newProfile.email);
    return newProfile;

  } catch (error) {
    console.error('⚠️ Error handling user profile:', error.message);
    // Return fallback user profile that works in-memory
    return {
      id: userId,
      email: userData.email,
      name: userData.name,
      avatar_url: userData.avatar_url,
      _fallback: true
    };
  }
}

/**
 * Handle project creation with robust error handling
 */
async function handleProjectCreation(userId, fileName, userProfile) {
  const projectData = {
    id: uuidv4(),
    user_id: userId,
    name: fileName,
    source: 'upload'
  };

  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (projectError) {
      console.error('⚠️ Could not create project in DB:', projectError.message);
      // Return fallback project
      return {
        id: projectData.id,
        user_id: userId,
        name: fileName,
        source: 'upload',
        _fallback: true
      };
    }

    console.log('✅ Created project in DB:', project.id);
    return project;

  } catch (error) {
    console.error('⚠️ Error creating project:', error.message);
    // Return fallback project
    return {
      id: projectData.id,
      user_id: userId,
      name: fileName,
      source: 'upload',
      _fallback: true
    };
  }
}

/**
 * Handle scan creation with robust error handling
 */
async function handleScanCreation(projectId, userId) {
  const scanData = {
    id: uuidv4(),
    project_id: projectId,
    user_id: userId,
    status: 'running',
    started_at: new Date().toISOString()
  };

  try {
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert(scanData)
      .select()
      .single();

    if (scanError) {
      console.error('⚠️ Could not create scan in DB:', scanError.message);
      // Return fallback scan
      return {
        id: scanData.id,
        project_id: projectId,
        user_id: userId,
        status: 'running',
        started_at: scanData.started_at,
        _fallback: true
      };
    }

    console.log('✅ Created scan in DB:', scan.id);
    return scan;

  } catch (error) {
    console.error('⚠️ Error creating scan:', error.message);
    // Return fallback scan
    return {
      id: scanData.id,
      project_id: projectId,
      user_id: userId,
      status: 'running',
      started_at: scanData.started_at,
      _fallback: true
    };
  }
}

/**
 * Process scan with timeout wrapper to prevent hanging scans
 */
async function processScanWithTimeout(scanId, filePath, userProfile, scanType = 'fast') {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Scan timeout: Process exceeded 5 minutes'));
    }, SCAN_TIMEOUT_MS);
  });

  try {
    await Promise.race([
      processScanAsync(scanId, filePath, userProfile, scanType),
      timeoutPromise
    ]);
  } catch (error) {
    console.error('❌ Scan failed or timed out:', error.message);
    
    // Update scan status to failed
    try {
      await updateScanStatus(scanId, 'failed', { error: error.message });
    } catch (updateError) {
      console.error('Failed to update scan status:', updateError);
    }
  }
}

/**
 * Process scan asynchronously with robust error handling
 */
async function processScanAsync(scanId, filePath, userProfile, scanType = 'fast') {
  let extractionDir = null;
  
  try {
    console.log('🔄 Processing scan asynchronously:', scanId, '| Scan type:', scanType);

    // Check if file needs extraction
    let targetPath = filePath;
    if (isZipFile(filePath)) {
      console.log('📦 ZIP file detected, extracting...');
      extractionDir = await extractZipFile(filePath);
      targetPath = extractionDir;
      console.log(`✅ ZIP extracted to: ${targetPath}`);
    }

    // Run Semgrep analysis with progress tracking and scan type
    console.log(`🔍 Running Semgrep ${scanType.toUpperCase()} scan...`);
    const semgrepResults = await semgrepService.analyzeDirectory(targetPath, { 
      scanId,
      scanType 
    });
    
    if (!semgrepResults || !semgrepResults.findings) {
      throw new Error('Semgrep analysis failed or returned no results');
    }

    const findings = semgrepResults.findings;
    console.log(`📊 Found ${findings.length} potential issues`);

    // Run AI analysis on findings
    console.log('🤖 Running AI analysis on findings...');
    const aiAnalysis = await aiAnalysisService.analyzeFindingsWithAI(findings);
    console.log('✅ AI analysis complete');

    // Calculate risk score
    const riskScore = findings.length > 0 ? scoringService.calculateScore(findings) : 100;
    const severityCounts = findings.length > 0 ? getSeverityCounts(findings) : {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    // Try to store findings in database (with fallback)
    if (findings.length > 0) {
      await storeFindingsWithFallback(scanId, findings);
    }

    // Combine semgrep results with AI analysis
    const enrichedResults = {
      ...semgrepResults,
      aiAnalysis,
      enhancedFindings: aiAnalysis.enhancedFindings || findings
    };

    // Try to update scan with results (with fallback)
    await updateScanWithFallback(scanId, {
      status: 'completed',
      finished_at: new Date().toISOString(),
      risk_score: riskScore,
      total_findings: findings.length,
      critical_count: severityCounts.CRITICAL || 0,
      high_count: severityCounts.HIGH || 0,
      medium_count: severityCounts.MEDIUM || 0,
      low_count: severityCounts.LOW || 0,
      report_json: enrichedResults
    });

    console.log('✅ Scan completed successfully:', scanId);

    // Clean up uploaded file and extraction directory
    try {
      await fs.unlink(filePath);
      console.log('🗑️ Cleaned up uploaded file');
    } catch (cleanupError) {
      console.warn('⚠️ Could not delete uploaded file:', cleanupError.message);
    }

    // Clean up extraction directory if it was created
    if (extractionDir) {
      await cleanupExtractionDir(extractionDir);
    }

  } catch (error) {
    console.error('❌ Error in processScanAsync:', error);
    
    // Clean up extraction directory if it was created
    if (extractionDir) {
      await cleanupExtractionDir(extractionDir);
    }
    
    // Try to update scan status to failed (with fallback)
    await updateScanWithFallback(scanId, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: error.message
    });
  }
}

/**
 * Store findings with fallback error handling
 */
async function storeFindingsWithFallback(scanId, findings) {
  try {
    const findingsData = findings.map(finding => ({
      id: uuidv4(),
      scan_id: scanId,
      rule_id: finding.rule_id || finding.check_id || 'unknown',
      severity: finding.severity?.toUpperCase() || 'MEDIUM',
      file_path: finding.file_path || finding.path || 'unknown',
      start_line: finding.start_line || finding.start?.line || 1,
      end_line: finding.end_line || finding.end?.line || 1,
      title: finding.title || finding.message || finding.rule_id || 'Security Issue',
      message: finding.message,
      code_snippet: finding.code_snippet || finding.extra?.lines,
      category: finding.category,
      cwe: finding.cwe || [],
      owasp: finding.owasp || []
    }));

    const { error: findingsError } = await supabase
      .from('findings')
      .insert(findingsData);

    if (findingsError) {
      console.error('⚠️ Could not store findings in DB:', findingsError.message);
      console.log('📊 Findings processed but not stored:', findingsData.length);
    } else {
      console.log('✅ Stored findings in DB:', findingsData.length);
    }

  } catch (error) {
    console.error('⚠️ Error storing findings:', error.message);
    console.log('📊 Findings processed but not stored due to error');
  }
}

/**
 * Update scan with fallback error handling
 */
async function updateScanWithFallback(scanId, updateData) {
  try {
    const { error: updateError } = await supabase
      .from('scans')
      .update(updateData)
      .eq('id', scanId);

    if (updateError) {
      console.error('⚠️ Could not update scan in DB:', updateError.message);
      console.log('📊 Scan completed but status not updated in DB');
    } else {
      console.log('✅ Updated scan status in DB:', updateData.status);
    }

  } catch (error) {
    console.error('⚠️ Error updating scan:', error.message);
    console.log('📊 Scan completed but status not updated due to error');
  }
}

/**
 * Get user's scans with pagination
 */
const getUserScans = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      // Get user's scans with project info using Supabase
      const { data: scans, error } = await supabase
        .from('scans')
        .select(`
          id,
          status,
          started_at,
          finished_at,
          risk_score,
          total_findings,
          critical_count,
          high_count,
          medium_count,
          low_count,
          error_message,
          created_at,
          projects (
            id,
            name,
            source,
            repo_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('⚠️ Error fetching user scans:', error);
        // Return empty result instead of error
        return res.json({
          success: true,
          data: {
            scans: [],
            pagination: {
              limit: parseInt(limit),
              offset: parseInt(offset),
              total: 0
            }
          },
          message: 'Could not fetch scan history from database'
        });
      }

      res.json({
        success: true,
        data: {
          scans: scans || [],
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: scans?.length || 0
          }
        }
      });

    } catch (error) {
      console.error('⚠️ Database error in getUserScans:', error);
      // Return empty result instead of error
      res.json({
        success: true,
        data: {
          scans: [],
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: 0
          }
        },
        message: 'Scan history temporarily unavailable'
      });
    }

  } catch (error) {
    console.error('Error in getUserScans:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get scan status (for polling)
 */
const getScanStatus = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      // Get scan status
      const { data: scan, error: scanError } = await supabase
        .from('scans')
        .select('id, status, started_at, finished_at, risk_score, total_findings, error_message')
        .eq('id', scanId)
        .eq('user_id', userId)
        .single();

      if (scanError || !scan) {
        return res.status(404).json({
          success: false,
          message: 'Scan not found'
        });
      }

      // Calculate progress estimate
      let progress = 0;
      if (scan.status === 'completed') {
        progress = 100;
      } else if (scan.status === 'failed') {
        progress = 0;
      } else if (scan.status === 'running') {
        // Estimate progress based on time elapsed (rough estimate)
        const startTime = new Date(scan.started_at).getTime();
        const now = Date.now();
        const elapsed = (now - startTime) / 1000; // seconds
        
        // Estimate: smaller projects ~30s, larger projects ~300s
        const estimatedTotal = scan.total_findings ? 180 : 120; // seconds
        progress = Math.min(95, (elapsed / estimatedTotal) * 100);
      }

      res.json({
        success: true,
        data: {
          scanId: scan.id,
          status: scan.status,
          progress: Math.round(progress),
          startedAt: scan.started_at,
          finishedAt: scan.finished_at,
          riskScore: scan.risk_score,
          totalFindings: scan.total_findings || 0,
          errorMessage: scan.error_message
        }
      });

    } catch (error) {
      console.error('⚠️ Database error in getScanStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Could not fetch scan status'
      });
    }

  } catch (error) {
    console.error('Error in getScanStatus:', error);
    res.status(500).json({
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

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      // Get scan details
      const { data: scan, error: scanError } = await supabase
        .from('scans')
        .select(`
          *,
          projects (
            id,
            name,
            source,
            repo_url
          )
        `)
        .eq('id', scanId)
        .eq('user_id', userId)
        .single();

      if (scanError || !scan) {
        return res.status(404).json({
          success: false,
          message: 'Scan not found'
        });
      }

      // Get findings for this scan
      const { data: findings, error: findingsError } = await supabase
        .from('findings')
        .select('*')
        .eq('scan_id', scanId)
        .order('severity');

      if (findingsError) {
        console.error('⚠️ Error fetching findings:', findingsError);
      }

      res.json({
        success: true,
        data: {
          scan,
          findings: findings || []
        }
      });

    } catch (error) {
      console.error('⚠️ Database error in getScanDetails:', error);
      res.status(500).json({
        success: false,
        message: 'Could not fetch scan details'
      });
    }

  } catch (error) {
    console.error('Error in getScanDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Scan GitHub repository
 * ROBUST version that handles foreign key constraints gracefully
 */
const scanRepository = async (req, res) => {
  try {
    const { repoUrl, branch, accessToken, scanType } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Repository URL is required'
      });
    }

    // Get authenticated user from middleware (already has converted UUID)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('🔍 Processing repository scan for user:', userId, '| Scan type:', scanType || 'fast');

    // Try to handle user profile with robust error handling
    let userProfile = await handleUserProfile(userId, req.user);

    // Extract repo name from URL
    const repoName = repoUrl.split('/').pop().replace('.git', '') || 'repository';

    // Try to create project with fallback approach
    let project = await handleProjectCreation(userId, repoName, userProfile);

    // Try to create scan record with fallback approach
    let scan = await handleScanCreation(project.id, userId);

    console.log('✅ Created scan record:', scan.id);

    // Return immediate response
    res.status(202).json({
      success: true,
      message: 'Repository scan initiated',
      data: {
        scanId: scan.id,
        projectId: project.id,
        status: 'running',
        repoUrl: repoUrl
      }
    });

    // Process the repository scan asynchronously with timeout
    processRepositoryScanWithTimeout(scan.id, repoUrl, userProfile, { branch, accessToken, scanType });

  } catch (error) {
    console.error('Error in scanRepository:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Process repository scan with timeout wrapper to prevent hanging scans
 */
async function processRepositoryScanWithTimeout(scanId, repoUrl, userProfile, options = {}) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Repository scan timeout: Process exceeded 10 minutes'));
    }, 10 * 60 * 1000); // 10 minutes for repo scans
  });

  try {
    await Promise.race([
      processRepositoryScanAsync(scanId, repoUrl, userProfile, options),
      timeoutPromise
    ]);
  } catch (error) {
    console.error('❌ Repository scan failed or timed out:', error.message);
    
    // Update scan status to failed
    try {
      await updateScanStatus(scanId, 'failed', { error: error.message });
    } catch (updateError) {
      console.error('Failed to update scan status:', updateError);
    }
  }
}

/**
 * Process repository scan asynchronously with robust error handling
 */
async function processRepositoryScanAsync(scanId, repoUrl, userProfile, options = {}) {
  let cloneInfo = null;
  
  try {
    const scanType = options.scanType || 'fast';
    console.log('🔄 Processing repository scan asynchronously:', scanId, '| Scan type:', scanType);

    // Initialize progress tracking
    const progressTracker = require('../services/progress-tracker.service');
    progressTracker.startScan(scanId, 0); // We don't know file count yet
    progressTracker.updateProgress(scanId, 'cloning', { message: 'Cloning repository...' });

    // Clone repository
    const githubService = require('../services/github.service');
    console.log(`📦 Cloning repository: ${repoUrl}`);
    cloneInfo = await githubService.cloneRepository(repoUrl, {
      branch: options.branch,
      accessToken: options.accessToken,
      shallow: true
    });

    console.log(`✅ Repository cloned: ${cloneInfo.files} files, ${(cloneInfo.size / 1024 / 1024).toFixed(2)}MB`);
    
    // Update progress with actual file count
    progressTracker.startScan(scanId, cloneInfo.files);
    progressTracker.updateProgress(scanId, 'extracting', { message: 'Repository cloned, preparing scan...' });

    // Run Semgrep analysis with progress tracking and scan type
    console.log(`🔍 Running Semgrep ${scanType.toUpperCase()} scan on: ${cloneInfo.clonePath}`);
    const semgrepResults = await semgrepService.analyzeDirectory(cloneInfo.clonePath, { 
      scanId,
      scanType 
    });

    if (!semgrepResults || !semgrepResults.findings) {
      throw new Error('Semgrep analysis failed or returned no results');
    }

    const findings = semgrepResults.findings;
    console.log(`📊 Found ${findings.length} potential issues`);

    // Run AI analysis on findings
    console.log('🤖 Running AI analysis on findings...');
    const aiAnalysis = await aiAnalysisService.analyzeFindingsWithAI(findings);
    console.log('✅ AI analysis complete');

    // Calculate risk score
    const riskScore = findings.length > 0 ? scoringService.calculateScore(findings) : 100;
    const severityCounts = findings.length > 0 ? getSeverityCounts(findings) : {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    console.log('📊 Severity counts:', severityCounts);
    console.log('📊 Risk score calculated:', riskScore);

    // Build result data with AI insights
    const resultData = {
      riskScore,
      totalFindings: findings.length,
      criticalCount: severityCounts.CRITICAL,
      highCount: severityCounts.HIGH,  
      mediumCount: severityCounts.MEDIUM,
      lowCount: severityCounts.LOW,
      reportJson: {
        findings,
        stats: semgrepResults.stats,
        aiAnalysis,
        enhancedFindings: aiAnalysis.enhancedFindings || findings,
        metadata: {
          ...semgrepResults.metadata,
          scanType,
          repository: {
            owner: cloneInfo.owner,
            repo: cloneInfo.repo,
            branch: cloneInfo.branch,
            latestCommit: cloneInfo.latestCommit
          }
        },
        summary: {
          totalFindings: findings.length,
          findingsBySeverity: severityCounts,
          securityScore: riskScore
        }
      }
    };

    // Try to store findings in database (with fallback)
    if (findings.length > 0) {
      await storeFindingsWithFallback(scanId, findings);
    }

    // Try to update scan in database with fallback
    await updateScanWithFallback(scanId, {
      status: 'completed',
      finished_at: new Date().toISOString(),
      risk_score: riskScore,
      total_findings: findings.length,
      critical_count: severityCounts.CRITICAL || 0,
      high_count: severityCounts.HIGH || 0,
      medium_count: severityCounts.MEDIUM || 0,
      low_count: severityCounts.LOW || 0,
      report_json: semgrepResults
    });

    console.log(`✅ Repository scan ${scanId} completed successfully`);
    
    // Complete progress tracking
    progressTracker.completeScan(scanId, findings);

  } catch (error) {
    console.error('❌ Error in processRepositoryScanAsync:', error.message);
    
    // Fail progress tracking
    const progressTracker = require('../services/progress-tracker.service');
    progressTracker.failScan(scanId, error);
    
    // Try to update scan status to failed
    await updateScanStatus(scanId, 'failed', { 
      errorMessage: error.message,
      timestamp: new Date().toISOString()
    }).catch(err => {
      console.error('Failed to update scan status to failed:', err);
    });

    throw error;
  } finally {
    // Clean up cloned repository
    if (cloneInfo && cloneInfo.clonePath) {
      try {
        const fs = require('fs');
        await fs.promises.rm(cloneInfo.clonePath, { recursive: true, force: true });
        console.log('🗑️ Cleaned up cloned repository:', cloneInfo.clonePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup repository:', cleanupError.message);
      }
    }
  }
}

/**
 * Update scan status in database
 */
async function updateScanStatus(scanId, status, additionalData = {}) {
  try {
    const updateData = {
      status,
      ...(status === 'COMPLETED' && { finished_at: new Date().toISOString() }),
      ...(additionalData.error && { error_message: additionalData.error }),
      ...(additionalData.errorMessage && { error_message: additionalData.errorMessage })
    };

    const { data, error } = await supabase
      .from('scans')
      .update(updateData)
      .eq('id', scanId)
      .select();

    if (error) {
      console.error('Failed to update scan status:', error);
    } else {
      console.log(`✅ Updated scan ${scanId} to ${status}`);
    }

    return { data, error };
  } catch (error) {
    console.error('Error updating scan status:', error);
    return { error };
  }
}

/**
 * Get real-time scan progress
 */
const getScanProgress = async (req, res) => {
  try {
    const { scanId } = req.params;
    console.log('📊 Progress request for scan:', scanId);

    if (!scanId) {
      return res.status(400).json({
        success: false,
        message: 'Scan ID is required'
      });
    }

    // Get progress from tracker
    const progress = progressTracker.getProgress(scanId);
    console.log('📊 Progress data:', progress);
    
    if (!progress) {
      // Check if scan exists in database
      const { data: scan, error } = await supabase
        .from('scans')
        .select('id, status, started_at, finished_at')
        .eq('id', scanId)
        .single();

      if (error || !scan) {
        return res.status(404).json({
          success: false,
          message: 'Scan not found'
        });
      }

      // Return database status if no active progress tracking
      return res.json({
        success: true,
        data: {
          scanId,
          percentage: scan.status === 'COMPLETED' ? 100 : 0,
          stage: scan.status.toLowerCase(),
          processedFiles: 0,
          totalFiles: 0,
          elapsed: scan.finished_at 
            ? new Date(scan.finished_at) - new Date(scan.started_at)
            : Date.now() - new Date(scan.started_at),
          findingsCount: 0
        }
      });
    }

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Error getting scan progress:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  scanFile,
  getUserScans,
  getScanStatus,
  getScanProgress,
  getScanDetails,
  scanRepository
};