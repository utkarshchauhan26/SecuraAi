const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const semgrepService = require('../services/semgrep.service');
const aiService = require('../services/ai.service');
const scoringService = require('../services/scoring.service');
const githubService = require('../services/github.service');
const prisma = require('../lib/prisma');

/**
 * Scan a single uploaded file for vulnerabilities
 */
const scanFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get authenticated user from middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Create or get user profile
    let userProfile = await prisma.userProfile.findUnique({
      where: { id: userId }
    });

    if (!userProfile) {
      // Create user profile on first use
      userProfile = await prisma.userProfile.create({
        data: {
          id: userId,
          email: req.user.email || 'unknown@example.com',
          name: req.user.name || null,
          avatarUrl: req.user.avatar_url || null,
        }
      });
    }

    // Create project for the upload
    const project = await prisma.project.create({
      data: {
        userId: userId,
        name: req.file.originalname,
        source: 'upload',
      }
    });

    // Extract scanType from request body
    const scanType = req.body.scanType || 'fast';
    console.log('📥 Scan type for file upload:', scanType);

    // Create scan record
    const scan = await prisma.scan.create({
      data: {
        projectId: project.id,
        userId: userId,
        status: 'queued',
        reportJson: {
          scanType: scanType,
          metadata: {
            queued: new Date().toISOString()
          }
        }
      }
    });

    // Process the scan asynchronously (pass scanType)
    processScan(scan.id, req.file.path, userId, scanType).catch(err => {
      console.error(`Error processing scan ${scan.id}:`, err);
      prisma.scan.update({
        where: { id: scan.id },
        data: { 
          status: 'failed',
          errorMessage: err.message || 'Internal server error during scan',
          finishedAt: new Date()
        }
      }).catch(console.error);
    });

    // Return immediately with the scan ID
    return res.status(202).json({
      success: true,
      message: 'Scan initiated',
      scanId: scan.id,
      projectId: project.id
    });
  } catch (error) {
    console.error('Error in scanFile:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing the file'
    });
  }
};

/**
 * Scan a GitHub repository for vulnerabilities
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

    // Get authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Create or get user profile
    let userProfile = await prisma.userProfile.findUnique({
      where: { id: userId }
    });

    if (!userProfile) {
      userProfile = await prisma.userProfile.create({
        data: {
          id: userId,
          email: req.user.email || 'unknown@example.com',
          name: req.user.name || null,
          avatarUrl: req.user.avatar_url || null,
        }
      });
    }

    // Extract repo name from URL
    const repoName = repoUrl.split('/').pop().replace('.git', '') || 'repository';

    // Create project for the repository
    const project = await prisma.project.create({
      data: {
        userId: userId,
        name: repoName,
        source: 'github',
        repoUrl: repoUrl,
      }
    });

    // Create scan record
    const scan = await prisma.scan.create({
      data: {
        projectId: project.id,
        userId: userId,
        status: 'queued',
      }
    });

    // Process the repository scan asynchronously
    processRepositoryScan(scan.id, repoUrl, userId, { branch, accessToken, scanType }).catch(err => {
      console.error(`Error processing repository scan ${scan.id}:`, err);
      prisma.scan.update({
        where: { id: scan.id },
        data: { 
          status: 'failed',
          errorMessage: err.message || 'Internal server error during scan',
          finishedAt: new Date()
        }
      }).catch(console.error);
    });

    return res.status(202).json({
      success: true,
      message: 'Repository scan initiated',
      scanId: scan.id,
      projectId: project.id
    });
  } catch (error) {
    console.error('Error in scanRepository:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while scanning the repository'
    });
  }
};

/**
 * Get the current status of a scan
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

    // Find scan and verify ownership
    const scan = await prisma.scan.findFirst({
      where: {
        id: scanId,
        userId: userId
      },
      include: {
        project: {
          select: {
            name: true,
            source: true,
            repoUrl: true
          }
        }
      }
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    // Set no-cache headers to prevent stale data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Return scan status (without full findings)
    return res.status(200).json({
      success: true,
      scan: {
        id: scan.id,
        status: scan.status,
        projectName: scan.project.name,
        projectSource: scan.project.source,
        repoUrl: scan.project.repoUrl,
        riskScore: scan.riskScore,
        totalFindings: scan.totalFindings,
        criticalCount: scan.criticalCount,
        highCount: scan.highCount,
        mediumCount: scan.mediumCount,
        lowCount: scan.lowCount,
        progress: scan.progress || 0,
        fileCount: scan.fileCount || 0,
        processedFiles: scan.processedFiles || 0,
        currentFile: scan.currentFile,
        elapsedTime: scan.elapsedTime || 0,
        estimatedRemaining: scan.estimatedRemaining,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        createdAt: scan.createdAt,
        errorMessage: scan.errorMessage
      }
    });
  } catch (error) {
    console.error('Error in getScanStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching scan status'
    });
  }
};

/**
 * Get the results of a completed scan with findings
 */
