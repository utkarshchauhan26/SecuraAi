/**
 * AI Security Audit Prompt Template
 * Generates comprehensive security reports from Semgrep findings
 * Used by AI services (Gemini, GPT) to provide professional analysis
 */

/**
 * Main audit prompt for comprehensive security analysis
 * @param {Object} scanData - Semgrep scan results with findings
 * @param {Object} context - Additional context (project info, stack, etc.)
 */
const generateSecurityAuditPrompt = (scanData, context = {}) => {
  const { findings = [], project = {}, stats = {} } = scanData;
  const { name = 'Project', description = '', stack = [] } = project;
  
  return `You are an expert AI Security Auditor with deep knowledge of web application security, OWASP Top 10, and modern development best practices.

📋 **AUDIT CONTEXT**
- Project: ${name}
- Technology Stack: ${stack.join(', ') || 'JavaScript/TypeScript, Node.js, React'}
- Total Files Scanned: ${stats.filesScanned || 'N/A'}
- Total Findings: ${findings.length}
- Scan Date: ${new Date().toISOString()}

📊 **SEMGREP FINDINGS DATA**
${JSON.stringify(findings, null, 2)}

🎯 **YOUR TASK**
Analyze the above Semgrep findings and generate a comprehensive, professional security audit report for a college-level developer. The report should be educational, actionable, and business-focused.

📝 **REQUIRED REPORT STRUCTURE**

## 1️⃣ Executive Summary
- Provide a clear, 2-3 paragraph summary of the security posture
- Highlight the most critical risks in business terms
- State the overall risk level: Critical/High/Medium/Low
- Mention if immediate action is required
- Be reassuring if security is good, urgent if issues exist

Example format:
"This security assessment identified [X] potential vulnerabilities across [Y] categories. [Critical/High findings summary]. The overall security posture is [excellent/good/fair/poor]. [Immediate action/Routine improvements] recommended."

## 2️⃣ Vulnerability Distribution
Create a breakdown:
- Critical: [count] - Immediate business risk (data breach, service disruption)
- High: [count] - Significant security risk (unauthorized access)
- Medium: [count] - Moderate security weakness
- Low: [count] - Best practice improvements

## 3️⃣ Top 5 Critical/High Findings
For EACH of the top 5 most severe findings, provide:

### Finding #[N] - [Severity] - [Category]
**File:** \`[exact file path]:[line number]\`
**Issue:** [Concise description]
**Risk:** [Business impact in simple terms]
**Code Context:**
\`\`\`javascript
[Show the vulnerable code snippet]
\`\`\`

**Why This Matters:**
[Explain the real-world impact - what could an attacker do?]

**How to Fix:**
\`\`\`javascript
// ❌ Vulnerable Code
[bad example]

// ✅ Secure Code
[fixed example with comments]
\`\`\`

**OWASP Mapping:** [e.g., A03:2021 - Injection]
**CWE:** [if applicable]
**Estimated Fix Time:** [e.g., 30 min, 1 hour, 2 hours]

## 4️⃣ Secrets & Credentials Analysis
List ANY exposed secrets found:
- API Keys (Google, AWS, third-party services)
- JWT Secrets or hardcoded tokens
- Database connection strings
- Private keys or certificates
- OAuth client secrets
- Any hardcoded passwords

For EACH secret:
- **Location:** \`file:line\`
- **Type:** [API Key/JWT/DB Credential/etc.]
- **Risk:** [What could be compromised]
- **Action:** [Immediate steps to rotate and secure]

If NO secrets found, state: "✅ No hardcoded secrets detected. Excellent security practice!"

## 5️⃣ AI-Powered Security Best Practices

### 🔐 API Security
Analyze findings for:
- Missing request timeouts (risk: hung requests, DoS)
- No input validation (risk: injection attacks)
- Missing rate limiting (risk: brute force, abuse)
- Unvalidated redirects (risk: phishing)

Provide specific code examples for improvements.

### 🔑 Authentication & Session Handling
Check for:
- Weak session management
- Missing CSRF protection
- Insecure password storage
- No multi-factor authentication support
- Session fixation vulnerabilities

### 🛡️ Data Validation & Sanitization
Identify:
- SQL injection risks (parameterized queries needed)
- XSS vulnerabilities (input sanitization)
- Command injection (avoid shell execution)
- Path traversal (validate file paths)

### ⚠️ Error Handling & Logging
Review:
- Sensitive data in error messages
- Stack traces exposed to users
- Insufficient logging for security events
- Over-verbose error responses

### 📦 Dependency Hygiene
Note:
- Vulnerable npm packages
- Outdated dependencies
- Unused dependencies increasing attack surface

## 6️⃣ AI Recommendations

### 🎯 Short-Term Fixes (This Sprint - 1-2 Weeks)
1. [Highest priority issue] - [Why] - [Estimated time]
2. [Second priority] - [Why] - [Estimated time]
3. [Third priority] - [Why] - [Estimated time]

### 📈 Long-Term Improvements (Next Month)
1. [Architectural improvement]
2. [Security infrastructure]
3. [Process improvement]

### 🚀 Preventive Coding Guidelines
- [Guideline 1]: [Explanation]
- [Guideline 2]: [Explanation]
- [Guideline 3]: [Explanation]

### 🔄 CI/CD & Pre-Commit Checks
Recommend:
- Pre-commit hooks to prevent secrets
- Automated Semgrep in CI pipeline
- Dependency vulnerability scanning
- Code coverage requirements
- Security gates (block on Critical/High)

## 7️⃣ Developer-Focused Remediation Guide

For the MOST COMMON vulnerability type found, provide:

### Problem: [Vulnerability Name]
**What it is:** [Simple explanation for college-level developer]
**Why it matters:** [Real-world scenario of exploitation]
**How attackers exploit it:** [Attack vector explained simply]

### The Fix:
\`\`\`javascript
// ❌ BEFORE (Vulnerable)
[realistic bad code example]

// ✅ AFTER (Secure)
[fixed code with inline comments explaining each security measure]
\`\`\`

### Additional Context:
- **OWASP Reference:** [Link concept to OWASP Top 10]
- **CWE-ID:** [If applicable]
- **Industry Standard:** [e.g., PCI-DSS requirement]
- **Testing:** [How to verify the fix works]

## 8️⃣ Compliance & Standards Mapping

Map findings to:
- **OWASP Top 10 2021:** [List relevant categories]
- **CWE (Common Weakness Enumeration):** [List CWE IDs]
- **PCI-DSS:** [If payment data is involved]
- **GDPR/CCPA:** [If personal data is involved]

## 9️⃣ Security Metrics & Scoring

Provide:
- **Overall Risk Score:** [0-100, where 100 is perfect security]
- **Security Grade:** [A/B/C/D/F]
- **Confidence Level:** [0.0-1.0 based on scan coverage]
- **Trend:** [Improving/Declining/Stable - if historical data available]

## 🔟 Next Steps & Action Plan

### Week 1-2:
- [ ] Fix all Critical vulnerabilities
- [ ] Rotate any exposed secrets
- [ ] Implement input validation for high-risk endpoints

### Week 3-4:
- [ ] Address High severity issues
- [ ] Add rate limiting to authentication
- [ ] Implement security headers

### Month 2:
- [ ] Remediate Medium severity findings
- [ ] Add comprehensive error handling
- [ ] Set up security monitoring

### Ongoing:
- [ ] Weekly security scans
- [ ] Monthly dependency updates
- [ ] Quarterly penetration testing
- [ ] Security training for team

---

🎯 **RESPONSE GUIDELINES:**

1. **Tone:** Professional but accessible - imagine explaining to a smart college student
2. **Length:** Be comprehensive but concise - every sentence should add value
3. **Code Examples:** Always show BEFORE and AFTER with clear comments
4. **Business Context:** Connect technical issues to business impact
5. **Actionable:** Every finding should have a clear fix with time estimate
6. **Educational:** Teach WHY, not just WHAT
7. **Realistic:** Use actual code patterns from the findings
8. **Prioritized:** Most critical issues first
9. **Empowering:** Make the developer confident they can fix this
10. **No Fluff:** Skip generic security advice - focus on THESE findings

🚫 **AVOID:**
- Generic security platitudes without specific examples
- Overly technical jargon without explanation
- Listing findings without actionable fixes
- Fear-mongering or alarmism
- Copy-paste security checklist items

✅ **REMEMBER:**
- This report will be read by developers, managers, AND executives
- It will guide sprint planning and budget decisions
- It needs to inspire action, not overwhelm
- Every recommendation should be concrete and testable
- The goal is to IMPROVE security, not just report problems

Generate the report now using Markdown formatting.`;
};

