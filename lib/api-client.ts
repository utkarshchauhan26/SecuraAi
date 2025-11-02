import { getSession } from "next-auth/react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

interface RequestOptions extends RequestInit {
  requireAuth?: boolean
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await getSession()
    
    if (!session?.user) {
      throw new Error("No authentication session available")
    }

    // Use the custom API token that backend can verify
    // This is a standard JWT signed with NEXTAUTH_SECRET
    let token = (session as any).apiToken || (session as any).supabaseToken
    
    if (!token) {
      throw new Error("No authentication token available in session")
    }

    console.log("Using API token for backend authentication")

    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requireAuth = true, ...fetchOptions } = options

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    }

    if (requireAuth) {
      const authHeaders = await this.getAuthHeaders()
      Object.assign(headers, authHeaders)
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || `API Error: ${response.status}`)
    }

    // Handle no content responses
    if (response.status === 204) {
      return {} as T
    }

    // Handle blob responses (for file downloads)
    if (response.headers.get("content-type")?.includes("application/pdf")) {
      return response.blob() as unknown as T
    }

    return response.json()
  }

  // Generic HTTP methods
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    })
  }

  async post<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // Scan endpoints
  async uploadFile(file: File, projectName?: string, scanType: "fast" | "deep" = "fast") {
    console.log('📤 API Client uploadFile - scanType:', scanType)
    
    const formData = new FormData()
    formData.append("codeFile", file) // Match backend expectation
    formData.append("scanType", scanType) // Add scan type
    if (projectName) {
      formData.append("projectName", projectName)
    }
    
    console.log('📋 FormData contents:', { 
      fileName: file.name, 
      projectName, 
      scanType 
    })

    const authHeaders = await this.getAuthHeaders()
    delete (authHeaders as any)["Content-Type"] // Let browser set it for multipart

    const response = await fetch(`${this.baseUrl}/scans/file`, { // Correct endpoint
      method: "POST",
      headers: authHeaders,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to upload file" }))
      throw new Error(error.message || "Failed to upload file")
    }

    return response.json()
  }

  async scanRepository(repoUrl: string, branch?: string, projectName?: string, scanType: "fast" | "deep" = "fast") {
    return this.request("/scans/repo", { // Correct endpoint
      method: "POST",
      body: JSON.stringify({
        repoUrl,
        branch,
        projectName,
        scanType,
      }),
    })
  }

  async getScan(scanId: string) {
    return this.request(`/scans/status/${scanId}`) // Correct endpoint - matches backend
  }

  async getUserScans() {
    return this.request("/scans/list") // Correct endpoint
  }

  // Report endpoints
  async getReport(scanId: string) {
    return this.request(`/reports/${scanId}`)
  }

  async downloadPDF(scanId: string): Promise<Blob> {
    const session = await getSession()
    
    if (!session?.user) {
      throw new Error("Authentication required")
    }

    // Debug: Log session structure (remove in production)
    console.log('Session keys:', Object.keys(session))
    console.log('Has apiToken:', 'apiToken' in session)
    console.log('Has supabaseToken:', 'supabaseToken' in session)

    // Use the same token extraction logic as getAuthHeaders
    let token = (session as any).apiToken || (session as any).supabaseToken
    
    if (!token) {
      console.error('Session object:', { ...session, user: session.user?.email })
      throw new Error("No authentication token available in session")
    }
    
    console.log('Using token for PDF download (first 20 chars):', token.substring(0, 20))
    
    const headers: HeadersInit = {
      "Authorization": `Bearer ${token}`
    }
    
    const response = await fetch(`${this.baseUrl}/reports/${scanId}/pdf`, {
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PDF download failed:', response.status, errorText)
      
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: response.statusText || 'Failed to download PDF' }
      }
      
      throw new Error(error.message || `Failed to download PDF: ${response.status}`)
    }

    return response.blob()
  }

  async getReportStatus(scanId: string) {
    return this.request(`/reports/${scanId}/status`)
  }

  // Project endpoints (if needed)
  async getProjects() {
    return this.request("/projects")
  }

  async getProject(projectId: string) {
    return this.request(`/projects/${projectId}`)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

// Type definitions for API responses
export interface ScanResponse {
  success: boolean
  scanId: string
  message: string
}

export interface Scan {
  id: string
  projectId: string
  scanType: "file" | "repository"
  status: "pending" | "running" | "completed" | "failed"
  riskScore: number
  filesScanned: number
  linesScanned: number
  createdAt: string
  completedAt?: string
  targetPath?: string
}

export interface Finding {
  id: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  checkId: string
  message: string
  filePath: string
  line: number
  column?: number
  code?: string
  category: string
  explanations?: Explanation[]
}

export interface Explanation {
  id: string
  summary: string
  whyItMatters: string
  fixSteps: string
  bestPractices: string
  preventionTips: string
  generatedBy: string
  cached: boolean
}

export interface Report {
  id: string
  createdAt: string
  completedAt?: string
  status: string
  scanType: string
  project: {
    id: string
    name: string
  }
  results: {
    findings: Finding[]
    summary: {
      securityScore: number
      totalFindings: number
      findingsBySeverity: {
        critical: number
        high: number
        medium: number
        low: number
      }
    }
  }
}
