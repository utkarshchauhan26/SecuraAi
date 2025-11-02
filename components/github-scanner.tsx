"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Github, 
  GitBranch, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink,
  Lock,
  Unlock
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { motion, AnimatePresence } from "framer-motion"

interface GitHubScannerProps {
  onScanStart?: (scanId: string) => void
  onScanComplete?: (scanId: string) => void
  scanType?: "fast" | "deep"
}

const GITHUB_URL_REGEX = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/
const REPO_INFO_REGEX = /github\.com\/([\w-]+)\/([\w.-]+)\/?$/

export function GitHubScanner({ onScanStart, onScanComplete, scanType = "fast" }: GitHubScannerProps) {
  const [repoUrl, setRepoUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [scanId, setScanId] = useState<string | null>(null)

  // Validate GitHub URL (memoized)
  const isValidUrl = useMemo(() => GITHUB_URL_REGEX.test(repoUrl), [repoUrl])

  // Extract repo info (memoized)
  const repoInfo = useMemo(() => {
    if (!isValidUrl) return null
    const match = repoUrl.match(REPO_INFO_REGEX)
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, "")
      }
    }
    return null
  }, [repoUrl, isValidUrl])

  const handleScan = useCallback(async () => {
    setError(null)
    setSuccess(false)

    // Validation
    if (!repoUrl.trim()) {
      setError("Please enter a GitHub repository URL")
      return
    }

    if (!isValidUrl) {
      setError("Invalid GitHub URL. Format: https://github.com/owner/repo")
      return
    }

    if (!repoInfo) {
      setError("Could not extract repository information")
      return
    }

    try {
      setLoading(true)
      const response = await apiClient.scanRepository(repoUrl, branch, `GitHub Scan - ${new Date().toLocaleString()}`, scanType) as { data: { scanId: string }; success: boolean }
      
      setScanId(response.data.scanId)
      setSuccess(true)
      setError(null)
      
      // Start global scan tracking immediately
      onScanStart?.(response.data.scanId)

      // Reset form after successful start
      setTimeout(() => {
        setRepoUrl("")
        setBranch("main")
        setSuccess(false)
        setScanId(null)
      }, 1500)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start repository scan")
      console.error("Scan error:", err)
    } finally {
      setLoading(false)
    }
  }, [repoUrl, branch, isValidUrl, repoInfo, onScanStart])

  return (
    <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Scan GitHub Repository
        </CardTitle>
        <CardDescription>
          Analyze code directly from a GitHub repository
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Repository URL Input */}
        <div className="space-y-2">
          <Label htmlFor="repoUrl" className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            Repository URL
          </Label>
          <div className="relative">
            <Input
              id="repoUrl"
              type="url"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className={error && !isValidUrl ? "border-red-500" : ""}
              disabled={loading}
            />
            {repoInfo && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Public repositories only. Format: https://github.com/owner/repo
          </p>
        </div>

        {/* Repository Info Preview */}
        <AnimatePresence>
          {repoInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <Github className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-500">
                  <div className="flex items-center justify-between">
                    <span>
                      <strong>{repoInfo.owner}</strong> / <strong>{repoInfo.repo}</strong>
                    </span>
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 hover:underline"
                    >
                      View on GitHub
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Branch Selection */}
        <div className="space-y-2">
          <Label htmlFor="branch" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Branch
          </Label>
          <Select value={branch} onValueChange={setBranch} disabled={loading}>
            <SelectTrigger id="branch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">main</SelectItem>
              <SelectItem value="master">master</SelectItem>
              <SelectItem value="develop">develop</SelectItem>
              <SelectItem value="dev">dev</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the branch to scan
          </p>
        </div>

        {/* Repository Type - Always show as Public */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Unlock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Public Repository
            </span>
          </div>
          <Badge variant="secondary">
            Supported
          </Badge>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Alert - Minimal, auto-dismiss */}
        <AnimatePresence>
          {success && scanId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-500 text-sm">
                  ✨ Scan initiated! Check the progress bar above.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan Button */}
        <Button
          onClick={handleScan}
          disabled={loading || !repoUrl || !isValidUrl}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cloning & Scanning...
            </>
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              Start Scan
            </>
          )}
        </Button>

        {/* Info Box */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>How it works:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Repository is cloned securely to temporary storage</li>
              <li>Semgrep scans for vulnerabilities across all files</li>
              <li>AI generates explanations for each finding</li>
              <li>Repository is automatically deleted after scan</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
