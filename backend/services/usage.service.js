/**
 * Service to track API usage and costs
 */
class UsageService {
  constructor() {
    // In-memory storage (replace with DB in production)
    this.usageStats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCost: 0,
      requestCount: 0,
      cachedRequestCount: 0,
      lastReset: new Date().toISOString()
    };
  }

  /**
   * Track usage of AI API
   * @param {Object} usage - Usage statistics from AI service
   */
  trackUsage(usage) {
    if (!usage) return;
    
    // Don't count cached responses in token usage
    if (usage.cached) {
      this.usageStats.cachedRequestCount++;
      return;
    }
    
    this.usageStats.totalTokens += usage.totalTokens || 0;
    this.usageStats.promptTokens += usage.promptTokens || 0;
    this.usageStats.completionTokens += usage.completionTokens || 0;
    this.usageStats.totalCost += usage.estimatedCost || 0;
    this.usageStats.requestCount++;
  }

  /**
   * Get current usage statistics
   * @returns {Object} - Usage statistics
   */
  getUsageStats() {
    return {
      ...this.usageStats,
      averageCostPerRequest: this.usageStats.requestCount > 0 
        ? this.usageStats.totalCost / this.usageStats.requestCount 
        : 0,
      savingsFromCache: this.usageStats.cachedRequestCount > 0
        ? this.estimateSavingsFromCache()
        : 0
    };
  }

  /**
   * Estimate cost savings from using cache
   * @returns {number} - Estimated savings in USD
   */
  estimateSavingsFromCache() {
    if (this.usageStats.requestCount === 0) return 0;
    
    const avgCostPerRequest = this.usageStats.totalCost / this.usageStats.requestCount;
    return avgCostPerRequest * this.usageStats.cachedRequestCount;
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats() {
    this.usageStats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCost: 0,
      requestCount: 0,
      cachedRequestCount: 0,
      lastReset: new Date().toISOString()
    };
  }
}

module.exports = new UsageService();