/**
 * Focused prompt for individual finding explanation
 * Used when AI needs to explain a single vulnerability in detail
 */
const generateFindingExplanationPrompt = (finding) => {
  return `You are a security expert explaining a code vulnerability to a developer.

**Finding Details:**
- **Type:** ${finding.check_id || finding.ruleId}
- **Severity:** ${finding.severity}
- **File:** ${finding.path}:${finding.start_line}
- **Message:** ${finding.message}

**Code Context:**
\`\`\`javascript
${finding.code || finding.extra?.lines || 'N/A'}
\`\`\`

**Your Task:**
Provide a clear, concise explanation (2-3 paragraphs max) covering:

1. **What's Wrong:** Explain the vulnerability in simple terms
2. **Real Risk:** What could an attacker actually do with this?
3. **The Fix:** Show a code example of the secure way to write this
4. **Why It Matters:** Connect to business impact (data loss, downtime, reputation)

Format as JSON:
{
  "explanation": "Clear explanation of the issue...",
  "risk": "Business impact and attack scenarios...",
  "remediation": "Step-by-step fix with code example...",
  "businessImpact": "What this means for the business...",
  "estimatedFixTime": "30 min | 1 hour | 2 hours | etc."
}

Keep it professional but friendly. Assume the reader is smart but not a security expert.`;
};

