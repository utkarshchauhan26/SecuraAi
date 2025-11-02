"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FindingDetailsModal } from "@/components/finding-details-modal"
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Search,
  AlertTriangle,
  Eye,
} from "lucide-react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useReport } from "@/hooks/use-api"

interface ResultsTableProps {
  scanId: string | null
}

export function ResultsTable({ scanId }: ResultsTableProps) {
  const { report, loading, error } = useReport(scanId)
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedFinding, setSelectedFinding] = useState<any>(null)

  const findings = report?.results?.findings || []

  const filteredFindings = useMemo(() => {
    return findings.filter((finding) => {
      const matchesSearch =
        searchQuery === "" ||
        finding.checkId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        finding.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        finding.filePath.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesSeverity = severityFilter === "all" || finding.severity.toLowerCase() === severityFilter

      return matchesSearch && matchesSeverity
    })
  }, [findings, searchQuery, severityFilter])

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "low":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const getSeverityIcon = (severity: string) => {
    return <AlertTriangle className="w-4 h-4" />
  }

  if (!scanId) {
    return (
      <Card className="glassmorphism p-6">
        <div className="text-center py-8 text-muted-foreground">
          No scan selected. Upload a file and start a scan to see results.
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="glassmorphism p-6">
        <div className="text-center py-8 text-muted-foreground">
          Loading scan results...
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glassmorphism p-6">
        <div className="text-center py-8 text-destructive">
          Error loading results: {error}
        </div>
      </Card>
    )
  }

  if (findings.length === 0) {
    return (
      <Card className="glassmorphism p-6">
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No vulnerabilities found!</p>
          <p className="text-sm mt-2">Your code appears to be secure.</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="glassmorphism p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-foreground">Security Findings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredFindings.length} of {findings.length} findings
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search findings, files, or rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Table */}
          <div className="space-y-2">
            <AnimatePresence>
              {filteredFindings.map((finding) => (
                <motion.div
                  key={finding.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="border border-border rounded-lg overflow-hidden bg-card/50 hover:bg-card/70 transition-colors"
                >
                  {/* Main Row */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(finding.id)}
                        className="p-0 h-6 w-6 mt-1"
                      >
                        {expandedRows.has(finding.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`${getSeverityColor(finding.severity)} border`}
                            >
                              {getSeverityIcon(finding.severity)}
                              <span className="ml-1.5 font-medium uppercase text-xs">
                                {finding.severity}
                              </span>
                            </Badge>
                            <span className="text-sm font-medium text-foreground">
                              {finding.checkId}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFinding(finding)}
                            className="shrink-0"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Details
                          </Button>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">{finding.message}</p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{finding.filePath}</span>
                          </div>
                          {finding.line && (
                            <span className="flex items-center gap-1.5">
                              Line {finding.line}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedRows.has(finding.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border overflow-hidden"
                      >
                        <div className="p-4 bg-muted/30 space-y-3">
                          {finding.code && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Code Snippet:</h4>
                              <pre className="bg-background/50 p-3 rounded text-xs overflow-x-auto">
                                <code>{finding.code}</code>
                              </pre>
                            </div>
                          )}

                          {finding.explanations && finding.explanations.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">AI Explanation:</h4>
                              <p className="text-sm text-muted-foreground">
                                {finding.explanations[0].summary}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredFindings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No findings match your search criteria
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Finding Details Modal */}
      {selectedFinding && (
        <FindingDetailsModal
          finding={selectedFinding}
          isOpen={selectedFinding !== null}
          onClose={() => setSelectedFinding(null)}
          onMarkFalsePositive={(id) => {
            console.log("Mark as false positive:", id)
            // TODO: Implement API call to mark as false positive
            setSelectedFinding(null)
          }}
          onApplyFix={(id) => {
            console.log("Apply fix:", id)
            // TODO: Implement API call to apply suggested fix
            setSelectedFinding(null)
          }}
          onAddToReport={(id) => {
            console.log("Add to report:", id)
            // TODO: Implement API call to add to report
            setSelectedFinding(null)
          }}
        />
      )}
    </>
  )
}
