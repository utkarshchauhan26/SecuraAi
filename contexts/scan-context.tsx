"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useScanPolling, type ScanStatus } from '@/hooks/use-scan-polling'

interface ScanContextType {
  currentScanId: string | null
  scanStatus: ScanStatus | null
  isScanning: boolean
  scanError: string | null
  startScan: (scanId: string) => void
  clearScan: () => void
  resetError: () => void
}

const ScanContext = createContext<ScanContextType | undefined>(undefined)

interface ScanProviderProps {
  children: React.ReactNode
}

export function ScanProvider({ children }: ScanProviderProps) {
  const [currentScanId, setCurrentScanId] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const { scanStatus, loading, error } = useScanPolling({
    scanId: currentScanId,
    enabled: !!currentScanId,
    interval: 2000,
    onComplete: (scan) => {
      console.log('✅ Scan completed globally:', scan)
      setIsScanning(false)
    },
    onError: (error) => {
      console.error('❌ Scan error globally:', error)
      setScanError(error)
      setIsScanning(false)
    }
  })

  // Sync error states
  useEffect(() => {
    if (error) {
      setScanError(error)
    }
  }, [error])

  // Auto-detect scanning state
  useEffect(() => {
    if (scanStatus) {
      const scanning = scanStatus.status === 'PENDING' || scanStatus.status === 'RUNNING'
      setIsScanning(scanning)
    }
  }, [scanStatus])

  const startScan = (scanId: string) => {
    console.log('🚀 ========= STARTING SCAN =========')
    console.log('🚀 Scan ID:', scanId)
    console.log('🔍 Previous state:', { currentScanId, isScanning, scanError })
    setCurrentScanId(scanId)
    setIsScanning(true)
    setScanError(null)
    console.log('✅ Scan state updated!')
    console.log('✅ New state will be:', { currentScanId: scanId, isScanning: true, scanError: null })
    console.log('🔍 Progress bar should appear now!')
    console.log('🚀 ===================================')
  }

  const clearScan = () => {
    console.log('🗑️ Clearing global scan')
    setCurrentScanId(null)
    setIsScanning(false)
    setScanError(null)
  }

  const resetError = () => {
    setScanError(null)
  }

  const value: ScanContextType = {
    currentScanId,
    scanStatus,
    isScanning,
    scanError,
    startScan,
    clearScan,
    resetError
  }

  return (
    <ScanContext.Provider value={value}>
      {children}
    </ScanContext.Provider>
  )
}

export function useScanContext() {
  const context = useContext(ScanContext)
  if (context === undefined) {
    throw new Error('useScanContext must be used within a ScanProvider')
  }
  return context
}

export type { ScanContextType }