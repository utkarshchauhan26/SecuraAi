const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

// Convert exec to promise-based
const execPromise = util.promisify(exec);

/**
 * Service for interacting with Semgrep for static code analysis
 */
class SemgrepService {
  constructor() {
    this.semgrepInstalled = false;
    this.checkSemgrepInstallation();
  }

  /**
   * Check if Semgrep is installed on the system
   */
  async checkSemgrepInstallation() {
    try {
      await execPromise('semgrep --version');
      this.semgrepInstalled = true;
      console.log('Semgrep is installed and ready to use');
    } catch (error) {
      console.warn('Semgrep is not installed. Please install Semgrep for full functionality.');
      console.warn('Install with: pip install semgrep');
      this.semgrepInstalled = false;
    }
  }

  /**
   * Analyze a file for security vulnerabilities using Semgrep
   * @param {string} filePath - Path to the file to analyze
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzeFile(filePath) {
    if (!this.semgrepInstalled) {
      throw new Error('Semgrep is not installed. Install with: pip install semgrep');
    }

    try {
      // Use Semgrep with security rules
      const command = `semgrep --config=p/security-audit ${filePath} --json`;
      const { stdout } = await execPromise(command);
      
      // Parse the results
      const results = JSON.parse(stdout);
      
      // Transform to our application format
      return this.transformResults(results, filePath);
    } catch (error) {
      console.error('Error running Semgrep:', error);
      
      // Handle case where Semgrep runs but finds no issues
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout);
          return this.transformResults(results, filePath);
        } catch (parseError) {
          // If we can't parse the output, re-throw the original error
          throw error;
        }
      }
      
      throw error;
    }
  }

  /**
   * Transform Semgrep results to application format
   * @param {Object} results - Raw Semgrep results
   * @param {string} filePath - Path to the analyzed file
   * @returns {Object} - Transformed results
   */
  transformResults(results, filePath) {
    const findings = [];
    
    // Process each finding from Semgrep
    if (results.results && Array.isArray(results.results)) {
      for (const result of results.results) {
        // Read the file content to get context
        const fileContent = fs.readFileSync(result.path, 'utf8').split('\n');
        
        // Get code snippets for context (5 lines before and after)
        const lineNumber = result.start.line;
        const startLine = Math.max(0, lineNumber - 6);
        const endLine = Math.min(fileContent.length - 1, lineNumber + 4);
        
        const before = fileContent.slice(startLine, lineNumber - 1);
        const after = fileContent.slice(lineNumber, endLine + 1);
        
        // Map Semgrep severity to our app's severity levels
        let severity = 'low';
        if (result.extra.severity === 'ERROR' || result.extra.severity === 'WARNING') {
          severity = 'high';
        } else if (result.extra.severity === 'INFO') {
          severity = 'medium';
        }
        
        findings.push({
          rule: result.check_id,
          severity: severity,
          file: path.basename(result.path),
          line: lineNumber,
          snippet: result.extra.lines,
          message: result.extra.message,
          confidence: 90, // Default high confidence for Semgrep findings
          context: {
            before,
            after
          },
          cwe: result.extra.metadata?.cwe || null,
          owasp: result.extra.metadata?.owasp || null
        });
      }
    }
    
    return {
      findings,
      stats: {
        totalFindings: findings.length,
        highSeverity: findings.filter(f => f.severity === 'high').length,
        mediumSeverity: findings.filter(f => f.severity === 'medium').length,
        lowSeverity: findings.filter(f => f.severity === 'low').length
      }
    };
  }

  /**
   * Run Semgrep on a directory of files
   * @param {string} dirPath - Path to the directory to analyze
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzeDirectory(dirPath) {
    if (!this.semgrepInstalled) {
      throw new Error('Semgrep is not installed. Install with: pip install semgrep');
    }

    try {
      // Use Semgrep with security rules on directory
      const command = `semgrep --config=p/security-audit ${dirPath} --json`;
      const { stdout } = await execPromise(command);
      
      // Parse the results
      const results = JSON.parse(stdout);
      
      // Transform to our application format
      return this.transformResults(results, dirPath);
    } catch (error) {
      console.error('Error running Semgrep on directory:', error);
      throw error;
    }
  }
}

module.exports = new SemgrepService();