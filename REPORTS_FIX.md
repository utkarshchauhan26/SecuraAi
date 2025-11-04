# 📄 REPORTS FIX - Making Reports Visible & Downloadable

## 🐛 Problems Found

1. ❌ **Backend `getUserScans` missing report URLs** - wasn't returning `report_url` field
2. ❌ **Wrong response format** - Frontend expected `{ data: { scans: [...] } }` but got `{ data: [...] }`
3. ❌ **Status not normalized** - lowercase "completed" instead of "COMPLETED"
4. ❌ **Missing fields** - `filesScanned`, `scanType`, `completedAt` not included

## ✅ Fixes Applied

### 1. **Backend: Fixed `getUserScans` Response**

**File:** `backend/controllers/scan-controller-github-actions.js`

**Changes:**
- ✅ Returns `report_url` in multiple formats (reportUrl, report_url, pdfUrl, pdf_url)
- ✅ Wraps scans in `{ data: { scans: [...] } }` format
- ✅ Normalizes status to UPPERCASE
- ✅ Includes all fields needed by reports page:
  - `filesScanned` (from file_count)
  - `scanType` (from scan_type)
  - `completedAt` (from finished_at)
  - `riskScore` (from risk_score)
  - `targetPath` (from repo_url)

**Response format:**
```json
{
  "success": true,
  "data": {
    "scans": [
      {
        "id": "uuid",
        "projectName": "MyProject",
        "status": "COMPLETED",
        "totalFindings": 12,
        "criticalCount": 3,
        "highCount": 5,
        "mediumCount": 3,
        "lowCount": 1,
        "createdAt": "2025-11-04...",
        "finishedAt": "2025-11-04...",
        "completedAt": "2025-11-04...",
        "reportUrl": "https://supabase.co/storage/.../report.pdf",
        "report_url": "https://...",
        "pdfUrl": "https://...",
        "riskScore": 85,
        "filesScanned": 150,
        "scanType": "fast"
      }
    ]
  }
}
```

## 📊 How Reports Work

### Report Generation Flow

```
GitHub Actions Workflow
  ↓
1. Scan completes
  ↓
2. Generate PDF report (pdf-report.service.js)
  ↓
3. Upload to Supabase Storage
  ↓
4. Update scans.report_url with public URL
  ↓
5. Frontend fetches scans list
  ↓
6. Shows "Download PDF" button if report_url exists
```

### Frontend Flow

```
Reports Page (/dashboard/reports)
  ↓
1. Calls useScans() hook
  ↓
2. Hook calls apiClient.getUserScans()
  ↓
3. Backend returns scans with report_url
  ↓
4. Frontend displays scans list
  ↓
5. User clicks "Download PDF"
  ↓
6. getPdfUrl(scan) returns scan.report_url
  ↓
7. Direct download from Supabase public URL
```

## 🧪 Testing Checklist

### 1. **Check Supabase Data**

Run this query in Supabase SQL Editor:

```sql
SELECT 
  id,
  status,
  total_findings,
  report_url,
  created_at,
  finished_at
FROM scans
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** 
- `report_url` should have a value like: `https://xxx.supabase.co/storage/v1/object/public/reports/...pdf`
- `status` should be 'completed' for finished scans

### 2. **Test Backend Endpoint**

```bash
# Get your auth token from browser console
# Then run:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend.onrender.com/api/scans/list
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "scans": [
      {
        "id": "...",
        "status": "COMPLETED",
        "reportUrl": "https://..."
      }
    ]
  }
}
```

### 3. **Test Frontend**

1. Open `/dashboard/reports`
2. Check browser console for logs
3. Verify scans appear in the list
4. For completed scans, "Download PDF" button should be visible
5. Click "Download PDF"
6. PDF should download directly

### 4. **Debug Logs to Watch**

**Backend:**
```
📊 Fetched 3 scans for user abc-123
```

**Frontend Console:**
```
Scans loaded: [{ id: '...', status: 'COMPLETED', reportUrl: 'https://...' }]
```

## 🔧 If Reports Still Don't Show

### Issue: No scans in reports page

**Cause:** Backend not returning scans or frontend not parsing response

**Fix:**
1. Check browser console for errors
2. Check Network tab → `/api/scans/list` request
3. Verify response has `{ data: { scans: [...] } }` structure
4. Check backend logs for errors

### Issue: Download button doesn't appear

**Cause:** `report_url` is null in database

**Fix:**
1. Check if GitHub Actions uploaded the report
2. Verify Supabase Storage bucket exists
3. Check GitHub Actions workflow logs
4. Manually upload a test PDF to Supabase Storage
5. Update scan record:
   ```sql
   UPDATE scans 
   SET report_url = 'https://xxx.supabase.co/storage/v1/object/public/reports/test.pdf'
   WHERE id = 'YOUR_SCAN_ID';
   ```

### Issue: Download fails with 404

**Cause:** Report URL is invalid or file doesn't exist

**Fix:**
1. Copy `report_url` from database
2. Open in browser to verify file exists
3. Check Supabase Storage RLS policies allow public read
4. Run this SQL to fix RLS:
   ```sql
   -- Allow public read access to reports bucket
   CREATE POLICY "Public reports are viewable by everyone"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'reports' );
   ```

### Issue: PDF downloads but is empty/corrupted

**Cause:** PDF generation failed or incomplete upload

**Fix:**
1. Check GitHub Actions logs for PDF generation errors
2. Verify `pdf-report.service.js` is working correctly
3. Test PDF generation locally:
   ```bash
   cd backend
   node -e "
   const service = require('./services/pdf-report.service');
   service.generateScanReport('SCAN_ID', 'USER_ID')
     .then(r => console.log('✅ PDF generated:', r))
     .catch(e => console.error('❌ Error:', e));
   "
   ```

## 📝 Required Database Columns

The `scans` table must have:

```sql
-- Core fields
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
project_id UUID
status TEXT
created_at TIMESTAMP
started_at TIMESTAMP
finished_at TIMESTAMP

-- Progress tracking
progress INTEGER DEFAULT 0
file_count INTEGER DEFAULT 0
processed_files INTEGER DEFAULT 0
current_file TEXT

-- Findings summary
total_findings INTEGER DEFAULT 0
critical_count INTEGER DEFAULT 0
high_count INTEGER DEFAULT 0
medium_count INTEGER DEFAULT 0
low_count INTEGER DEFAULT 0

-- Report
report_url TEXT  ← IMPORTANT: This must exist and be populated!

-- Additional
risk_score INTEGER DEFAULT 0
scan_type TEXT DEFAULT 'fast'
error_message TEXT
```

## 🎯 Expected Behavior After Fix

1. ✅ **Reports page loads** - Shows list of all scans
2. ✅ **Completed scans show download button** - If `report_url` exists
3. ✅ **Clicking download works** - PDF downloads directly from Supabase
4. ✅ **Status displays correctly** - "COMPLETED" not "completed"
5. ✅ **All scan details shown** - Findings count, risk score, dates, etc.

## 🚀 Deployment

1. **Backend changes** are in `scan-controller-github-actions.js`
2. **No frontend changes** needed (already compatible)
3. **Restart backend** to apply changes
4. **Test** with existing completed scans

## 📋 Files Modified

1. `backend/controllers/scan-controller-github-actions.js` - Fixed getUserScans endpoint
2. `REPORTS_FIX.md` - This documentation

---

**Status:** ✅ Ready to test

**Next Step:** Restart backend and visit `/dashboard/reports`
