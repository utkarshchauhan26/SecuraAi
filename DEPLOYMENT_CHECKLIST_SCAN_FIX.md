# 🚀 DEPLOYMENT CHECKLIST - Scan Flow Fix

## Pre-Deployment Verification

### ✅ Code Changes Verified

- [x] `backend/controllers/scan-controller-github-actions.js` - Fixed scan endpoints
- [x] `hooks/use-scan-polling.ts` - Simplified polling logic
- [x] `backend/services/progress-tracker.service.js` - Added clarification comment

### ✅ Backend Changes Summary

**File:** `backend/controllers/scan-controller-github-actions.js`

1. **`getScanStatus` endpoint:**
   - ✅ Queries Supabase directly (no cache)
   - ✅ Returns uppercase status
   - ✅ Includes all progress fields
   - ✅ Cache-Control headers added
   - ✅ Calculates progress from files ratio

2. **`getScanProgress` endpoint:**
   - ✅ Queries Supabase directly
   - ✅ Returns detailed progress data
   - ✅ Cache-Control headers added
   - ✅ Maps status to user-friendly messages

### ✅ Frontend Changes Summary

**File:** `hooks/use-scan-polling.ts`

1. **Polling logic:**
   - ✅ Uses `/scans/status/:id` endpoint only
   - ✅ Direct mapping from API response
   - ✅ No complex transformations needed
   - ✅ Enhanced logging for debugging

---

## 🔧 Deployment Steps

### 1. Environment Variables

#### Backend (Render)

Verify these environment variables are set in Render dashboard:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
PORT=5000
NODE_ENV=production

# GitHub Actions
GITHUB_TOKEN=ghp_xxx
GITHUB_REPO_OWNER=your-username
GITHUB_REPO_NAME=SecuraAi

# Other required vars
NEXTAUTH_SECRET=xxx
DATABASE_URL=xxx
```

#### Frontend (Vercel)

Update environment variable in Vercel dashboard:

```env
# Update this to your Render backend URL
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api

# Other vars
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

### 2. Backend Deployment (Render)

#### Option A: Manual Deploy via Render Dashboard

1. Go to Render dashboard
2. Select your backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment to complete (~2-3 minutes)
5. Check logs for any errors

#### Option B: Git Push (Auto-deploy)

```bash
# In Project2.0 directory
git add .
git commit -m "fix: Scan flow endpoints now query Supabase directly with proper caching headers"
git push origin main
```

Render will auto-deploy if connected to GitHub.

#### Verify Backend Deployment

```bash
# Test the endpoint (replace with your Render URL)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend.onrender.com/api/scans/status/SCAN_ID
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "COMPLETED",  // ← UPPERCASE
    "progress": 100,        // ← Real progress
    "file_count": 150,
    "processed_files": 150,
    "findings_count": 12,
    "report_url": "https://..."
  }
}
```

---

### 3. Frontend Deployment (Vercel)

#### Option A: Vercel Dashboard

1. Go to Vercel dashboard
2. Select your project
3. Go to "Deployments" tab
4. Click "Redeploy" on latest deployment
5. Check "Use existing build cache" is OFF
6. Click "Redeploy"

#### Option B: Git Push (Auto-deploy)

```bash
# Same commit will trigger Vercel deploy
git push origin main
```

#### Verify Frontend Deployment

1. Open your app: `https://your-app.vercel.app`
2. Open browser console (F12)
3. Start a scan
4. Watch for these logs:
   ```
   📡 Raw scan data from backend: {status: 'RUNNING', progress: 30, ...}
   📊 Mapped scan status: {status: 'RUNNING', progress: 30}
   ✅ Scan COMPLETED - stopping polling
   ```

---

### 4. Supabase Setup

Verify progress tracking columns exist:

#### Check Schema

Run this in Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scans' 
  AND column_name IN ('progress', 'file_count', 'processed_files', 'current_file')
