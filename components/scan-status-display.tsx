import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useScanPolling, type ScanStatus } from "@/hooks/use-scan-polling"
import { formatDistanceToNow } from "date-fns"

interface ScanStatusDisplayProps {
  scanId: string | null
  onComplete?: (scan: ScanStatus) => void
  onError?: (error: string) => void
}

export function ScanStatusDisplay({ scanId, onComplete, onError }: ScanStatusDisplayProps) {
  const { scanStatus, loading, error, restartPolling, isPolling } = useScanPolling({
    scanId,
    enabled: !!scanId,
    interval: 2000,
    onComplete,
    onError
  })

  if (!scanId) return null

  const getStatusIcon = (status: ScanStatus['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'RUNNING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: ScanStatus['status']) => {
    switch (status) {
      case 'PENDING':
        return 'border-yellow-200 bg-yellow-50'
      case 'RUNNING':
        return 'border-blue-200 bg-blue-50'
      case 'COMPLETED':
        return 'border-green-200 bg-green-50'
      case 'FAILED':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getProgressValue = (status: ScanStatus['status'], startedAt?: string) => {
    if (status === 'COMPLETED') return 100
    if (status === 'FAILED') return 0
    if (status === 'PENDING') return 0
    
    if (status === 'RUNNING' && startedAt) {
      // Estimate progress based on time (assuming 5 minutes max)
      const elapsed = Date.now() - new Date(startedAt).getTime()
      const maxTime = 5 * 60 * 1000 // 5 minutes
      return Math.min(90, (elapsed / maxTime) * 100) // Cap at 90% until completion
    }
    
    return 25
  }

  const formatElapsedTime = (startedAt?: string) => {
    if (!startedAt) return 'Unknown'
    try {
      return formatDistanceToNow(new Date(startedAt), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={scanId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`transition-colors duration-300 ${scanStatus ? getStatusColor(scanStatus.status || 'PENDING') : 'border-gray-200'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {scanStatus ? getStatusIcon(scanStatus.status || 'PENDING') : <Loader2 className="h-4 w-4 animate-spin" />}
              Scan Status
              <Badge variant="outline" className="ml-auto">
                {scanStatus?.status || 'Loading...'}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(getProgressValue(scanStatus?.status || 'PENDING', scanStatus?.started_at))}%</span>
              </div>
              <Progress 
                value={getProgressValue(scanStatus?.status || 'PENDING', scanStatus?.started_at)} 
                className="transition-all duration-500"
              />
            </div>

            {/* Scan Details */}
            {scanStatus && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File:</span>
                  <span className="font-medium">{scanStatus.filename || 'Unknown'}</span>
                </div>
                
                {scanStatus.file_count && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Files:</span>
                    <span className="font-medium">{scanStatus.file_count}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started:</span>
                  <span className="font-medium">{formatElapsedTime(scanStatus.started_at)}</span>
                </div>

                {scanStatus.status === 'COMPLETED' && scanStatus.finished_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium">{formatElapsedTime(scanStatus.finished_at)}</span>
                  </div>
                )}

                {scanStatus.status === 'COMPLETED' && scanStatus.findings_count !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Findings:</span>
                    <Badge variant={scanStatus.findings_count > 0 ? "destructive" : "secondary"}>
                      {scanStatus.findings_count}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
              >
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Error
                </div>
                <p className="mt-1">{error}</p>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {scanStatus?.status === 'RUNNING' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Scanning in progress... ({isPolling ? 'Live' : 'Paused'})</span>
                </div>
              )}
              
              {(error || scanStatus?.status === 'FAILED') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={restartPolling}
                  className="ml-auto"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>

            {/* Status Messages */}
            {scanStatus?.status === 'RUNNING' && (
              <motion.div
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700"
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {scanStatus.file_count && scanStatus.file_count > 50
                      ? `Analyzing ${scanStatus.file_count} files... Large projects take 3-5 minutes.`
                      : 'Running security analysis... This may take a few minutes.'
                    }
                  </span>
                </div>
              </motion.div>
            )}

            {scanStatus?.status === 'COMPLETED' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"
              >
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Scan completed successfully!
                </div>
                <p className="mt-1">Check the results table below for detailed findings.</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}