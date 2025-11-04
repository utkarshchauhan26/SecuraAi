# 🧪 TESTING CHECKLIST - Scan Flow Verification

##  Prerequisites
- [ ] Backend running on `localhost:5000`
- [ ] Frontend running on `localhost:3000`
- [ ] Logged in via Google/GitHub OAuth
- [ ] Browser DevTools console open

---

## ✅ Test 1: Backend Health Check

**Open Terminal:**
```bash
curl http://localhost:5000/health
```

**Expected Response:**
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

---

## ✅ Test 2: Check Recent Scans

**Browser Console:**
```javascript
// Get your session token
const session = await fetch('/api/auth/session').then(r => r.json());
console.log('Session:', session);

// Fetch recent scans
const response = await fetch('http://localhost:5000/api/scans/list', {
  headers: {
    'Authorization': `Bearer ${session.apiToken}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
console.log('Recent Scans:', data);
```

**Expected:**
- Should return array of your recent scans
- Each scan should have `id`, `status`, `projectName`, `totalFindings`

---

## ✅ Test 3: Trigger a New Scan

**In Frontend UI:**
1. Go to Dashboard
2. Click "Scan Repository"
3. Enter: `https://github.com/your-username/test-repo`
4. Click "Start Scan"

**Watch Browser Console - You Should See:**
```
🚀 ========= STARTING SCAN =========
🚀 Scan ID: [uuid]
🔍 Previous state: { ... }
✅ Scan started successfully
📡 Starting scan polling for: [scanId]
🔍 Raw API response status: queued string
✅ Normalized status: QUEUED
🔎 Final scan status object: { id: '...', status: 'QUEUED', ... }
⏳ Scan still in progress: QUEUED
```

**Then after ~30-60 seconds:**
```
🔍 Raw API response status: completed string
✅ Normalized status: COMPLETED
🎉 Scan COMPLETED - stopping polling
✅ Scan completed - auto-clearing in 1s
```

---

## ✅ Test 4: Verify Progress Bar

**Watch the UI:**
- [ ] Progress starts at **10%** (QUEUED status)
- [ ] Moves to **30-85%** (RUNNING status)
- [ ] Reaches **100%** (COMPLETED status)
- [ ] Shows findings count
- [ ] Status badge changes color

---

## ✅ Test 5: Check Database

**Supabase SQL Editor:**
```sql
SELECT 
  id,
  status,
  total_findings,
  created_at,
  started_at,
  finished_at,
  user_id
FROM scans
ORDER BY created_at DESC
LIMIT 10;
```

**Verify:**
- [ ] Latest scan has `status = 'completed'`
- [ ] `finished_at` is set
- [ ] `total_findings` matches what you see in UI
- [ ] `user_id` matches your authenticated user

---

## ✅ Test 6: Check GitHub Actions

**Go to:** `https://github.com/YOUR-USERNAME/SecuraAi/actions`

**Verify:**
- [ ] Latest workflow run shows "✅ Success"
- [ ] Check logs - should see:
  ```
  ✅ Uploaded X findings to Supabase
  ✅ Updated scan [id] to completed
  ```

---

## ❌ Troubleshooting

### Issue: "No scans found"
**Possible causes:**
1. User not authenticated
2. Wrong `user_id` in database
3. RLS policies blocking access

**Fix:**
```javascript
// Check your user ID
const session = await fetch('/api/auth/session').then(r => r.json());
console.log('Your User ID:', session.user.id);

// Compare with database
// In Supabase SQL:
SELECT user_id FROM scans WHERE id = 'your-scan-id';
```

### Issue: "Stuck at 10%"
**Possible causes:**
1. GitHub Actions failed
2. Status not updating in DB
3. Frontend not polling

**Fix:**
1. Check GitHub Actions logs
2. Check Supabase table manually
3. Check browser console for polling logs

### Issue: "401 Unauthorized"
**Possible causes:**
1. Not logged in
2. Session expired
3. JWT token not being sent

**Fix:**
```javascript
// Check if session has apiToken
const session = await fetch('/api/auth/session').then(r => r.json());
console.log('Has API Token:', !!session.apiToken);

// Re-login if needed
window.location.href = '/auth/signin';
```

### Issue: "Scan not found (404)"
**Possible causes:**
1. Scan belongs to different user
2. Scan ID is wrong
3. RLS policy blocking

**Fix:**
```sql
-- Check if scan exists (as admin)
SELECT id, user_id, status 
FROM scans 
WHERE id = 'your-scan-id';

-- Disable RLS temporarily to test
ALTER TABLE scans DISABLE ROW LEVEL SECURITY;
```

---

## 📊 Expected Flow Timeline

```
T+0s     User clicks "Start Scan"
T+1s     ✅ Scan created in DB (status=queued)
T+2s     ✅ GitHub Actions triggered
T+5s     ✅ GitHub Actions starts (status=running)
T+30s    ✅ Semgrep completes
T+35s    ✅ Findings uploaded to DB
T+36s    ✅ Scan status updated (status=completed)
T+40s    ✅ Frontend polls and detects completion
T+41s    ✅ UI shows 100% and findings count
```

---

## 🎯 Success Criteria

All of these should be TRUE:

- [ ] Backend health check passes
- [ ] Can fetch recent scans via API
- [ ] New scan creates DB record
- [ ] GitHub Actions workflow completes
- [ ] Scan status updates to 'completed'
- [ ] Frontend shows progress 10% → 100%
- [ ] Findings are displayed in UI
- [ ] Browser console shows status normalization logs
- [ ] No 401/404 errors in Network tab
- [ ] RLS policies allow user to see their own scans

---

## 🚨 If Still Not Working

1. **Check Backend Logs** (terminal running `npm start`)
2. **Check Frontend Console** (browser DevTools)
3. **Check Network Tab** (look for failed requests)
4. **Check Supabase Logs** (Dashboard → Logs)
5. **Check GitHub Actions** (verify workflow completed)

Run this test script:
```bash
node backend/test-complete-flow.js
```

Or use browser console to test manually.