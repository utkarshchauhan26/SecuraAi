"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { UploadZone } from "@/components/upload-zone"
import { ScanConfiguration } from "@/components/scan-configuration"
import { RiskScorePanel } from "@/components/risk-score-panel"
import { ResultsTable } from "@/components/results-table"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { Zap } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface UploadedFile {
  name: string
  size: number
  type: string
  status: "uploading" | "ready" | "error"
  error?: string
}

interface ScanConfig {
  model: "fast" | "accurate"
  severity: string[]
  includeTests: boolean
  includeDependencies: boolean
  maxDepth: number
  customRules: boolean
}

export default function DashboardPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [hasResults, setHasResults] = useState(false)
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    model: "fast",
    severity: ["high", "medium", "low"],
    includeTests: false,
    includeDependencies: true,
    maxDepth: 5,
    customRules: false,
  })

  const handleStartScan = async () => {
    if (uploadedFiles.length === 0) return

    setIsScanning(true)
    setScanProgress(0)
    setHasResults(false)

    // Simulate scanning progress with different speeds based on model
    const scanDuration = scanConfig.model === "fast" ? 2000 : 8000
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsScanning(false)
          setHasResults(true)
          return 100
        }
        return prev + 100 / (scanDuration / 200)
      })
    }, 200)
  }

  const mockRiskScore = {
    overall: 73,
    high: 3,
    medium: 8,
    low: 12,
  }

  const canScan = uploadedFiles.length > 0 && uploadedFiles.every((f) => f.status === "ready")

  return (
    <DashboardLayout>
      <div className="flex flex-1 gap-6 p-6">
        {/* Main Panel */}
        <div className="flex-1 space-y-6">
          {/* Upload Section */}
          <Card className="glassmorphism p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Security Scan</h2>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  <span>AI-Powered Analysis</span>
                </div>
              </div>

              <UploadZone
                onFilesUpload={setUploadedFiles}
                uploadedFiles={uploadedFiles}
                maxFiles={10}
                maxFileSize={100}
              />

              <AnimatePresence>
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {scanConfig.model === "fast" ? "Fast scanning" : "Deep analysis"} in progress...
                      </span>
                      <span className="text-foreground font-medium">{Math.round(scanProgress)}%</span>
                    </div>
                    <Progress value={scanProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Analyzing {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} with{" "}
                      {scanConfig.model} model
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Results Section */}
          <AnimatePresence>
            {hasResults && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <ResultsTable />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Side Panel */}
        <div className="w-80 space-y-6">
          <ScanConfiguration
            config={scanConfig}
            onConfigChange={setScanConfig}
            onStartScan={handleStartScan}
            canScan={canScan}
            isScanning={isScanning}
          />

          <RiskScorePanel score={hasResults ? mockRiskScore : null} isLoading={isScanning} />
        </div>
      </div>
    </DashboardLayout>
  )
}
