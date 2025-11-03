/**
 * Report Controller
 * Handles PDF report generation and scan report retrieval
 * Now uses AI-ENHANCED PDF service with Smart Score & EU AI Code Score
 */

// Use AI-enhanced PDF service for compliance reports
const pdfService = require('../services/pdf-report-ai-enhanced.service');

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get a report for a specific scan
 */
const getReport = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id; // Optional auth for this endpoint

    const { data: scan, error } = await supabase
      .from('scans')
      .select(`
        *,
        project:projects(*),
        findings(*, explanations(*))
      `)
      .eq('id', scanId)
      .single();

    if (error || !scan) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Optional auth check - scan has user_id directly
    const scanUserId = scan.user_id || scan.userId;
    if (userId && scanUserId !== userId) {
      console.error(`getReport permission denied: scan belongs to ${scanUserId}, requested by ${userId}`);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to report'
      });
    }

    // Calculate severity counts
    const findingsBySeverity = scan.findings.reduce((acc, finding) => {
      const severity = finding.severity.toLowerCase();
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });

    return res.status(200).json({
      success: true,
      report: {
        id: scan.id,
        createdAt: scan.createdAt,
        completedAt: scan.completedAt,
        status: scan.status,
        scanType: scan.scanType,
        project: {
          id: scan.project.id,
          name: scan.project.name
        },
        results: {
          findings: scan.findings.map(f => ({
            id: f.id,
            severity: f.severity,
            checkId: f.checkId,
            message: f.message,
            filePath: f.filePath,
            line: f.line,
            code: f.code,
            hasExplanation: f.explanations.length > 0
          })),
          summary: {
            securityScore: scan.riskScore || 0,
            totalFindings: scan.findings.length,
            findingsBySeverity
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve report'
    });
  }
};

/**
 * Generate and download PDF report for a scan
 */
const generatePdf = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id;

    console.log(`Generating PDF report for scan: ${scanId}`);

    // Generate the PDF report
    const report = await pdfService.generateScanReport(scanId, userId);

    // Update scan record with report generation timestamp (optional, non-critical)
    await supabase
      .from('scans')
      .update({
        report_generated: true,
        report_generated_at: new Date().toISOString()
      })
      .eq('id', scanId)
      .then(() => console.log('Scan metadata updated'))
      .catch(err => console.error('Error updating scan metadata:', err));

    // Send the file for download
    res.download(report.filePath, report.fileName, (err) => {
      if (err) {
        console.error('Error sending report:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading report'
          });
        }
      }

      // Clean up the file after download (with delay)
      setTimeout(async () => {
        await pdfService.deleteReport(report.fileName);
      }, 60000); // Delete after 1 minute
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    
    if (error.message === 'Scan not found') {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    if (error.message === 'Unauthorized access to scan') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this scan'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report'
    });
  }
};

module.exports = {
  getReport,
  generatePdf
};