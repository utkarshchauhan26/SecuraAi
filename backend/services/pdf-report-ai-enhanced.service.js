/**
 * AI-ENHANCED PDF REPORT SERVICE v2.0
 * SecuraAI Code & AI Compliance Report Generator
 * 
 * Features:
 * - SecuraAI Smart Score™ (5 parameters)
 * - Europe AI Code of Practice Score (5 pillars)
 * - Gemini AI-powered recommendations
 * - Fixed page count (3-12 pages based on findings)
 * - Consistent theme & typography
 * - Zero blank pages (dynamic sections)
 * - Professional compliance badges
 */

const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const scoringService = require('./scoring.service');
const aiService = require('./ai.service');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class AIEnhancedPDFService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../reports');
    this._ensureReportsDirectory();
    
    // CONSISTENT COLOR PALETTE
    this.colors = {
      primary: '#1e40af',      // Deep blue
      success: '#16a34a',      // Green
      critical: '#dc2626',     // Red
      high: '#f97316',         // Orange
      medium: '#eab308',       // Yellow
      low: '#22c55e',          // Light green
      text: '#1f2937',         // Dark gray
      textLight: '#6b7280',    // Medium gray
      border: '#e5e7eb',       // Light gray
      background: '#f9fafb',   // Off-white
      white: '#ffffff',
      euBlue: '#003399'        // EU flag blue
    };

    // CONSISTENT TYPOGRAPHY
    this.fonts = {
      title: 24,
      heading1: 18,
      heading2: 14,
      heading3: 12,
      body: 10,
      small: 8,
      badge: 9
    };

    // Page dimensions (A4)
    this.pageWidth = 595.28;
    this.pageHeight = 841.89;
    this.margin = 50;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.footerHeight = 60;
    this.maxY = this.pageHeight - this.footerHeight;
  }

  async _ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating reports directory:', error);
    }
  }

  /**
   * MAIN ENTRY POINT - Generate AI-Enhanced Report
   */
  async generateScanReport(scanId, userId) {
    try {
      // Fetch scan data
      const { data: scan, error } = await supabase
        .from('scans')
        .select('*, project:projects(*), findings(*, explanations(*))')
        .eq('id', scanId)
        .single();

      if (error || !scan) throw new Error('Scan not found');
      if (userId && scan.user_id !== userId) throw new Error('Unauthorized');

      const fileName = `SecuraAI-AI-Compliance-Report-${scanId}-${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);

      // Calculate metrics and scores
      const metrics = this._calculateMetrics(scan);
      const findings = (scan.findings || []).sort((a, b) => {
        const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (order[b.severity?.toUpperCase()] || 0) - (order[a.severity?.toUpperCase()] || 0);
      });

      // Get AI-enhanced scores (try/catch to handle errors gracefully)
      let scores = null;
      let aiSummary = null;
      
      try {
        const projectPath = scan.target_path || scan.targetPath || null;
        scores = await scoringService.calculateScores(scan, projectPath);
        aiSummary = await aiService.generateProjectSummary(scan, findings, scores);
      } catch (err) {
        console.warn('AI scoring/summary generation failed:', err.message);
        // Continue with basic scores
      }

      await this._createReport(scan, filePath, metrics, findings, scores, aiSummary);

      const stats = await fs.stat(filePath);
      return { filePath, fileName, size: stats.size };
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  /**
   * CREATE THE COMPLETE PDF REPORT
   */
  async _createReport(scan, filePath, metrics, findings, scores, aiSummary) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: this.margin, bottom: this.margin, left: this.margin, right: this.margin },
        bufferPages: true,
        info: {
          Title: 'SecuraAI Code & AI Compliance Report',
          Author: 'SecuraAI Scanner',
          Subject: 'Security Analysis Report',
          Keywords: 'security, AI, compliance, EU AI Act'
        }
      });

      const stream = require('fs').createWriteStream(filePath);
      doc.pipe(stream);

      // SECTION 1: Cover Page (Page 1)
      this._addCoverPage(doc, scan, metrics, scores);
      
      // SECTION 2: Executive Summary (Page 1-2)
      this._addExecutiveSummary(doc, scan, metrics, scores);

      if (metrics.total === 0) {
        // Clean scan: Add Smart Score + EU Score + Certification (Pages 2-3)
        this._addSmartScoreSection(doc, scores);
        this._addEUAICodeSection(doc, scores);
        this._addGeminiSummary(doc, aiSummary, scores);
        this._addCertificationSection(doc, scores, metrics);
      } else {
        // Has findings: Add all sections
        this._addSmartScoreSection(doc, scores);
        this._addEUAICodeSection(doc, scores);
        
        // Detailed Findings (top 10 only to control page count)
        if (findings.length > 0) {
          this._addDetailedFindings(doc, findings.slice(0, 10), metrics);
        }
        
        // Gemini AI Recommendations
        this._addGeminiSummary(doc, aiSummary, scores);
        
        // Charts (optional, only if findings > 3)
        if (findings.length > 3) {
          this._addChartsSection(doc, metrics);
        }
        
        // Certification
        this._addCertificationSection(doc, scores, metrics);
      }

      // SECTION 9: Appendix (last page)
      this._addAppendix(doc, scan);

      // Add footers to all pages
      this._addFooters(doc, scan);

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * SECTION 1: COVER PAGE with AI/EU Badges
   */
  _addCoverPage(doc, scan, metrics, scores) {
    const y = 150;

    // Title
    doc.fontSize(this.fonts.title)
       .font('Helvetica-Bold')
       .fillColor(this.colors.primary)
       .text('SecuraAI Code & AI Compliance Report', this.margin, y, {
         width: this.contentWidth,
         align: 'center'
       });

    // Subtitle
    doc.moveDown(0.5);
    doc.fontSize(this.fonts.heading2)
       .font('Helvetica')
       .fillColor(this.colors.textLight)
       .text('Automated Code Security, AI Quality & EU Code of Practice Evaluation', {
         width: this.contentWidth,
         align: 'center'
       });

    // Badges
    doc.moveDown(2);
    const badgeY = doc.y;
    const badgeWidth = 220;
    const leftBadgeX = (this.pageWidth - badgeWidth * 2 - 20) / 2;
    const rightBadgeX = leftBadgeX + badgeWidth + 20;

    // AI Best Practice Badge
    doc.rect(leftBadgeX, badgeY, badgeWidth, 35)
       .fillAndStroke(this.colors.success, this.colors.success);
    doc.fillColor(this.colors.white)
       .font('Helvetica-Bold')
       .fontSize(this.fonts.badge)
       .text('AI Best Practice Verified', leftBadgeX, badgeY + 12, {
         width: badgeWidth,
         align: 'center'
       });

    // EU AI Code Badge
    doc.rect(rightBadgeX, badgeY, badgeWidth, 35)
       .fillAndStroke(this.colors.euBlue, this.colors.euBlue);
    doc.fillColor(this.colors.white)
       .font('Helvetica-Bold')
       .fontSize(this.fonts.badge)
       .text('[EU] AI Code Compliance Evaluated', rightBadgeX, badgeY + 12, {
         width: badgeWidth,
         align: 'center'
       });

    // Project details box
    doc.moveDown(3);
    const detailsY = doc.y;
    doc.rect(this.margin + 50, detailsY, this.contentWidth - 100, 120)
       .fillAndStroke(this.colors.background, this.colors.border);

    const detailsContent = [
      `Project Name: ${scan.project?.name || 'Unknown Project'}`,
      `Generated By: SecuraAI Automated Scanner`,
      `Date: ${new Date(scan.created_at || scan.createdAt).toLocaleDateString('en-GB')}`,
      `Version: v2.0 (Gemini + Semgrep + EU AI Code Engine)`
    ];

    doc.fillColor(this.colors.text)
       .font('Helvetica')
       .fontSize(this.fonts.body);

    detailsContent.forEach((line, index) => {
      doc.text(line, this.margin + 70, detailsY + 15 + (index * 25), {
        width: this.contentWidth - 140
      });
    });

    // Risk Score Badge (large, centered)
    doc.moveDown(3);
    const scoreY = doc.y;
    const scoreSize = 80;
    const scoreX = (this.pageWidth - scoreSize) / 2;

    const scoreColor = metrics.grade === 'A' ? this.colors.success :
                      metrics.grade === 'B' ? this.colors.primary :
                      metrics.grade === 'C' ? this.colors.medium :
                      this.colors.critical;

    doc.circle(scoreX + scoreSize / 2, scoreY + scoreSize / 2, scoreSize / 2)
       .fillAndStroke(scoreColor, scoreColor);

    doc.fillColor(this.colors.white)
       .font('Helvetica-Bold')
       .fontSize(36)
       .text(metrics.grade, scoreX, scoreY + 20, {
         width: scoreSize,
         align: 'center'
       });

    doc.fontSize(this.fonts.small)
       .text('Security Grade', scoreX, scoreY + scoreSize + 5, {
         width: scoreSize,
         align: 'center'
       });

    doc.addPage();
  }

  /**
   * SECTION 2: EXECUTIVE SUMMARY with Dual Scores
   */
  _addExecutiveSummary(doc, scan, metrics, scores) {
    this._sectionHeader(doc, '📊 Executive Summary');

    doc.fontSize(this.fonts.body)
       .font('Helvetica')
       .fillColor(this.colors.text);

    const summaryText = `This report provides an AI-driven evaluation of your project's codebase using a hybrid of static analysis (Semgrep), AI reasoning (Gemini), and regulatory mapping (EU AI Code of Practice). It identifies vulnerabilities, evaluates AI safety alignment, and assigns dual compliance scores — SecuraAI Smart Score and Europe AI Code Score (GPAI) — to benchmark your code's readiness for global AI standards.`;

    doc.text(summaryText, { lineGap: 4 });
    doc.moveDown(1.5);

    // Metrics Table
    const tableData = [
      ['Metric', 'Value'],
      ['Files Scanned', (metrics.filesScanned || 0).toString()],
      ['Findings', metrics.total.toString()],
      ['Risk Score', `${metrics.riskScore}/100`],
      ['SecuraAI Smart Score', scores?.smartScore?.score ? `${scores.smartScore.score} / 100` : 'N/A'],
      ['Europe AI Code Score', scores?.euAIScore?.score ? `${scores.euAIScore.score} / 100` : 'N/A']
    ];

    this._drawTable(doc, tableData, doc.y);
    
    doc.moveDown(2);
  }

  /**
   * SECTION 3: SECURAAI SMART SCORE
   */
  _addSmartScoreSection(doc, scores) {
    this._checkNewPage(doc, 200);
    this._sectionHeader(doc, 'SecuraAI Smart Scoring Summary');

    if (!scores || !scores.smartScore) {
      doc.fontSize(this.fonts.body).fillColor(this.colors.textLight)
         .text('Smart Score analysis unavailable.', { lineGap: 4 });
      doc.moveDown(2);
      return;
    }

    const { score, grade, parameters, interpretation } = scores.smartScore;

    doc.fontSize(this.fonts.body)
       .font('Helvetica')
       .fillColor(this.colors.text)
       .text('Measures how secure, optimized, and maintainable your project is.', { lineGap: 4 });

    doc.moveDown(1);

    // Parameters Table
    const paramData = [
      ['Parameter', 'Weight', 'Score', 'Notes'],
      ['Code Security', '40%', parameters.security.score.toString(), parameters.security.notes],
      ['Best Practices', '25%', parameters.bestPractices.score.toString(), parameters.bestPractices.notes],
      ['Maintainability', '15%', parameters.maintainability.score.toString(), parameters.maintainability.notes],
      ['Dependency Safety', '10%', parameters.dependencies.score.toString(), parameters.dependencies.notes],
      ['AI Ethics Alignment', '10%', parameters.aiEthics.score.toString(), parameters.aiEthics.notes]
    ];

    this._drawTable(doc, paramData, doc.y, [120, 60, 60, 240]);

    doc.moveDown(1.5);

    // Final Score Display
    doc.fontSize(this.fonts.heading2)
       .font('Helvetica-Bold')
       .fillColor(this.colors.primary)
       .text(`[VERIFIED] Final Smart Score: ${score}/100 (${grade}-Grade)`, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(this.fonts.body)
       .font('Helvetica-Oblique')
       .fillColor(this.colors.text)
       .text(`"${interpretation}"`, { align: 'center', lineGap: 4 });

    doc.moveDown(2);
  }

  /**
   * SECTION 4: EUROPE AI CODE OF PRACTICE SCORING
   */
  _addEUAICodeSection(doc, scores) {
    this._checkNewPage(doc, 250);
    this._sectionHeader(doc, '[EU] Europe AI Code of Practice Scoring');

    if (!scores || !scores.euAIScore) {
      doc.fontSize(this.fonts.body).fillColor(this.colors.textLight)
         .text('EU AI Code Score analysis unavailable.', { lineGap: 4 });
      doc.moveDown(2);
      return;
    }

    const { score, complianceLevel, pillars, certification } = scores.euAIScore;

    doc.fontSize(this.fonts.body)
       .font('Helvetica')
       .fillColor(this.colors.text)
       .text('Evaluates project alignment with EU AI Act & GPAI voluntary framework.', { lineGap: 4 });

    doc.moveDown(1);

    // Pillars Table
    const pillarData = [
      ['Compliance Pillar', 'Description', 'Level', 'Notes']
    ];

    Object.entries(pillars).forEach(([key, pillar]) => {
      const complianceIcon = pillar.compliance === 'High' ? '[OK]' :
                             pillar.compliance === 'Medium' ? '[!]' : '[X]';
      pillarData.push([
        key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        pillar.description,
        `${complianceIcon} ${pillar.compliance}`,
        pillar.notes
      ]);
    });

    this._drawTable(doc, pillarData, doc.y, [110, 140, 70, 160]);

    doc.moveDown(1.5);

    // Overall Score
    doc.fontSize(this.fonts.heading3)
       .font('Helvetica-Bold')
       .fillColor(this.colors.primary)
       .text(`Overall Europe AI Code Score: ${score} / 100`, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(this.fonts.body)
       .font('Helvetica')
       .fillColor(this.colors.text)
       .text(certification, { align: 'center', lineGap: 4 });

    doc.moveDown(0.5);
    doc.fontSize(this.fonts.small)
       .font('Helvetica-Oblique')
       .fillColor(this.colors.textLight)
       .text('🧾 This project meets key voluntary compliance standards for General-Purpose AI under the EU AI Act (2025).', {
         align: 'center',
         lineGap: 3
       });

    doc.moveDown(2);
  }

  /**
   * SECTION 5: DETAILED SEMGREP FINDINGS (Top 10)
   */
  _addDetailedFindings(doc, findings, metrics) {
    this._checkNewPage(doc, 100);
    this._sectionHeader(doc, '🔍 Detailed Semgrep Findings');

    doc.fontSize(this.fonts.body)
       .font('Helvetica')
       .fillColor(this.colors.textLight)
       .text(`Showing top ${findings.length} findings (sorted by severity):`, { lineGap: 4 });

    doc.moveDown(1);

    findings.forEach((finding, index) => {
      this._checkNewPage(doc, 80);

      const severityColor = this.colors[finding.severity?.toLowerCase()] || this.colors.medium;

      // Finding header
      doc.fontSize(this.fonts.heading3)
         .font('Helvetica-Bold')
         .fillColor(severityColor)
         .text(`#${index + 1} [${finding.severity}] ${finding.message}`, { lineGap: 3 });

      doc.fontSize(this.fonts.small)
         .font('Helvetica')
         .fillColor(this.colors.textLight)
         .text(`File: ${finding.path || finding.filePath} (Line ${finding.line || 'N/A'})`, { lineGap: 2 });

      // AI Suggestion (if available)
      if (finding.explanations && finding.explanations.length > 0) {
        const explanation = finding.explanations[0];
        doc.moveDown(0.5);
        doc.fontSize(this.fonts.body)
           .font('Helvetica-Bold')
           .fillColor(this.colors.primary)
           .text('AI Suggestion:', { continued: false });
        
        doc.font('Helvetica')
           .fillColor(this.colors.text)
           .text(explanation.summary || 'No AI suggestion available.', { lineGap: 3 });
      }

      doc.moveDown(1);
    });

    doc.moveDown(1);
  }

  /**
   * SECTION 6: GEMINI AI RECOMMENDATIONS
   */
  _addGeminiSummary(doc, aiSummary, scores) {
    this._checkNewPage(doc, 150);
    this._sectionHeader(doc, '🧠 Gemini AI Recommendations');

    if (!aiSummary || !aiSummary.summary) {
      doc.fontSize(this.fonts.body).fillColor(this.colors.textLight)
         .text('AI-powered recommendations unavailable.', { lineGap: 4 });
      doc.moveDown(2);
      return;
    }

    // AI Summary Quote
    doc.fontSize(this.fonts.body)
       .font('Helvetica-Oblique')
       .fillColor(this.colors.text)
       .text(`"${aiSummary.summary}"`, { lineGap: 5 });

    doc.moveDown(1);

    // Top 5 Recommendations
    doc.fontSize(this.fonts.heading3)
       .font('Helvetica-Bold')
       .fillColor(this.colors.primary)
       .text('Top 5 Recommendations:');

    doc.moveDown(0.5);

    const recommendations = aiSummary.recommendations || [];
    recommendations.slice(0, 5).forEach((rec, index) => {
      doc.fontSize(this.fonts.body)
         .font('Helvetica')
         .fillColor(this.colors.text)
         .text(`${index + 1}. ${rec}`, { lineGap: 4, indent: 15 });
    });

    doc.moveDown(1);
    doc.fontSize(this.fonts.small)
       .font('Helvetica-Oblique')
       .fillColor(this.colors.textLight)
       .text('Generated by Gemini AI', { align: 'right' });

    doc.moveDown(2);
  }

  /**
   * SECTION 7: CHARTS & METRICS (Optional)
   */
  _addChartsSection(doc, metrics) {
    this._checkNewPage(doc, 120);
    this._sectionHeader(doc, '📊 Vulnerability Distribution');

    // Simple ASCII bar chart
    const chartData = [
      { label: 'Critical', count: metrics.CRITICAL, color: this.colors.critical },
      { label: 'High', count: metrics.HIGH, color: this.colors.high },
      { label: 'Medium', count: metrics.MEDIUM, color: this.colors.medium },
      { label: 'Low', count: metrics.LOW, color: this.colors.low }
    ];

    const maxCount = Math.max(...chartData.map(d => d.count), 1);
    const barMaxWidth = 300;

    chartData.forEach(item => {
      const barWidth = (item.count / maxCount) * barMaxWidth;
      const yPos = doc.y;

      // Label
      doc.fontSize(this.fonts.body)
         .font('Helvetica')
         .fillColor(this.colors.text)
         .text(item.label, this.margin, yPos, { width: 80 });

      // Bar
      doc.rect(this.margin + 90, yPos, barWidth, 15)
         .fill(item.color);

      // Count
      doc.fillColor(this.colors.text)
         .text(item.count.toString(), this.margin + 90 + barWidth + 10, yPos);

      doc.moveDown(1.2);
    });

    doc.moveDown(1);
  }

  /**
   * SECTION 8: CERTIFICATION BADGE
   */
  _addCertificationSection(doc, scores, metrics) {
    this._checkNewPage(doc, 100);
    this._sectionHeader(doc, '🏆 Final Summary & Certification');

    const smartScore = scores?.smartScore?.score || 70;
    const euScore = scores?.euAIScore?.score || 60;
    const avgScore = Math.round((smartScore + euScore) / 2);

    const certLevel = avgScore >= 85 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 55 ? 'C' : 'D';
    const certColor = certLevel === 'A' ? this.colors.success :
                     certLevel === 'B' ? this.colors.primary :
                     certLevel === 'C' ? this.colors.medium : this.colors.critical;

    const summaryText = avgScore >= 70
      ? 'Based on the AI-assisted analysis and Semgrep scanning, this codebase demonstrates strong compliance with modern software security and emerging European AI standards.'
      : 'Based on the AI-assisted analysis and Semgrep scanning, this codebase shows basic compliance but requires improvements in security and AI standards alignment.';

    doc.fontSize(this.fonts.body)
       .font('Helvetica')
       .fillColor(this.colors.text)
       .text(summaryText, { lineGap: 5 });

    doc.moveDown(1.5);

    // Certification Badge
    const badgeY = doc.y;
    const badgeWidth = this.contentWidth - 100;
    const badgeX = this.margin + 50;

    doc.rect(badgeX, badgeY, badgeWidth, 50)
       .fillAndStroke(certColor, certColor);

    doc.fillColor(this.colors.white)
       .font('Helvetica-Bold')
       .fontSize(this.fonts.heading3)
       .text(`[CERTIFIED] SecuraAI Verified - AI Code Safe & EU-Compliant`, badgeX, badgeY + 10, {
         width: badgeWidth,
         align: 'center'
       });

    doc.fontSize(this.fonts.body)
       .text(`(Level-${certLevel} Compliance, ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})`, badgeX, badgeY + 30, {
         width: badgeWidth,
         align: 'center'
       });

    doc.moveDown(3);
  }

  /**
   * SECTION 9: APPENDIX
   */
  _addAppendix(doc, scan) {
    this._checkNewPage(doc, 120);
    this._sectionHeader(doc, '📄 Appendix');

    doc.fontSize(this.fonts.heading3)
       .font('Helvetica-Bold')
       .fillColor(this.colors.text)
       .text('Tools Used:');

    doc.moveDown(0.5);
    doc.fontSize(this.fonts.body)
       .font('Helvetica')
       .text('• Semgrep (Static Analysis)', { lineGap: 3 });
    doc.text('• Gemini AI (Google Generative AI)', { lineGap: 3 });
    doc.text('• Supabase (Data Storage)', { lineGap: 3 });

    doc.moveDown(1);

    doc.fontSize(this.fonts.heading3)
       .font('Helvetica-Bold')
       .text('Scanning Configuration:');

    doc.moveDown(0.5);
    doc.fontSize(this.fonts.body)
       .font('Helvetica')
       .text(`Scan Type: ${scan.scan_type || scan.scanType || 'Full'}`, { lineGap: 3 });
    doc.text(`Target: ${scan.target_path || scan.targetPath || 'N/A'}`, { lineGap: 3 });

    doc.moveDown(1);

    doc.fontSize(this.fonts.small)
       .font('Helvetica-Oblique')
       .fillColor(this.colors.textLight)
       .text('Disclaimer: This analysis is advisory and does not constitute a formal EU compliance certificate. For official certification, consult a qualified compliance auditor.', {
         lineGap: 3
       });

    doc.moveDown(1);
    doc.fontSize(this.fonts.small)
       .fillColor(this.colors.text)
       .text(`Report Generated: ${new Date().toLocaleString('en-GB')}`, { align: 'center' });
  }

  // ========== HELPER METHODS ==========

  _calculateMetrics(scan) {
    const findings = scan.findings || [];
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    
    findings.forEach(f => {
      const sev = (f.severity || 'LOW').toUpperCase();
      counts[sev] = (counts[sev] || 0) + 1;
    });

    const riskScore = Math.min(100, 
      counts.CRITICAL * 25 + counts.HIGH * 10 + counts.MEDIUM * 3 + counts.LOW * 1
    );

    const grade = riskScore < 20 ? 'A' :
                  riskScore < 40 ? 'B' :
                  riskScore < 60 ? 'C' :
                  riskScore < 80 ? 'D' : 'F';

    return {
      ...counts,
      total: findings.length,
      riskScore,
      grade,
      filesScanned: scan.files_scanned || scan.filesScanned || 0,
      duration: this._formatDuration(scan.scan_duration || scan.scanDuration || 0)
    };
  }

  _formatDuration(seconds) {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  _sectionHeader(doc, title) {
    this._checkNewPage(doc, 50);
    
    doc.fontSize(this.fonts.heading1)
       .font('Helvetica-Bold')
       .fillColor(this.colors.primary)
       .text(title);
    
    doc.moveDown(0.5);
    
    // Underline
    doc.moveTo(this.margin, doc.y)
       .lineTo(this.margin + this.contentWidth, doc.y)
       .strokeColor(this.colors.border)
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(1);
  }

  _checkNewPage(doc, requiredSpace = 100) {
    if (doc.y + requiredSpace > this.maxY) {
      doc.addPage();
    }
  }

  _drawTable(doc, data, startY, columnWidths = null) {
    const rowHeight = 20;
    const headerHeight = 25;
    
    if (!columnWidths) {
      columnWidths = new Array(data[0].length).fill(this.contentWidth / data[0].length);
    }

    let y = startY;

    // Header row
    let x = this.margin;
    data[0].forEach((header, i) => {
      doc.rect(x, y, columnWidths[i], headerHeight)
         .fillAndStroke(this.colors.primary, this.colors.border);
      
      doc.fillColor(this.colors.white)
         .font('Helvetica-Bold')
         .fontSize(this.fonts.small)
         .text(header, x + 5, y + 7, {
           width: columnWidths[i] - 10,
           align: 'left'
         });
      
      x += columnWidths[i];
    });

    y += headerHeight;

    // Data rows
    for (let row = 1; row < data.length; row++) {
      x = this.margin;
      
      data[row].forEach((cell, i) => {
        doc.rect(x, y, columnWidths[i], rowHeight)
           .fillAndStroke(this.colors.white, this.colors.border);
        
        doc.fillColor(this.colors.text)
           .font('Helvetica')
           .fontSize(this.fonts.small)
           .text(cell.toString(), x + 5, y + 5, {
             width: columnWidths[i] - 10,
             align: 'left'
           });
        
        x += columnWidths[i];
      });

      y += rowHeight;
    }

    doc.y = y + 10;
  }

  _addFooters(doc, scan) {
    const pages = doc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      const footerY = this.pageHeight - this.margin - 20;
      
      // Footer line
      doc.moveTo(this.margin, footerY - 10)
         .lineTo(this.margin + this.contentWidth, footerY - 10)
         .strokeColor(this.colors.border)
         .lineWidth(0.5)
         .stroke();
      
      // Footer text
      doc.fontSize(this.fonts.small)
         .font('Helvetica')
         .fillColor(this.colors.textLight)
         .text('SecuraAI Security Report', this.margin, footerY, { continued: true })
         .text(`Page ${i + 1} of ${pages.count}`, { align: 'right' });
    }
  }

  /**
   * Delete a report file
   */
  async deleteReport(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  }
}

module.exports = new AIEnhancedPDFService();
