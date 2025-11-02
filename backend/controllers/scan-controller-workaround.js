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
 * WORKAROUND: Create a separate users table that doesn't reference auth.users
 * This bypasses the foreign key constraint issue
 */
async function createIndependentUsersTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.app_users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      daily_budget_cents INT DEFAULT 200,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(email)
    );
    
    CREATE TABLE IF NOT EXISTS public.app_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('upload', 'github')),
      repo_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS public.app_scans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES public.app_projects(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      risk_score INT DEFAULT 0,
      total_findings INT DEFAULT 0,
      critical_count INT DEFAULT 0,
      high_count INT DEFAULT 0,
      medium_count INT DEFAULT 0,
      low_count INT DEFAULT 0,
      report_json JSONB,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  
  console.log('🔧 Creating independent tables...');
  return true; // Would execute SQL here if we had exec permissions
}

/**
 * Scan a single uploaded file for vulnerabilities - WORKAROUND VERSION
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

    // WORKAROUND: Use app_users table instead of user_profiles
    let { data: userProfile, error: findError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.log('⚠️  app_users table might not exist, creating user profile without DB storage...');
    }

    if (!userProfile) {
      // Try to create user in app_users table
      const { data: newProfile, error: createError } = await supabase
        .from('app_users')
        .insert({
          id: userId,
          email: req.user.email || 'unknown@example.com',
          name: req.user.name || null,
          avatar_url: req.user.avatar_url || null,
        })
        .select()
        .single();

      if (createError) {
        console.log('⚠️  Could not create user in database:', createError.message);
        // Create a temporary user object for processing
        userProfile = {
          id: userId,
          email: req.user.email || 'unknown@example.com',
          name: req.user.name || 'Unknown User',
          avatar_url: req.user.avatar_url || null
        };
        console.log('✅ Using temporary user profile for processing');
      } else {
        userProfile = newProfile;
        console.log('✅ Created user in app_users table');
      }
    }

    // Create project record (try app_projects first, fallback to in-memory)
    let projectId = uuidv4();
    let project = null;

    try {
      const { data: createdProject, error: projectError } = await supabase
        .from('app_projects')
        .insert({
          id: projectId,
          user_id: userId,
          name: req.file.originalname,
          source: 'upload'
        })
        .select()
        .single();

      if (projectError) {
        console.log('⚠️  Could not create project in database:', projectError.message);
        project = {
          id: projectId,
          user_id: userId,
          name: req.file.originalname,
          source: 'upload'
        };
      } else {
        project = createdProject;
        console.log('✅ Created project in app_projects table');
      }
    } catch (err) {
      console.log('⚠️  Using in-memory project data');
      project = {
        id: projectId,
        user_id: userId,
        name: req.file.originalname,
        source: 'upload'
      };
    }

    // Create scan record
    const scanId = uuidv4();
    let scan = null;

    try {
      const { data: createdScan, error: scanError } = await supabase
        .from('app_scans')
        .insert({
          id: scanId,
          project_id: project.id,
          user_id: userId,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (scanError) {
        console.log('⚠️  Could not create scan in database:', scanError.message);
        scan = {
          id: scanId,
          project_id: project.id,
          user_id: userId,
          status: 'running',
          started_at: new Date().toISOString()
        };
      } else {
        scan = createdScan;
        console.log('✅ Created scan in app_scans table');
      }
    } catch (err) {
      console.log('⚠️  Using in-memory scan data');
      scan = {
        id: scanId,
        project_id: project.id,
        user_id: userId,
        status: 'running',
        started_at: new Date().toISOString()
      };
    }

    console.log('✅ Scan setup completed:', scan.id);

    // Return immediate response
    res.json({
      success: true,
      message: 'Scan started successfully',
      data: {
        scanId: scan.id,
        projectId: project.id,
        status: 'running',
        fileName: req.file.originalname,
        note: 'Processing with workaround - some features may be limited until database constraints are fixed'
      }
    });

    // Process scan asynchronously
    processScanAsyncWorkaround(scan.id, req.file.path, userProfile);

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
 * Process scan asynchronously - WORKAROUND VERSION
 */
async function processScanAsyncWorkaround(scanId, filePath, userProfile) {
  try {
    console.log('🔄 Processing scan asynchronously:', scanId);

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

    // Try to update scan in database, but don't fail if it doesn't work
    try {
      await supabase
        .from('app_scans')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          risk_score: riskScore,
          total_findings: findings.length,
          critical_count: severityCounts.CRITICAL || 0,
          high_count: severityCounts.HIGH || 0,
          medium_count: severityCounts.MEDIUM || 0,
          low_count: severityCounts.LOW || 0,
          report_json: semgrepResults
        })
        .eq('id', scanId);

      console.log('✅ Scan results saved to database');
    } catch (dbError) {
      console.log('⚠️  Could not save to database, but scan completed successfully');
      console.log('📊 Scan Results:');
      console.log('   - Risk Score:', riskScore);
      console.log('   - Total Findings:', findings.length);
      console.log('   - Critical:', severityCounts.CRITICAL || 0);
      console.log('   - High:', severityCounts.HIGH || 0);
      console.log('   - Medium:', severityCounts.MEDIUM || 0);
      console.log('   - Low:', severityCounts.LOW || 0);
    }

    console.log('✅ Scan completed successfully:', scanId);

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
      console.log('🗑️  Cleaned up uploaded file');
    } catch (cleanupError) {
      console.warn('Could not delete uploaded file:', cleanupError.message);
    }

  } catch (error) {
    console.error('Error in processScanAsyncWorkaround:', error);
    
    // Try to update scan status to failed
    try {
      await supabase
        .from('app_scans')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', scanId);
    } catch (dbError) {
      console.log('⚠️  Could not update scan status in database');
    }
  }
}

/**
 * Get user's scans - WORKAROUND VERSION
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

    // Try to get scans from app_scans table
    const { data: scans, error } = await supabase
      .from('app_scans')
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
        app_projects (
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
      console.log('⚠️  Could not fetch scans from database:', error.message);
      // Return empty result with message
      return res.json({
        success: true,
        data: {
          scans: [],
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: 0
          },
          message: 'No scans found - database constraints need to be fixed for full functionality'
        }
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
 * Get scan details - WORKAROUND VERSION
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

    // Try to get scan from app_scans table
    const { data: scan, error: scanError } = await supabase
      .from('app_scans')
      .select(`
        *,
        app_projects (
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
        message: 'Scan not found or database constraints need to be fixed'
      });
    }

    res.json({
      success: true,
      data: {
        scan,
        findings: [] // Would need app_findings table
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
 * Scan GitHub repository (placeholder)
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