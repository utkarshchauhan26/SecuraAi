const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const progressTracker = require('../utils/semgrep-progress-tracker');

/**
 * Service for interacting with Semgrep for static code analysis
 * Focuses on critical security vulnerabilities with production-ready error handling
 */
class SemgrepService {
  constructor() {
    this.semgrepInstalled = false;
    
    // Fast Scan - OFFLINE mode using local rules (NO downloads, instant start)
    const fastRulesPath = path.join(__dirname, '..', 'config', 'simple-rules.yaml');
    this.fastScanRulesets = [fastRulesPath];
    console.log('📁 Fast scan rules path:', fastRulesPath);
    
    // Balanced Scan - High-priority vulnerabilities (recommended for most projects)
    this.balancedScanRulesets = [
      'p/owasp-top-ten',           // OWASP Top 10 vulnerabilities
      'p/secrets',                 // Hardcoded secrets/API keys
      'p/sql-injection',           // SQL injection detection
      'p/xss',                     // Cross-site scripting
    ];
    
    // Deep Analysis - Comprehensive Security Scan (full ruleset)
    this.deepScanRulesets = [
      'p/owasp-top-ten',           // OWASP Top 10 vulnerabilities
      'p/security-audit',          // General security patterns
      'p/sql-injection',           // SQL injection detection
      'p/xss',                     // Cross-site scripting
      'p/secrets',                 // Hardcoded secrets/API keys
      'p/jwt',                     // JWT security issues
      'p/command-injection',       // OS command injection
      'p/ssrf',                    // Server-side request forgery
      'p/insecure-transport',      // Insecure protocols
      'p/dockerfile',              // Docker security (if Dockerfile present)
    ];
    
    // Default to balanced scan rulesets
    this.rulesets = this.balancedScanRulesets;
    this.fastScanRulesets = this.fastScanRulesets;
    this.balancedScanRulesets = this.balancedScanRulesets;
    
    // Ignore patterns
    this.ignorePatterns = [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '*.min.js',
      '*.bundle.js',
      'coverage/**',
      '.next/**',
      'out/**',
      'vendor/**',
      '__pycache__/**',
    ];
    
    // Size and timeout limits
    this.maxTargetBytes = 100 * 1024 * 1024; // 100MB
    this.maxFiles = 10000;
    
    // Dynamic timeout calculation: ~3-5 seconds per file for safe scanning
    this.baseTimeout = 180000; // 3 minutes base (increased for initial setup)
    this.timeoutPerFile = 5000; // 5 seconds per file (more buffer)
    this.maxTimeout = 900000; // 15 minutes absolute max (increased)
    
    // Predefined timeouts (will be overridden by calculateTimeout)
    this.fastScanTimeout = 180000;   // 3 minutes for fast scan
    this.deepScanTimeout = 600000;  // 10 minutes for deep analysis
    this.timeoutMs = this.fastScanTimeout; // Default
    
    this.checkSemgrepInstallation();
  }

  /**
   * Calculate optimal timeout based on file count and scan type
   */
  calculateTimeout(fileCount, scanType = 'fast') {
    // Base calculation: 2 seconds per file + 1 minute overhead
    let calculatedTimeout = this.baseTimeout + (fileCount * this.timeoutPerFile);
    
    // Adjust for scan type (deep scans need more time per file)
    if (scanType === 'deep') {
      calculatedTimeout *= 2; // Double the time for deep scans
    }
    
    // Cap at maximum timeout
    calculatedTimeout = Math.min(calculatedTimeout, this.maxTimeout);
    
    // Ensure minimum timeout (3 minutes for network delays)
    calculatedTimeout = Math.max(calculatedTimeout, 180000); // Minimum 3 minutes
    
    console.log(`⏱️  Calculated timeout: ${Math.round(calculatedTimeout / 1000)}s for ${fileCount} files (${scanType} scan)`);
    
    return calculatedTimeout;
  }

  /**
   * Check if Semgrep is installed
   */
  async checkSemgrepInstallation() {
    try {
      const version = await this._runCommand('semgrep', ['--version'], 5000);
      this.semgrepInstalled = true;
      console.log(`✅ Semgrep installed: ${version.trim()}`);
    } catch (error) {
      console.warn('⚠️  Semgrep is not installed. Please install with: pip install semgrep');
      this.semgrepInstalled = false;
    }
  }

