# Frontend Authentication & API Integration Guide

## ✅ What Was Implemented

### 1. NextAuth Setup
- **Package**: `next-auth` with Next.js 13+ App Router support
- **Providers**: GitHub OAuth & Google OAuth
- **Session**: JWT-based strategy
- **Supabase Integration**: Automatic user sync with backend database

### 2. Authentication Flow

```
User → Sign In Page → OAuth Provider → NextAuth Callback → Supabase User Sync → Dashboard
```

#### Files Created:
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API route
- `app/auth/signin/page.tsx` - Beautiful sign-in page
- `app/auth/error/page.tsx` - Error handling page
- `components/providers/auth-provider.tsx` - Session provider wrapper
- `components/user-menu.tsx` - User dropdown menu
- `middleware.ts` - Route protection middleware
- `types/next-auth.d.ts` - TypeScript type extensions

### 3. Supabase Integration

#### Client-Side (`lib/supabase/client.ts`):
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
```

#### Server-Side (`lib/supabase/server.ts`):
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

### 4. API Client (`lib/api-client.ts`)

Complete API client with authentication:

```typescript
import { apiClient } from '@/lib/api-client'

// Upload file
const response = await apiClient.uploadFile(file, "My Project")

// Scan repository
const response = await apiClient.scanRepository("https://github.com/user/repo")

// Get user scans
const scans = await apiClient.getUserScans()

// Download PDF report
const blob = await apiClient.downloadPDF(scanId)
```

### 5. React Hooks (`hooks/use-api.ts`)

Easy-to-use hooks for data fetching:

```typescript
import { useScans, useScan, useReport } from '@/hooks/use-api'

function Dashboard() {
  const { scans, loading, error, refetch } = useScans()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return <div>{scans.map(scan => ...)}</div>
}
```

## 📋 Environment Variables Required

Add to `.env.local`:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# GitHub OAuth
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🔐 Setting Up OAuth Providers

### GitHub OAuth App

1. Go to **GitHub Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in:
   - Application name: `SecuraAI`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy **Client ID** and **Client Secret** to `.env.local`

### Google OAuth App

1. Go to **Google Cloud Console** → **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy **Client ID** and **Client Secret** to `.env.local`

## 🚀 Usage Examples

### 1. Protected Page

```typescript
// app/dashboard/page.tsx
import { useSession } from "next-auth/react"

export default function Dashboard() {
  const { data: session } = useSession()
  
  return <div>Welcome, {session?.user?.name}!</div>
}
```

### 2. Upload File Scan

```typescript
"use client"

import { apiClient } from "@/lib/api-client"
import { useState } from "react"

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    
    setLoading(true)
    try {
      const response = await apiClient.uploadFile(file, "My Project")
      console.log("Scan started:", response.scanId)
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload & Scan"}
      </button>
    </div>
  )
}
```

### 3. Display Scans List

```typescript
"use client"

import { useScans } from "@/hooks/use-api"

export function ScansList() {
  const { scans, loading, error, refetch } = useScans()

  if (loading) return <div>Loading scans...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {scans.map((scan) => (
        <div key={scan.id}>
          <h3>{scan.projectId}</h3>
          <p>Status: {scan.status}</p>
          <p>Risk Score: {scan.riskScore}/100</p>
          <p>Findings: {scan.filesScanned} files scanned</p>
        </div>
      ))}
    </div>
  )
}
```

### 4. Download PDF Report

```typescript
"use client"

import { useReport } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"

export function ReportView({ scanId }: { scanId: string }) {
  const { report, loading, downloadPDF } = useReport(scanId)

  const handleDownload = async () => {
    try {
      await downloadPDF()
      alert("PDF downloaded successfully!")
    } catch (error) {
      alert("Failed to download PDF")
    }
  }

  if (loading) return <div>Loading report...</div>

  return (
    <div>
      <h1>{report?.project.name}</h1>
      <p>Total Findings: {report?.results.summary.totalFindings}</p>
      <p>Security Score: {report?.results.summary.securityScore}/100</p>
      
      <Button onClick={handleDownload}>Download PDF Report</Button>
    </div>
  )
}
```

## 🎨 UI Components

### Sign-In Page
- **Route**: `/auth/signin`
- **Features**: GitHub & Google OAuth buttons, gradient background, responsive design

### User Menu
- **Location**: Top-right of dashboard
- **Features**: User avatar, name, email, sign-out button

### Protected Routes
- **Middleware**: Automatically redirects to `/auth/signin` if not authenticated
- **Routes**: All `/dashboard/*` paths are protected

## 🔄 Authentication Callbacks

The NextAuth configuration includes custom callbacks:

1. **signIn**: Creates user in Supabase if doesn't exist
2. **jwt**: Adds user ID and Supabase token to JWT
3. **session**: Adds custom properties to session object

## 📊 Type Safety

Full TypeScript support with types for:
- `Scan` - Scan object structure
- `Finding` - Vulnerability finding
- `Explanation` - AI explanation
- `Report` - Complete report with findings
- `ScanResponse` - API response structure

## 🔧 Next Steps

To integrate into your existing pages:

1. **Update Dashboard** (`app/dashboard/page.tsx`):
   ```typescript
   import { useScans } from '@/hooks/use-api'
   // Replace mock data with useScans()
   ```

2. **Update Reports Page** (`app/dashboard/reports/page.tsx`):
   ```typescript
   import { useReport } from '@/hooks/use-api'
   // Add PDF download button
   ```

3. **Update Upload Zone** (`components/upload-zone.tsx`):
   ```typescript
   import { apiClient } from '@/lib/api-client'
   // Use apiClient.uploadFile() instead of mock
   ```

## ✅ Testing Authentication

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/dashboard`
   - Should redirect to `/auth/signin`

3. Click "Continue with GitHub" or "Continue with Google"
   - Should redirect to OAuth provider
   - After authorization, should redirect back to `/dashboard`

4. Check browser console for session object:
   ```javascript
   console.log(session)
   ```

## 🐛 Troubleshooting

### "Invalid callback URL"
- Check `NEXTAUTH_URL` in `.env.local`
- Verify OAuth app callback URLs match

### "No authentication token available"
- Ensure user is signed in
- Check Supabase token in JWT callback

### "API Error: 401"
- Verify backend is running (`npm run dev` in `/backend`)
- Check JWT token is being sent in headers

## 📝 Summary

✅ **Authentication System Complete!**
- NextAuth with GitHub & Google OAuth
- Supabase user synchronization
- Protected routes with middleware
- Type-safe API client
- React hooks for data fetching
- Beautiful sign-in UI
- User menu component

**Ready for full frontend-backend integration!**