ORDER BY column_name;
```

Expected result: 4 rows showing these columns.

#### If Columns Missing

Run the migration:

```sql
-- Add progress tracking columns
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_files INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_file TEXT;
```

---

## 🧪 Post-Deployment Testing

### 1. Test Complete Scan Flow

1. **Start a scan:**
   - Go to GitHub scanner
   - Enter a repository URL
   - Click "Start Scan"

2. **Watch progress in real-time:**
   - Progress bar should appear
   - Status should show: QUEUED → RUNNING → COMPLETED
   - Progress should reach 100%

3. **Verify completion:**
   - "View Report" button appears
   - Findings are displayed in dashboard
   - Report PDF is downloadable

### 2. Check Console Logs

**Backend (Render Logs):**

```
📊 Scan status for xxx: QUEUED (0%) - Findings: 0
📊 Scan status for xxx: RUNNING (30%) - Findings: 0
📊 Scan status for xxx: RUNNING (67%) - Findings: 8
📊 Scan status for xxx: COMPLETED (100%) - Findings: 12
```

**Frontend (Browser Console):**

```
📡 Raw scan data from backend: {status: 'RUNNING', progress: 67, findings_count: 8}
📊 Mapped scan status: {status: 'RUNNING', progress: 67, findings: 8}
✅ Scan COMPLETED - stopping polling
```

### 3. Verify Database Updates

Run this to check Supabase:

```bash
# In backend directory
node test-scan-flow.js
```

Expected:
```
✅ Progress columns exist
✅ Found scans with proper status
✅ Reports are accessible
```

---

## 🐛 Troubleshooting

### Issue: Frontend still stuck at 30%

**Cause:** Old cached response from Render

**Fix:**
1. Check Render logs for cache headers:
   ```
   Cache-Control: no-store, no-cache, must-revalidate, private
   ```
2. Clear browser cache: Ctrl+Shift+Delete
3. Hard refresh: Ctrl+Shift+R
4. Try in incognito mode

### Issue: Status shows "running" instead of "RUNNING"

**Cause:** Old backend code still deployed

**Fix:**
1. Verify latest commit is deployed in Render
2. Check backend logs for:
   ```
   📊 Scan status for xxx: RUNNING (not 'running')
   ```
3. Redeploy backend manually

### Issue: Progress is always 30%

**Cause:** GitHub Actions not updating `processed_files` in Supabase

**Fix:**
1. Check GitHub Actions workflow logs
2. Verify Supabase credentials in GitHub Secrets
3. Ensure workflow updates these fields:
   - `progress`
   - `file_count`
   - `processed_files`
   - `current_file`

### Issue: Reports don't appear

**Cause:** `report_url` not set in Supabase

**Fix:**
1. Check GitHub Actions workflow uploads report
2. Verify Supabase Storage bucket exists
3. Check RLS policies allow public read for reports

---

## ✅ Final Verification

### Checklist

- [ ] Backend deployed to Render successfully
- [ ] Frontend deployed to Vercel successfully
- [ ] Environment variables updated
- [ ] Test scan completes successfully
- [ ] Progress updates in real-time (not stuck at 30%)
- [ ] Status transitions: QUEUED → RUNNING → COMPLETED
- [ ] Progress reaches 100% when done
- [ ] Findings appear in dashboard
- [ ] Report PDF is accessible
- [ ] No errors in browser console
- [ ] No errors in Render logs
- [ ] GitHub Actions workflow runs successfully

### Success Criteria

✅ **Scan Flow Working:**
- User clicks "Start Scan"
- Progress bar appears immediately
- Status shows "QUEUED" → "RUNNING"
- Progress increases: 0% → 30% → 67% → 100%
- Status shows "COMPLETED" when done
- Reports and findings are visible

---

## 📊 Monitoring

### Logs to Watch

**Render (Backend):**
```bash
# View live logs in Render dashboard
https://dashboard.render.com/web/[your-service]/logs
```

Look for:
- `📊 Scan status for xxx: COMPLETED (100%)`
- No error messages
- Cache headers being set

**Vercel (Frontend):**
```bash
# View logs in Vercel dashboard
https://vercel.com/[your-project]/deployments
```

Look for:
- No build errors
- No runtime errors
- Successful API calls to backend

**GitHub Actions:**
```bash
# View workflow runs
https://github.com/[your-repo]/actions
```

Look for:
- Successful workflow runs
- Supabase updates working
- Report uploads successful

---

## 🎉 Deployment Complete!

If all checkboxes are ticked, your scan flow is now working correctly!

**Expected behavior:**
1. ✅ Scans start immediately when user clicks button
2. ✅ Progress updates in real-time (no stuck at 30%)
3. ✅ Status changes properly (QUEUED → RUNNING → COMPLETED)
4. ✅ Reports appear automatically when scan finishes
5. ✅ No caching issues on Render
6. ✅ All data fresh from Supabase

---

## 📞 Support

If issues persist:

1. Check `SCAN_FLOW_FIX_COMPLETE.md` for detailed technical info
2. Run `node backend/test-endpoints.js` to verify responses
3. Run `node test-scan-flow.js` to check Supabase data
4. Review browser console and Render logs for errors

**Last Updated:** November 4, 2025