const getScanResults = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Find scan with findings and explanations
    const scan = await prisma.scan.findFirst({
      where: {
        id: scanId,
        userId: userId
      },
      include: {
        project: {
          select: {
            name: true,
            source: true,
            repoUrl: true
          }
        },
        findings: {
          include: {
            explanation: true
          },
          orderBy: [
            { severity: 'asc' }, // CRITICAL first (alphabetically)
            { startLine: 'asc' }
          ]
        }
      }
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    if (scan.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Scan is not completed (current status: ${scan.status})`
      });
    }

    // Format findings for response
    const findings = scan.findings.map(finding => ({
      id: finding.id,
      ruleId: finding.ruleId,
      severity: finding.severity,
      category: finding.category,
      title: finding.title,
      message: finding.message,
      filePath: finding.filePath,
      startLine: finding.startLine,
      endLine: finding.endLine,
      codeSnippet: finding.codeSnippet,
      cwe: finding.cwe,
      owasp: finding.owasp,
      explanation: finding.explanation ? {
        summary: finding.explanation.summary,
        whyItMatters: finding.explanation.whyItMatters,
        fixSteps: finding.explanation.fixSteps,
        bestPractices: finding.explanation.bestPractices,
        preventionTips: finding.explanation.preventionTips
      } : null
    }));

    return res.status(200).json({
      success: true,
      scan: {
        id: scan.id,
        status: scan.status,
        projectName: scan.project.name,
        projectSource: scan.project.source,
        riskScore: scan.riskScore,
        totalFindings: scan.totalFindings,
        criticalCount: scan.criticalCount,
        highCount: scan.highCount,
        mediumCount: scan.mediumCount,
        lowCount: scan.lowCount,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        createdAt: scan.createdAt,
        findings: findings,
        reportJson: scan.reportJson
      }
    });
  } catch (error) {
    console.error('Error in getScanResults:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching scan results'
    });
  }
};

/**
 * Process a scan asynchronously
 * @param {string} scanId - The unique scan identifier
 * @param {string} filePath - Path to the file/directory to scan
 * @param {string} userId - User ID for tracking and budget
 * @param {string} scanType - Scan type ('fast' or 'deep')
 */
const processScan = async (scanId, filePath, userId, scanType = 'fast') => {
  let tempDir = null;
  
  try {
    console.log(`📊 Starting scan ${scanId} for user ${userId}`);
    
    // Update scan to running status
    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        status: 'running',
        startedAt: new Date()
      }
    });

    // Run Semgrep analysis with scan type
    console.log('📥 Backend processing scanType:', scanType);
    console.log(`🔍 Running Semgrep ${scanType.toUpperCase()} scan on: ${filePath}`);
    const semgrepResults = await semgrepService.analyzeDirectory(filePath, { 
      scanId,
      scanType 
    });
    
    console.log(`✅ Semgrep found ${semgrepResults.findings.length} findings`);

    // Store findings in database
    const findingRecords = [];
    for (const finding of semgrepResults.findings) {
      const findingRecord = await prisma.finding.create({
        data: {
          scanId: scanId,
          ruleId: finding.ruleId,
          severity: finding.severity,
          category: finding.category || 'security',
          filePath: finding.filePath,
          startLine: finding.startLine,
          endLine: finding.endLine,
          title: finding.title,
          message: finding.message,
          codeSnippet: finding.codeSnippet,
          cwe: finding.cwe || [],
          owasp: finding.owasp || [],
        }
      });
      
      findingRecords.push({ ...finding, id: findingRecord.id });
    }

    // Trigger AI explanations asynchronously for high-severity findings
    const highSeverityFindings = findingRecords.filter(
      f => f.severity === 'CRITICAL' || f.severity === 'HIGH'
    );

    console.log(`🤖 Generating AI explanations for ${highSeverityFindings.length} critical/high findings`);
    
    // Process AI explanations (limit to first 10 to avoid budget issues)
    const explanationPromises = highSeverityFindings.slice(0, 10).map(async (finding) => {
      try {
        const explanation = await aiService.explainVulnerability(userId, finding);
        
        // Explanation is already stored in database by AI service
        console.log(`✅ Explanation generated for ${finding.ruleId}`);
        
        return { success: true, findingId: finding.id };
      } catch (error) {
        console.error(`❌ Failed to generate explanation for ${finding.ruleId}:`, error.message);
        return { success: false, findingId: finding.id, error: error.message };
      }
    });

    // Wait for all explanations (with timeout)
    await Promise.allSettled(explanationPromises);

    // Calculate risk score
    const riskScore = scoringService.calculateScore(findingRecords);
    
    // Count by severity
    const stats = {
      totalFindings: findingRecords.length,
      criticalCount: findingRecords.filter(f => f.severity === 'CRITICAL').length,
      highCount: findingRecords.filter(f => f.severity === 'HIGH').length,
      mediumCount: findingRecords.filter(f => f.severity === 'MEDIUM').length,
      lowCount: findingRecords.filter(f => f.severity === 'LOW').length,
    };

    // Update scan with completed results
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        riskScore: riskScore,
        totalFindings: stats.totalFindings,
        criticalCount: stats.criticalCount,
        highCount: stats.highCount,
        mediumCount: stats.mediumCount,
        lowCount: stats.lowCount,
        reportJson: {
          summary: stats,
          metadata: semgrepResults.metadata,
          categories: semgrepResults.stats.categories,
          cweList: semgrepResults.stats.cweList,
          owaspList: semgrepResults.stats.owaspList,
        }
      }
    });

    console.log(`✅ Scan ${scanId} completed: ${stats.totalFindings} findings, risk score: ${riskScore}`);
    
    // Clean up uploaded file/temp directory
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.warn(`Failed to cleanup file ${filePath}:`, cleanupError.message);
    }

  } catch (error) {
    console.error(`❌ Error in processScan for ${scanId}:`, error);
    
    // Update scan with error status
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: error.message || 'Failed to process scan'
      }
    }).catch(err => console.error('Failed to update scan status:', err));
    
    // Clean up file in case of error
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
};

/**
 * Process a repository scan asynchronously
 * @param {string} scanId - The unique scan identifier
 * @param {string} repoUrl - GitHub repository URL
 * @param {string} userId - User ID for tracking and budget
 * @param {Object} options - Clone options (branch, accessToken)
 */
const processRepositoryScan = async (scanId, repoUrl, userId, options = {}) => {
  let cloneInfo = null;
  
  try {
    console.log(`📊 Starting repository scan ${scanId} for user ${userId}`);
    
    // Update scan to running status
    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        status: 'running',
        startedAt: new Date()
      }
    });

    // Initialize progress tracking
    const progressTracker = require('../services/progress-tracker.service');
    progressTracker.startScan(scanId, 0); // We don't know file count yet
    progressTracker.updateProgress(scanId, 'cloning', { message: 'Cloning repository...' });

    // Clone repository
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

    // Run Semgrep analysis on cloned repository with scan type
    const scanType = options.scanType || 'fast'; // Default to fast scan
    console.log(`🔍 Running Semgrep ${scanType.toUpperCase()} scan on: ${cloneInfo.clonePath}`);
    const semgrepResults = await semgrepService.analyzeDirectory(cloneInfo.clonePath, { 
      scanId,
      scanType 
    });
    
    console.log(`✅ Semgrep found ${semgrepResults.findings.length} findings`);

    // Store findings in database
    const findingRecords = [];
    for (const finding of semgrepResults.findings) {
      const findingRecord = await prisma.finding.create({
        data: {
          scanId: scanId,
          ruleId: finding.ruleId,
          severity: finding.severity,
          category: finding.category || 'security',
          filePath: finding.filePath,
          startLine: finding.startLine,
          endLine: finding.endLine,
          title: finding.title,
          message: finding.message,
          codeSnippet: finding.codeSnippet,
          cwe: finding.cwe || [],
          owasp: finding.owasp || [],
        }
      });
      
      findingRecords.push({ ...finding, id: findingRecord.id });
    }

    // Trigger AI explanations for high-severity findings
    const highSeverityFindings = findingRecords.filter(
      f => f.severity === 'CRITICAL' || f.severity === 'HIGH'
    );

    console.log(`🤖 Generating AI explanations for ${highSeverityFindings.length} critical/high findings`);
    
    // Process AI explanations (limit to first 10 to avoid budget issues)
    const explanationPromises = highSeverityFindings.slice(0, 10).map(async (finding) => {
      try {
        await aiService.explainVulnerability(userId, finding);
        console.log(`✅ Explanation generated for ${finding.ruleId}`);
        return { success: true, findingId: finding.id };
      } catch (error) {
        console.error(`❌ Failed to generate explanation for ${finding.ruleId}:`, error.message);
        return { success: false, findingId: finding.id, error: error.message };
      }
    });

    await Promise.allSettled(explanationPromises);

    // Calculate risk score
    const riskScore = scoringService.calculateScore(findingRecords);
    
    // Count by severity
    const stats = {
      totalFindings: findingRecords.length,
      criticalCount: findingRecords.filter(f => f.severity === 'CRITICAL').length,
      highCount: findingRecords.filter(f => f.severity === 'HIGH').length,
      mediumCount: findingRecords.filter(f => f.severity === 'MEDIUM').length,
      lowCount: findingRecords.filter(f => f.severity === 'LOW').length,
    };

    // Update scan with completed results
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        riskScore: riskScore,
        totalFindings: stats.totalFindings,
        criticalCount: stats.criticalCount,
        highCount: stats.highCount,
        mediumCount: stats.mediumCount,
        lowCount: stats.lowCount,
        reportJson: {
          summary: stats,
          metadata: {
            ...semgrepResults.metadata,
            repository: {
              owner: cloneInfo.owner,
              repo: cloneInfo.repo,
              branch: cloneInfo.branch,
              latestCommit: cloneInfo.latestCommit
            }
          },
          categories: semgrepResults.stats.categories,
          cweList: semgrepResults.stats.cweList,
          owaspList: semgrepResults.stats.owaspList,
        }
      }
    });

    console.log(`✅ Repository scan ${scanId} completed: ${stats.totalFindings} findings, risk score: ${riskScore}`);
    
    // Complete progress tracking
    progressTracker.completeScan(scanId, { 
      findings: stats.totalFindings,
      riskScore: riskScore 
    });

  } catch (error) {
    console.error(`❌ Error in processRepositoryScan for ${scanId}:`, error);
    
    // Fail progress tracking
    const progressTracker = require('../services/progress-tracker.service');
    progressTracker.failScan(scanId, error);
    
    // Update scan with error status
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: error.message || 'Failed to process repository scan'
      }
    }).catch(err => console.error('Failed to update scan status:', err));

  } finally {
    // Always cleanup cloned repository
    if (cloneInfo) {
      try {
        await githubService.cleanup(cloneInfo.cloneId);
        console.log(`🗑️  Cleaned up repository clone`);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup repository:`, cleanupError.message);
      }
    }
  }
};

