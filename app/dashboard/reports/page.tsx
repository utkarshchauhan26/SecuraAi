"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMemo, useState } from "react"
import { useScans } from "@/hooks/use-api"
import { apiClient } from "@/lib/api-client"
import { 
  Calendar, 
  Download, 
  FileText, 
  RefreshCw, 
  Search, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  Clock,
  GitBranch,
  FileCode
} from "lucide-react"

type AnyScan = any

export default function ReportsPage() {
  const { scans, loading, error, refetch } = useScans()

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  const getPdfUrl = (scan: AnyScan): string | null => {
    return (
      scan?.reportUrl ||
      scan?.report_url ||
      scan?.pdfUrl ||
      scan?.pdf_url ||
      scan?.report?.pdfUrl ||
      null
    )
  }

  const filtered = useMemo(() => {
    const list: AnyScan[] = Array.isArray(scans) ? scans : []

    let out = list.filter((s) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        s.id?.toLowerCase()?.includes(q) ||
        s.projectId?.toLowerCase()?.includes(q) ||
        s.targetPath?.toLowerCase()?.includes(q)

      const matchesStatus = status === "all" || s.status?.toUpperCase() === status.toUpperCase()
      return matchesSearch && matchesStatus
    })

    out.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "risk-desc":
          return (b.riskScore || 0) - (a.riskScore || 0)
        case "risk-asc":
          return (a.riskScore || 0) - (b.riskScore || 0)
        case "date-desc":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return out
  }, [scans, search, status, sortBy])

  const handleDownloadPDF = async (scan: AnyScan) => {
    try {
      const url = getPdfUrl(scan)
      if (url) {
        // Direct download from Supabase public URL
        const a = document.createElement("a")
        a.href = url
        a.download = `security-report-${scan.id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        return
      }

      // Fallback: download via backend endpoint
      const blob = await apiClient.downloadPDF(scan.id)
      const objectUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = `security-report-${scan.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(objectUrl)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Failed to download PDF:", err)
      alert("Failed to download PDF report")
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-500"
    if (score >= 60) return "text-orange-500"
    if (score >= 40) return "text-yellow-500"
    return "text-green-500"
  }

  const getStatusBadge = (s: string) => {
    const status = s?.toUpperCase() // Normalize to uppercase
    switch (status) {
      case "COMPLETED":
        return { icon: CheckCircle, className: "bg-green-500/10 text-green-500 border-green-500/20" }
      case "FAILED":
        return { icon: AlertTriangle, className: "bg-red-500/10 text-red-500 border-red-500/20" }
      case "RUNNING":
      case "PENDING":
      case "IN_PROGRESS":
        return { icon: RefreshCw, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" }
      default:
        return { icon: FileText, className: "bg-muted text-muted-foreground" }
    }
  }

  // Summary stats
  const total = Array.isArray(scans) ? scans.length : 0
  const completed = Array.isArray(scans) ? scans.filter((s: AnyScan) => s.status?.toUpperCase() === "COMPLETED").length : 0
  const avgRisk = total > 0 ? Math.round((scans as AnyScan[]).reduce((sum, s) => sum + (s.riskScore || 0), 0) / total) : 0
  const totalFindings = Array.isArray(scans) 
    ? (scans as AnyScan[]).reduce((sum, s) => sum + (s.criticalCount || 0) + (s.highCount || 0) + (s.mediumCount || 0) + (s.lowCount || 0), 0) 
    : 0
  const totalFilesScanned = Array.isArray(scans)
    ? (scans as AnyScan[]).reduce((sum, s) => sum + (s.filesScanned || 0), 0)
    : 0

  return (
    <DashboardLayout>
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Scan Reports</h1>
              <p className="text-muted-foreground mt-1">View and download security scan reports</p>
            </div>
            <Button onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card className="glassmorphism p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by scan ID, project, or path..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-3">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="RUNNING">Running</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="risk-desc">Highest Risk</SelectItem>
                    <SelectItem value="risk-asc">Lowest Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Summary Cards */}
          {total > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="glassmorphism p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{total}</p>
                    <p className="text-sm text-muted-foreground">Total Scans</p>
                  </div>
                </div>
              </Card>
              
              <Card className="glassmorphism p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completed}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </Card>
              
              <Card className="glassmorphism p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgRisk}</p>
                    <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                  </div>
                </div>
              </Card>
              
              <Card className="glassmorphism p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalFindings}</p>
                    <p className="text-sm text-muted-foreground">Total Findings</p>
                  </div>
                </div>
              </Card>
              
              <Card className="glassmorphism p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileCode className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalFilesScanned}</p>
                    <p className="text-sm text-muted-foreground">Files Scanned</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Reports List */}
          {loading ? (
            <Card className="glassmorphism p-12 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
              Loading reports...
            </Card>
          ) : error ? (
            <Card className="glassmorphism p-12 text-center text-destructive">
              <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
              Error loading reports: {error}
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="glassmorphism p-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No reports found</p>
              <p className="text-sm mt-2">{search || status !== "all" ? "Try adjusting your filters" : "Start a scan to generate your first report"}</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filtered.map((scan: AnyScan) => {
                const statusBadge = getStatusBadge(scan.status)
                const StatusIcon = statusBadge.icon
                const pdfUrl = getPdfUrl(scan)

                return (
                  <Card key={scan.id} className="glassmorphism p-6 hover:bg-card/70 transition-colors">
                    <div className="flex flex-col gap-4">
                      {/* Header Section */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">Scan #{String(scan.id).substring(0, 8)}</h3>
                            <Badge variant="outline" className={statusBadge.className}>
                              <StatusIcon className="w-3 h-3 mr-1.5" />
                              {scan.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {scan.scanType} Scan
                            </Badge>
                          </div>
                          
                          {/* Target Path */}
                          {scan.targetPath && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                              <GitBranch className="w-4 h-4" />
                              <span className="truncate max-w-md">{scan.targetPath}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          {scan.status?.toUpperCase() === "COMPLETED" && pdfUrl && (
                            <Button onClick={() => handleDownloadPDF(scan)} variant="default" size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </Button>
                          )}
                          {scan.status?.toUpperCase() === "COMPLETED" && !pdfUrl && (
                            <Button variant="outline" size="sm" disabled>
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              No PDF
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {/* Risk Score */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Shield className="w-3 h-3" />
                            Risk Score
                          </div>
                          <p className={`font-bold text-xl ${getRiskColor(scan.riskScore || 0)}`}>
                            {scan.riskScore || 0}/100
                          </p>
                        </div>

                        {/* Files Scanned */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <FileCode className="w-3 h-3" />
                            Files Scanned
                          </div>
                          <p className="font-semibold text-lg">{scan.filesScanned || 0}</p>
                        </div>

                        {/* Total Findings */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <AlertTriangle className="w-3 h-3" />
                            Total Findings
                          </div>
                          <p className="font-semibold text-lg">
                            {(scan.criticalCount || 0) + (scan.highCount || 0) + (scan.mediumCount || 0) + (scan.lowCount || 0)}
                          </p>
                        </div>

                        {/* Date */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Created
                          </div>
                          <p className="font-medium text-sm">
                            {new Date(scan.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Processing Time */}
                        {scan.startedAt && scan.finishedAt && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              Duration
                            </div>
                            <p className="font-medium text-sm">
                              {Math.round((new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000)}s
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Severity Breakdown */}
                      {scan.status?.toUpperCase() === "COMPLETED" && (
                        <div className="pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2.5">Findings by Severity</p>
                          <div className="flex gap-4 flex-wrap">
                            {/* Critical */}
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="text-sm">
                                <span className="font-semibold text-red-500">{scan.criticalCount || 0}</span>
                                <span className="text-muted-foreground ml-1">Critical</span>
                              </span>
                            </div>
                            
                            {/* High */}
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <span className="text-sm">
                                <span className="font-semibold text-orange-500">{scan.highCount || 0}</span>
                                <span className="text-muted-foreground ml-1">High</span>
                              </span>
                            </div>
                            
                            {/* Medium */}
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              <span className="text-sm">
                                <span className="font-semibold text-yellow-500">{scan.mediumCount || 0}</span>
                                <span className="text-muted-foreground ml-1">Medium</span>
                              </span>
                            </div>
                            
                            {/* Low */}
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-sm">
                                <span className="font-semibold text-blue-500">{scan.lowCount || 0}</span>
                                <span className="text-muted-foreground ml-1">Low</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
