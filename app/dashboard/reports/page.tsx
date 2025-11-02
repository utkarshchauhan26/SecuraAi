"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Download,
  Search,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react"
import { useState, useMemo } from "react"
import { useScans } from "@/hooks/use-api"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"

export default function ReportsPage() {
  const { scans, loading, error, refetch } = useScans()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  const filteredScans = useMemo(() => {
    if (!scans) return []

    let filtered = scans.filter((scan) => {
      const matchesSearch =
        searchQuery === "" ||
        scan.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.projectId?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || scan.status === statusFilter

      return matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "risk-desc":
          return (b.riskScore || 0) - (a.riskScore || 0)
        case "risk-asc":
          return (a.riskScore || 0) - (b.riskScore || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [scans, searchQuery, statusFilter, sortBy])

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

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-500"
    if (score >= 60) return "text-orange-500"
    if (score >= 40) return "text-yellow-500"
    return "text-green-500"
  }

  const getRiskBadge = (score: number) => {
    if (score >= 80) return { label: "CRITICAL", className: "bg-red-500/10 text-red-500 border-red-500/20" }
    if (score >= 60) return { label: "HIGH", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" }
    if (score >= 40) return { label: "MEDIUM", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" }
    return { label: "LOW", className: "bg-green-500/10 text-green-500 border-green-500/20" }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: CheckCircle, className: "bg-green-500/10 text-green-500" }
      case "failed":
        return { icon: AlertTriangle, className: "bg-red-500/10 text-red-500" }
      case "running":
        return { icon: RefreshCw, className: "bg-blue-500/10 text-blue-500" }
      default:
        return { icon: FileText, className: "bg-gray-500/10 text-gray-500" }
    }
  }

  return (
    <DashboardLayout>
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Scan Reports</h1>
              <p className="text-muted-foreground mt-1">
                View and download security scan reports
              </p>
            </div>
            <Button onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card className="glassmorphism p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by scan ID or project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
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
          </Card>

          {/* Reports List */}
          {loading ? (
            <Card className="glassmorphism p-12">
              <div className="text-center text-muted-foreground">
                <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                <p>Loading reports...</p>
              </div>
            </Card>
          ) : error ? (
            <Card className="glassmorphism p-12">
              <div className="text-center text-destructive">
                <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
                <p>Error loading reports: {error}</p>
              </div>
            </Card>
          ) : filteredScans.length === 0 ? (
            <Card className="glassmorphism p-12">
              <div className="text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No reports found</p>
                <p className="text-sm mt-2">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Start a scan to generate your first report"}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredScans.map((scan) => {
                const statusBadge = getStatusBadge(scan.status)
                const StatusIcon = statusBadge.icon
                const riskBadge = getRiskBadge(scan.riskScore || 0)

                return (
                  <Card key={scan.id} className="glassmorphism p-6 hover:bg-card/70 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">
                            Scan #{scan.id.substring(0, 8)}
                          </h3>
                          <Badge variant="outline" className={statusBadge.className}>
                            <StatusIcon className="w-3 h-3 mr-1.5" />
                            {scan.status}
                          </Badge>
                          {scan.status === "completed" && (
                            <Badge variant="outline" className={`${riskBadge.className} border`}>
                              {riskBadge.label}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Type</p>
                            <p className="font-medium capitalize">{scan.scanType}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Risk Score</p>
                            <p className={`font-bold text-lg ${getRiskColor(scan.riskScore || 0)}`}>
                              {scan.riskScore || 0}/100
                            </p>
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
                          <p className="text-xs text-muted-foreground mt-3">
                            Completed: {new Date(scan.completedAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {scan.status === "completed" && (
                          <Button
                            onClick={() => handleDownloadPDF(scan.id)}
                            variant="default"
                          >
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

          {/* Summary Stats */}
          {scans && scans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glassmorphism p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{scans.length}</p>
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
                    <p className="text-2xl font-bold">
                      {scans.filter((s) => s.status === "completed").length}
                    </p>
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
                    <p className="text-2xl font-bold">
                      {scans.length > 0
                        ? Math.round(
                            scans.reduce((sum, s) => sum + (s.riskScore || 0), 0) / scans.length
                          )
                        : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
