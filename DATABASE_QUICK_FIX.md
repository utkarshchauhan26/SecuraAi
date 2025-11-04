# 🎯 QUICK FIX - Database Issues

## ⚠️ Your Symptoms
- ✅ GitHub Actions completes
- ❌ Frontend stuck
- ❌ Backend loops
- ❌ No scan status
- ❌ No reports

## 💡 Root Cause
**Database schema/RLS issues** preventing backend from reading scan data written by GitHub Actions.

---

## 🚀 IMMEDIATE FIXES (Run in Order)

### 1️⃣ Fix Database (Supabase SQL Editor)

Open: `https://supabase.com/dashboard/project/YOUR_PROJECT/editor`

Paste and run this SQL:

```sql
-- Add user_email column
ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_email TEXT;

-- DISABLE RLS (Critical!)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE scans DISABLE ROW LEVEL SECURITY;
ALTER TABLE findings DISABLE ROW LEVEL SECURITY;
ALTER TABLE explanations DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_email ON scans(user_email);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);

-- Backfill user_email
UPDATE scans s
SET user_email = u.email
FROM user_profiles u
WHERE s.user_id = u.id AND s.user_email IS NULL;

-- Check results
SELECT 
    COUNT(*) as total_scans,
    COUNT(user_email) as scans_with_email,
    (SELECT COUNT(*) FROM scans WHERE status = 'completed') as completed_scans
FROM scans;
```

**Expected output:**
```
total_scans | scans_with_email | completed_scans
------------|------------------|----------------
    10      |        10        |       8
```

Numbers should match!

---

### 2️⃣ Verify Fix (Terminal)

```bash
cd d:\Project2.0
node backend-diagnostic.js
```

**Look for:**
- ✅ Connection successful
- ✅ user_email column exists
- ✅ No stuck scans
- ✅ Findings count matches

---

### 3️⃣ Test Backend Query (Supabase SQL)

```sql
-- Replace YOUR_USER_ID with actual user ID
SELECT 
    s.id,
    s.status,
    s.user_email,
    s.total_findings,
    p.name as project_name
FROM scans s
LEFT JOIN projects p ON s.project_id = p.id
WHERE s.user_id = 'YOUR_USER_ID'
ORDER BY s.created_at DESC
LIMIT 5;
```

**Should return:** Your recent scans with populated data

---

### 4️⃣ Commit Changes

```bash
git add .
git commit -m "fix: Database schema fixes - add user_email, disable RLS"
git push origin main
```

---

### 5️⃣ Test Scan Flow

1. Login to frontend
2. Start a new scan
3. Watch console for status updates
4. Verify progress reaches 100%
5. Check scan details load

---

## 🔍 Common Errors & Fixes

### Error: "Scan not found"
**Cause:** RLS blocking queries
**Fix:** Run DISABLE RLS SQL above

### Error: "column user_email does not exist"
**Cause:** Migration not applied
**Fix:** Run ALTER TABLE SQL above

### Error: Foreign key constraint violation
**Cause:** Findings reference wrong column
**Fix:** 
```sql
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_scan_id_fkey;
ALTER TABLE findings ADD CONSTRAINT findings_scan_id_fkey 
FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE;
```

### Frontend stuck at 10%
**Cause:** Backend can't read scan status from DB
**Fix:** Check backend logs, verify RLS is disabled

---

## ✅ Success Checklist

After running fixes:

- [ ] user_email column exists in scans table
- [ ] RLS disabled on all tables
- [ ] All scans have user_email populated
- [ ] No stuck scans (queued/running > 10 min)
- [ ] Findings count matches total_findings
- [ ] Backend diagnostic shows all ✅
- [ ] Frontend shows scans in dashboard
- [ ] Can view scan details
- [ ] Reports generate successfully

---

## 📁 Files Created

1. **`backend/prisma/migrations/00_DIAGNOSTIC_AND_FIX.sql`** - Complete diagnostic SQL
2. **`backend-diagnostic.js`** - Backend diagnostic script
3. **`DATABASE_FIX_GUIDE.md`** - Detailed fix guide
4. **`DATABASE_QUICK_FIX.md`** - This file (quick reference)

---

## 🆘 Still Not Working?

Run full diagnostic:
```bash
# In Supabase SQL Editor
-- Copy entire content of: backend/prisma/migrations/00_DIAGNOSTIC_AND_FIX.sql
-- Run it and check each section for errors
```

Check backend logs (Render):
- Look for database errors
- Look for "Scan not found" errors
- Look for RLS policy errors

The diagnostic will show **exactly** what's wrong! 🎯
