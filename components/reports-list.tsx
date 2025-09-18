"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Share2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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

interface ReportsListProps {
  reports: Report[]
  onViewReport: (report: Report) => void
}

export function ReportsList({ reports, onViewReport }: ReportsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "generating":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20"
      case "generating":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const handleDownload = (report: Report) => {
    if (report.downloadUrl) {
      // In a real app, this would trigger the download
      console.log("Downloading report:", report.downloadUrl)
    }
  }

  if (reports.length === 0) {
    return (
      <Card className="glassmorphism p-8 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No reports found</h3>
        <p className="text-muted-foreground">No reports match your current search and filter criteria.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {reports.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            className="group"
          >
            <Card className="glassmorphism p-6 hover:bg-muted/20 transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                        {report.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(report.createdAt)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{report.scanDuration}</span>
                        </span>
                        <span>{report.filesScanned} files scanned</span>
                        {report.size && <span>{report.size}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Status Badge */}
                    <Badge className={getStatusColor(report.status)}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(report.status)}
                        <span className="capitalize">{report.status}</span>
                      </span>
                    </Badge>

                    {/* Risk Score */}
                    {report.status === "completed" && (
                      <div className={`px-3 py-1 rounded-full border ${getScoreBackground(report.riskScore)}`}>
                        <span className={`font-medium ${getScoreColor(report.riskScore)}`}>
                          {report.riskScore} Security Score
                        </span>
                      </div>
                    )}

                    {/* Findings Summary */}
                    {report.status === "completed" && report.findingsCount.total > 0 && (
                      <div className="flex items-center space-x-2">
                        {report.findingsCount.high > 0 && (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                            {report.findingsCount.high} High
                          </Badge>
                        )}
                        {report.findingsCount.medium > 0 && (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                            {report.findingsCount.medium} Medium
                          </Badge>
                        )}
                        {report.findingsCount.low > 0 && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                            {report.findingsCount.low} Low
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Progress for generating reports */}
                    {report.status === "generating" && (
                      <div className="flex-1 max-w-xs">
                        <Progress value={65} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">Generating report...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  {report.status === "completed" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewReport(report)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Share functionality
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(report)
                        }}
                        className="bg-transparent group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </>
                  )}

                  {report.status === "failed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Retry functionality
                      }}
                    >
                      Retry
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewReport(report)
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
