"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  X,
  Download,
  Share2,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  Shield,
  TrendingUp,
  Eye,
  ExternalLink,
} from "lucide-react"
import { motion } from "framer-motion"

interface Report {
  id: string
  name: string
  createdAt: string
  riskScore: number
  findingsCount: {
    high: number
    medium: number
    low: number
    total: number
  }
  filesScanned: number
  scanDuration: string
  status: "completed" | "generating" | "failed"
  size: string
  downloadUrl?: string
}

interface ReportPreviewModalProps {
  report: Report | null
  isOpen: boolean
  onClose: () => void
}

export function ReportPreviewModal({ report, isOpen, onClose }: ReportPreviewModalProps) {
  if (!report) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-500/10 border-green-500/20"
    if (score >= 60) return "bg-yellow-500/10 border-yellow-500/20"
    return "bg-red-500/10 border-red-500/20"
  }

  const handleDownload = () => {
    if (report.downloadUrl) {
      console.log("Downloading report:", report.downloadUrl)
    }
  }

  const mockSummary = {
    executiveSummary:
      "This security audit identified several critical vulnerabilities that require immediate attention. The application shows good security practices in authentication but needs improvement in input validation and data handling.",
    keyFindings: [
      "SQL injection vulnerabilities in user authentication endpoints",
      "Hardcoded API keys in configuration files",
      "Missing input validation in user data processing",
      "Insufficient error handling exposing system information",
    ],
    recommendations: [
      "Implement parameterized queries for all database operations",
      "Move all secrets to environment variables",
      "Add comprehensive input validation middleware",
      "Implement proper error handling and logging",
    ],
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden glassmorphism">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold">{report.name}</DialogTitle>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(report.createdAt)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{report.scanDuration}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>{report.filesScanned} files</span>
                </span>
                <span>{report.size}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glassmorphism p-4 text-center">
                <div
                  className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${getScoreBackground(report.riskScore)}`}
                >
                  <span className={`text-2xl font-bold ${getScoreColor(report.riskScore)}`}>{report.riskScore}</span>
                </div>
                <h3 className="font-medium mb-1">Security Score</h3>
                <p className="text-xs text-muted-foreground">
                  {report.riskScore >= 80 ? "Excellent" : report.riskScore >= 60 ? "Good" : "Needs Attention"}
                </p>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glassmorphism p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 mx-auto mb-3 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="font-medium mb-1">Total Findings</h3>
                <p className="text-2xl font-bold">{report.findingsCount.total}</p>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="glassmorphism p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-medium mb-1">Files Scanned</h3>
                <p className="text-2xl font-bold">{report.filesScanned}</p>
              </Card>
            </motion.div>
          </div>

          {/* Findings Breakdown */}
          <Card className="glassmorphism p-6">
            <h3 className="text-lg font-semibold mb-4">Findings Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xl font-bold text-red-400">{report.findingsCount.high}</span>
                </div>
                <p className="text-sm font-medium">High Risk</p>
                <p className="text-xs text-muted-foreground">Critical vulnerabilities</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xl font-bold text-yellow-400">{report.findingsCount.medium}</span>
                </div>
                <p className="text-sm font-medium">Medium Risk</p>
                <p className="text-xs text-muted-foreground">Important issues</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-400">{report.findingsCount.low}</span>
                </div>
                <p className="text-sm font-medium">Low Risk</p>
                <p className="text-xs text-muted-foreground">Minor improvements</p>
              </div>
            </div>
          </Card>

          {/* Executive Summary */}
          <Card className="glassmorphism p-6">
            <h3 className="text-lg font-semibold mb-4">Executive Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{mockSummary.executiveSummary}</p>
          </Card>

          {/* Key Findings and Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glassmorphism p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
                Key Findings
              </h3>
              <ul className="space-y-2">
                {mockSummary.keyFindings.map((finding, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 mr-2 flex-shrink-0" />
                    {finding}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="glassmorphism p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {mockSummary.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 mr-2 flex-shrink-0" />
                    {recommendation}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="bg-transparent">
              <Share2 className="w-4 h-4 mr-2" />
              Share Report
            </Button>
            <Button variant="outline" size="sm" className="bg-transparent">
              <Eye className="w-4 h-4 mr-2" />
              View Findings
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="bg-transparent">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
            <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
