# 🚨 Quick Fix: Supabase Storage Bucket Error

## Error You're Seeing
```
Supabase Storage upload failed: StorageApiError: Bucket not found
status: 400, statusCode: '404'
```

## ✅ 5-Minute Fix

### Step 1: Create the Bucket

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `xvbgyzreroygnwmcgghh`

2. **Navigate to Storage**
   - Click **Storage** in left sidebar (icon looks like 📦)
   - Click green **"Create a new bucket"** button

3. **Create Bucket**
   - **Name**: `reports` (exactly this, lowercase)
   - **Public bucket**: ❌ **LEAVE UNCHECKED** (keep private)
   - Click **"Create bucket"** button

### Step 2: Add Storage Policies

1. **Click on "reports" bucket** (you just created)

2. **Click "Policies" tab** at the top

3. **Click "New Policy"** button → Choose **"For full customization"**

4. **Add Upload Policy**:
   - Policy name: `Allow service role to upload`
   - Target roles: Check **service_role**
   - Policy definition:
   ```sql
   (bucket_id = 'reports'::text)
   ```
   - Allowed operation: **INSERT** (check the box)
   - Click **"Review"** → **"Save policy"**

5. **Add Read Policy**:
   - Click **"New Policy"** again
   - Policy name: `Allow authenticated read`
   - Target roles: Check **authenticated**
   - Policy definition:
   ```sql
   (bucket_id = 'reports'::text)
   ```
   - Allowed operation: **SELECT** (check the box)
   - Click **"Review"** → **"Save policy"**

### Step 3: Verify Environment Variable

1. **Check your backend `.env` file** has:
   ```env
   SUPABASE_REPORTS_BUCKET=reports
   ```

2. **If missing, add it** and restart backend:
   ```bash
   cd D:\Project2.0\backend
   # Add to .env: SUPABASE_REPORTS_BUCKET=reports
   node server.js
   ```

### Step 4: Test Again

1. **Upload a project** and run scan
2. **Download PDF** - should work now! ✅
3. **Check Supabase Storage**:
   - Go to **Storage** → **reports**
   - Should see folder: `scans/{your-scan-id}/SecuraAI-Report-*.pdf`

---

## ✅ Success Checklist

- [ ] Bucket "reports" created in Supabase
- [ ] Bucket is **private** (not public)
- [ ] Upload policy added (service_role can INSERT)
- [ ] Read policy added (authenticated can SELECT)
- [ ] `SUPABASE_REPORTS_BUCKET=reports` in backend .env
- [ ] Backend restarted
- [ ] PDF download works
- [ ] PDF appears in Supabase Storage

---

## 🎯 What Happens Now

When you download a PDF:
1. ✅ PDF generates locally (10-12 pages, no blank pages)
2. ✅ Uploads to Supabase Storage: `reports/scans/{scanId}/{fileName}`
3. ✅ Creates signed URL (valid 7 days)
4. ✅ Saves URL to database: `scans.report_json.signedUrl`
5. ✅ Downloads to your browser
6. ✅ Deletes local temp file after 1 minute

---

## 🔍 Still Getting Errors?

### Check 1: Bucket Name
- Must be exactly: `reports` (lowercase, no spaces)
- In Supabase Storage → Should see it listed

### Check 2: Policies
- Click bucket → Policies tab
- Should see 2 policies:
  - One for `service_role` (INSERT)
  - One for `authenticated` (SELECT)

### Check 3: Service Key
- In backend `.env`, check `SUPABASE_SERVICE_KEY`
- Should start with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Should be the **service_role** key (not anon key!)
- Get it from: Supabase → Settings → API → service_role (secret)

### Check 4: Restart Backend
```bash
cd D:\Project2.0\backend
node server.js
```

---

## 📞 Next Steps

Once this works, follow the full deployment guide:
- **Read**: `FIRST_TIME_DEPLOYMENT.md`
- **Deploy**: Frontend to Vercel, Backend to Render
- **Go live**: Share with recruiters! 🚀

---

**Time to fix**: ~5 minutes  
**Difficulty**: Easy  
**Cost**: $0 (free tier)
