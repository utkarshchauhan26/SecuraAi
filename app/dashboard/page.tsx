"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { UploadZone } from "@/components/upload-zone"
import { GitHubScanner } from "@/components/github-scanner"
import { ScanConfiguration } from "@/components/scan-configuration"
import { RiskScorePanel } from "@/components/risk-score-panel"
import { ResultsTable } from "@/components/results-table"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Zap, Download, RefreshCw, Upload, Github, Shield, Loader2, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useScans } from "@/hooks/use-api"
import { apiClient } from "@/lib/api-client"
import { useSession } from "next-auth/react"
import { useScanContext } from "@/contexts/scan-context"

interface UploadedFile {
  name: string
  size: number
  type: string
  status: "uploading" | "ready" | "error"
  error?: string
  file?: File
}

interface ScanConfig {
  model: "fast" | "deep"
  severity: string[]
  includeTests: boolean
  includeDependencies: boolean
  maxDepth: number
  customRules: boolean
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { scans, loading: scansLoading, error: scansError, refetch } = useScans()
  const { currentScanId, isScanning, scanStatus, startScan, clearScan } = useScanContext()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    model: "fast",
    severity: ["high", "medium", "low"],
    includeTests: false,
    includeDependencies: true,
    maxDepth: 5,
    customRules: false,
  })

  // Debug: Log scan config changes
  useEffect(() => {
    console.log('📊 Dashboard scanConfig state:', scanConfig)
  }, [scanConfig])

  const handleStartScan = async () => {
    if (uploadedFiles.length === 0) return

    setUploadError(null)

    try {
      // Upload the first file (for now, single file support)
      const fileToUpload = uploadedFiles[0]
      if (!fileToUpload.file) {
        throw new Error("No file to upload")
      }

      console.log('🚀 Starting scan with config:', scanConfig)
      console.log('📊 Selected scan type:', scanConfig.model)
      
      const response = await apiClient.uploadFile(
        fileToUpload.file,
        `Scan - ${new Date().toLocaleString()}`,
        scanConfig.model
      )

      if (response.success && response.data?.scanId) {
        startScan(response.data.scanId) // Use global scan context - shows animated progress bar
        setUploadedFiles([]) // Clear uploaded files after successful start
        console.log('✅ Scan initiated:', response.data.scanId)
      } else {
        throw new Error(response.message || 'Failed to start scan')
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to start scan")
      console.error('❌ Scan start failed:', error)
    }
  }

  const handleScanComplete = (scan: any) => {
    console.log('✅ Scan completed:', scan)
    refetch() // Refresh scans list
  }

  const handleDownloadPDF = async (scanId: string) => {
    try {
      const blob = await apiClient.downloadPDF(scanId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `security-report-${scanId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to download PDF:", error)
      alert("Failed to download PDF report")
    }
  }

  const latestScan = scans && scans.length > 0 ? scans[0] : null
  const canScan = uploadedFiles.length > 0 && uploadedFiles.every((f) => f.status === "ready")

  return (
    <DashboardLayout>
      <div className="flex flex-1 gap-6 p-6">
        {/* Main Panel */}
        <div className="flex-1 space-y-6">
          {/* Upload Section with Tabs */}
          <Card className="glassmorphism p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Security Scan</h2>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  <span>AI-Powered Analysis</span>
                </div>
              </div>

              {session ? (
                <>
                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Files
                      </TabsTrigger>
                      <TabsTrigger value="github" className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        GitHub Repository
                      </TabsTrigger>
                    </TabsList>

                    {/* File Upload Tab */}
                    <TabsContent value="upload" className="space-y-4 mt-4">
                      <UploadZone
                        onFilesUpload={setUploadedFiles}
                        uploadedFiles={uploadedFiles}
                        maxFiles={10}
                        maxFileSize={100}
                      />
                    </TabsContent>

                    {/* GitHub Scanner Tab */}
                    <TabsContent value="github" className="space-y-4 mt-4">
                      <GitHubScanner
                        scanType={scanConfig.model}
                        onScanStart={(scanId) => {
                          startScan(scanId) // Use global scan context
                        }}
                        onScanComplete={(scanId) => {
                          refetch()
                        }}
                      />
                    </TabsContent>
                  </Tabs>

                  <AnimatePresence>
                    {uploadError && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2"
                      >
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <span className="text-destructive text-sm">{uploadError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    onClick={handleStartScan}
                    disabled={!canScan || isScanning}
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                    size="lg"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Initializing {scanConfig.model.toUpperCase()} Scan...
                      </>
                    ) : (
                      <>
                        {scanConfig.model === 'fast' ? <Zap className="mr-2 h-5 w-5" /> : <Shield className="mr-2 h-5 w-5" />}
                        Start {scanConfig.model === 'fast' ? 'Fast' : 'Deep'} Security Scan
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Please sign in to upload and scan files
                </div>
              )}
            </div>
          </Card>



          {/* Recent Scans */}
          {session && (
            <Card className="glassmorphism p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Recent Scans</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={scansLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${scansLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {scansLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading scans...
                </div>
              ) : scansError ? (
                <div className="text-center py-8 text-destructive">
                  Error: {scansError}
                </div>
              ) : scans && scans.length > 0 ? (
                <div className="space-y-3">
                  {scans.slice(0, 5).map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-4 bg-card/50 border border-border rounded-lg hover:bg-card/70 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">
                            Scan #{scan.id.substring(0, 8)}
                          </div>
                          <div
                            className={`px-2 py-1 text-xs rounded-full ${
                              scan.status === "completed"
                                ? "bg-green-500/10 text-green-500"
                                : scan.status === "failed"
                                ? "bg-red-500/10 text-red-500"
                                : scan.status === "running"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-gray-500/10 text-gray-500"
                            }`}
                          >
                            {scan.status}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Risk Score: {scan.riskScore || 0}/100</span>
                          <span>{scan.filesScanned || 0} files</span>
                          <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {scan.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(scan.id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No scans yet. Upload a file to get started!
                </div>
              )}
            </Card>
          )}

          {/* Results Table - Show latest scan results */}
          {latestScan && latestScan.status === "completed" && (
            <ResultsTable scanId={latestScan.id} />
          )}
        </div>

        {/* Sidebar */}
        <div className="w-96 space-y-6">
          {/* Risk Score Panel */}
          {latestScan && (
            <RiskScorePanel
              score={{
                overall: latestScan.riskScore || 0,
                high: 0,
                medium: 0,
                low: 0
              }}
            />
          )}

          {/* Scan Configuration */}
          <ScanConfiguration 
            config={scanConfig} 
            onConfigChange={setScanConfig}
            onStartScan={handleStartScan}
            canScan={canScan}
            isScanning={isScanning}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
