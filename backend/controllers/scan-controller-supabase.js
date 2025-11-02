const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const semgrepService = require('../services/semgrep.service');
const aiService = require('../services/ai.service');
const scoringService = require('../services/scoring.service');
const githubService = require('../services/github.service');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Get authenticated user from middleware (already has converted UUID)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('🔍 Processing scan for user:', userId);

    // Create or get user profile using Supabase
    let { data: userProfile, error: findError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding user profile:', findError);
    }

    if (!userProfile) {
      // Create user profile on first use
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: req.user.email || 'unknown@example.com',
          name: req.user.name || null,
          avatar_url: req.user.avatar_url || null,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        // Continue with basic user info even if profile creation fails
        userProfile = {
          id: userId,
          email: req.user.email,
          name: req.user.name,
          avatar_url: req.user.avatar_url
        };
      } else {
        userProfile = newProfile;
      }
    }

    // Create project for the upload
    const projectData = {
      id: uuidv4(),
      user_id: userId,
      name: req.file.originalname,
      source: 'upload'
    };

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create project'
      });
    }

    // Create scan record
    const scanData = {
      id: uuidv4(),
      project_id: project.id,
      user_id: userId,
      status: 'running',
      started_at: new Date().toISOString()
    };

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert(scanData)
      .select()
      .single();

    if (scanError) {
      console.error('Error creating scan:', scanError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create scan'
      });
    }

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

    // Process scan asynchronously
    processScanAsync(scan.id, req.file.path, userProfile);

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
 * Process scan asynchronously
 */
async function processScanAsync(scanId, filePath, userProfile) {
  try {
    console.log('🔄 Processing scan asynchronously:', scanId);

    // Update scan status to running
    await supabase
      .from('scans')
      .update({ status: 'running' })
      .eq('id', scanId);

    // Run Semgrep analysis
    console.log('🔍 Running Semgrep scan...');
    const semgrepResults = await semgrepService.analyzeDirectory(filePath);
    
    if (!semgrepResults || !semgrepResults.results) {
      throw new Error('Semgrep analysis failed');
    }

    const findings = semgrepResults.results;
    console.log(`📊 Found ${findings.length} potential issues`);

    // Calculate risk score
    const riskScore = scoringService.calculateRiskScore(findings);
    const severityCounts = scoringService.getSeverityCounts(findings);

    // Store findings in database
    const findingsData = findings.map(finding => ({
      id: uuidv4(),
      scan_id: scanId,
      rule_id: finding.check_id,
      severity: finding.extra?.severity?.toUpperCase() || 'MEDIUM',
      file_path: finding.path,
      start_line: finding.start?.line || 1,
      end_line: finding.end?.line || 1,
      title: finding.extra?.message || finding.check_id,
      message: finding.extra?.message,
      code_snippet: finding.extra?.lines,
      category: finding.extra?.metadata?.category,
      cwe: finding.extra?.metadata?.cwe || [],
      owasp: finding.extra?.metadata?.owasp || []
    }));

    if (findingsData.length > 0) {
      const { error: findingsError } = await supabase
        .from('findings')
        .insert(findingsData);

      if (findingsError) {
        console.error('Error inserting findings:', findingsError);
      }
    }

    // Update scan with results
    const { error: updateError } = await supabase
      .from('scans')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        risk_score: riskScore,
        total_findings: findings.length,
        critical_count: severityCounts.CRITICAL,
        high_count: severityCounts.HIGH,
        medium_count: severityCounts.MEDIUM,
        low_count: severityCounts.LOW,
        report_json: semgrepResults
      })
      .eq('id', scanId);

    if (updateError) {
      console.error('Error updating scan:', updateError);
    }

    console.log('✅ Scan completed successfully:', scanId);

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.warn('Could not delete uploaded file:', cleanupError.message);
    }

  } catch (error) {
    console.error('Error in processScanAsync:', error);
    
    // Update scan status to failed
    await supabase
      .from('scans')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', scanId);
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
      console.error('Error fetching user scans:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch scans'
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
    console.error('Error in getUserScans:', error);
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
      console.error('Error fetching findings:', findingsError);
    }

    res.json({
      success: true,
      data: {
        scan,
        findings: findings || []
      }
    });

  } catch (error) {
    console.error('Error in getScanDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Scan GitHub repository (placeholder - needs implementation)
 */
const scanRepository = async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Repository scanning not implemented yet'
    });
  } catch (error) {
    console.error('Error in scanRepository:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  scanFile,
  getUserScans,
  getScanDetails,
  scanRepository
};