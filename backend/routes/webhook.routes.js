const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Webhook endpoint for GitHub Actions to notify scan completion
 * This endpoint can be called without authentication since it's from GitHub Actions
 */
router.post('/notify-scan', async (req, res) => {
  try {
    const { scanId, status, findings, error } = req.body;
    
    console.log(`📥 Scan notification received:`, { scanId, status });
    
    if (!scanId) {
      return res.status(400).json({
        success: false,
        message: 'Scan ID is required'
      });
    }
    
    // Validate scan exists
    const { data: scan, error: fetchError } = await supabase
      .from('scans')
      .select('id, status')
      .eq('id', scanId)
      .single();
      
    if (fetchError || !scan) {
      console.error('Scan not found:', scanId);
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }
    
    // Update scan based on status
    const updateData = {
      status: status || 'completed',
      finished_at: new Date().toISOString()
    };
    
    if (status === 'failed' && error) {
      updateData.error_message = error;
    }
    
    if (findings) {
      updateData.total_findings = findings.total || 0;
      updateData.critical_count = findings.critical || 0;
      updateData.high_count = findings.high || 0;
      updateData.medium_count = findings.medium || 0;
      updateData.low_count = findings.low || 0;
    }
    
    const { error: updateError } = await supabase
      .from('scans')
      .update(updateData)
      .eq('id', scanId);
      
    if (updateError) {
      console.error('Failed to update scan:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update scan'
      });
    }
    
    console.log(`✅ Scan ${scanId} updated to ${status}`);
    
    return res.json({
      success: true,
      message: 'Scan status updated successfully'
    });
    
  } catch (error) {
    console.error('Notify scan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;