  /**
   * Analyze a directory for security vulnerabilities using Semgrep
   * @param {string} targetPath - Path to the directory/file to analyze
   * @param {Object} options - Scan options
   * @param {string} options.scanType - 'fast' or 'deep' (default: 'fast')
   * @param {string} options.scanId - Unique scan ID for progress tracking
   * @returns {Promise<Object>} - Analysis results with findings
   */
  async analyzeDirectory(targetPath, options = {}) {
    if (!this.semgrepInstalled) {
      throw new Error('Semgrep is not installed. Install with: pip install semgrep');
    }

    const scanId = options.scanId;
    const scanType = options.scanType || 'fast';
    
    // Set rulesets based on scan type
    if (scanType === 'deep') {
      options.rulesets = this.deepScanRulesets;
      console.log(`🔍 Starting DEEP ANALYSIS scan (${this.deepScanRulesets.length} rulesets)`);
    } else {
      options.rulesets = this.fastScanRulesets;
      console.log(`⚡ Starting FAST SCAN (${this.fastScanRulesets.length} critical rulesets)`);
    }
    
    // Validate target path exists
    try {
      const stats = await fs.stat(targetPath);
      if (!stats.isDirectory() && !stats.isFile()) {
        throw new Error('Target path must be a file or directory');
      }
    } catch (error) {
      throw new Error(`Invalid target path: ${error.message}`);
    }

    console.log(`🔍 Starting Semgrep scan on: ${targetPath}`);
    const startTime = Date.now();

    try {
      // Count files for progress tracking and dynamic timeout calculation
      let fileCount = 0;
      if (scanId) {
        progressTracker.updateProgress(scanId, 'counting_files');
        fileCount = await this._countAnalyzableFiles(targetPath);
        progressTracker.startScan(scanId, fileCount);
      } else {
        fileCount = await this._countAnalyzableFiles(targetPath);
      }
      
      // Calculate dynamic timeout based on file count and scan type
      this.timeoutMs = this.calculateTimeout(fileCount, scanType);
      console.log(`📊 Scanning ${fileCount} files with ${Math.round(this.timeoutMs / 1000)}s timeout`);

      // Build Semgrep command arguments
      const args = this._buildSemgrepArgs(targetPath, options);
      
      // Run Semgrep with timeout and progress tracking
      const output = await this._runCommandWithProgress('semgrep', args, this.timeoutMs, scanId);
      
      // Parse results
      if (scanId) {
        progressTracker.updateProgress(scanId, 'processing_results');
      }
      
      const results = JSON.parse(output);
      
      // Transform to our application format
      const findings = await this._transformResults(results, targetPath);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Semgrep scan complete in ${(duration / 1000).toFixed(2)}s: ${findings.length} findings`);
      
      if (scanId) {
        progressTracker.completeScan(scanId, findings);
      }
      
      return {
        findings,
        stats: this._calculateStats(findings),
        metadata: {
          scannedPath: targetPath,
          durationMs: duration,
          semgrepVersion: results.version || 'unknown',
          rulesUsed: this.rulesets,
        }
      };
    } catch (error) {
      console.error('❌ Semgrep scan failed:', error.message);
      
      if (scanId) {
        progressTracker.failScan(scanId, error);
      }
      
      // Try to parse partial results if available
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout);
          const findings = await this._transformResults(results, targetPath);
          return {
            findings,
            stats: this._calculateStats(findings),
            metadata: {
              scannedPath: targetPath,
              warning: 'Scan completed with warnings',
              error: error.message
            }
          };
        } catch (parseError) {
          // Could not parse, continue to throw
        }
      }
      
      throw new Error(`Semgrep analysis failed: ${error.message}`);
    }
  }

  /**
   * Build Semgrep command arguments
   */
  _buildSemgrepArgs(targetPath, options) {
    const args = [];
    
    // Add rulesets (config) - use all provided rulesets (no artificial limit)
    const rulesets = options.rulesets || this.rulesets;
    console.log(`📋 Using ${rulesets.length} rulesets: ${rulesets.join(', ')}`);
    
    for (const ruleset of rulesets) {
      args.push('--config', ruleset);
    }
    
    // Output format
    args.push('--json');
    args.push('--quiet'); // Suppress progress output
    
    // Performance and safety limits
    args.push('--max-target-bytes', this.maxTargetBytes.toString());
    args.push('--timeout', Math.floor(this.timeoutMs / 1000).toString());
    args.push('--max-memory', '4000'); // 4GB max memory
    
    // Skip unknown extensions and large files
    args.push('--skip-unknown-extensions');
    
    // Ignore patterns
    for (const pattern of this.ignorePatterns) {
      args.push('--exclude', pattern);
    }
    
    // Disable version check and optimize for offline use
    args.push('--disable-version-check');
    args.push('--no-git-ignore'); // Don't try to read .gitignore (can cause delays)
    
    // Target path (must be last)
    args.push(targetPath);
    
    return args;
  }

  /**
   * Transform Semgrep results to application format
   * @param {Object} results - Raw Semgrep results
   * @param {string} basePath - Base path for relative file paths
   * @returns {Promise<Array>} - Transformed findings
   */
  async _transformResults(results, basePath) {
    const findings = [];
    
    if (!results.results || !Array.isArray(results.results)) {
      return findings;
    }
    
    for (const result of results.results) {
      try {
        // Read code snippet with safe error handling
        let codeSnippet = '';
        
        // Semgrep requires login for 'lines' field, so we read it ourselves
        if (result.extra?.lines && result.extra.lines !== 'requires login') {
          codeSnippet = result.extra.lines;
        } else {
          // Read from file
          try {
            const fileContent = await fs.readFile(result.path, 'utf8');
            const lines = fileContent.split('\n');
            const startLine = Math.max(0, (result.start?.line || 1) - 1);
            const endLine = Math.min(lines.length, (result.end?.line || startLine + 1));
            
            codeSnippet = lines.slice(startLine, endLine).join('\n');
          } catch (readError) {
            codeSnippet = '(code snippet unavailable)';
          }
        }
        
        // Map Semgrep severity to our levels (CRITICAL/HIGH/MEDIUM/LOW)
        const severity = this._mapSeverity(result.extra?.severity, result.extra?.metadata);
        
        // Extract security metadata
        const metadata = result.extra?.metadata || {};
        const cwe = this._extractCWE(metadata);
        const owasp = this._extractOWASP(metadata);
        
        // Create relative path
        const relativePath = path.relative(basePath, result.path);
        
        findings.push({
          // Unique identifier
          ruleId: result.check_id,
          
          // Severity and categorization
          severity,
          category: metadata.category || this._categorizeFromRuleId(result.check_id),
          confidence: metadata.confidence || 'HIGH',
          
          // Location
          filePath: relativePath,
          startLine: result.start?.line || 1,
          endLine: result.end?.line || result.start?.line || 1,
          startCol: result.start?.col || 0,
          endCol: result.end?.col || 0,
          
          // Content
          title: this._generateTitle(result),
          message: result.extra?.message || result.extra?.message || 'Security issue detected',
          codeSnippet,
          
          // Security classifications
          cwe,
          owasp,
          
          // Additional metadata
          metadata: {
            technology: metadata.technology || [],
            references: metadata.references || [],
            likelihood: metadata.likelihood || 'MEDIUM',
            impact: metadata.impact || 'MEDIUM',
            semgrepUrl: result.extra?.metadata?.semgrep_url,
          }
        });
      } catch (error) {
        console.warn(`Failed to process finding: ${error.message}`);
      }
    }
    
    return findings;
  }

  /**
   * Map Semgrep severity to our application levels
   */
  _mapSeverity(semgrepSeverity, metadata = {}) {
    // Check metadata for explicit severity overrides
    if (metadata.impact === 'HIGH' || metadata.likelihood === 'HIGH') {
      return 'CRITICAL';
    }
    
    // Map Semgrep severity
    switch (semgrepSeverity?.toUpperCase()) {
      case 'ERROR':
        return 'CRITICAL';
      case 'WARNING':
        return 'HIGH';
      case 'INFO':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  /**
   * Extract CWE identifiers from metadata
   */
  _extractCWE(metadata) {
    const cwe = [];
    
    if (metadata.cwe) {
      if (Array.isArray(metadata.cwe)) {
        cwe.push(...metadata.cwe);
      } else {
        cwe.push(metadata.cwe);
      }
    }
    
    // Extract from other fields
    if (metadata['cwe-id']) {
      cwe.push(metadata['cwe-id']);
    }
    
    return cwe.map(c => c.toString().replace('CWE-', ''));
  }

  /**
   * Extract OWASP categories from metadata
   */
  _extractOWASP(metadata) {
    const owasp = [];
    
    if (metadata.owasp) {
      if (Array.isArray(metadata.owasp)) {
        owasp.push(...metadata.owasp);
      } else {
        owasp.push(metadata.owasp);
      }
    }
    
    // Map common categories
    if (metadata.category) {
      const owaspMap = {
        'security': 'A00:2021',
        'injection': 'A03:2021',
        'auth': 'A07:2021',
        'secrets': 'A07:2021',
        'xss': 'A03:2021',
        'ssrf': 'A10:2021',
      };
      
      const category = metadata.category.toLowerCase();
      for (const [key, value] of Object.entries(owaspMap)) {
        if (category.includes(key)) {
          owasp.push(value);
        }
      }
    }
    
    return [...new Set(owasp)]; // Remove duplicates
  }

  /**
   * Categorize vulnerability from rule ID
   */
  _categorizeFromRuleId(ruleId) {
    const ruleLower = ruleId.toLowerCase();
    
    if (ruleLower.includes('sql') || ruleLower.includes('injection')) return 'injection';
    if (ruleLower.includes('xss') || ruleLower.includes('cross-site')) return 'xss';
    if (ruleLower.includes('auth') || ruleLower.includes('session')) return 'authentication';
    if (ruleLower.includes('secret') || ruleLower.includes('key') || ruleLower.includes('password')) return 'secrets';
    if (ruleLower.includes('ssrf')) return 'ssrf';
    if (ruleLower.includes('path-traversal') || ruleLower.includes('lfi')) return 'path-traversal';
    if (ruleLower.includes('csrf')) return 'csrf';
    if (ruleLower.includes('cors')) return 'cors';
    if (ruleLower.includes('crypto')) return 'cryptography';
    if (ruleLower.includes('deserialization')) return 'deserialization';
    
    return 'security';
  }

  /**
   * Generate human-readable title from finding
   */
  _generateTitle(result) {
    const metadata = result.extra?.metadata || {};
    
    // Use metadata title if available
    if (metadata.title) return metadata.title;
    
    // Generate from rule ID
    const ruleId = result.check_id;
    const parts = ruleId.split('.');
    const ruleName = parts[parts.length - 1] || ruleId;
    
    // Convert kebab-case to Title Case
    return ruleName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Calculate statistics from findings
   */
  _calculateStats(findings) {
    const stats = {
      totalFindings: findings.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      categories: {},
      cweList: new Set(),
      owaspList: new Set(),
    };
    
    for (const finding of findings) {
      // Count by severity
      switch (finding.severity) {
        case 'CRITICAL':
          stats.criticalCount++;
          break;
        case 'HIGH':
          stats.highCount++;
          break;
        case 'MEDIUM':
          stats.mediumCount++;
          break;
        case 'LOW':
          stats.lowCount++;
          break;
      }
      
      // Count by category
      stats.categories[finding.category] = (stats.categories[finding.category] || 0) + 1;
      
      // Collect CWE and OWASP
      if (finding.cwe) finding.cwe.forEach(c => stats.cweList.add(c));
      if (finding.owasp) finding.owasp.forEach(o => stats.owaspList.add(o));
    }
    
    stats.cweList = Array.from(stats.cweList);
    stats.owaspList = Array.from(stats.owaspList);
    
    return stats;
  }

  /**
   * Run a command with timeout and proper error handling
   * @param {string} command - Command to run
   * @param {Array<string>} args - Command arguments
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<string>} - Command output
   */
  _runCommand(command, args = [], timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      // On Windows, use shell for command resolution
      const isWindows = process.platform === 'win32';
      
      const childProcess = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: isWindows, // Enable shell on Windows to find commands in PATH
        windowsHide: true, // Hide console window on Windows
        env: {
          ...process.env,
          SEMGREP_SEND_METRICS: 'off', // Disable telemetry completely
          SEMGREP_ENABLE_VERSION_CHECK: '0', // Disable version checks via env var
          SEMGREP_TIMEOUT: '0', // Disable network timeouts
        },
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let resolved = false;

      // Set timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          timedOut = true;
          childProcess.kill('SIGTERM');
          
          // Force kill if not dead after 5s
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL');
            }
          }, 5000);
        }
      }, timeoutMs);

      // Collect stdout
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        
        // For JSON output, we can try to parse early and resolve
        // This prevents waiting for stderr to finish on Windows
        if (args.includes('--json') && stdout.includes('"version"') && stdout.includes('"results"')) {
          try {
            JSON.parse(stdout); // Validate it's complete JSON
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              childProcess.kill(); // Stop the process
              resolve(stdout);
            }
          } catch (e) {
            // Not complete JSON yet, keep collecting
          }
        }
      });

      // Collect stderr (Semgrep sends status updates here)
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      childProcess.on('close', (code) => {
        if (resolved) return; // Already resolved early
        
        clearTimeout(timeout);
        resolved = true;

        if (timedOut) {
          reject(new Error(`Command timed out after ${timeoutMs}ms`));
          return;
        }

        // Semgrep returns exit code 1 when findings exist (not an error)
        if (code === 0 || code === 1 || code === null) { // null when killed early
          resolve(stdout);
        } else {
          const error = new Error(`Command failed with exit code ${code}: ${stderr || 'No error message'}`);
          error.code = code;
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });

      // Handle spawn errors
      childProcess.on('error', (error) => {
        if (resolved) return;
        clearTimeout(timeout);
        resolved = true;
        reject(new Error(`Failed to spawn command: ${error.message}`));
      });
    });
  }

  /**
   * Validate scan target before running Semgrep
   */
  async validateTarget(targetPath) {
    try {
      const stats = await fs.stat(targetPath);
      
      // Check if it's a valid file or directory
      if (!stats.isFile() && !stats.isDirectory()) {
        return { valid: false, error: 'Target must be a file or directory' };
      }
      
      // Count files in directory (rough estimate)
      if (stats.isDirectory()) {
        const fileCount = await this._countFiles(targetPath);
        if (fileCount > this.maxFiles) {
          return { 
            valid: false, 
            error: `Directory contains too many files (${fileCount} > ${this.maxFiles})` 
          };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Cannot access target: ${error.message}` };
    }
  }

  /**
   * Count analyzable files for progress tracking
   */
  async _countAnalyzableFiles(targetPath) {
    const stats = await fs.stat(targetPath);
    if (stats.isFile()) return 1;
    
    let count = 0;
    const analyzableExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rb', '.php', '.cs', '.cpp', '.c', '.h'];
    
    const countRecursive = async (dir) => {
      if (count >= this.maxFiles) return;
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (count >= this.maxFiles) break;
          
          if (this._shouldIgnore(entry.name)) continue;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (analyzableExtensions.includes(ext)) {
              count++;
            }
          } else if (entry.isDirectory()) {
            await countRecursive(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };
    
    await countRecursive(targetPath);
    return count;
  }

  /**
   * Run command with real-time progress tracking
   */
  async _runCommandWithProgress(command, args, timeoutMs, scanId) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      });

      let stdout = '';
      let stderr = '';
      let processedFiles = 0;

      // Set up timeout
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Track progress through stderr (Semgrep outputs progress info there)
      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;

        // Look for file processing patterns in Semgrep output
        const fileMatches = output.match(/Scanning (\d+)/g);
        if (fileMatches && scanId) {
          processedFiles++;
          progressTracker.updateProgress(scanId, 'scanning_file', {
            index: processedFiles,
            filename: 'Processing...'
          });
        }
      });

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Count files in directory (with limits)
   */
  async _countFiles(dirPath, maxCount = 10000) {
    let count = 0;
    
    const countRecursive = async (dir) => {
      if (count >= maxCount) return;
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (count >= maxCount) break;
          
          // Skip ignored patterns
          if (this._shouldIgnore(entry.name)) continue;
          
          if (entry.isFile()) {
            count++;
          } else if (entry.isDirectory()) {
            await countRecursive(path.join(dir, entry.name));
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    await countRecursive(dirPath);
    return count;
  }

  /**
   * Check if path should be ignored
   */
  _shouldIgnore(name) {
    const ignoreList = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '.next', 'out', 'vendor', '__pycache__', '.venv'
    ];
    return ignoreList.includes(name);
  }
}

module.exports = new SemgrepService();