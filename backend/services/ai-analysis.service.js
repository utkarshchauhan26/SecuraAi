/**
 * AI Analysis Service
 * Enhances security findings with AI-powered insights, best practices, and recommendations
 */

class AIAnalysisService {
  constructor() {
    this.enabled = true;
  }

  /**
   * Analyze security findings and provide AI-enhanced insights
   * @param {Array} findings - Array of security findings from Semgrep
   * @returns {Promise<Object>} - Enhanced analysis with recommendations
   */
  async analyzeFindingsWithAI(findings) {
    if (!findings || findings.length === 0) {
      return {
        summary: {
          totalFindings: 0,
          criticalIssues: 0,
          commonPatterns: [],
          riskLevel: 'LOW'
        },
        insights: [],
        recommendations: [],
        bestPractices: []
      };
    }

    try {
      // Analyze patterns
      const patterns = this._identifyCommonPatterns(findings);
      const criticalIssues = findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
      const riskLevel = this._calculateRiskLevel(findings);

      // Generate insights for each finding
      const enhancedFindings = findings.map(finding => ({
        ...finding,
        aiInsights: this._generateFindingInsights(finding),
        remediationSteps: this._generateRemediationSteps(finding),
        businessImpact: this._assessBusinessImpact(finding),
        exploitability: this._assessExploitability(finding)
      }));

      // Generate overall recommendations
      const recommendations = this._generateRecommendations(findings, patterns);
      const bestPractices = this._generateBestPractices(findings, patterns);

      return {
        summary: {
          totalFindings: findings.length,
          criticalIssues: criticalIssues.length,
          commonPatterns: patterns,
          riskLevel,
          severityDistribution: this._getSeverityDistribution(findings)
        },
        enhancedFindings,
        insights: this._generateOverallInsights(findings, patterns),
        recommendations,
        bestPractices,
        complianceMapping: this._mapToCompliance(findings)
      };
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return {
        summary: {
          totalFindings: findings.length,
          criticalIssues: 0,
          commonPatterns: [],
          riskLevel: 'UNKNOWN'
        },
        insights: [],
        recommendations: [],
        bestPractices: []
      };
    }
  }

