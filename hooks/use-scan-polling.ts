"use client"

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api-client'

interface ScanStatus {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  progress?: number
  error?: string
  filename?: string
  started_at?: string
  finished_at?: string
  file_count?: number
  findings_count?: number
  current_file?: string
  processed_files?: number
  elapsed_time?: number
  estimated_remaining?: number
}

interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
}

interface UseScanPollingOptions {
  scanId: string | null
  enabled?: boolean
  interval?: number
  onComplete?: (scan: ScanStatus) => void
  onError?: (error: string) => void
}

export function useScanPolling({
  scanId,
  enabled = true,
  interval = 2000, // 2 seconds
  onComplete,
  onError
}: UseScanPollingOptions) {
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const pollStatus = async () => {
    if (!scanId || !enabled || !mountedRef.current) return

    try {
      setLoading(true)
      setError(null)

      // Try progress endpoint first for active scans, fallback to status
      let response;
      try {
        response = await apiClient.get<ApiResponse<any>>(`/scans/progress/${scanId}`);
        
        // If progress data exists, transform it to ScanStatus format
        if (response.success && response.data) {
          const progressData = response.data;
          response.data = {
            id: progressData.scanId,
            status: progressData.stage === 'completed' ? 'COMPLETED' : 
                   progressData.stage === 'failed' ? 'FAILED' : 'RUNNING',
            progress: progressData.percentage,
            file_count: progressData.totalFiles,
            findings_count: progressData.findingsCount,
            current_file: progressData.currentFile,
            processed_files: progressData.processedFiles,
            elapsed_time: progressData.elapsed,
            estimated_remaining: progressData.estimatedTimeRemaining
          } as ScanStatus;
        }
      } catch (progressError) {
        // Fallback to regular status endpoint
        response = await apiClient.get<ApiResponse<ScanStatus>>(`/scans/status/${scanId}`);
      }
      
      if (!mountedRef.current) return

      if (response.success && response.data) {
        const status = response.data
        setScanStatus(status)

        // Stop polling if scan is complete
        if (status.status === 'COMPLETED') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          onComplete?.(status)
        } else if (status.status === 'FAILED') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          const errorMsg = status.error || 'Scan failed'
          setError(errorMsg)
          onError?.(errorMsg)
        }
      } else {
        throw new Error(response.message || 'Failed to fetch scan status')
      }
    } catch (err) {
      if (!mountedRef.current) return
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      onError?.(errorMessage)
      
      // Stop polling on error
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Start/stop polling based on scanId and enabled state
  useEffect(() => {
    if (scanId && enabled && !intervalRef.current) {
      // Initial poll
      pollStatus()
      
      // Start interval polling
      intervalRef.current = setInterval(pollStatus, interval)
    } else if ((!scanId || !enabled) && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [scanId, enabled, interval])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const restartPolling = () => {
    if (scanId && enabled) {
      stopPolling()
      pollStatus()
      intervalRef.current = setInterval(pollStatus, interval)
    }
  }

  return {
    scanStatus,
    loading,
    error,
    stopPolling,
    restartPolling,
    isPolling: intervalRef.current !== null
  }
}

export type { ScanStatus, UseScanPollingOptions }