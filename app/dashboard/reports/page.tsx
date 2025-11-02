"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ReportsList } from "@/components/reports-list"
import { ReportPreviewModal } from "@/components/report-preview-modal"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search, Plus, Download, TrendingUp } from "lucide-react"
import { useState } from "react"
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

const mockReports: Report[] = [
  {
    id: "1",
    name: "E-commerce Platform Security Audit",
    createdAt: "2024-01-15T10:30:00Z",
    riskScore: 73,
    findingsCount: { high: 3, medium: 8, low: 12, total: 23 },
    filesScanned: 156,
    scanDuration: "8m 32s",
    status: "completed",
    size: "2.4 MB",
    downloadUrl: "/reports/ecommerce-audit.pdf",
  },
  {
    id: "2",
    name: "API Gateway Security Review",
    createdAt: "2024-01-14T14:15:00Z",
    riskScore: 85,
    findingsCount: { high: 1, medium: 4, low: 7, total: 12 },
    filesScanned: 89,
    scanDuration: "4m 18s",
    status: "completed",
    size: "1.8 MB",
    downloadUrl: "/reports/api-gateway-review.pdf",
  },
  {
    id: "3",
    name: "Mobile App Backend Scan",
    createdAt: "2024-01-13T09:45:00Z",
    riskScore: 62,
    findingsCount: { high: 5, medium: 12, low: 18, total: 35 },
    filesScanned: 203,
    scanDuration: "12m 45s",
    status: "completed",
    size: "3.1 MB",
    downloadUrl: "/reports/mobile-backend-scan.pdf",
  },
  {
    id: "4",
    name: "Authentication Service Audit",
    createdAt: "2024-01-12T16:20:00Z",
    riskScore: 91,
    findingsCount: { high: 0, medium: 2, low: 5, total: 7 },
    filesScanned: 67,
    scanDuration: "3m 12s",
    status: "completed",
    size: "1.2 MB",
    downloadUrl: "/reports/auth-service-audit.pdf",
  },
  {
    id: "5",
    name: "Microservices Security Assessment",
    createdAt: "2024-01-11T11:00:00Z",
    riskScore: 0,
    findingsCount: { high: 0, medium: 0, low: 0, total: 0 },
    filesScanned: 0,
    scanDuration: "0s",
    status: "generating",
    size: "0 MB",
  },
]

export default function ReportsPage() {
  const [reports] = useState<Report[]>(mockReports)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("date-desc")
  const [filterStatus, setFilterStatus] = useState("all")

  const filteredAndSortedReports = reports
    .filter((report) => {
      const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === "all" || report.status === filterStatus
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "score-desc":
          return b.riskScore - a.riskScore
        case "score-asc":
          return a.riskScore - b.riskScore
        case "findings-desc":
          return b.findingsCount.total - a.findingsCount.total
        case "findings-asc":
          return a.findingsCount.total - b.findingsCount.total
        default:
          return 0
      }
    })

  const completedReports = reports.filter((r) => r.status === "completed")
  const totalFindings = completedReports.reduce((sum, r) => sum + r.findingsCount.total, 0)
  const averageScore =
    completedReports.length > 0
      ? Math.round(completedReports.reduce((sum, r) => sum + r.riskScore, 0) / completedReports.length)
      : 0

  return (
    <DashboardLayout>
      <div className="flex flex-1 flex-col p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Security Reports</h1>
            <p className="text-muted-foreground mt-1">View and download your security audit reports</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Generate New Report
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glassmorphism p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports.length}</p>
                  <p className="text-xs text-muted-foreground">Total Reports</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glassmorphism p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{averageScore}</p>
                  <p className="text-xs text-muted-foreground">Avg Security Score</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glassmorphism p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalFindings}</p>
                  <p className="text-xs text-muted-foreground">Total Findings</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glassmorphism p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedReports.length}</p>
                  <p className="text-xs text-muted-foreground">Ready to Download</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <Card className="glassmorphism p-4">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-transparent"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-transparent">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="glassmorphism">
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="score-desc">Highest Score</SelectItem>
                <SelectItem value="score-asc">Lowest Score</SelectItem>
                <SelectItem value="findings-desc">Most Findings</SelectItem>
                <SelectItem value="findings-asc">Fewest Findings</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-transparent">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glassmorphism">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="generating">Generating</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Reports List */}
        <ReportsList reports={filteredAndSortedReports} onViewReport={setSelectedReport} />

        {/* Report Preview Modal */}
        <ReportPreviewModal report={selectedReport} isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} />
      </div>
    </DashboardLayout>
  )
}
