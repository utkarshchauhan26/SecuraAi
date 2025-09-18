const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const semgrepService = require('../services/semgrep.service');
const aiService = require('../services/ai.service');
const scoringService = require('../services/scoring.service');
const usageService = require('../services/usage.service');

// In-memory store for scan status and results (replace with DB in production)
const scanStore = new Map();

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

    // Generate unique scan ID
    const scanId = uuidv4();
    
    // Store initial scan status
    scanStore.set(scanId, {
      id: scanId,
      status: 'processing',
      progress: 0,
      file: req.file.originalname,
      createdAt: new Date().toISOString(),
      results: null
    });

    // Process the scan asynchronously
    processScan(scanId, req.file.path).catch(err => {
      console.error(`Error processing scan ${scanId}:`, err);
      scanStore.set(scanId, {
        ...scanStore.get(scanId),
        status: 'failed',
        error: 'Internal server error during scan'
      });
    });

    // Return immediately with the scan ID
    return res.status(202).json({
      success: true,
      message: 'Scan initiated',
      scanId: scanId
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
    const { repoUrl } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Repository URL is required'
      });
    }

    // Generate unique scan ID
    const scanId = uuidv4();
    
    // Store initial scan status
    scanStore.set(scanId, {
      id: scanId,
      status: 'processing',
      progress: 0,
      repoUrl: repoUrl,
      createdAt: new Date().toISOString(),
      results: null
    });

    // TODO: Implement repository cloning and scanning
    // This will be handled by the GitHub service and then pass to processScan

    // Return immediately with the scan ID
    return res.status(202).json({
      success: true,
      message: 'Repository scan initiated',
      scanId: scanId
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
const getScanStatus = (req, res) => {
  const { scanId } = req.params;
  
  if (!scanStore.has(scanId)) {
    return res.status(404).json({
      success: false,
      message: 'Scan not found'
    });
  }

  const scan = scanStore.get(scanId);
  
  // Don't include full results in status check
  const { results, ...scanStatus } = scan;
  
  return res.status(200).json({
    success: true,
    scan: scanStatus
  });
};

/**
 * Get the results of a completed scan
 */
const getScanResults = (req, res) => {
  const { scanId } = req.params;
  
  if (!scanStore.has(scanId)) {
    return res.status(404).json({
      success: false,
      message: 'Scan not found'
    });
  }

  const scan = scanStore.get(scanId);
  
  if (scan.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: `Scan is not completed (current status: ${scan.status})`
    });
  }
  
  return res.status(200).json({
    success: true,
    scan: scan
  });
};

/**
 * Process a scan asynchronously
 * @param {string} scanId - The unique scan identifier
 * @param {string} filePath - Path to the file to scan
 */
const processScan = async (scanId, filePath) => {
  try {
    // Update progress
    updateScanProgress(scanId, 10, 'Running static code analysis');
    
    // Run Semgrep
    const semgrepResults = await semgrepService.analyzeFile(filePath);
    
    // Update progress
    updateScanProgress(scanId, 40, 'Processing vulnerability findings');
    
    // Enrich findings with AI explanations
    const enrichedFindings = [];
    for (const finding of semgrepResults.findings) {
      updateScanProgress(
        scanId, 
        40 + (50 * (enrichedFindings.length / semgrepResults.findings.length)), 
        `Generating explanations (${enrichedFindings.length + 1}/${semgrepResults.findings.length})`
      );
      
      const aiExplanation = await aiService.explainVulnerability(finding);
      enrichedFindings.push({
        ...finding,
        explanation: aiExplanation.explanation,
        suggestedFix: aiExplanation.suggestedFix,
        impact: aiExplanation.impact
      });
      
      // Track token usage
      usageService.trackUsage(aiExplanation.usage);
    }
    
    // Calculate security score
    const securityScore = scoringService.calculateScore(enrichedFindings);
    
    // Update scan with completed results
    scanStore.set(scanId, {
      ...scanStore.get(scanId),
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      results: {
        findings: enrichedFindings,
        summary: {
          totalFindings: enrichedFindings.length,
          securityScore: securityScore,
          findingsBySeverity: {
            high: enrichedFindings.filter(f => f.severity === 'high').length,
            medium: enrichedFindings.filter(f => f.severity === 'medium').length,
            low: enrichedFindings.filter(f => f.severity === 'low').length
          }
        }
      }
    });
    
    // Clean up uploaded file after processing
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error(`Error in processScan for ${scanId}:`, error);
    
    // Update scan with error status
    scanStore.set(scanId, {
      ...scanStore.get(scanId),
      status: 'failed',
      error: 'Failed to process scan'
    });
    
    // Clean up uploaded file in case of error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

/**
 * Update the progress of a scan
 * @param {string} scanId - The unique scan identifier
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} statusMessage - Current processing message
 */
const updateScanProgress = (scanId, progress, statusMessage) => {
  if (scanStore.has(scanId)) {
    const scan = scanStore.get(scanId);
    scanStore.set(scanId, {
      ...scan,
      progress: progress,
      statusMessage: statusMessage
    });
  }
};

module.exports = {
  scanFile,
  scanRepository,
  getScanStatus,
  getScanResults
};