  /**
   * Identify common vulnerability patterns
   */
  _identifyCommonPatterns(findings) {
    const patternCounts = {};
    
    findings.forEach(finding => {
      const category = this._categorizeVulnerability(finding);
      patternCounts[category] = (patternCounts[category] || 0) + 1;
    });

    return Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({
        pattern,
        count,
        severity: this._getPatternSeverity(pattern, findings)
      }));
  }

  /**
   * Categorize vulnerability type
   */
  _categorizeVulnerability(finding) {
    const ruleId = (finding.rule_id || finding.check_id || '').toLowerCase();
    const message = (finding.message || '').toLowerCase();
    
    if (ruleId.includes('sql') || message.includes('sql injection')) return 'SQL Injection';
    if (ruleId.includes('xss') || message.includes('cross-site scripting')) return 'Cross-Site Scripting (XSS)';
    if (ruleId.includes('secret') || ruleId.includes('password') || ruleId.includes('key')) return 'Hardcoded Secrets';
    if (ruleId.includes('auth') || message.includes('authentication')) return 'Authentication Issues';
    if (ruleId.includes('csrf')) return 'CSRF Vulnerabilities';
    if (ruleId.includes('cors')) return 'CORS Misconfigurations';
    if (ruleId.includes('path') || ruleId.includes('traversal')) return 'Path Traversal';
    if (ruleId.includes('deserialization')) return 'Insecure Deserialization';
    if (ruleId.includes('crypto') || ruleId.includes('hash')) return 'Cryptographic Issues';
    if (ruleId.includes('eval') || ruleId.includes('exec')) return 'Code Injection';
    if (ruleId.includes('ssrf')) return 'Server-Side Request Forgery';
    if (ruleId.includes('xxe')) return 'XML External Entity (XXE)';
    
    return 'Other Security Issues';
  }

  /**
   * Calculate overall risk level
   */
  _calculateRiskLevel(findings) {
    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;

    if (criticalCount > 0) return 'CRITICAL';
    if (highCount >= 3) return 'HIGH';
    if (highCount > 0 || mediumCount >= 5) return 'MEDIUM';
    if (mediumCount > 0) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Get severity distribution
   */
  _getSeverityDistribution(findings) {
    return {
      CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
      HIGH: findings.filter(f => f.severity === 'HIGH').length,
      MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
      LOW: findings.filter(f => f.severity === 'LOW').length
    };
  }

  /**
   * Get pattern severity
   */
  _getPatternSeverity(pattern, findings) {
    const patternFindings = findings.filter(f => 
      this._categorizeVulnerability(f) === pattern
    );
    
    const severities = patternFindings.map(f => f.severity);
    
    if (severities.includes('CRITICAL')) return 'CRITICAL';
    if (severities.includes('HIGH')) return 'HIGH';
    if (severities.includes('MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate AI insights for a specific finding
   */
  _generateFindingInsights(finding) {
    const category = this._categorizeVulnerability(finding);
    
    const insightsMap = {
      'SQL Injection': {
        description: 'SQL injection allows attackers to interfere with database queries, potentially accessing, modifying, or deleting data.',
        commonCauses: ['Unsanitized user input', 'String concatenation in queries', 'Lack of parameterized queries'],
        realWorldImpact: 'Data breach, unauthorized access, data manipulation, or complete database compromise'
      },
      'Cross-Site Scripting (XSS)': {
        description: 'XSS enables attackers to inject malicious scripts into web pages viewed by other users.',
        commonCauses: ['Unescaped user input in HTML', 'innerHTML usage with untrusted data', 'Missing Content Security Policy'],
        realWorldImpact: 'Session hijacking, credential theft, malware distribution, or defacement'
      },
      'Hardcoded Secrets': {
        description: 'Hardcoded credentials or API keys in source code can be discovered by attackers.',
        commonCauses: ['Direct credential storage', 'Committed secrets in version control', 'Configuration files in repository'],
        realWorldImpact: 'Unauthorized access to systems, data breaches, or service compromise'
      },
      'Authentication Issues': {
        description: 'Weak authentication mechanisms can allow unauthorized access to protected resources.',
        commonCauses: ['Weak password policies', 'Missing multi-factor authentication', 'Session management flaws'],
        realWorldImpact: 'Account takeover, unauthorized access, or privilege escalation'
      },
      'Code Injection': {
        description: 'Code injection allows attackers to execute arbitrary code on the server or client.',
        commonCauses: ['eval() with user input', 'exec() with unsanitized data', 'Dynamic code execution'],
        realWorldImpact: 'Remote code execution, server compromise, or data theft'
      }
    };

    return insightsMap[category] || {
      description: 'Security vulnerability that requires attention.',
      commonCauses: ['Insecure coding practices', 'Missing security controls'],
      realWorldImpact: 'Potential security breach or data compromise'
    };
  }

  /**
   * Generate remediation steps for a finding
   */
  _generateRemediationSteps(finding) {
    const category = this._categorizeVulnerability(finding);
    
    const remediationMap = {
      'SQL Injection': [
        'Use parameterized queries or prepared statements',
        'Implement input validation and sanitization',
        'Use ORM frameworks with built-in protection',
        'Apply principle of least privilege to database accounts',
        'Enable SQL injection detection tools'
      ],
      'Cross-Site Scripting (XSS)': [
        'Encode all user-supplied data before rendering',
        'Use Content Security Policy (CSP) headers',
        'Avoid innerHTML; use textContent or createElement',
        'Implement input validation and output encoding',
        'Use modern frameworks with automatic XSS protection'
      ],
      'Hardcoded Secrets': [
        'Remove secrets from source code immediately',
        'Use environment variables or secret management systems',
        'Rotate compromised credentials',
        'Implement git-secrets or similar pre-commit hooks',
        'Use services like AWS Secrets Manager or HashiCorp Vault'
      ],
      'Authentication Issues': [
        'Implement multi-factor authentication (MFA)',
        'Use strong password policies and hashing',
        'Implement secure session management',
        'Add rate limiting and account lockout',
        'Use OAuth 2.0 or OpenID Connect for third-party auth'
      ],
      'Code Injection': [
        'Never use eval() with user input',
        'Sanitize and validate all user inputs',
        'Use safe alternatives to dynamic code execution',
        'Implement strict Content Security Policy',
        'Apply input validation and output encoding'
      ]
    };

    return remediationMap[category] || [
      'Review and fix the security issue',
      'Follow secure coding best practices',
      'Implement proper input validation',
      'Apply security testing and code review'
    ];
  }

  /**
   * Assess business impact
   */
  _assessBusinessImpact(finding) {
    const severity = finding.severity || 'MEDIUM';
    const category = this._categorizeVulnerability(finding);

    const impactLevels = {
      CRITICAL: {
        financial: 'Potential for significant financial loss',
        reputation: 'Severe damage to brand reputation',
        legal: 'Risk of regulatory fines and legal action',
        operational: 'Critical business operations at risk'
      },
      HIGH: {
        financial: 'Moderate to high financial impact',
        reputation: 'Notable reputation damage',
        legal: 'Compliance violations possible',
        operational: 'Important operations affected'
      },
      MEDIUM: {
        financial: 'Limited financial impact',
        reputation: 'Minor reputation concerns',
        legal: 'Low compliance risk',
        operational: 'Some operational impact'
      },
      LOW: {
        financial: 'Minimal financial impact',
        reputation: 'Negligible reputation effect',
        legal: 'No significant compliance issues',
        operational: 'Limited operational concern'
      }
    };

    return impactLevels[severity] || impactLevels.MEDIUM;
  }

  /**
   * Assess exploitability
   */
  _assessExploitability(finding) {
    const category = this._categorizeVulnerability(finding);
    
    const exploitabilityMap = {
      'SQL Injection': { level: 'HIGH', toolsAvailable: true, skillRequired: 'LOW', timeToExploit: 'MINUTES' },
      'Cross-Site Scripting (XSS)': { level: 'HIGH', toolsAvailable: true, skillRequired: 'LOW', timeToExploit: 'MINUTES' },
      'Hardcoded Secrets': { level: 'CRITICAL', toolsAvailable: true, skillRequired: 'MINIMAL', timeToExploit: 'IMMEDIATE' },
      'Code Injection': { level: 'CRITICAL', toolsAvailable: true, skillRequired: 'MEDIUM', timeToExploit: 'HOURS' },
      'Authentication Issues': { level: 'MEDIUM', toolsAvailable: true, skillRequired: 'MEDIUM', timeToExploit: 'HOURS' }
    };

    return exploitabilityMap[category] || { 
      level: 'MEDIUM', 
      toolsAvailable: false, 
      skillRequired: 'MEDIUM', 
      timeToExploit: 'DAYS' 
    };
  }

  /**
   * Generate overall insights
   */
  _generateOverallInsights(findings, patterns) {
    const insights = [];

    // Pattern-based insights
    if (patterns.length > 0) {
      const topPattern = patterns[0];
      insights.push({
        type: 'PATTERN',
        severity: topPattern.severity,
        title: `Recurring ${topPattern.pattern} Pattern Detected`,
        description: `Found ${topPattern.count} instances of ${topPattern.pattern}. This suggests a systematic issue that should be addressed across the codebase.`,
        priority: 'HIGH'
      });
    }

    // Severity-based insights
    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      insights.push({
        type: 'SEVERITY',
        severity: 'CRITICAL',
        title: 'Critical Vulnerabilities Require Immediate Action',
        description: `${criticalCount} critical vulnerabilities found. These pose immediate risk and should be remediated urgently.`,
        priority: 'CRITICAL'
      });
    }

    // Code quality insights
    const secretsCount = findings.filter(f => this._categorizeVulnerability(f) === 'Hardcoded Secrets').length;
    if (secretsCount > 0) {
      insights.push({
        type: 'SECURITY_PRACTICE',
        severity: 'HIGH',
        title: 'Secrets Management Needed',
        description: `${secretsCount} hardcoded secrets found. Implement a secure secrets management solution.`,
        priority: 'HIGH'
      });
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  _generateRecommendations(findings, patterns) {
    const recommendations = [];

    // Immediate actions
    recommendations.push({
      category: 'IMMEDIATE',
      title: 'Prioritize Critical and High Severity Issues',
      actions: [
        'Address all CRITICAL findings within 24-48 hours',
        'Remediate HIGH severity issues within 1 week',
        'Review and plan fixes for MEDIUM severity items'
      ],
      impact: 'Significantly reduces security risk'
    });

    // Code review recommendations
    if (patterns.some(p => p.count > 3)) {
      recommendations.push({
        category: 'PROCESS',
        title: 'Enhance Code Review Process',
        actions: [
          'Implement security-focused code review checklist',
          'Train developers on secure coding practices',
          'Use automated security scanning in CI/CD pipeline'
        ],
        impact: 'Prevents similar issues in future code'
      });
    }

    // Tool recommendations
    recommendations.push({
      category: 'TOOLING',
      title: 'Implement Security Automation',
      actions: [
        'Enable pre-commit hooks for secret detection',
        'Set up automated dependency scanning',
        'Configure SAST/DAST tools in deployment pipeline',
        'Use security linters in development environment'
      ],
      impact: 'Catches vulnerabilities before deployment'
    });

    return recommendations;
  }

  /**
   * Generate best practices
   */
  _generateBestPractices(findings, patterns) {
    const practices = [];

    practices.push({
      category: 'Input Validation',
      practice: 'Validate and sanitize all user inputs',
      description: 'Never trust user input. Implement strict validation and sanitization for all data entering the application.',
      resources: ['OWASP Input Validation Cheat Sheet', 'OWASP XSS Prevention Cheat Sheet']
    });

    practices.push({
      category: 'Authentication & Authorization',
      practice: 'Implement defense in depth',
      description: 'Use multiple layers of security controls including MFA, session management, and least privilege access.',
      resources: ['OWASP Authentication Cheat Sheet', 'NIST Digital Identity Guidelines']
    });

    practices.push({
      category: 'Secrets Management',
      practice: 'Never commit secrets to version control',
      description: 'Use environment variables, secret management services, and rotate credentials regularly.',
      resources: ['AWS Secrets Manager', 'HashiCorp Vault', 'Azure Key Vault']
    });

    practices.push({
      category: 'Secure Development',
      practice: 'Adopt security-first development culture',
      description: 'Integrate security throughout SDLC with training, threat modeling, and security testing.',
      resources: ['OWASP Top 10', 'CWE Top 25', 'SANS Secure Coding']
    });

    return practices;
  }

  /**
   * Map findings to compliance frameworks
   */
  _mapToCompliance(findings) {
    const compliance = {
      'OWASP Top 10': [],
      'CWE Top 25': [],
      'PCI DSS': [],
      'GDPR': [],
      'SOC 2': []
    };

    findings.forEach(finding => {
      const category = this._categorizeVulnerability(finding);
      
      // OWASP Top 10 mapping
      if (category === 'SQL Injection') compliance['OWASP Top 10'].push('A03:2021 – Injection');
      if (category === 'Cross-Site Scripting (XSS)') compliance['OWASP Top 10'].push('A03:2021 – Injection');
      if (category === 'Authentication Issues') compliance['OWASP Top 10'].push('A07:2021 – Identification and Authentication Failures');
      if (category === 'Hardcoded Secrets') compliance['OWASP Top 10'].push('A07:2021 – Identification and Authentication Failures');
      
      // CWE mapping
      if (category === 'SQL Injection') compliance['CWE Top 25'].push('CWE-89: SQL Injection');
      if (category === 'Cross-Site Scripting (XSS)') compliance['CWE Top 25'].push('CWE-79: Cross-site Scripting');
      if (category === 'Code Injection') compliance['CWE Top 25'].push('CWE-94: Code Injection');
    });

    // Remove duplicates
    Object.keys(compliance).forEach(key => {
      compliance[key] = [...new Set(compliance[key])];
    });

    return compliance;
  }
}

module.exports = new AIAnalysisService();
