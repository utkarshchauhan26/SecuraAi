const { OpenAI } = require('openai');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');

class AIService {
  constructor() {
    // Initialize OpenAI API
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Initialize cache with TTL (time to live)
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL || 3600),
      checkperiod: 120
    });
  }

  /**
   * Generate an explanation for a vulnerability finding
   * @param {Object} finding - The vulnerability finding from Semgrep
   * @returns {Promise<Object>} - AI explanation with usage stats
   */
  async explainVulnerability(finding) {
    // Create a cache key based on the finding
    const cacheKey = this._createCacheKey(finding);
    
    // Check if we have a cached response
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached AI explanation');
      return {
        ...cachedResponse,
        cached: true
      };
    }

    // Prepare the prompt
    const prompt = this._createPrompt(finding);
    
    try {
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert security consultant explaining vulnerabilities to developers who are not security experts. Provide clear, concise explanations of security issues found in code, why they matter, and how to fix them.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: parseInt(process.env.MAX_TOKENS_PER_REQUEST || 2000),
        temperature: 0.5
      });
      
      // Parse the response
      const explanation = this._parseResponse(completion.choices[0].message.content);
      
      // Calculate token usage and cost estimate
      const usage = {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
        estimatedCost: this._calculateCost(completion.usage.total_tokens)
      };
      
      // Add usage info to the explanation
      const result = { ...explanation, usage };
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      
      // Return a basic explanation if API call fails
      return {
        explanation: 'An error occurred while generating the explanation. Please refer to the rule description for more information.',
        suggestedFix: 'Unable to generate fix suggestion. Please review security best practices for this type of vulnerability.',
        impact: 'Potential security risk.',
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
   * Create a cache key for a finding
   * @param {Object} finding - The vulnerability finding
   * @returns {string} - Cache key
   */
  _createCacheKey(finding) {
    // Create a deterministic key based on finding properties
    return `${finding.rule}_${finding.file}_${finding.line}_${finding.severity}`;
  }

  /**
   * Create a prompt for the OpenAI API
   * @param {Object} finding - The vulnerability finding
   * @returns {string} - Formatted prompt
   */
  _createPrompt(finding) {
    return `
Analyze this potential security vulnerability found in code:

Rule: ${finding.rule}
Severity: ${finding.severity}
File: ${finding.file}
Line: ${finding.line}

Code snippet:
\`\`\`
${finding.snippet}
\`\`\`

Context (code before):
\`\`\`
${finding.context?.before?.join('\n') || 'No context available'}
\`\`\`

Context (code after):
\`\`\`
${finding.context?.after?.join('\n') || 'No context available'}
\`\`\`

Semgrep message: ${finding.message}

Please provide:
1. A clear explanation of this vulnerability in simple terms that a non-security expert would understand
2. Why this vulnerability matters and what could happen if it's exploited
3. A specific code example of how to fix this vulnerability
`;
  }

  /**
   * Parse the response from OpenAI API
   * @param {string} response - The raw response text
   * @returns {Object} - Structured explanation
   */
  _parseResponse(response) {
    // Default structure
    const result = {
      explanation: '',
      suggestedFix: '',
      impact: ''
    };
    
    // Try to extract structured information from the response
    const explanationMatch = response.match(/explanation:?\s*(.*?)(?=impact|suggested fix|$)/is);
    const impactMatch = response.match(/impact:?\s*(.*?)(?=explanation|suggested fix|$)/is);
    const fixMatch = response.match(/(?:suggested fix|how to fix):?\s*(.*?)(?=impact|explanation|$)/is);
    
    // Extract code blocks for the fix
    const codeBlockMatch = response.match(/```(?:.*?)?\n([\s\S]*?)```/);
    
    if (explanationMatch && explanationMatch[1]) {
      result.explanation = explanationMatch[1].trim();
    } else {
      result.explanation = response.split('\n').slice(0, 3).join('\n').trim();
    }
    
    if (impactMatch && impactMatch[1]) {
      result.impact = impactMatch[1].trim();
    }
    
    if (fixMatch && fixMatch[1]) {
      result.suggestedFix = fixMatch[1].trim();
    }
    
    // If we found a code block, use that as the suggested fix
    if (codeBlockMatch && codeBlockMatch[1]) {
      result.suggestedFix = codeBlockMatch[1].trim();
    }
    
    return result;
  }

  /**
   * Calculate estimated cost for token usage
   * @param {number} tokens - Total tokens used
   * @returns {number} - Estimated cost in USD
   */
  _calculateCost(tokens) {
    // GPT-3.5 Turbo pricing (as of my knowledge, may need updating)
    const costPer1kTokens = 0.002;
    return (tokens / 1000) * costPer1kTokens;
  }
}

module.exports = new AIService();