/**
 * Get all scans for the authenticated user
 */
const getUserScans = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { limit = 20, offset = 0 } = req.query;

    // Get user's scans with project info
    const scans = await prisma.scan.findMany({
      where: { userId },
      include: {
        project: {
          select: {
            name: true,
            source: true,
            repoUrl: true
          }
        },
        _count: {
          select: { findings: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const formattedScans = scans.map(scan => ({
      id: scan.id,
      projectName: scan.project.name,
      projectSource: scan.project.source,
      status: scan.status,
      riskScore: scan.riskScore,
      totalFindings: scan.totalFindings,
      criticalCount: scan.criticalCount,
      highCount: scan.highCount,
      mediumCount: scan.mediumCount,
      lowCount: scan.lowCount,
      startedAt: scan.startedAt,
      finishedAt: scan.finishedAt,
      createdAt: scan.createdAt
    }));

    return res.status(200).json({
      success: true,
      scans: formattedScans,
      total: scans.length
    });
  } catch (error) {
    console.error('Error in getUserScans:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching scans'
    });
  }
};

/**
 * Get real-time progress of a scan
 */
const getScanProgress = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Query Supabase directly for progress data (GitHub Actions writes here)
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: scan, error } = await supabase
      .from('scans')
      .select('id, status, progress, file_count, processed_files, current_file, elapsed_time, estimated_remaining, total_findings, started_at, finished_at')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single();

    if (error || !scan) {
      console.log('❌ Scan not found in Supabase:', error);
      return res.status(404).json({
        success: false,
        message: 'Scan not found or progress not available'
      });
    }

    // Transform to expected format
    const progress = {
      scanId: scan.id,
      stage: scan.status,
      percentage: scan.progress || 0,
      totalFiles: scan.file_count || 0,
      processedFiles: scan.processed_files || 0,
      currentFile: scan.current_file,
      elapsed: scan.elapsed_time || 0,
      estimatedTimeRemaining: scan.estimated_remaining,
      findingsCount: scan.total_findings || 0,
      startedAt: scan.started_at,
      updatedAt: new Date()
    };

    console.log('✅ Progress from Supabase:', {
      scanId: scan.id,
      status: scan.status,
      progress: scan.progress,
      file_count: scan.file_count
    });

    // Set no-cache headers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error in getScanProgress:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching scan progress'
    });
  }
};

/**
 * Get detailed scan information with findings
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

    // Find scan with findings
    const scan = await prisma.scan.findFirst({
      where: {
        id: scanId,
        project: {
          userId: userId
        }
      },
      include: {
        findings: {
          orderBy: { severity: 'desc' }
        },
        project: {
          select: {
            name: true,
            description: true
          }
        }
      }
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    return res.status(200).json({
      success: true,
      scan: {
        id: scan.id,
        status: scan.status,
        riskScore: scan.riskScore,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        totalFindings: scan.totalFindings,
        criticalCount: scan.criticalCount,
        highCount: scan.highCount,
        mediumCount: scan.mediumCount,
        lowCount: scan.lowCount,
        project: scan.project,
        findings: scan.findings
      }
    });
  } catch (error) {
    console.error('Error in getScanDetails:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching scan details'
    });
  }
};

module.exports = {
  scanFile,
  scanRepository,
  getScanStatus,
  getScanProgress,
  getScanDetails,
  getScanResults,
  getUserScans
};