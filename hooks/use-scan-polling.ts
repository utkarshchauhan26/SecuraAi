"use client"

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api-client'

interface ScanStatus {
  id: string
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
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

      // Use status endpoint which now has all progress data
      const response = await apiClient.get<ApiResponse<any>>(`/scans/status/${scanId}`);
      
      if (!mountedRef.current) return

      if (response.success && response.data) {
        const rawData = response.data;
        
        console.log('📡 Raw scan data from backend:', rawData);
        
        // Map backend response to ScanStatus interface
        const status: ScanStatus = {
          id: rawData.id,
          status: rawData.status, // Already uppercase from backend
          progress: rawData.progress,
          file_count: rawData.file_count,
          findings_count: rawData.findings_count,
          current_file: rawData.current_file,
          processed_files: rawData.processed_files,
          started_at: rawData.started_at,
          finished_at: rawData.finished_at,
          elapsed_time: rawData.elapsed_time,
          estimated_remaining: rawData.estimated_remaining
        };
        
        console.log('� Mapped scan status:', {
          id: status.id?.substring(0, 8),
          status: status.status,
          progress: status.progress,
          findings: status.findings_count
        });
        
        setScanStatus(status)

        // Stop polling if scan is complete or failed
        if (status.status === 'COMPLETED') {
          console.log('✅ Scan COMPLETED - stopping polling');
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          onComplete?.(status)
        } else if (status.status === 'FAILED') {
          console.log('❌ Scan FAILED - stopping polling');
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          const errorMsg = status.error || 'Scan failed'
          setError(errorMsg)
          onError?.(errorMsg)
        } else {
          console.log(`⏳ Scan in progress: ${status.status} (${status.progress}%)`);
        }
      } else {
        throw new Error(response.message || 'Failed to fetch scan status')
      }
    } catch (err) {
      if (!mountedRef.current) return
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Polling error:', errorMessage);
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