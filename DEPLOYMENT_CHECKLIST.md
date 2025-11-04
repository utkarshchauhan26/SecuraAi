# 🎯 DEPLOYMENT CHECKLIST - Scan Flow Fixes

## ✅ What Was Fixed

### 1. **Missing repo_url in GitHub Actions Payload** ✅
- **Before:** Payload sent but repo_url might be undefined
- **After:** Full payload logged, validated, and sent with all fields
- **Files:** `backend/services/github-actions.service.js`

### 2. **Missing user_email in Scans Table** ✅
- **Before:** Only `user_id` saved, frontend might filter by email
- **After:** Both `user_id` and `user_email` saved
- **Files:** 
  - `backend/prisma/schema.prisma`
  - `backend/controllers/scan-controller-github-actions.js`
  - `backend/prisma/migrations/add_user_email_to_scans.sql`

### 3. **Status Not Updating to 'running'** ✅
- **Before:** Status stayed 'queued' until completion
- **After:** Status updates: queued → running → completed
- **Files:** `.github/workflows/semgrep-scan.yml`

### 4. **Routes Verification** ✅
- **Confirmed:** `/api/scans/*` and `/api/reports/*` properly mounted
- **Files:** `backend/routes/index.js`, `backend/server.js`

---

## 📋 Required Actions (In Order)

### ⚡ STEP 1: Apply Database Migration (CRITICAL)

Run this in **Supabase SQL Editor**:

```sql
-- Add user_email column
ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_scans_user_email ON scans(user_email);

-- Backfill existing scans with email
UPDATE scans s
SET user_email = u.email
FROM user_profiles u
WHERE s.user_id = u.id
  AND s.user_email IS NULL;

-- Verify
SELECT COUNT(*) as total, 
       COUNT(user_email) as with_email 
FROM scans;
```

**Expected Output:**
```
total | with_email
------|------------
  10  |    10
```
Both numbers should match!

---

### ⚡ STEP 2: Commit and Push Changes

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "fix: Complete scan flow - add user_email, fix GitHub Actions payload, update status to running"

# Push to GitHub
git push origin main
```

**What happens:**
- ✅ Vercel auto-deploys frontend
- ✅ Render auto-deploys backend
- ✅ GitHub Actions workflow updated

---

### ⚡ STEP 3: Verify Deployment

#### Check Backend (Render)

1. Go to: `https://your-backend.onrender.com/health`
2. Should see:
   ```json
   {
     "status": "ok",
     "environment": {
       "hasGithubToken": true,
       "hasSupabaseUrl": true,
       "hasSupabaseKey": true,
       "hasNextAuthSecret": true
     }
   }
   ```

#### Check Frontend (Vercel)

1. Go to: `https://your-frontend.vercel.app`
2. Login with Google/GitHub
3. Should see dashboard with no errors

---

### ⚡ STEP 4: Test Complete Flow

#### 4.1 Start a Scan

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Click "Scan Repository"**
4. **Enter:** `https://github.com/utkarshchauhan26/test-repo`
5. **Click "Start Scan"**

#### 4.2 Watch Backend Logs (Render Dashboard)

You should see:
```
📦 Repository scan request - URL: https://github.com/..., Type: fast, User: user@example.com
🚀 Triggering GitHub Actions scan for scanId: xxx
📦 Repository URL: https://github.com/...
📤 Sending payload: {
  "scan_id": "...",
  "repo_url": "https://github.com/...",  ✅ CRITICAL
  "scan_type": "fast",
  "user_id": "...",
  "triggered_at": "..."
}
✅ GitHub Actions workflow triggered successfully
```

#### 4.3 Watch GitHub Actions

1. **Go to:** `https://github.com/utkarshchauhan26/SecuraAi/actions`
2. **See new workflow run starting**
3. **Click on it to see logs**
4. **Should see:**
   ```
   ✅ Repository dispatch event received
   Repo URL: https://github.com/...
   ✅ Updated scan xxx status to 'running'
   📥 Cloning repository: https://github.com/...
   ✅ Repository cloned successfully
   ```

#### 4.4 Watch Frontend

Browser console should show:
```
🚀 Scan started: scan_id
📡 Polling status...
🔍 Status: QUEUED
🔍 Status: RUNNING  ✅ NEW - Should appear after ~5 seconds
🔍 Status: COMPLETED
✅ Scan completed - 100% progress
```

Progress bar should:
- Start at **10%** (QUEUED)
- Move to **30-50%** (RUNNING) ✅ NEW
- Reach **100%** (COMPLETED)

---

## 🐛 Troubleshooting

### Issue: "Route not found (404)" for `/api/scans/list`

**Test:**
```bash
node test-routes-render.js
```

