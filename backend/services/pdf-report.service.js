/**
 * Optimized PDF Report Service - NO BLANK PAGES VERSION
 * Professional, consistent theme with proper spacing
 */

const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class OptimizedPDFService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../reports');
    this._ensureReportsDirectory();
    
    // Professional consistent color scheme
    this.colors = {
      primary: '#1e40af',
      critical: '#dc2626',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
      success: '#16a34a',
      text: '#1f2937',
      textLight: '#6b7280',
      background: '#f9fafb',
      border: '#e5e7eb',
      white: '#ffffff'
    };

    // Page dimensions
    this.pageWidth = 595.28; // A4 width
    this.pageHeight = 841.89; // A4 height
    this.margin = 50;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.footerHeight = 70;
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
   * Main entry point
   */
  async generateScanReport(scanId, userId) {
    try {
      const { data: scan, error } = await supabase
        .from('scans')
        .select('*, project:projects(*), findings(*, explanations(*))')
        .eq('id', scanId)
        .single();

      if (error || !scan) throw new Error('Scan not found');

      // Authorization
      if (userId && scan.user_id !== userId) {
        throw new Error('Unauthorized');
      }

      const fileName = `SecuraAI-Report-${scanId}-${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);

      await this._createReport(scan, filePath);

      const stats = await fs.stat(filePath);
      return { filePath, fileName, size: stats.size };
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  /**
   * Create the complete PDF report
   */
  async _createReport(scan, filePath) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: this.margin, bottom: this.margin, left: this.margin, right: this.margin },
        bufferPages: true
      });

      const stream = require('fs').createWriteStream(filePath);
      doc.pipe(stream);

      const metrics = this._calculateMetrics(scan);
      const findings = (scan.findings || []).sort((a, b) => {
        const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (order[b.severity?.toUpperCase()] || 0) - (order[a.severity?.toUpperCase()] || 0);
      });

      // Build report sections without unnecessary page breaks
      this._addCoverPage(doc, scan, metrics);
      this._addExecutiveSummary(doc, scan, metrics);
      this._addVulnerabilityChart(doc, metrics);
      this._addTopFindings(doc, findings.slice(0, 5));
      this._addSecretsSection(doc, findings);
      this._addBestPractices(doc);
      this._addRecommendations(doc, metrics);
      this._addRemediationExamples(doc);
      
      this._addFooters(doc, scan);

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Calculate security metrics
   */
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  _formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Check if we need a new page
   */
  _checkNewPage(doc, requiredSpace = 150) {
    if (doc.y + requiredSpace > this.maxY) {
      doc.addPage();
      return true;
    }
    return false;
  }

  /**
   * COVER PAGE
   */
  _addCoverPage(doc, scan, metrics) {
    // Blue header
    doc.rect(0, 0, this.pageWidth, 200).fill(this.colors.primary);

    // Title
    doc.fontSize(44)
       .fillColor(this.colors.white)
       .font('Helvetica-Bold')
       .text('Security Assessment', 0, 60, { align: 'center' });

    doc.fontSize(18)
       .fillColor('#bfdbfe')
       .font('Helvetica')
       .text('AI-Powered Code Security Report', 0, 115, { align: 'center' });

    // Info card
    const cardY = 230;
    doc.roundedRect(80, cardY, this.pageWidth - 160, 280, 10)
       .fillAndStroke(this.colors.background, this.colors.border);

    // Project name
    doc.fontSize(26)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text(scan.project?.name || 'Security Scan', 100, cardY + 30, {
         width: this.pageWidth - 200,
         align: 'center'
       });

    // Metadata
    const leftX = 120;
    const rightX = 360;
    let y = cardY + 90;

    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica');

    // Left column
    doc.text('Scan Date', leftX, y);
    doc.fillColor(this.colors.text).font('Helvetica-Bold').fontSize(13)
       .text(this._formatDate(scan.created_at || scan.createdAt), leftX, y + 20);

    doc.fillColor(this.colors.textLight).font('Helvetica').fontSize(11)
       .text('Files Scanned', leftX, y + 60);
    doc.fillColor(this.colors.text).font('Helvetica-Bold').fontSize(13)
       .text(metrics.filesScanned.toLocaleString(), leftX, y + 80);

    doc.fillColor(this.colors.textLight).font('Helvetica').fontSize(11)
       .text('Scan Duration', leftX, y + 120);
    doc.fillColor(this.colors.text).font('Helvetica-Bold').fontSize(13)
       .text(metrics.duration, leftX, y + 140);

    // Right column
    doc.fillColor(this.colors.textLight).font('Helvetica').fontSize(11)
       .text('Total Findings', rightX, y);
    doc.fillColor(this.colors.text).font('Helvetica-Bold').fontSize(13)
       .text(metrics.total.toLocaleString(), rightX, y + 20);

    doc.fillColor(this.colors.textLight).font('Helvetica').fontSize(11)
       .text('Security Grade', rightX, y + 60);
    
    const gradeColor = metrics.grade === 'A' ? this.colors.success :
                      metrics.grade === 'B' ? this.colors.primary :
                      metrics.grade === 'C' ? this.colors.medium : this.colors.critical;
    doc.fillColor(gradeColor).font('Helvetica-Bold').fontSize(32)
       .text(metrics.grade, rightX, y + 75);

    doc.fillColor(this.colors.textLight).font('Helvetica').fontSize(11)
       .text('Risk Score', rightX, y + 120);
    doc.fillColor(this.colors.text).font('Helvetica-Bold').fontSize(13)
       .text(`${metrics.riskScore}/100`, rightX, y + 140);

    // Bottom bar
    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica');
    const summaryText = `Critical: ${metrics.CRITICAL}  |  High: ${metrics.HIGH}  |  Medium: ${metrics.MEDIUM}  |  Low: ${metrics.LOW}`;
    doc.text(summaryText, 0, cardY + 240, { align: 'center', width: this.pageWidth });

    doc.addPage();
  }

  /**
   * EXECUTIVE SUMMARY
   */
  _addExecutiveSummary(doc, scan, metrics) {
    this._sectionHeader(doc, '📊 Executive Summary');

    const summary = this._generateSummaryText(metrics);
    
    doc.fontSize(13)
       .fillColor(this.colors.text)
       .font('Helvetica')
       .text(summary, this.margin, doc.y, {
         width: this.contentWidth,
         align: 'justify',
         lineGap: 6
       });

    doc.moveDown(2);
    this._checkNewPage(doc, 120);

    // Metric boxes
    const boxY = doc.y;
    const boxWidth = (this.contentWidth - 20) / 3;
    
    // Total Findings
    let x = this.margin;
    doc.roundedRect(x, boxY, boxWidth - 10, 80, 6)
       .fillAndStroke(this.colors.background, this.colors.border);
    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica')
       .text('Total Findings', x + 15, boxY + 15);
    doc.fontSize(28).fillColor(this.colors.primary).font('Helvetica-Bold')
       .text(metrics.total, x + 15, boxY + 38);

    // Risk Score
    x += boxWidth;
    doc.roundedRect(x, boxY, boxWidth - 10, 80, 6)
       .fillAndStroke(this.colors.background, this.colors.border);
    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica')
       .text('Risk Score', x + 15, boxY + 15);
    doc.fontSize(28).fillColor(this.colors.critical).font('Helvetica-Bold')
       .text(`${metrics.riskScore}/100`, x + 15, boxY + 38);

    // Grade
    x += boxWidth;
    doc.roundedRect(x, boxY, boxWidth - 10, 80, 6)
       .fillAndStroke(this.colors.background, this.colors.border);
    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica')
       .text('Security Grade', x + 15, boxY + 15);
    const gradeColor = metrics.grade === 'A' ? this.colors.success :
                      metrics.grade === 'B' ? this.colors.primary :
                      metrics.grade === 'C' ? this.colors.medium : this.colors.critical;
    doc.fontSize(28).fillColor(gradeColor).font('Helvetica-Bold')
       .text(metrics.grade, x + 15, boxY + 38);

    doc.y = boxY + 100;
    this._checkNewPage(doc);
  }

  _generateSummaryText(metrics) {
    if (metrics.total === 0) {
      return 'This security assessment found zero vulnerabilities. The application demonstrates excellent security practices and adherence to modern coding standards.';
    }

    let text = `This AI-powered assessment analyzed ${metrics.filesScanned.toLocaleString()} files and identified ${metrics.total} potential security ${metrics.total === 1 ? 'issue' : 'issues'}. `;

    if (metrics.CRITICAL > 0) {
      text += `⚠️ ${metrics.CRITICAL} CRITICAL ${metrics.CRITICAL > 1 ? 'vulnerabilities' : 'vulnerability'} require immediate attention to prevent data breaches. `;
    }

    if (metrics.HIGH > 0) {
      text += `${metrics.HIGH} HIGH-severity ${metrics.HIGH > 1 ? 'issues' : 'issue'} could lead to unauthorized access if exploited. `;
    }

    text += `Overall security grade: ${metrics.grade}. This report provides detailed remediation guidance with code examples.`;
    return text;
  }

  /**
   * VULNERABILITY CHART
   */
  _addVulnerabilityChart(doc, metrics) {
    this._sectionHeader(doc, '📈 Vulnerability Distribution');

    doc.fontSize(13).fillColor(this.colors.text).font('Helvetica')
       .text('Findings breakdown by severity level:');

    doc.moveDown(1.5);
    this._checkNewPage(doc, 140);

    const boxY = doc.y;
    const boxWidth = (this.contentWidth - 30) / 4;
    let x = this.margin;

    // Create colored boxes with WHITE text
    const severities = [
      { label: 'CRITICAL', count: metrics.CRITICAL, color: this.colors.critical },
      { label: 'HIGH', count: metrics.HIGH, color: this.colors.high },
      { label: 'MEDIUM', count: metrics.MEDIUM, color: this.colors.medium },
      { label: 'LOW', count: metrics.LOW, color: this.colors.low }
    ];

    severities.forEach((sev, idx) => {
      doc.roundedRect(x, boxY, boxWidth - 10, 90, 6).fill(sev.color);
      
      doc.fontSize(13).fillColor(this.colors.white).font('Helvetica-Bold')
         .text(sev.label, x + 12, boxY + 18, { width: boxWidth - 30 });
      
      doc.fontSize(36).fillColor(this.colors.white).font('Helvetica-Bold')
         .text(sev.count, x + 12, boxY + 42);
      
      x += boxWidth;
    });

    doc.y = boxY + 110;
    
    // Impact descriptions
    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica');
    doc.text('• CRITICAL: Immediate risk — potential data breach or system compromise');
    doc.text('• HIGH: Significant risk — could enable unauthorized access', { lineGap: 4 });
    doc.text('• MEDIUM: Moderate risk — should be addressed in next sprint', { lineGap: 4 });
    doc.text('• LOW: Code quality improvement recommendations', { lineGap: 4 });

    doc.moveDown(2);
    this._checkNewPage(doc);
  }

  /**
   * TOP FINDINGS
   */
  _addTopFindings(doc, findings) {
    this._sectionHeader(doc, '🔍 Top 5 Critical & High Priority Findings');

    const criticalFindings = findings.filter(f => 
      ['CRITICAL', 'HIGH'].includes((f.severity || '').toUpperCase())
    ).slice(0, 5);

    if (criticalFindings.length === 0) {
      doc.fontSize(14).fillColor(this.colors.success).font('Helvetica-Bold');
      doc.text('✅ Excellent! No critical or high-severity vulnerabilities detected.');
      doc.fontSize(13).fillColor(this.colors.text).font('Helvetica');
      doc.text('\nYour application demonstrates strong security practices.');
      this._checkNewPage(doc);
      return;
    }

    doc.fontSize(13).fillColor(this.colors.textLight).font('Helvetica');
    doc.text(`Found ${criticalFindings.length} high-priority ${criticalFindings.length === 1 ? 'issue' : 'issues'}:\n`);

    criticalFindings.forEach((finding, idx) => {
      this._checkNewPage(doc, 180);

      const severity = (finding.severity || 'HIGH').toUpperCase();
      const color = severity === 'CRITICAL' ? this.colors.critical : this.colors.high;
      const startY = doc.y;

      // Card border
      doc.rect(this.margin, startY, 4, 140).fill(color);
      doc.roundedRect(this.margin + 4, startY, this.contentWidth - 4, 140, 6)
         .fillAndStroke(this.colors.background, this.colors.border);

      // Header
      doc.fontSize(15).fillColor(color).font('Helvetica-Bold');
      doc.text(`Finding #${idx + 1} — ${severity}`, this.margin + 15, startY + 15);

      // File path
      doc.fontSize(12).fillColor(this.colors.text).font('Helvetica');
      doc.text(
        `📄 ${finding.path || 'Unknown'}:${finding.start_line || finding.startLine || '?'}`,
        this.margin + 15,
        startY + 40,
        { width: this.contentWidth - 30 }
      );

      // Description
      doc.fontSize(13).fillColor(this.colors.text).font('Helvetica-Bold');
      doc.text('Issue:', this.margin + 15, startY + 65);
      
      doc.fontSize(12).font('Helvetica').fillColor(this.colors.textLight);
      const message = (finding.message || finding.check_id || 'Security issue detected').substring(0, 120);
      doc.text(message, this.margin + 15, startY + 85, {
        width: this.contentWidth - 30,
        lineGap: 3
      });

      // Compliance
      doc.fontSize(10).fillColor(this.colors.textLight).font('Helvetica');
      doc.text('📋 OWASP A03:2021 | CWE | PCI-DSS 6.5', this.margin + 15, startY + 120);

      doc.y = startY + 155;
    });

    this._checkNewPage(doc);
  }

  /**
   * SECRETS SECTION
   */
  _addSecretsSection(doc, findings) {
    this._sectionHeader(doc, '🔐 Secrets & Credentials');

    const secrets = findings.filter(f =>
      f.check_id?.includes('secret') ||
      f.check_id?.includes('password') ||
      f.check_id?.includes('token') ||
      f.message?.toLowerCase().includes('hardcoded')
    );

    if (secrets.length === 0) {
      doc.fontSize(14).fillColor(this.colors.success).font('Helvetica-Bold');
      doc.text('✅ No exposed secrets or hardcoded credentials detected.');
      doc.fontSize(13).fillColor(this.colors.text).font('Helvetica');
      doc.text('\nExcellent! Continue using environment variables for sensitive data.');
      this._checkNewPage(doc);
      return;
    }

    doc.fontSize(13).fillColor(this.colors.critical).font('Helvetica-Bold');
    doc.text(`⚠️ Found ${secrets.length} exposed ${secrets.length === 1 ? 'secret' : 'secrets'}:`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor(this.colors.text).font('Helvetica');
    secrets.slice(0, 5).forEach((s, idx) => {
      this._checkNewPage(doc, 40);
      doc.text(`${idx + 1}. ${s.path}:${s.start_line || s.startLine}`, { lineGap: 3 });
      doc.fillColor(this.colors.textLight).text(`   ${(s.message || '').substring(0, 80)}`, { lineGap: 6 });
      doc.fillColor(this.colors.text);
    });

    doc.moveDown(1.5);
    this._checkNewPage(doc, 100);

    doc.fontSize(14).fillColor(this.colors.text).font('Helvetica-Bold');
    doc.text('Immediate Actions:');
    doc.moveDown(0.5);

    const actions = [
      '1. Rotate all exposed credentials immediately',
      '2. Use environment variables (.env files)',
      '3. Add .env to .gitignore',
      '4. Use secret management (AWS Secrets Manager, Azure Key Vault)',
      '5. Scan git history for leaked credentials'
    ];

    doc.fontSize(12).fillColor(this.colors.text).font('Helvetica');
    actions.forEach(action => {
      doc.text(action, { lineGap: 5 });
    });

    this._checkNewPage(doc);
  }

  /**
   * BEST PRACTICES
   */
  _addBestPractices(doc) {
    this._sectionHeader(doc, '🤖 AI-Powered Security Best Practices');

    doc.fontSize(13).fillColor(this.colors.text).font('Helvetica');
    doc.text('Key security improvements based on AI analysis:\n');

    const practices = [
      {
        title: '1. API Security',
        items: ['Request timeouts (30s)', 'Rate limiting (100 req/min)', 'Input validation', 'Authentication on all endpoints']
      },
      {
        title: '2. Authentication & Sessions',
        items: ['Secure JWT tokens (RS256)', 'Session expiration (15 min idle)', 'Strong passwords (12+ chars)', 'Multi-factor authentication']
      },
      {
        title: '3. Data Validation',
        items: ['Server-side validation', 'Parameterized SQL queries', 'XSS prevention', 'CSP headers']
      },
      {
        title: '4. Error Handling',
        items: ['No stack traces in production', 'Security event logging', 'Centralized error handling', 'Structured logging']
      }
    ];

    practices.forEach(practice => {
      this._checkNewPage(doc, 100);
      
      doc.fontSize(14).fillColor(this.colors.primary).font('Helvetica-Bold');
      doc.text(practice.title, { lineGap: 4 });
      
      doc.fontSize(12).fillColor(this.colors.text).font('Helvetica');
      practice.items.forEach(item => {
        doc.text(`  • ${item}`, { lineGap: 4 });
      });
      doc.moveDown(1);
    });

    this._checkNewPage(doc);
  }

  /**
   * RECOMMENDATIONS
   */
  _addRecommendations(doc, metrics) {
    this._sectionHeader(doc, '💡 AI Recommendations');

    // Short-term
    doc.fontSize(14).fillColor(this.colors.text).font('Helvetica-Bold');
    doc.text('Short-Term Fixes (1-2 Weeks)');
    doc.moveDown(0.5);

    const shortTerm = [
      `Fix ${metrics.CRITICAL + metrics.HIGH} critical/high vulnerabilities`,
      'Rotate exposed credentials',
      'Add input validation',
      'Enable security headers (CSP, HSTS)',
      'Update vulnerable dependencies'
    ];

    doc.fontSize(12).fillColor(this.colors.text).font('Helvetica');
    shortTerm.forEach(item => {
      doc.text(`  ✓ ${item}`, { lineGap: 5 });
    });

    doc.moveDown(1.5);
    this._checkNewPage(doc, 100);

    // Long-term
    doc.fontSize(14).fillColor(this.colors.text).font('Helvetica-Bold');
    doc.text('Long-Term Improvements (1-3 Months)');
    doc.moveDown(0.5);

    const longTerm = [
      'Implement logging and monitoring',
      'Automated security in CI/CD',
      'Security training for team',
      'Code review process',
      'Deploy WAF',
      'Secrets management solution'
    ];

    doc.fontSize(12).fillColor(this.colors.text).font('Helvetica');
    longTerm.forEach(item => {
      doc.text(`  ⏰ ${item}`, { lineGap: 5 });
    });

    this._checkNewPage(doc);
  }

  /**
   * REMEDIATION EXAMPLES
   */
  _addRemediationExamples(doc) {
    this._sectionHeader(doc, '👨‍💻 Developer Remediation Guide');

    doc.fontSize(13).fillColor(this.colors.text).font('Helvetica');
    doc.text('Practical code examples for common vulnerabilities:\n');

    // SQL Injection
    doc.fontSize(14).fillColor(this.colors.critical).font('Helvetica-Bold');
    doc.text('1. SQL Injection Prevention');
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica');
    doc.text('Attackers can manipulate queries to access/delete data.\n');

    doc.fontSize(11).fillColor(this.colors.critical).font('Helvetica-Bold');
    doc.text('❌ Vulnerable:');
    doc.fontSize(10).fillColor(this.colors.text).font('Courier');
    doc.text('db.query("SELECT * FROM users WHERE id=" + userId);');

    doc.moveDown(0.5);

    doc.fontSize(11).fillColor(this.colors.success).font('Helvetica-Bold');
    doc.text('✅ Secure:');
    doc.fontSize(10).fillColor(this.colors.text).font('Courier');
    doc.text('db.query("SELECT * FROM users WHERE id = ?", [userId]);');

    doc.moveDown(2);
    this._checkNewPage(doc, 120);

    // XSS
    doc.fontSize(14).fillColor(this.colors.high).font('Helvetica-Bold');
    doc.text('2. XSS Prevention');
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica');
    doc.text('Malicious scripts can steal sessions or redirect users.\n');

    doc.fontSize(11).fillColor(this.colors.critical).font('Helvetica-Bold');
    doc.text('❌ Vulnerable:');
    doc.fontSize(10).fillColor(this.colors.text).font('Courier');
    doc.text('res.send("<h1>" + req.query.name + "</h1>");');

    doc.moveDown(0.5);

    doc.fontSize(11).fillColor(this.colors.success).font('Helvetica-Bold');
    doc.text('✅ Secure:');
    doc.fontSize(10).fillColor(this.colors.text).font('Courier');
    doc.text('res.send("<h1>" + escapeHtml(req.query.name) + "</h1>");');

    doc.moveDown(2);
    this._checkNewPage(doc, 120);

    // Password Storage
    doc.fontSize(14).fillColor(this.colors.high).font('Helvetica-Bold');
    doc.text('3. Secure Password Storage');
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica');
    doc.text('Plain text passwords expose all accounts in a breach.\n');

    doc.fontSize(11).fillColor(this.colors.critical).font('Helvetica-Bold');
    doc.text('❌ Vulnerable:');
    doc.fontSize(10).fillColor(this.colors.text).font('Courier');
    doc.text('db.insert({ password: req.body.password });');

    doc.moveDown(0.5);

    doc.fontSize(11).fillColor(this.colors.success).font('Helvetica-Bold');
    doc.text('✅ Secure:');
    doc.fontSize(10).fillColor(this.colors.text).font('Courier');
    doc.text('const hash = await bcrypt.hash(req.body.password, 10);\ndb.insert({ password: hash });');

    doc.moveDown(1.5);

    doc.fontSize(11).fillColor(this.colors.textLight).font('Helvetica');
    doc.text('\n📋 These fixes address OWASP Top 10 2021 and PCI-DSS requirements.', {
      align: 'center',
      width: this.contentWidth
    });
  }

  /**
   * Section header helper
   */
  _sectionHeader(doc, title) {
    this._checkNewPage(doc, 100);

    doc.fontSize(20)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text(title, this.margin, doc.y);

    doc.moveTo(this.margin, doc.y + 8)
       .lineTo(this.pageWidth - this.margin, doc.y + 8)
       .strokeColor(this.colors.primary)
       .lineWidth(3)
       .stroke();

    doc.moveDown(1.5);
  }

  /**
   * Add footers to all pages
   */
  _addFooters(doc, scan) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);

      const footerY = this.pageHeight - 50;

      // Separator line
      doc.moveTo(this.margin, footerY)
         .lineTo(this.pageWidth - this.margin, footerY)
         .strokeColor(this.colors.border)
         .lineWidth(1)
         .stroke();

      // Footer text
      doc.fontSize(9).fillColor(this.colors.textLight).font('Helvetica');

      // Left: Project name
      doc.text(
        scan.project?.name || 'Security Report',
        this.margin,
        footerY + 12,
        { width: 180 }
      );

      // Center: Branding
      doc.text(
        'Powered by SecuraAI',
        0,
        footerY + 12,
        { align: 'center', width: this.pageWidth }
      );

      // Right: Page number
      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        this.pageWidth - this.margin - 80,
        footerY + 12,
        { width: 80, align: 'right' }
      );
    }
  }

  /**
   * Delete a PDF report file
   */
  async deleteReport(fileName) {
    try {
      const filePath = path.join(this.reportsDir, fileName);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  }
}

module.exports = OptimizedPDFService;
