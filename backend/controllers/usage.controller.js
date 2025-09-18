const usageService = require('../services/usage.service');

/**
 * Get API usage statistics
 */
const getUsageStats = (req, res) => {
  try {
    const stats = usageService.getUsageStats();
    
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error in getUsageStats:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving usage statistics'
    });
  }
};

module.exports = {
  getUsageStats
};