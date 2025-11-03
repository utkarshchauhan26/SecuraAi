import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/components/providers/auth-provider"
import { ScanProvider } from "@/contexts/scan-context"
import { GlobalScanProgress } from "@/components/global-scan-progress"
import "./globals.css"

export const metadata: Metadata = {
  title: "SecuraAI - AI-Powered Security Scanner",
  description: "Scan your code. Fix vulnerabilities. Build securely. AI-powered security auditing with EU AI Code compliance.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>
          <ScanProvider>
            <GlobalScanProgress />
            <Suspense fallback={null}>{children}</Suspense>
          </ScanProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
