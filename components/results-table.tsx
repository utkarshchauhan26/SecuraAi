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
  ExternalLink,
  FileText,
  Search,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
} from "lucide-react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Finding {
  id: string
  severity: "high" | "medium" | "low"
  rule: string
  file: string
  line: number
  snippet: string
  explanation: string
  suggestedFix: string
  impact?: string
  cwe?: string
  owasp?: string
  confidence: number
  context?: {
    before: string[]
    after: string[]
  }
  status?: "open" | "false-positive" | "fixed" | "in-report"
}

const mockFindings: Finding[] = [
  {
    id: "1",
    severity: "high",
    rule: "SQL Injection",
    file: "src/auth.js",
    line: 42,
    snippet: "SELECT * FROM users WHERE id = 'userInput'",
    explanation:
      "This code is vulnerable to SQL injection attacks because user input is directly concatenated into the SQL query without proper sanitization.",
    suggestedFix: "const query = 'SELECT * FROM users WHERE id = ?';\ndb.query(query, [userInput]);",
    impact:
      "An attacker could execute arbitrary SQL commands, potentially accessing, modifying, or deleting sensitive data.",
    cwe: "89",
    owasp: "A03:2021 – Injection",
    confidence: 95,
    context: {
      before: ["function authenticateUser(userInput) {", "  // Validate user credentials"],
      after: ["  return result.rows[0];", "}"],
    },
    status: "open",
  },
  {
    id: "2",
    severity: "medium",
    rule: "Hardcoded Secret",
    file: "src/config.js",
    line: 15,
    snippet: "const API_KEY = 'sk-1234567890abcdef'",
    explanation: "Hardcoded secrets in source code can be exposed if the code is compromised or accidentally shared.",
    suggestedFix: "const API_KEY = process.env.API_KEY || '';",
    impact: "Exposed API keys could allow unauthorized access to external services and incur costs.",
    cwe: "798",
    owasp: "A07:2021 – Identification and Authentication Failures",
    confidence: 90,
    context: {
      before: ["// Configuration settings", "const config = {"],
      after: ["  timeout: 5000", "};"],
    },
    status: "open",
  },
  {
    id: "3",
    severity: "low",
    rule: "Missing Input Validation",
    file: "src/user.js",
    line: 28,
    snippet: "function updateUser(data) { return db.update(data) }",
    explanation: "Input validation is missing, which could lead to unexpected behavior or security issues.",
    suggestedFix:
      "function updateUser(data) {\n  if (!data || !data.id) throw new Error('Invalid input');\n  return db.update(data);\n}",
    impact: "Invalid input could cause application errors or unexpected behavior.",
    cwe: "20",
    confidence: 75,
    context: {
      before: ["// User management functions", "const userService = {"],
      after: ["  deleteUser: (id) => db.delete(id)", "};"],
    },
    status: "open",
  },
]

interface ResultsTableProps {
  findings?: Finding[]
}

export function ResultsTable({ findings = mockFindings }: ResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredFindings = useMemo(() => {
    return findings.filter((finding) => {
      const matchesSearch =
        finding.rule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finding.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finding.snippet.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSeverity = severityFilter === "all" || finding.severity === severityFilter
      const matchesStatus = statusFilter === "all" || (finding.status || "open") === statusFilter

      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [findings, searchTerm, severityFilter, statusFilter])

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
    switch (severity) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20"
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      case "low":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fixed":
        return "bg-green-500/10 text-green-400 border-green-500/20"
      case "false-positive":
        return "bg-gray-500/10 text-gray-400 border-gray-500/20"
      case "in-report":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      default:
        return "bg-orange-500/10 text-orange-400 border-orange-500/20"
    }
  }

  const handleMarkFalsePositive = (id: string) => {
    // Implementation would update the finding status
    console.log("Mark as false positive:", id)
    setSelectedFinding(null)
  }

  const handleApplyFix = (id: string) => {
    // Implementation would apply the suggested fix
    console.log("Apply fix:", id)
    setSelectedFinding(null)
  }

  const handleAddToReport = (id: string) => {
    // Implementation would add to report
    console.log("Add to report:", id)
    setSelectedFinding(null)
  }

  const severityCounts = findings.reduce(
    (acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <>
      <Card className="glassmorphism">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Security Findings</h3>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-xs text-muted-foreground">
                  {filteredFindings.length} of {findings.length} findings
                </span>
                <div className="flex items-center space-x-2">
                  {severityCounts.high && (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                      {severityCounts.high} High
                    </Badge>
                  )}
                  {severityCounts.medium && (
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                      {severityCounts.medium} Medium
                    </Badge>
                  )}
                  {severityCounts.low && (
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                      {severityCounts.low} Low
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-transparent">
              <FileText className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search findings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-transparent"
              />
            </div>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32 bg-transparent">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="glassmorphism">
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-transparent">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glassmorphism">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="false-positive">False Positive</SelectItem>
                <SelectItem value="in-report">In Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="divide-y divide-border">
          <AnimatePresence>
            {filteredFindings.map((finding, index) => (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => toggleRow(finding.id)}
                      >
                        {expandedRows.has(finding.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <Badge className={getSeverityColor(finding.severity)}>{finding.severity.toUpperCase()}</Badge>

                      {finding.status && finding.status !== "open" && (
                        <Badge className={getStatusColor(finding.status)}>
                          {finding.status.replace("-", " ").toUpperCase()}
                        </Badge>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{finding.rule}</p>
                        <p className="text-xs text-muted-foreground">
                          {finding.file}:{finding.line} • {finding.confidence}% confidence
                        </p>
                      </div>

                      <div className="hidden md:block flex-1 min-w-0">
                        <code className="text-xs bg-muted/50 px-2 py-1 rounded text-muted-foreground truncate block">
                          {finding.snippet}
                        </code>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedFinding(finding)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedRows.has(finding.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-border bg-muted/20"
                    >
                      <div className="p-6 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">AI Explanation</h4>
                          <p className="text-sm text-muted-foreground">{finding.explanation}</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Vulnerable Code</h4>
                            <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto border border-destructive/20">
                              <code>{finding.snippet}</code>
                            </pre>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2">Suggested Fix</h4>
                            <pre className="bg-green-500/10 p-3 rounded-lg text-xs overflow-x-auto border border-green-500/20">
                              <code>{finding.suggestedFix}</code>
                            </pre>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              onClick={() => handleMarkFalsePositive(finding.id)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              False Positive
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              onClick={() => handleAddToReport(finding.id)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Add to Report
                            </Button>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFinding(finding)}
                              className="bg-transparent"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              onClick={() => handleApplyFix(finding.id)}
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Apply Fix
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredFindings.length === 0 && (
          <div className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No findings match your current filters</p>
          </div>
        )}
      </Card>

      <FindingDetailsModal
        finding={selectedFinding}
        isOpen={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onMarkFalsePositive={handleMarkFalsePositive}
        onApplyFix={handleApplyFix}
        onAddToReport={handleAddToReport}
      />
    </>
  )
}
