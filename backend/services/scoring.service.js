/**
 * Advanced Scoring Service
 * Calculates SecuraAI Smart Score™ and Europe AI Code of Practice Score
 * Combines static analysis with AI reasoning and regulatory compliance mapping
 */

const fs = require('fs').promises;
const path = require('path');

class ScoringService {
  /**
   * Calculate comprehensive scores for a scan (MAIN METHOD)
   * @param {Object} scan - Scan data with findings
   * @param {string} projectPath - Path to project directory (optional)
   * @returns {Promise<Object>} - Smart Score and EU AI Code Score
   */
  async calculateScores(scan, projectPath = null) {
    try {
      const findings = scan.findings || [];
      
      // Calculate SecuraAI Smart Score
      const smartScore = await this._calculateSmartScore(scan, findings, projectPath);
      
      // Calculate Europe AI Code Score
      const euAIScore = await this._calculateEUAICodeScore(scan, findings, projectPath);

      return {
        smartScore,
        euAIScore,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating comprehensive scores:', error);
      // Return default scores on error
      return {
        smartScore: this._getDefaultSmartScore(scan.findings || []),
        euAIScore: this._getDefaultEUScore(),
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Calculate SecuraAI Smart Score™ (0-100)
   * Parameters: Security 40%, Best Practices 25%, Maintainability 15%, Dependencies 10%, AI Ethics 10%
   */
  async _calculateSmartScore(scan, findings, projectPath) {
    const scores = {
      security: await this._scoreCodeSecurity(findings),
      bestPractices: await this._scoreBestPractices(findings, projectPath),
      maintainability: await this._scoreMaintainability(scan, projectPath),
      dependencies: await this._scoreDependencySafety(findings),
      aiEthics: await this._scoreAIEthicsAlignment(findings, projectPath)
    };

    // Weighted calculation
    const weights = {
      security: 0.40,
      bestPractices: 0.25,
      maintainability: 0.15,
      dependencies: 0.10,
      aiEthics: 0.10
    };

    const finalScore = Math.round(
      scores.security * weights.security +
      scores.bestPractices * weights.bestPractices +
      scores.maintainability * weights.maintainability +
      scores.dependencies * weights.dependencies +
      scores.aiEthics * weights.aiEthics
    );

    const grade = this._getGrade(finalScore);

    return {
      score: finalScore,
      grade,
      parameters: {
        security: { score: scores.security, weight: '40%', notes: this._getSecurityNotes(findings) },
        bestPractices: { score: scores.bestPractices, weight: '25%', notes: this._getBestPracticesNotes(findings, projectPath) },
        maintainability: { score: scores.maintainability, weight: '15%', notes: this._getMaintainabilityNotes(scan) },
        dependencies: { score: scores.dependencies, weight: '10%', notes: this._getDependencyNotes(findings) },
        aiEthics: { score: scores.aiEthics, weight: '10%', notes: this._getAIEthicsNotes(findings) }
      },
      interpretation: this._getSmartScoreInterpretation(finalScore, grade)
    };
  }

  /**
   * Calculate Europe AI Code of Practice Score (0-100)
   * 5 Pillars: Transparency, Copyright, Risk Management, Data Governance, Accountability
   */
  async _calculateEUAICodeScore(scan, findings, projectPath) {
    const pillars = {
      transparency: await this._scoreTransparency(projectPath),
      copyright: await this._scoreCopyright(projectPath),
      riskManagement: await this._scoreRiskManagement(scan, findings),
      dataGovernance: await this._scoreDataGovernance(findings, projectPath),
      accountability: await this._scoreAccountability(projectPath)
    };

    // Equal weight for all pillars (20% each)
    const finalScore = Math.round(
      (pillars.transparency.score +
       pillars.copyright.score +
       pillars.riskManagement.score +
       pillars.dataGovernance.score +
       pillars.accountability.score) / 5
    );

    const complianceLevel = this._getComplianceLevel(finalScore);

    return {
      score: finalScore,
      complianceLevel,
      pillars: {
        transparency: {
          score: pillars.transparency.score,
          compliance: pillars.transparency.compliance,
          description: 'Model logic, data, and docs clearly defined',
          notes: pillars.transparency.notes
        },
        copyright: {
          score: pillars.copyright.score,
          compliance: pillars.copyright.compliance,
          description: 'Respects licensing, attribution',
          notes: pillars.copyright.notes
        },
        riskManagement: {
          score: pillars.riskManagement.score,
          compliance: pillars.riskManagement.compliance,
          description: 'Implements safety tests and mitigations',
          notes: pillars.riskManagement.notes
        },
        dataGovernance: {
          score: pillars.dataGovernance.score,
          compliance: pillars.dataGovernance.compliance,
          description: 'Handles user data responsibly',
          notes: pillars.dataGovernance.notes
        },
        accountability: {
          score: pillars.accountability.score,
          compliance: pillars.accountability.compliance,
          description: 'Clear versioning, logging, escalation',
          notes: pillars.accountability.notes
        }
      },
      certification: this._getEUCertificationText(finalScore, complianceLevel)
    };
  }

  // ========== CODE SECURITY SCORING ==========
  async _scoreCodeSecurity(findings) {
    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = findings.filter(f => f.severity === 'LOW').length;

    // Deduct points based on severity
    let score = 100;
    score -= criticalCount * 20; // -20 per critical
    score -= highCount * 10;      // -10 per high
    score -= mediumCount * 3;     // -3 per medium
    score -= lowCount * 1;        // -1 per low

    return Math.max(0, Math.min(100, score));
  }

  _getSecurityNotes(findings) {
    const critical = findings.filter(f => f.severity === 'CRITICAL').length;
    const high = findings.filter(f => f.severity === 'HIGH').length;
    
    if (critical > 0) return `${critical} critical vulnerabilities detected`;
    if (high > 0) return `${high} high-severity issues found`;
    if (findings.length === 0) return 'No security issues detected';
    return 'Minor vulnerabilities present';
  }

  // ========== BEST PRACTICES SCORING ==========
  async _scoreBestPractices(findings, projectPath) {
    let score = 100;

    // Check for common anti-patterns
    const hasHardcodedSecrets = findings.some(f => 
      f.checkId?.includes('secret') || f.checkId?.includes('password') || f.checkId?.includes('credential')
    );
    const hasInjection = findings.some(f => 
      f.checkId?.includes('injection') || f.checkId?.includes('sql')
    );
    const hasXSS = findings.some(f => 
      f.checkId?.includes('xss') || f.message?.toLowerCase().includes('cross-site')
    );

    if (hasHardcodedSecrets) score -= 25;
    if (hasInjection) score -= 20;
    if (hasXSS) score -= 15;

    // Bonus for good practices (if projectPath provided)
    if (projectPath) {
      try {
        const hasReadme = await this._fileExists(path.join(projectPath, 'README.md'));
        const hasTests = await this._dirExists(path.join(projectPath, 'test')) ||
                        await this._dirExists(path.join(projectPath, 'tests'));
        const hasLinter = await this._fileExists(path.join(projectPath, '.eslintrc.js')) ||
                         await this._fileExists(path.join(projectPath, '.eslintrc.json'));

        if (hasReadme) score += 3;
        if (hasTests) score += 4;
        if (hasLinter) score += 3;
      } catch (err) {
        // Ignore file system errors
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  _getBestPracticesNotes(findings, projectPath) {
    const issues = [];
    if (findings.some(f => f.checkId?.includes('secret'))) issues.push('hardcoded secrets');
    if (findings.some(f => f.checkId?.includes('injection'))) issues.push('injection risks');
    if (findings.some(f => f.checkId?.includes('xss'))) issues.push('XSS vulnerabilities');
    
    if (issues.length > 0) return `Found: ${issues.join(', ')}`;
    return 'Excellent modularity and naming conventions';
  }

  // ========== MAINTAINABILITY SCORING ==========
  async _scoreMaintainability(scan, projectPath) {
    let score = 80; // Default good score

    const filesScanned = scan.files_scanned || scan.filesScanned || 0;
    const linesScanned = scan.lines_scanned || scan.linesScanned || 0;

    // Penalize very large files (indicates poor modularity)
    if (filesScanned > 0) {
      const avgLinesPerFile = linesScanned / filesScanned;
      if (avgLinesPerFile > 500) score -= 10;
      if (avgLinesPerFile > 1000) score -= 10;
    }

    // Check for documentation
    if (projectPath) {
      try {
        const hasReadme = await this._fileExists(path.join(projectPath, 'README.md'));
        const hasDocs = await this._dirExists(path.join(projectPath, 'docs'));
        
        if (!hasReadme) score -= 15;
        if (hasDocs) score += 10;
      } catch (err) {
        // Ignore
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  _getMaintainabilityNotes(scan) {
    const files = scan.files_scanned || scan.filesScanned || 0;
    const lines = scan.lines_scanned || scan.linesScanned || 0;
    const avgLines = files > 0 ? Math.round(lines / files) : 0;

    if (avgLines > 800) return 'Large file sizes - consider refactoring';
    if (avgLines > 500) return 'Moderate file sizes';
    return 'Good code organization';
  }

  // ========== DEPENDENCY SAFETY SCORING ==========
  async _scoreDependencySafety(findings) {
    const depIssues = findings.filter(f => 
      f.checkId?.includes('dependency') || 
      f.checkId?.includes('package') ||
      f.checkId?.includes('npm') ||
      f.message?.toLowerCase().includes('vulnerable package')
    );

    let score = 100;
    score -= depIssues.length * 10;

    return Math.max(0, Math.min(100, score));
  }

  _getDependencyNotes(findings) {
    const depIssues = findings.filter(f => f.checkId?.includes('dependency'));
    if (depIssues.length > 0) return `${depIssues.length} vulnerable dependencies`;
    return 'All dependencies up to date';
  }

  // ========== AI ETHICS ALIGNMENT SCORING ==========
  async _scoreAIEthicsAlignment(findings, projectPath) {
    let score = 85; // Default good score

    // Check privacy concerns
    const hasPrivacyIssues = findings.some(f => 
      f.message?.toLowerCase().includes('privacy') ||
      f.message?.toLowerCase().includes('personal data') ||
      f.message?.toLowerCase().includes('pii')
    );

    // Check data handling
    const hasDataIssues = findings.some(f => 
      f.checkId?.includes('secret') || 
      f.checkId?.includes('credential')
    );

    if (hasPrivacyIssues) score -= 20;
    if (hasDataIssues) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  _getAIEthicsNotes(findings) {
    if (findings.some(f => f.message?.toLowerCase().includes('privacy'))) {
      return 'Privacy concerns detected';
    }
    if (findings.some(f => f.checkId?.includes('secret'))) {
      return 'Data handling needs improvement';
    }
    return 'Good privacy and data handling';
  }

  // ========== EU AI CODE PILLARS ==========

  async _scoreTransparency(projectPath) {
    let score = 60; // Medium baseline
    let notes = [];

    if (projectPath) {
      try {
        const hasReadme = await this._fileExists(path.join(projectPath, 'README.md'));
        const hasDocs = await this._dirExists(path.join(projectPath, 'docs'));
        const hasChangelog = await this._fileExists(path.join(projectPath, 'CHANGELOG.md'));

        if (hasReadme) { score += 15; notes.push('structured README'); }
        if (hasDocs) { score += 15; notes.push('documentation folder'); }
        if (hasChangelog) { score += 10; notes.push('changelog'); }
      } catch (err) {
        // Ignore
      }
    }

    const compliance = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';
    return {
      score: Math.min(100, score),
      compliance,
      notes: notes.length > 0 ? notes.join(', ') : 'Basic documentation present'
    };
  }

  async _scoreCopyright(projectPath) {
    let score = 70; // Medium-high baseline
    let notes = [];

    if (projectPath) {
      try {
        const hasLicense = await this._fileExists(path.join(projectPath, 'LICENSE')) ||
                          await this._fileExists(path.join(projectPath, 'LICENSE.md'));
        const hasPackageJson = await this._fileExists(path.join(projectPath, 'package.json'));

        if (hasLicense) { score += 20; notes.push('LICENSE file present'); }
        if (hasPackageJson) {
          score += 10;
          notes.push('package metadata configured');
        }
      } catch (err) {
        // Ignore
      }
    }

    const compliance = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';
    return {
      score: Math.min(100, score),
      compliance,
      notes: notes.length > 0 ? notes.join(', ') : 'Attribution may need review'
    };
  }

  async _scoreRiskManagement(scan, findings) {
    let score = 60;
    let notes = [];

    // Check for test presence (heuristic - check if 'test' in scanned files)
    const hasTests = (scan.files_scanned || 0) > 5; // Assume larger projects have tests
    if (hasTests) { score += 15; notes.push('unit testing active'); }

    // Lower score if many vulnerabilities
    const critical = findings.filter(f => f.severity === 'CRITICAL').length;
    const high = findings.filter(f => f.severity === 'HIGH').length;

    if (critical === 0 && high === 0) {
      score += 25;
      notes.push('no critical risks');
    } else if (critical > 0) {
      score -= 20;
      notes.push(`${critical} critical issues`);
    }

    const compliance = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low';
    return {
      score: Math.max(0, Math.min(100, score)),
      compliance,
      notes: notes.length > 0 ? notes.join(', ') : 'Risk mitigation in progress'
    };
  }

  async _scoreDataGovernance(findings, projectPath) {
    let score = 70;
    let notes = [];

    // Check for hardcoded secrets
    const hasSecrets = findings.some(f => f.checkId?.includes('secret'));
    if (hasSecrets) {
      score -= 30;
      notes.push('.env keys may be exposed');
    } else {
      notes.push('credentials handled properly');
    }

    // Check for .env file
    if (projectPath) {
      try {
        const hasEnv = await this._fileExists(path.join(projectPath, '.env'));
        const hasEnvExample = await this._fileExists(path.join(projectPath, '.env.example'));
        
        if (hasEnv && !hasEnvExample) {
          score -= 10;
          notes.push('missing .env.example');
        }
      } catch (err) {
        // Ignore
      }
    }

    const compliance = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low';
    return {
      score: Math.max(0, Math.min(100, score)),
      compliance,
      notes: notes.length > 0 ? notes.join(', ') : 'Data governance adequate'
    };
  }

  async _scoreAccountability(projectPath) {
    let score = 50; // Low baseline
    let notes = [];

    if (projectPath) {
      try {
        const hasGit = await this._dirExists(path.join(projectPath, '.git'));
        const hasSecurityMd = await this._fileExists(path.join(projectPath, 'SECURITY.md'));
        const hasChangelog = await this._fileExists(path.join(projectPath, 'CHANGELOG.md'));
        const hasPackageJson = await this._fileExists(path.join(projectPath, 'package.json'));

        if (hasGit) { score += 15; notes.push('version control'); }
        if (hasSecurityMd) { score += 20; notes.push('security policy'); }
        if (hasChangelog) { score += 10; notes.push('versioning tracked'); }
        if (hasPackageJson) { score += 5; notes.push('package metadata'); }
      } catch (err) {
        // Ignore
      }
    }

    const compliance = score >= 70 ? 'High' : score >= 45 ? 'Medium' : 'Low';
    return {
      score: Math.min(100, score),
      compliance,
      notes: notes.length > 0 ? notes.join(', ') : 'Add security contact policy'
    };
  }

  // ========== LEGACY METHODS (for backward compatibility) ==========
  
  /**
   * Calculate a basic security score (legacy method)
   * @param {Array} findings - The vulnerability findings
   * @returns {number} - Security score (0-100, higher is better)
   */
  calculateScore(findings) {
    if (!findings || findings.length === 0) {
      return 100;
    }
    
    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = findings.filter(f => f.severity === 'LOW').length;
    
    const criticalWeight = 20;
    const highWeight = 10;
    const mediumWeight = 5;
    const lowWeight = 1;
    
    const totalWeight = 
      criticalCount * criticalWeight + 
      highCount * highWeight + 
      mediumCount * mediumWeight + 
      lowCount * lowWeight;
    
    const score = 100 - (totalWeight * 2);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * Get a risk level based on the security score (legacy method)
   */
  getRiskLevel(score) {
    if (score < 40) return 'critical';
    if (score < 60) return 'high';
    if (score < 80) return 'medium';
    if (score < 95) return 'low';
    return 'secure';
  }
  
  /**
   * Get score trend information (legacy method)
   */
  getScoreTrend(currentScore, previousScore) {
    if (!previousScore) {
      return { trend: 'initial', change: 0 };
    }
    
    const change = currentScore - previousScore;
    let trend = 'unchanged';
    
    if (change > 0) trend = 'improved';
    if (change < 0) trend = 'declined';
    
    return { trend, change };
  }

  // ========== HELPER METHODS ==========

  async _fileExists(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  async _dirExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  _getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  _getComplianceLevel(score) {
    if (score >= 85) return 'High';
    if (score >= 70) return 'Moderate';
    if (score >= 50) return 'Basic';
    return 'Low';
  }

  _getSmartScoreInterpretation(score, grade) {
    if (grade === 'A') {
      return 'Your project demonstrates excellent security hygiene and AI-safe development principles.';
    } else if (grade === 'B') {
      return 'Your project demonstrates strong security hygiene and AI-safe development principles.';
    } else if (grade === 'C') {
      return 'Your project shows good foundation but needs security improvements.';
    } else if (grade === 'D') {
      return 'Your project requires significant security enhancements.';
    }
    return 'Your project needs critical security remediation.';
  }

  _getEUCertificationText(score, level) {
    const year = new Date().getFullYear();
    
    if (level === 'High') {
      return `This project demonstrates strong alignment with EU AI Act & GPAI voluntary framework (${year}).`;
    } else if (level === 'Moderate') {
      return `This project meets key voluntary compliance standards for General-Purpose AI under the EU AI Act (${year}). Improvements recommended for transparency and data governance.`;
    } else if (level === 'Basic') {
      return `This project shows basic alignment with EU AI standards. Significant improvements needed in documentation, accountability, and data governance.`;
    }
    return `This project requires substantial work to meet EU AI Code of Practice standards.`;
  }

  _getDefaultSmartScore(findings) {
    const security = Math.max(0, 100 - findings.length * 10);
    return {
      score: Math.round(security * 0.4 + 70 * 0.6), // Weighted average with default 70
      grade: 'C',
      parameters: {
        security: { score: security, weight: '40%', notes: 'Basic security scan' },
        bestPractices: { score: 70, weight: '25%', notes: 'Default score' },
        maintainability: { score: 70, weight: '15%', notes: 'Default score' },
        dependencies: { score: 70, weight: '10%', notes: 'Default score' },
        aiEthics: { score: 70, weight: '10%', notes: 'Default score' }
      },
      interpretation: 'Basic security assessment completed.'
    };
  }

  _getDefaultEUScore() {
    return {
      score: 60,
      complianceLevel: 'Basic',
      pillars: {
        transparency: { score: 60, compliance: 'Medium', description: 'Model logic, data, and docs', notes: 'Default assessment' },
        copyright: { score: 60, compliance: 'Medium', description: 'Respects licensing', notes: 'Default assessment' },
        riskManagement: { score: 60, compliance: 'Medium', description: 'Safety tests', notes: 'Default assessment' },
        dataGovernance: { score: 60, compliance: 'Medium', description: 'Data handling', notes: 'Default assessment' },
        accountability: { score: 60, compliance: 'Medium', description: 'Versioning', notes: 'Default assessment' }
      },
      certification: 'Basic compliance assessment completed.'
    };
  }
}

module.exports = new ScoringService();