/**
 * Prompt for best practices recommendations based on codebase patterns
 */
const generateBestPracticesPrompt = (codePatterns, findings) => {
  return `You are a senior developer reviewing code for security and quality improvements.

**Codebase Patterns Detected:**
${JSON.stringify(codePatterns, null, 2)}

**Security Findings Summary:**
- Total Issues: ${findings.length}
- Categories: ${[...new Set(findings.map(f => f.category))].join(', ')}

**Task:**
Generate a list of 5-7 actionable best practices specific to THIS codebase. Each should include:

1. **Category:** (API Security, Auth, Error Handling, etc.)
2. **Issue:** What pattern you noticed that needs improvement
3. **Recommendation:** Specific change to make
4. **Impact:** Why this improves security/reliability
5. **Code Example:** Before/After snippet
6. **Priority:** High/Medium/Low

Format as a JSON array:
[
  {
    "category": "API Security",
    "issue": "Missing request timeouts on fetch() calls",
    "recommendation": "Implement AbortController with timeout",
    "impact": "Prevents hung requests and resource exhaustion",
    "example": {
      "before": "fetch(url)",
      "after": "const controller = new AbortController();\\nfetch(url, { signal: controller.signal, timeout: 5000 })"
    },
    "priority": "High"
  }
]

Focus on HIGH-IMPACT, LOW-EFFORT improvements that will actually get implemented.
Avoid generic advice - make it specific to the detected patterns.`;
};

/**
 * Prompt for generating improvement timeline/roadmap
 */
const generateImprovementTimelinePrompt = (findings, metrics) => {
  return `You are a security engineering manager creating a remediation roadmap.

**Current State:**
- Critical Issues: ${metrics.critical}
- High Issues: ${metrics.high}
- Medium Issues: ${metrics.medium}
- Low Issues: ${metrics.low}
- Overall Risk Score: ${metrics.riskScore}/100

**Task:**
Create a realistic, week-by-week improvement plan that a development team can actually follow.

Output as JSON:
{
  "week1-2": {
    "title": "Critical Security Fixes",
    "tasks": [
      {
        "task": "Fix SQL injection in user.js:87",
        "reason": "Critical - could expose entire database",
        "effort": "2 hours",
        "priority": 1
      }
    ],
    "goal": "Eliminate immediate business risks"
  },
  "week3-4": { ... },
  "month2": { ... },
  "ongoing": { ... }
}

Principles:
- Prioritize by risk, not effort
- Bundle related fixes together
- Account for testing time
- Be realistic about velocity
- Include process improvements (CI/CD) in later phases
- Max 3-5 tasks per sprint to avoid overwhelming team`;
};

/**
 * Prompt for OWASP/CWE/compliance mapping
 */
const generateComplianceMappingPrompt = (findings) => {
  return `You are a compliance auditor mapping security findings to industry standards.

**Findings:**
${findings.map(f => `- ${f.check_id}: ${f.message}`).join('\n')}

**Task:**
Map each finding to relevant compliance frameworks:

Output as JSON:
{
  "owasp_top_10_2021": [
    {
      "category": "A03:2021 - Injection",
      "findings": ["sql-injection-check", "command-injection"],
      "description": "Injection flaws occur when untrusted data..."
    }
  ],
  "cwe": [
    {
      "id": "CWE-89",
      "name": "SQL Injection",
      "findings": ["sql-injection-check"]
    }
  ],
  "pci_dss": [
    {
      "requirement": "6.5.1 - Injection Flaws",
      "findings": ["sql-injection-check"],
      "applicable": true
    }
  ]
}

Only include applicable standards. If PCI-DSS doesn't apply (no payment data), omit it.`;
};

module.exports = {
  generateSecurityAuditPrompt,
  generateFindingExplanationPrompt,
  generateBestPracticesPrompt,
  generateImprovementTimelinePrompt,
  generateComplianceMappingPrompt
};
