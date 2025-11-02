"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Clock, Loader2, XCircle, X, Eye, Shield, FileSearch, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useScanContext } from "@/contexts/scan-context"
import { formatDistanceToNow } from "date-fns"
import { useState, useEffect } from "react"
import Link from "next/link"

export function GlobalScanProgress() {
  const { currentScanId, scanStatus, isScanning, scanError, clearScan } = useScanContext()
  const [isMinimized, setIsMinimized] = useState(false)
  const [animatedProgress, setAnimatedProgress] = useState(0)

  // Show if we have a scan ID OR if scanning state is active
  const shouldShow = !!(currentScanId || isScanning)

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS

  // Log when component mounts/unmounts
  useEffect(() => {
    console.log('🎨 GlobalScanProgress MOUNTED')
    return () => console.log('🎨 GlobalScanProgress UNMOUNTED')
  }, [])

  // Smooth progress animation
  useEffect(() => {
    if (!shouldShow) return // Don't run if not showing

    const getProgressValue = () => {
      if (scanError) return 0
      if (!scanStatus) return 15
      if (scanStatus.status === 'COMPLETED') return 100
      if (scanStatus.status === 'FAILED') return 0
      if (scanStatus.status === 'PENDING') return 10
      
      // Use actual progress if available
      if (scanStatus.progress !== undefined) {
        return scanStatus.progress
      }
      
      // Use processed files ratio
      if (scanStatus.processed_files && scanStatus.file_count) {
        return Math.min(95, (scanStatus.processed_files / scanStatus.file_count) * 100)
      }
      
      if (scanStatus.status === 'RUNNING' && scanStatus.started_at) {
        const elapsed = Date.now() - new Date(scanStatus.started_at).getTime()
        const maxTime = 5 * 60 * 1000 // 5 minutes
        return Math.min(85, 15 + (elapsed / maxTime) * 70)
      }
      
      return 30
    }

    const progressValue = getProgressValue()
    
    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        const target = progressValue
        const diff = target - prev
        if (Math.abs(diff) < 0.1) return target
        return prev + diff * 0.1
      })
    }, 50)
    return () => clearInterval(interval)
  }, [shouldShow, scanStatus, scanError])

  // Debug logging
  console.log('🔍 GlobalScanProgress render:', {
    currentScanId,
    isScanning,
    scanStatus,
    scanError,
    shouldShow
  })

  // NOW we can do early returns after all hooks
  if (!shouldShow) {
    console.log('🔍 Not showing progress bar - no scanId and not scanning')
    return null
  }

  console.log('✅ Showing progress bar!')

  // Helper functions for rendering
  const getStatusIcon = () => {
    if (scanError) return <XCircle className="h-5 w-5 text-red-500 animate-pulse" />
    if (!scanStatus) return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
    
    switch (scanStatus.status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
      case 'RUNNING':
        return <Shield className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-500 animate-bounce" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500 animate-pulse" />
      default:
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
    }
  }

  const getProgressValue = () => {
    if (scanError) return 0
    if (!scanStatus) return 15
    if (scanStatus.status === 'COMPLETED') return 100
    if (scanStatus.status === 'FAILED') return 0
    if (scanStatus.status === 'PENDING') return 10
    
    // Use actual progress if available
    if (scanStatus.progress !== undefined) {
      return scanStatus.progress
    }
    
    // Use processed files ratio
    if (scanStatus.processed_files && scanStatus.file_count) {
      return Math.min(95, (scanStatus.processed_files / scanStatus.file_count) * 100)
    }
    
    if (scanStatus.status === 'RUNNING' && scanStatus.started_at) {
      // Estimate progress based on time (assuming 5 minutes max)
      const elapsed = Date.now() - new Date(scanStatus.started_at).getTime()
      const maxTime = 5 * 60 * 1000 // 5 minutes
      return Math.min(85, 15 + (elapsed / maxTime) * 70) // Start at 15%, max 85% until completion
    }
    
    return 30
  }

  const formatElapsedTime = (startedAt?: string) => {
    if (!startedAt) return 'Starting...'
    try {
      return formatDistanceToNow(new Date(startedAt), { addSuffix: false })
    } catch {
      return 'Unknown'
    }
  }

  const getStatusMessage = () => {
    if (scanError) return `Error: ${scanError}`
    if (!scanStatus) return '🚀 Initializing security scan...'
    
    switch (scanStatus.status) {
      case 'PENDING':
        return '⏳ Scan queued, preparing environment...'
      case 'RUNNING':
        const fileCount = scanStatus.file_count
        const currentFile = scanStatus.current_file
        const processedFiles = scanStatus.processed_files
        
        if (currentFile) {
          return `🔍 Analyzing: ${currentFile.substring(currentFile.lastIndexOf('/') + 1)}`
        }
        if (processedFiles && fileCount) {
          return `📁 Processing files: ${processedFiles}/${fileCount} (${formatElapsedTime(scanStatus.started_at)})`
        }
        // Show scan type from context instead of hardcoded
        return `⚡ Running security analysis... (${formatElapsedTime(scanStatus.started_at)})`
      case 'COMPLETED':
        const findings = scanStatus.findings_count || 0
        return `✅ Scan completed! ${findings} finding${findings !== 1 ? 's' : ''} detected.`
      case 'FAILED':
        return `❌ Scan failed: ${scanStatus.error || 'Unknown error'}`
      default:
        return '🔄 Processing...'
    }
  }

  const progressValue = getProgressValue()
  const statusMessage = getStatusMessage()
  const isCompleted = scanStatus?.status === 'COMPLETED'
  const isFailed = scanStatus?.status === 'FAILED' || !!scanError

  return (
    <>
      {shouldShow && (
        <motion.div
          key="scan-progress"
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-20 left-0 right-0 z-[60] px-4"
        >
          <Card className="border shadow-2xl relative overflow-hidden bg-card/95 backdrop-blur-md max-w-5xl mx-auto">
            {/* Animated background gradient */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            
            <div className="relative p-5">
              <div className="flex items-center gap-4">
                {/* Animated Status Icon */}
                <motion.div 
                  className="flex-shrink-0 relative"
                  animate={scanStatus?.status === 'RUNNING' ? {
                    rotate: [0, 5, -5, 0],
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                  {getStatusIcon()}
                </motion.div>

                {/* Progress Section */}
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">🛡️ Security Scan</span>
                      <Badge 
                        variant={isCompleted ? "default" : isFailed ? "destructive" : "secondary"}
                        className={`text-xs font-semibold ${
                          scanStatus?.status === 'RUNNING' ? 'animate-pulse' : ''
                        }`}
                      >
                        {scanStatus?.status || 'STARTING'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <motion.span
                        key={Math.round(animatedProgress)}
                        initial={{ scale: 1.2, color: '#3b82f6' }}
                        animate={{ scale: 1, color: 'currentColor' }}
                        className="font-bold"
                      >
                        {Math.round(animatedProgress)}%
                      </motion.span>
                      {scanStatus?.file_count && (
                        <>
                          <span>•</span>
                          <FileSearch className="h-3 w-3" />
                          <span>{scanStatus.processed_files || 0}/{scanStatus.file_count}</span>
                        </>
                      )}
                      {scanStatus?.findings_count !== undefined && (
                        <>
                          <span>•</span>
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          <span className="text-yellow-500">{scanStatus.findings_count}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {/* Multi-segment Progress Bar */}
                    <div className="relative h-3 bg-secondary/30 rounded-full overflow-hidden">
                      {/* Background shimmer */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{
                          x: ['-100%', '200%'],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                      
                      {/* Main progress bar with gradient */}
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
                        initial={{ width: 0 }}
                        animate={{ width: `${animatedProgress}%` }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                      >
                        <div className={`h-full ${
                          isFailed ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
                        }`} />
                        
                        {/* Animated shine effect */}
                        {!isCompleted && !isFailed && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            animate={{
                              x: ['-100%', '200%'],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                          />
                        )}
                      </motion.div>
                    </div>
                    
                    <motion.p 
                      key={statusMessage}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      {statusMessage}
                    </motion.p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                    >
                      <Button size="sm" variant="default" className="shadow-lg" asChild>
                        <Link href="/dashboard/reports">
                          <Eye className="h-3 w-3 mr-1" />
                          View Results
                        </Link>
                      </Button>
                    </motion.div>
                  )}
                  
                  {(isCompleted || isFailed) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearScan}
                      className="h-8 w-8 p-0 hover:bg-destructive/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Pulsing border for running scans */}
              {scanStatus?.status === 'RUNNING' && (
                <motion.div
                  className="absolute inset-0 border-2 border-blue-500/50 rounded-lg pointer-events-none"
                  animate={{ 
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </>
  )
}