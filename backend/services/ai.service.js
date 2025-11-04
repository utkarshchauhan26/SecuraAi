const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const prisma = require('../lib/prisma');

class AIService {
  constructor() {
    // Initialize Google Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set. AI explanations will be disabled.');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use gemini-1.5-flash-latest for v1beta API compatibility
      this.model = this.genAI.getGenerativeModel({ 
        model: process.env.AI_MODEL || 'gemini-1.5-flash-latest'
      });
    }
    
    // Initialize cache with TTL (time to live)
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL || 3600),
      checkperiod: 120
    });
  }

  /**
   * Generate an explanation for a vulnerability finding
   * @param {string} userId - User ID for budget tracking
   * @param {Object} finding - The vulnerability finding
   * @returns {Promise<Object>} - AI explanation with usage stats
   */
  async explainVulnerability(userId, finding) {
    if (!this.genAI) {
      return {
        summary: 'AI explanations are currently unavailable. Please configure GEMINI_API_KEY.',
        whyItMatters: '',
        fixSteps: '',
        bestPractices: '',
        preventionTips: '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 }
      };
    }

    // Create cache key based on code snippet and rule
    const cacheKey = this._createCacheKey(finding.codeSnippet, finding.ruleId);
    
    // Check database cache first
    const cachedExplanation = await this._getCachedExplanation(cacheKey, finding.id);
    if (cachedExplanation) {
      console.log('Using cached AI explanation from database');
      return cachedExplanation;
    }

    // Check in-memory cache
    const memoryCached = this.cache.get(cacheKey);
    if (memoryCached) {
      console.log('Using cached AI explanation from memory');
      return { ...memoryCached, cached: true };
    }

    // Check user's daily budget before making API call
    if (userId) {
      await this._ensureBudget(userId, 30); // Estimate ~30 cents per explanation
    }

    // Prepare the prompt
    const prompt = this._createPrompt(finding);
    
    try {
      // Call Gemini API
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the response into structured sections
      const explanation = this._parseResponse(text);
      
      // Estimate token usage (Gemini doesn't provide exact counts like OpenAI)
      const estimatedPromptTokens = Math.ceil(prompt.length / 4);
      const estimatedCompletionTokens = Math.ceil(text.length / 4);
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;
      
      // Calculate cost (Gemini is free for now, but track for future)
      const costCents = this._calculateCost(totalTokens);
      
      const usage = {
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens: totalTokens,
        estimatedCost: costCents,
        model: process.env.AI_MODEL || 'gemini-1.5-flash-latest'
      };
      
      const fullResponse = { 
        ...explanation, 
        usage,
        cachedKey: cacheKey
      };
      
      // Cache in memory
      this.cache.set(cacheKey, fullResponse);
      
      // Store in database if we have a finding ID
      if (finding.id && userId) {
        await this._storeExplanation(finding.id, fullResponse, userId, costCents);
      }
      
      return fullResponse;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      // Return a basic explanation if API call fails
      return {
        summary: 'An error occurred while generating the AI explanation.',
        whyItMatters: 'Please refer to the rule description for more information.',
        fixSteps: 'Unable to generate fix suggestion at this time.',
        bestPractices: 'Please review security best practices for this type of vulnerability.',
        preventionTips: '',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          error: error.message
        }
      };
    }
  }

  /**
   * Create a cache key based on code snippet and rule
   */
  _createCacheKey(codeSnippet, ruleId) {
    const content = `${ruleId}::${codeSnippet || ''}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get cached explanation from database
   */
  async _getCachedExplanation(cacheKey, findingId) {
    try {
      const cached = await prisma.explanation.findFirst({
        where: { 
          OR: [
            { cachedKey: cacheKey },
            { findingId: findingId }
          ]
        }
      });
      
      if (cached) {
        return {
          summary: cached.summary,
          whyItMatters: cached.whyItMatters,
          fixSteps: cached.fixSteps,
          bestPractices: cached.bestPractices,
          preventionTips: cached.preventionTips,
          usage: {
            promptTokens: cached.promptTokens,
            completionTokens: cached.completionTokens,
            totalTokens: cached.promptTokens + cached.completionTokens,
            estimatedCost: cached.costCents,
            model: cached.model
          },
          cached: true
        };
      }
    } catch (error) {
      console.error('Error fetching cached explanation:', error);
    }
    return null;
  }

  /**
   * Store explanation in database
   */
  async _storeExplanation(findingId, explanation, userId, costCents) {
    try {
      await prisma.explanation.create({
        data: {
          findingId: findingId,
          summary: explanation.summary || '',
          whyItMatters: explanation.whyItMatters || '',
          fixSteps: explanation.fixSteps || '',
          bestPractices: explanation.bestPractices || '',
          preventionTips: explanation.preventionTips || '',
          cachedKey: explanation.cachedKey,
          model: explanation.usage.model,
          promptTokens: explanation.usage.promptTokens,
          completionTokens: explanation.usage.completionTokens,
          costCents: costCents
        }
      });

      // Track usage event
      if (userId) {
        await prisma.usageEvent.create({
          data: {
            userId: userId,
            eventType: 'openai',
            metadata: { 
              model: explanation.usage.model,
              findingId: findingId 
            },
            costCents: costCents
          }
        });
      }
    } catch (error) {
      console.error('Error storing explanation:', error);
    }
  }

  /**
   * Check and enforce daily budget
   */
  async _ensureBudget(userId, estimatedCostCents) {
    try {
      const user = await prisma.userProfile.findUnique({
        where: { id: userId }
      });

      if (!user) return;

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const spent = await prisma.usageEvent.aggregate({
        _sum: { costCents: true },
        where: { 
          userId, 
          eventType: 'openai', 
          createdAt: { gte: since } 
        }
      });

      const totalSpent = spent._sum.costCents || 0;
      if (totalSpent + estimatedCostCents > user.dailyBudgetCents) {
        throw new Error(`Daily AI budget exceeded. Spent: $${(totalSpent/100).toFixed(2)}, Limit: $${(user.dailyBudgetCents/100).toFixed(2)}`);
      }
    } catch (error) {
      if (error.message.includes('Daily AI budget exceeded')) {
        throw error;
      }
      console.error('Error checking budget:', error);
    }
  }

  /**
   * Create a detailed prompt for the AI
   */
  _createPrompt(finding) {
    const codeSnippet = finding.codeSnippet || finding.code || 'No code snippet available';
    
    return `You are a senior security consultant explaining a vulnerability to a developer.

VULNERABILITY DETAILS:
- Rule: ${finding.ruleId || finding.rule}
- Severity: ${finding.severity}
- File: ${finding.filePath || finding.file}:${finding.startLine || finding.line}-${finding.endLine || finding.line}
- Title: ${finding.title || 'Security Issue'}
- Category: ${finding.category || 'Unknown'}

CODE SNIPPET:
${codeSnippet}

MESSAGE:
${finding.message || ''}

Please provide a detailed analysis in the following format:

1. SUMMARY (2-3 sentences)
Explain what the vulnerability is in plain English.

2. WHY IT MATTERS (2-3 sentences)
Explain the real-world security impact and potential attacks.

3. FIX STEPS (numbered list with code examples)
Provide concrete steps to fix this issue with code snippets.

4. BEST PRACTICES (3-5 bullet points)
Language-specific security best practices to prevent this in the future.

5. PREVENTION TIPS (3-5 bullet points)
Development practices, code review checklist items, and tools to prevent this vulnerability class.

Keep explanations practical, actionable, and avoid security jargon where possible.`;
  }

  /**
   * Parse the AI response into structured sections
   */
  _parseResponse(text) {
    const sections = {
      summary: '',
      whyItMatters: '',
      fixSteps: '',
      bestPractices: '',
      preventionTips: ''
    };

    // Try to extract numbered sections
    const summaryMatch = text.match(/1\.\s*SUMMARY[\s\S]*?\n([\s\S]*?)(?=\n2\.|$)/i);
    const whyMatch = text.match(/2\.\s*WHY IT MATTERS[\s\S]*?\n([\s\S]*?)(?=\n3\.|$)/i);
    const fixMatch = text.match(/3\.\s*FIX STEPS[\s\S]*?\n([\s\S]*?)(?=\n4\.|$)/i);
    const practicesMatch = text.match(/4\.\s*BEST PRACTICES[\s\S]*?\n([\s\S]*?)(?=\n5\.|$)/i);
    const preventionMatch = text.match(/5\.\s*PREVENTION TIPS[\s\S]*?\n([\s\S]*?)$/i);

    if (summaryMatch) sections.summary = summaryMatch[1].trim();
    if (whyMatch) sections.whyItMatters = whyMatch[1].trim();
    if (fixMatch) sections.fixSteps = fixMatch[1].trim();
    if (practicesMatch) sections.bestPractices = practicesMatch[1].trim();
    if (preventionMatch) sections.preventionTips = preventionMatch[1].trim();

    // If structured parsing failed, use the whole response as summary
    if (!sections.summary) {
      sections.summary = text.substring(0, 500);
    }

    return sections;
  }

  /**
   * Calculate estimated cost (Gemini is free, but track for future)
   */
  _calculateCost(tokens) {
    // Gemini Flash is currently free
    // Future pricing might be similar to: $0.35 per 1M input tokens, $1.05 per 1M output
    // For now, return 0
    return 0;
  }

  /**
   * Generate AI-powered project summary and recommendations
   * @param {Object} scan - Scan data
   * @param {Array} findings - Vulnerability findings
   * @param {Object} scores - Smart Score and EU AI Code Score
   * @returns {Promise<Object>} - Project summary with recommendations
   */
  async generateProjectSummary(scan, findings = [], scores = null) {
    if (!this.genAI) {
      return {
        summary: 'The overall codebase appears to be well-structured. AI-powered analysis is currently unavailable.',
        strengths: ['Project structure is organized', 'Code follows common patterns'],
        gaps: ['Enable AI analysis for deeper insights'],
        recommendations: [
          'Continue regular security scanning',
          'Implement automated testing',
          'Add comprehensive documentation',
          'Review security best practices',
          'Conduct periodic code reviews'
        ],
        cached: false
      };
    }

    // Create cache key
    const cacheKey = this._createCacheKey(
      `project_${scan.id}_${findings.length}`,
      'project_summary'
    );

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Using cached project summary');
      return { ...cached, cached: true };
    }

    // Build comprehensive prompt
    const prompt = this._createProjectSummaryPrompt(scan, findings, scores);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const summary = this._parseProjectSummary(text);
      
      // Cache for 1 hour
      this.cache.set(cacheKey, summary, 3600);

      return { ...summary, cached: false };
    } catch (error) {
      console.error('Error generating project summary:', error);
      return {
        summary: 'Error generating AI summary. The project has been scanned successfully.',
        strengths: ['Security scan completed'],
        gaps: ['AI analysis unavailable'],
        recommendations: [
          'Review all identified vulnerabilities',
          'Fix critical and high-severity issues first',
          'Implement security best practices',
          'Add automated security scanning to CI/CD',
          'Maintain regular security audits'
        ],
        cached: false,
        error: error.message
      };
    }
  }

  /**
   * Create comprehensive prompt for project summary
   */
  _createProjectSummaryPrompt(scan, findings, scores) {
    const projectName = scan.project?.name || 'Project';
    const filesScanned = scan.files_scanned || scan.filesScanned || 0;
    const linesScanned = scan.lines_scanned || scan.linesScanned || 0;
    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = findings.filter(f => f.severity === 'LOW').length;

    const smartScore = scores?.smartScore?.score || 'N/A';
    const euScore = scores?.euAIScore?.score || 'N/A';

    return `You are an expert software security architect and AI code reviewer. Analyze this project and provide a comprehensive, professional assessment.

**PROJECT OVERVIEW**
- Name: ${projectName}
- Files Scanned: ${filesScanned}
- Lines of Code: ${linesScanned}
- Vulnerabilities Found: ${findings.length}
  - Critical: ${criticalCount}
  - High: ${highCount}
  - Medium: ${mediumCount}
  - Low: ${lowCount}
- SecuraAI Smart Score™: ${smartScore}/100
- Europe AI Code Score: ${euScore}/100

**YOUR TASK**
Provide a professional, balanced assessment of this codebase in the following format:

1. OVERALL ASSESSMENT (2-3 sentences)
Write a clear, professional summary of the codebase quality. Be encouraging if security is good, constructive if issues exist.

2. KEY STRENGTHS (3-4 points)
List what the project does well (e.g., "Good separation of concerns", "Excellent modularity and naming conventions", "Well-documented API endpoints").

3. AREAS FOR IMPROVEMENT (2-3 points)
Identify gaps (e.g., "Missing input validation in 3 endpoints", "Hardcoded credentials detected", "Improve error handling").

4. TOP 5 RECOMMENDATIONS (prioritized action items)
Provide specific, actionable recommendations such as:
- "Add structured logging using Winston or Pino"
- "Improve .env variable validation and documentation"
- "Implement AI ethics checklist for model training"
- "Add CHANGELOG.md with data usage summary"
- "Run weekly automated security scans"

Keep your tone professional, educational, and supportive. Focus on practical advice that helps developers improve security and code quality.

**RESPONSE FORMAT**
Return your response in this exact format:

ASSESSMENT:
[Your 2-3 sentence assessment]

STRENGTHS:
- [Strength 1]
- [Strength 2]
- [Strength 3]

GAPS:
- [Gap 1]
- [Gap 2]
- [Gap 3]

RECOMMENDATIONS:
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]
4. [Recommendation 4]
5. [Recommendation 5]`;
  }

  /**
   * Parse Gemini's project summary response
   */
  _parseProjectSummary(text) {
    const result = {
      summary: '',
      strengths: [],
      gaps: [],
      recommendations: []
    };

    // Extract assessment
    const assessmentMatch = text.match(/ASSESSMENT:\s*([\s\S]*?)(?=STRENGTHS:|$)/i);
    if (assessmentMatch) {
      result.summary = assessmentMatch[1].trim().replace(/\n+/g, ' ');
    }

    // Extract strengths
    const strengthsMatch = text.match(/STRENGTHS:\s*([\s\S]*?)(?=GAPS:|$)/i);
    if (strengthsMatch) {
      result.strengths = strengthsMatch[1]
        .split(/\n/)
        .map(line => line.replace(/^[\s\-\*]+/, '').trim())
        .filter(line => line.length > 0);
    }

    // Extract gaps
    const gapsMatch = text.match(/GAPS:\s*([\s\S]*?)(?=RECOMMENDATIONS:|$)/i);
    if (gapsMatch) {
      result.gaps = gapsMatch[1]
        .split(/\n/)
        .map(line => line.replace(/^[\s\-\*]+/, '').trim())
        .filter(line => line.length > 0);
    }

    // Extract recommendations
    const recsMatch = text.match(/RECOMMENDATIONS:\s*([\s\S]*?)$/i);
    if (recsMatch) {
      result.recommendations = recsMatch[1]
        .split(/\n/)
        .map(line => line.replace(/^[\s\d\.\-\*]+/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5); // Top 5
    }

    // Fallback if parsing failed
    if (!result.summary) {
      result.summary = 'The overall codebase demonstrates good structure and organization. Minor security improvements recommended.';
    }
    if (result.strengths.length === 0) {
      result.strengths = ['Code organization is clear', 'Project structure follows best practices'];
    }
    if (result.gaps.length === 0) {
      result.gaps = ['Some security vulnerabilities detected', 'Documentation could be improved'];
    }
    if (result.recommendations.length === 0) {
      result.recommendations = [
        'Address all critical and high-severity vulnerabilities',
        'Add comprehensive unit tests',
        'Implement structured logging',
        'Document all API endpoints',
        'Set up automated security scanning in CI/CD'
      ];
    }

    return result;
  }
}

module.exports = new AIService();
