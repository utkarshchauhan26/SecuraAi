"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Copy, ExternalLink, AlertTriangle, CheckCircle, FileText, Lightbulb, Code, Shield } from "lucide-react"
import { useState } from "react"

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
}

interface FindingDetailsModalProps {
  finding: Finding | null
  isOpen: boolean
  onClose: () => void
  onMarkFalsePositive: (id: string) => void
  onApplyFix: (id: string) => void
  onAddToReport: (id: string) => void
}

export function FindingDetailsModal({
  finding,
  isOpen,
  onClose,
  onMarkFalsePositive,
  onApplyFix,
  onAddToReport,
}: FindingDetailsModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  if (!finding) return null

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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case "low":
        return <Shield className="w-4 h-4 text-blue-400" />
      default:
        return <Shield className="w-4 h-4" />
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(type)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const formatCode = (code: string) => {
    // Simple syntax highlighting for demonstration
    return code
      .replace(
        /(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|const|let|var|function|if|else|return)/g,
        '<span class="text-blue-400">$1</span>',
      )
      .replace(/('[^']*'|"[^"]*")/g, '<span class="text-green-400">$1</span>')
      .replace(/(\d+)/g, '<span class="text-orange-400">$1</span>')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden glassmorphism">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                {getSeverityIcon(finding.severity)}
                <DialogTitle className="text-xl font-bold">{finding.rule}</DialogTitle>
                <Badge className={getSeverityColor(finding.severity)}>{finding.severity.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>
                    {finding.file}:{finding.line}
                  </span>
                </span>
                <span className="flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>{finding.confidence}% confidence</span>
                </span>
                {finding.cwe && (
                  <span className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>CWE-{finding.cwe}</span>
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 glassmorphism">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="code">Code Context</TabsTrigger>
              <TabsTrigger value="fix">Suggested Fix</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              <TabsContent value="overview" className="space-y-4">
                <Card className="glassmorphism p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-accent" />
                    <h3 className="font-medium">AI Explanation</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{finding.explanation}</p>
                </Card>

                {finding.impact && (
                  <Card className="glassmorphism p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <h3 className="font-medium">Potential Impact</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{finding.impact}</p>
                  </Card>
                )}

                <Card className="glassmorphism p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Code className="w-4 h-4 text-primary" />
                      <h3 className="font-medium">Vulnerable Code</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(finding.snippet, "vulnerable")}>
                      {copiedCode === "vulnerable" ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto border border-destructive/20">
                    <code dangerouslySetInnerHTML={{ __html: formatCode(finding.snippet) }} />
                  </pre>
                </Card>
              </TabsContent>

              <TabsContent value="code" className="space-y-4">
                <Card className="glassmorphism p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium">Full Context</h3>
                    <span className="text-xs text-muted-foreground">
                      {finding.file}:{finding.line}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {finding.context?.before && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Before (context)</p>
                        <pre className="bg-muted/30 p-2 rounded text-xs text-muted-foreground">
                          <code>{finding.context.before.join("\n")}</code>
                        </pre>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-destructive mb-1">Vulnerable line {finding.line}</p>
                      <pre className="bg-destructive/10 p-2 rounded text-xs border border-destructive/20">
                        <code dangerouslySetInnerHTML={{ __html: formatCode(finding.snippet) }} />
                      </pre>
                    </div>

                    {finding.context?.after && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">After (context)</p>
                        <pre className="bg-muted/30 p-2 rounded text-xs text-muted-foreground">
                          <code>{finding.context.after.join("\n")}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="fix" className="space-y-4">
                <Card className="glassmorphism p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <h3 className="font-medium">Recommended Fix</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(finding.suggestedFix, "fix")}>
                      {copiedCode === "fix" ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <pre className="bg-green-500/10 p-3 rounded-lg text-xs overflow-x-auto border border-green-500/20">
                    <code dangerouslySetInnerHTML={{ __html: formatCode(finding.suggestedFix) }} />
                  </pre>
                </Card>

                <Card className="glassmorphism p-4">
                  <h3 className="font-medium mb-2">Implementation Steps</h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Replace the vulnerable code with the suggested fix</li>
                    <li>Test the functionality to ensure it works as expected</li>
                    <li>Run additional security tests to verify the fix</li>
                    <li>Update any related documentation or comments</li>
                  </ol>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="glassmorphism p-4">
                    <h3 className="font-medium mb-3">Security Classification</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Severity:</span>
                        <Badge className={getSeverityColor(finding.severity)}>{finding.severity.toUpperCase()}</Badge>
                      </div>
                      {finding.cwe && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CWE:</span>
                          <span>CWE-{finding.cwe}</span>
                        </div>
                      )}
                      {finding.owasp && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">OWASP:</span>
                          <span>{finding.owasp}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span>{finding.confidence}%</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="glassmorphism p-4">
                    <h3 className="font-medium mb-3">File Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">File:</span>
                        <span className="truncate ml-2">{finding.file}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Line:</span>
                        <span>{finding.line}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rule:</span>
                        <span>{finding.rule}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkFalsePositive(finding.id)}
              className="bg-transparent"
            >
              <X className="w-4 h-4 mr-2" />
              False Positive
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAddToReport(finding.id)} className="bg-transparent">
              <FileText className="w-4 h-4 mr-2" />
              Add to Report
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="bg-transparent">
              <ExternalLink className="w-4 h-4 mr-2" />
              View in Editor
            </Button>
            <Button onClick={() => onApplyFix(finding.id)} className="bg-primary hover:bg-primary/90">
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Fix
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
