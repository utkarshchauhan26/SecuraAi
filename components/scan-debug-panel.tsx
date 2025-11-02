"use client"

import { useScanContext } from "@/contexts/scan-context"
import { motion } from "framer-motion"
import { useState } from "react"
import { ChevronDown, ChevronUp, Play } from "lucide-react"
import { usePathname } from "next/navigation"

export function ScanDebugPanel() {
  const { currentScanId, scanStatus, isScanning, scanError, startScan } = useScanContext()
  const [isExpanded, setIsExpanded] = useState(true)
  const pathname = usePathname()

  // Only show in development mode AND on dashboard pages
  if (process.env.NODE_ENV !== 'development') return null
  if (!pathname?.startsWith('/dashboard')) return null

  const getStatusColor = () => {
    if (scanError) return 'text-red-400'
    if (!scanStatus) return 'text-yellow-400'
    
    switch (scanStatus.status) {
      case 'COMPLETED':
        return 'text-green-400'
      case 'FAILED':
        return 'text-red-400'
      case 'RUNNING':
        return 'text-blue-400'
      case 'PENDING':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  const formatDuration = (started_at?: string, finished_at?: string) => {
    if (!started_at) return 'N/A'
    const start = new Date(started_at).getTime()
    const end = finished_at ? new Date(finished_at).getTime() : Date.now()
    const duration = Math.floor((end - start) / 1000)
    return `${duration}s`
  }

  // Test function to trigger scan manually
  const handleTestScan = () => {
    const testId = `test-scan-${Date.now()}`
    console.log('🧪 Testing scan with ID:', testId)
    startScan(testId)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-4 right-4 z-[100] max-w-sm"
    >
      <div className="bg-black/95 backdrop-blur-md text-white rounded-lg shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-white/10 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: isScanning ? 360 : 0 }}
              transition={{ duration: 2, repeat: isScanning ? Infinity : 0, ease: "linear" }}
            >
              🔍
            </motion.div>
            <span className="font-bold text-sm">Scan Debug</span>
            {isScanning && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
            )}
          </div>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>

        {/* Content */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 font-mono text-xs">
              {/* Scan ID */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-400 flex-shrink-0">ID:</span>
                <span className="text-white font-semibold text-right break-all">
                  {currentScanId ? `${currentScanId.substring(0, 16)}...` : 'none'}
                </span>
              </div>

              {/* Scanning Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Scanning:</span>
                <span className={`font-bold ${isScanning ? 'text-blue-400' : 'text-gray-500'}`}>
                  {isScanning ? '✓ Yes' : '✗ No'}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`font-bold ${getStatusColor()}`}>
                  {scanStatus?.status || 'none'}
                </span>
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Progress:</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${scanStatus?.progress || 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-blue-400 font-bold w-10 text-right">
                    {scanStatus?.progress || 0}%
                  </span>
                </div>
              </div>

              {/* Files */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Files:</span>
                <span className="text-white font-semibold">
                  {scanStatus?.processed_files || 0}/{scanStatus?.file_count || 0}
                </span>
              </div>

              {/* Findings */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Findings:</span>
                <span className={`font-bold ${
                  (scanStatus?.findings_count || 0) > 0 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {scanStatus?.findings_count || 0}
                </span>
              </div>

              {/* Current File */}
              {scanStatus?.current_file && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Current:</span>
                  <span className="text-blue-300 text-right break-all text-[10px]">
                    {scanStatus.current_file.split('/').pop()}
                  </span>
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Duration:</span>
                <span className="text-white font-semibold">
                  {formatDuration(scanStatus?.started_at, scanStatus?.finished_at)}
                </span>
              </div>

              {/* Estimated Time */}
              {scanStatus?.estimated_remaining !== undefined && scanStatus.estimated_remaining > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Est. Remaining:</span>
                  <span className="text-purple-400 font-semibold">
                    ~{Math.ceil(scanStatus.estimated_remaining / 1000)}s
                  </span>
                </div>
              )}

              {/* Error */}
              {scanError && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                  <div className="text-red-400 font-bold text-[10px] mb-1">ERROR:</div>
                  <div className="text-red-300 text-[10px] break-words">
                    {scanError}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="pt-2 border-t border-white/10 text-[10px] text-gray-500 text-center">
                Last Update: {new Date().toLocaleTimeString()}
              </div>

              {/* Test Button */}
              <button
                onClick={handleTestScan}
                className="w-full mt-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-xs font-semibold text-purple-300 flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="h-3 w-3" />
                Test Progress Bar
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}