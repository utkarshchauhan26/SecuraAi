"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { apiClient, type Scan, type Report } from "@/lib/api-client"

interface ScansResponse {
  success: boolean
  scans: Scan[]
}

interface ScanResponse {
  success: boolean
  scan: Scan
}

interface ReportResponse {
  success: boolean
  report: Report
}

export function useScans() {
  const { data: session, status } = useSession()
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchScans() {
      if (status === "loading") return
      if (!session) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await apiClient.getUserScans() as any
        // Backend returns { success: true, data: { scans: [...] } }
        setScans(response.data?.scans || response.scans || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch scans")
        setScans([])
      } finally {
        setLoading(false)
      }
    }

    fetchScans()
  }, [session, status])

  const refetch = async () => {
    if (!session) return

    try {
      setLoading(true)
      const response = await apiClient.getUserScans() as any
      // Backend returns { success: true, data: { scans: [...] } }
      setScans(response.data?.scans || response.scans || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch scans")
    } finally {
      setLoading(false)
    }
  }

  return { scans, loading, error, refetch }
}

export function useScan(scanId: string | null) {
  const { data: session, status } = useSession()
  const [scan, setScan] = useState<Scan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchScan() {
      if (status === "loading") return
      if (!session || !scanId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await apiClient.getScan(scanId) as ScanResponse
        setScan(response.scan || null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch scan")
        setScan(null)
      } finally {
        setLoading(false)
      }
    }

    fetchScan()
  }, [scanId, session, status])

  return { scan, loading, error }
}

export function useReport(scanId: string | null) {
  const { data: session, status } = useSession()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReport() {
      if (status === "loading") return
      if (!session || !scanId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await apiClient.getReport(scanId) as ReportResponse
        setReport(response.report || null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch report")
        setReport(null)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [scanId, session, status])

  const downloadPDF = async () => {
    if (!scanId) return

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
    } catch (err) {
      console.error("Failed to download PDF:", err)
      throw err
    }
  }

  return { report, loading, error, downloadPDF }
}