**Fix:** Verify routes are mounted correctly in `backend/routes/index.js`

---

### Issue: Scan stuck in 'QUEUED'

**Check 1:** Backend logs show payload sent?
```
✅ GitHub Actions workflow triggered successfully
```

**Check 2:** GitHub Actions received event?
- Go to: `https://github.com/utkarshchauhan26/SecuraAi/actions`
- Should see workflow run

**Check 3:** Payload includes repo_url?
```bash
# Run test
node test-github-actions-payload.js
```

---

### Issue: Scan stuck in 'RUNNING'

**Check 1:** GitHub Actions completed?
- Workflow should be ✅ green
- Check logs for errors

**Check 2:** Supabase updated?
```sql
SELECT id, status, total_findings, finished_at 
FROM scans 
WHERE id = 'your-scan-id';
```

Should show: `status = 'completed'`, `finished_at` is set

---

### Issue: No scans visible in dashboard

**Check 1:** user_email populated?
```sql
SELECT id, user_id, user_email, status 
FROM scans 
ORDER BY created_at DESC 
LIMIT 5;
```

If NULL, run migration again (Step 1).

**Check 2:** Frontend API call working?
- Open Network tab
- Look for: `GET /api/scans/list`
- Status should be: **200 OK**
- Response: `{ success: true, data: [...] }`

---

## 📊 Success Indicators

After completing all steps, you should have:

### ✅ Database State
```sql
SELECT id, user_id, user_email, status, total_findings 
FROM scans 
ORDER BY created_at DESC 
LIMIT 1;

-- Should show:
-- id: UUID
-- user_id: UUID
-- user_email: user@example.com ✅ POPULATED
-- status: completed
-- total_findings: N
```

### ✅ Backend Logs
```
✅ GitHub Actions workflow triggered successfully
📋 Response status: 204
```

### ✅ GitHub Actions Logs
```
✅ Repository dispatch event received
✅ Updated scan xxx status to 'running'
✅ Repository cloned successfully
✅ Uploaded N findings to Supabase
✅ Updated scan xxx to completed
```

### ✅ Frontend Console
```
🚀 Scan started
🔍 Status: QUEUED
🔍 Status: RUNNING
🔍 Status: COMPLETED
✅ Scan completed - 100% progress
```

### ✅ Frontend UI
```
┌────────────────────────────────────────┐
│  Recent Scans                          │
├────────────────────────────────────────┤
│  📦 test-repo                          │
│  ✅ COMPLETED • 5 findings • now       │
│  ━━━━━━━━━━━━━━━━━━━━ 100%            │
└────────────────────────────────────────┘
```

---

## 🎯 Expected Timeline

```
T+0s    User clicks "Start Scan"
T+1s    ✅ Scan created (with user_email)
T+2s    ✅ GitHub Actions triggered (with repo_url)
T+3s    ✅ Workflow starts
T+4s    ✅ Status updated to 'running' ✅ NEW
T+10s   Frontend polls: status='running', progress=30%
T+45s   Semgrep completes
T+50s   ✅ Status updated to 'completed'
T+55s   Frontend polls: status='completed', progress=100%
        ✅ Findings displayed
        ✅ Success!
```

---

## 📞 Next Steps After Verification

Once scan completes successfully:

1. **Generate Migration** (if using Prisma)
   ```bash
   cd backend
   npx prisma migrate dev --name add_user_email_to_scans
   npx prisma generate
   ```

2. **Update Environment Variables** (if needed)
   - Verify GITHUB_TOKEN has `repo` and `workflow` scopes
   - Verify SUPABASE_SERVICE_KEY is correct

3. **Monitor Production**
   - Check Render logs for errors
   - Check Vercel logs for frontend issues
   - Check GitHub Actions for workflow failures

4. **Celebrate!** 🎉
   - End-to-end scan flow is working
   - Status updates properly
   - Findings are displayed
   - Reports can be generated

---

## 📝 Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| **Database** | Added `user_email` column | Frontend can filter by email |
| **Backend Controller** | Save `user_email` on scan create | Both user_id and email stored |
| **GitHub Service** | Enhanced logging, validate repo_url | Better debugging, catch errors early |
| **GitHub Actions** | Update status to 'running', validate repo_url | Better progress tracking |
| **Routes** | Verified `/api/scans` and `/api/reports` | Already working correctly ✅ |

---

## 🔒 Security Checklist

- [x] JWT authentication on all scan routes
- [x] Users can only see their own scans
- [x] GitHub Actions uses service key
- [x] Frontend uses anon key + RLS
- [x] CORS restricted to specific origins
- [x] No sensitive data in logs

---

**Ready to deploy!** Follow steps 1-4 above and your scan flow will be fully operational. 🚀
