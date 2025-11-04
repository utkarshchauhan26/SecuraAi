/**
 * Progress Tracker Service
 * Manages real-time progress tracking for scan operations
 * 
 * ⚠️ NOTE: This is only used for LOCAL scans (not GitHub Actions)
 * For GitHub Actions scans, progress is tracked directly in Supabase.
 * See: scan-controller-github-actions.js
 */

class ProgressTracker {
  constructor() {
    // In-memory storage for scan progress (use Redis in production)
    this.scanProgress = new Map();
  }

  /**
   * Initialize progress tracking for a new scan
   */
  startScan(scanId, totalFiles = 0) {
    this.scanProgress.set(scanId, {
      scanId,
      status: 'initializing',
      totalFiles,
      processedFiles: 0,
      currentFile: null,
      stage: 'preparing',
      percentage: 0,
      startedAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`📊 Progress tracking started for scan ${scanId} (${totalFiles} files)`);
  }

  /**
   * Update scan progress
   */
  updateProgress(scanId, stage, data = {}) {
    const progress = this.scanProgress.get(scanId);
    if (!progress) {
      console.warn(`⚠️ No progress tracking found for scan ${scanId}`);
      return;
    }

    let percentage = progress.percentage;
    
    // Calculate percentage based on stage and data
    switch (stage) {
      case 'cloning':
        percentage = 5;
        break;
      case 'counting_files':
        percentage = 10;
        break;
      case 'extracting':
        percentage = 15;
        break;
      case 'scanning_file':
        if (data.index && progress.totalFiles > 0) {
          percentage = Math.min(20 + (data.index / progress.totalFiles) * 65, 85);
        }
        break;
      case 'analyzing_results':
        percentage = 90;
        break;
      case 'completed':
        percentage = 100;
        break;
      case 'failed':
        percentage = progress.percentage; // Keep current percentage
        break;
    }

    // Update progress
    const updatedProgress = {
      ...progress,
      stage,
      percentage: Math.round(percentage),
      processedFiles: data.index || progress.processedFiles,
      currentFile: data.filename || progress.currentFile,
      updatedAt: new Date(),
      ...data
    };

    this.scanProgress.set(scanId, updatedProgress);
    
    // Log progress updates (can be sent via WebSocket in production)
    if (stage === 'scanning_file') {
      console.log(`📈 Scan ${scanId}: ${percentage.toFixed(1)}% (${data.index}/${progress.totalFiles}) - ${data.filename || 'Processing...'}`);
    } else if (stage === 'cloning') {
      console.log(`📈 Scan ${scanId}: Cloning repository - ${percentage}%`);
    } else {
      console.log(`📈 Scan ${scanId}: ${stage} - ${percentage}%`);
    }
  }

  /**
   * Get current progress for a scan
   */
  getProgress(scanId) {
    return this.scanProgress.get(scanId) || null;
  }

  /**
   * Mark scan as completed
   */
  completeScan(scanId, results = {}) {
    const progress = this.scanProgress.get(scanId);
    if (!progress) {
      console.warn(`⚠️ No progress tracking found for scan ${scanId}`);
      return;
    }

    const completedProgress = {
      ...progress,
      stage: 'completed',
      percentage: 100,
      finishedAt: new Date(),
      updatedAt: new Date(),
      results
    };

    this.scanProgress.set(scanId, completedProgress);
    console.log(`✅ Scan ${scanId} completed successfully`);
    
    // Clean up after 1 hour to prevent memory leaks
    setTimeout(() => {
      this.cleanupScan(scanId);
    }, 60 * 60 * 1000);
  }

  /**
   * Mark scan as failed
   */
  failScan(scanId, error) {
    const progress = this.scanProgress.get(scanId);
    if (!progress) {
      console.warn(`⚠️ No progress tracking found for scan ${scanId}`);
      return;
    }

    const failedProgress = {
      ...progress,
      stage: 'failed',
      error: error.message || 'Unknown error',
      finishedAt: new Date(),
      updatedAt: new Date()
    };

    this.scanProgress.set(scanId, failedProgress);
    console.log(`❌ Scan ${scanId} failed:`, error.message);
    
    // Clean up after 10 minutes for failed scans
    setTimeout(() => {
      this.cleanupScan(scanId);
    }, 10 * 60 * 1000);
  }

  /**
   * Clean up scan progress data
   */
  cleanupScan(scanId) {
    if (this.scanProgress.delete(scanId)) {
      console.log(`🧹 Cleaned up progress data for scan ${scanId}`);
    }
  }

  /**
   * Get all active scans
   */
  getActiveScans() {
    const activeScans = [];
    for (const [scanId, progress] of this.scanProgress.entries()) {
      if (progress.stage !== 'completed' && progress.stage !== 'failed') {
        activeScans.push(progress);
      }
    }
    return activeScans;
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.scanProgress.size;
    const active = this.getActiveScans().length;
    const completed = Array.from(this.scanProgress.values()).filter(p => p.stage === 'completed').length;
    const failed = Array.from(this.scanProgress.values()).filter(p => p.stage === 'failed').length;

    return { total, active, completed, failed };
  }
}

// Export singleton instance
module.exports = new ProgressTracker();