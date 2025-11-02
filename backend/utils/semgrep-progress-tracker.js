const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class SemgrepProgressTracker extends EventEmitter {
  constructor() {
    super();
    this.scans = new Map(); // Store scan progress by scanId
  }

  startScan(scanId, totalFiles) {
    const scanProgress = {
      scanId,
      totalFiles,
      processedFiles: 0,
      currentFile: null,
      startTime: Date.now(),
      stage: 'initializing',
      findings: []
    };

    this.scans.set(scanId, scanProgress);
    this.emit('progress', scanId, this.getProgress(scanId));
  }

  updateProgress(scanId, stage, data = {}) {
    const scan = this.scans.get(scanId);
    if (!scan) return;

    scan.stage = stage;
    
    switch (stage) {
      case 'counting_files':
        scan.totalFiles = data.count || scan.totalFiles;
        break;
        
      case 'scanning_file':
        scan.currentFile = data.filename;
        scan.processedFiles = data.index || scan.processedFiles;
        break;
        
      case 'processing_results':
        scan.findings = data.findings || scan.findings;
        break;
        
      case 'completed':
      case 'failed':
        scan.endTime = Date.now();
        break;
    }

    this.emit('progress', scanId, this.getProgress(scanId));
  }

  getProgress(scanId) {
    const scan = this.scans.get(scanId);
    if (!scan) return null;

    const elapsed = Date.now() - scan.startTime;
    const percentage = scan.totalFiles > 0 
      ? Math.min(95, (scan.processedFiles / scan.totalFiles) * 90) // Cap at 95% until completion
      : this.getStageProgress(scan.stage);

    return {
      scanId,
      percentage: Math.round(percentage),
      stage: scan.stage,
      processedFiles: scan.processedFiles,
      totalFiles: scan.totalFiles,
      currentFile: scan.currentFile,
      elapsed,
      findingsCount: scan.findings?.length || 0,
      estimatedTimeRemaining: this.estimateTimeRemaining(scan)
    };
  }

  getStageProgress(stage) {
    const stageProgress = {
      'initializing': 5,
      'counting_files': 10,
      'scanning_file': 50,
      'processing_results': 85,
      'completed': 100,
      'failed': 0
    };
    return stageProgress[stage] || 25;
  }

  estimateTimeRemaining(scan) {
    if (scan.processedFiles === 0) return null;
    
    const elapsed = Date.now() - scan.startTime;
    const avgTimePerFile = elapsed / scan.processedFiles;
    const remaining = scan.totalFiles - scan.processedFiles;
    
    return remaining > 0 ? remaining * avgTimePerFile : 0;
  }

  completeScan(scanId, results) {
    this.updateProgress(scanId, 'completed', { findings: results });
    
    // Keep scan data for a while, then clean up
    setTimeout(() => {
      this.scans.delete(scanId);
    }, 5 * 60 * 1000); // Clean up after 5 minutes
  }

  failScan(scanId, error) {
    this.updateProgress(scanId, 'failed', { error: error.message });
  }
}

// Singleton instance
const progressTracker = new SemgrepProgressTracker();

module.exports = progressTracker;