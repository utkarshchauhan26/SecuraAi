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
import { Calendar, Download, FileText, RefreshCw, Search, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react"

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

      const matchesStatus = status === "all" || s.status === status
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
    switch (s) {
      case "completed":
        return { icon: CheckCircle, className: "bg-green-500/10 text-green-500 border-green-500/20" }
      case "failed":
        return { icon: AlertTriangle, className: "bg-red-500/10 text-red-500 border-red-500/20" }
      case "running":
      case "pending":
        return { icon: RefreshCw, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" }
      default:
        return { icon: FileText, className: "bg-muted text-muted-foreground" }
    }
  }

  // Summary stats
  const total = Array.isArray(scans) ? scans.length : 0
  const completed = Array.isArray(scans) ? scans.filter((s: AnyScan) => s.status === "completed").length : 0
  const avgRisk = total > 0 ? Math.round((scans as AnyScan[]).reduce((sum, s) => sum + (s.riskScore || 0), 0) / total) : 0

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
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">Scan #{String(scan.id).substring(0, 8)}</h3>
                          <Badge variant="outline" className={statusBadge.className}>
                            <StatusIcon className="w-3 h-3 mr-1.5" />
                            {scan.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Type</p>
                            <p className="font-medium capitalize">{scan.scanType}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Risk Score</p>
                            <p className={`font-bold text-lg ${getRiskColor(scan.riskScore || 0)}`}>{scan.riskScore || 0}/100</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Files Scanned</p>
                            <p className="font-medium">{scan.filesScanned || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Date</p>
                            <p className="font-medium flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(scan.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {scan.completedAt && (
                          <p className="text-xs text-muted-foreground mt-3">Completed: {new Date(scan.completedAt).toLocaleString()}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {scan.status === "completed" && (
                          <Button onClick={() => handleDownloadPDF(scan)} variant="default">
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </Button>
                        )}
                      </div>
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
