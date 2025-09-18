/**
 * Service for calculating security scores based on vulnerability findings
 */
class ScoringService {
  /**
   * Calculate a security score based on vulnerability findings
   * @param {Array} findings - The vulnerability findings
   * @returns {number} - Security score (0-100, higher is better)
   */
  calculateScore(findings) {
    if (!findings || findings.length === 0) {
      return 100; // Perfect score if no findings
    }
    
    // Count findings by severity
    const highCount = findings.filter(f => f.severity === 'high').length;
    const mediumCount = findings.filter(f => f.severity === 'medium').length;
    const lowCount = findings.filter(f => f.severity === 'low').length;
    
    // Weights for different severity levels
    const highWeight = 10;
    const mediumWeight = 5;
    const lowWeight = 1;
    
    // Calculate weighted score
    const totalWeight = highCount * highWeight + mediumCount * mediumWeight + lowCount * lowWeight;
    
    // Convert to a score from 0-100 (higher is better)
    // This formula creates a non-linear curve that drops quickly with high severity issues
    const baseScore = 100;
    const weightMultiplier = 3; // Controls how quickly the score drops
    
    const score = baseScore - (totalWeight * weightMultiplier);
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Get a risk level based on the security score
   * @param {number} score - The security score (0-100)
   * @returns {string} - Risk level (critical, high, medium, low, secure)
   */
  getRiskLevel(score) {
    if (score < 40) return 'critical';
    if (score < 60) return 'high';
    if (score < 80) return 'medium';
    if (score < 95) return 'low';
    return 'secure';
  }
  
  /**
   * Get score trend information (comparing to a previous score)
   * @param {number} currentScore - Current security score
   * @param {number} previousScore - Previous security score
   * @returns {Object} - Trend information
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
}

module.exports = new ScoringService();