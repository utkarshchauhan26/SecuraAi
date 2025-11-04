# Fix: Supabase Storage "Bucket not found" Error

## Problem
PDF reports upload successfully to Supabase Storage, but downloads fail with:
```json
{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}
```

## Root Cause
The "reports" bucket exists but is **NOT configured for public access**. 

Current policies only allow:
- ✅ Authenticated users can read
- ✅ Service role can upload

Missing:
- ❌ Public (anonymous) read access

## Solution

### Option 1: Run SQL Script (Recommended)

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
   
2. **Copy and run this SQL:**
   ```sql
   -- Make bucket public
   UPDATE storage.buckets
   SET public = true
   WHERE id = 'reports';
   
   -- Add public read policy
   CREATE POLICY "Public can read reports"
   ON storage.objects
   FOR SELECT
   USING (bucket_id = 'reports');
   ```

3. **Click "Run"**

### Option 2: Use Storage Dashboard (Alternative)

1. **Go to Storage Settings:**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets/reports
   
2. **Edit Bucket Settings:**
   - Click the ⚙️ (settings icon) on "reports" bucket
   - Toggle **"Public bucket"** to ON
   - Click "Save"

3. **Add Public Policy:**
   - Click on "Policies" tab
   - Click "New Policy"
   - Select "For full customization"
   - Name: `Public can read reports`
   - Allowed operation: `SELECT`
   - Target roles: `public` (or leave empty for all)
   - USING expression: `bucket_id = 'reports'`
   - Click "Save policy"

### Option 3: Run Full Setup Script

For a complete setup with all policies, run the SQL file:

```bash
# Copy the SQL file content
cat fix-storage-bucket-public.sql

# Then paste into Supabase SQL Editor and run
```

## Verification

### Test 1: Check Bucket is Public
Run this SQL:
```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'reports';
```

Expected result:
```
id: reports
name: reports
public: true  ← Must be TRUE
```

### Test 2: Check Public Policy Exists
Run this SQL:
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%Public%'
AND policyname LIKE '%reports%';
```

Expected result:
```
policyname: Public can read reports
cmd: SELECT
roles: {public} or {}
```

### Test 3: Download a Report
Try downloading from your browser:
```
https://YOUR_PROJECT.supabase.co/storage/v1/object/public/reports/SCAN_ID/FILENAME.pdf
```

Should show PDF, not error.

## Current Policies (Before Fix)

Your current setup:
```
❌ Allow authenticated read ppcrwe_0 - SELECT, authenticated only
❌ Allow service role to upload i3p58f_0 - INSERT, service_role only
❌ Authenticated users can read reports - SELECT, authenticated only
```

**Problem:** All policies require authentication. Public downloads fail.

## Required Policies (After Fix)

```
✅ Public can read reports - SELECT, public/anonymous
✅ Service role can upload reports - INSERT, service_role
✅ Authenticated can update reports - UPDATE, authenticated
✅ Service role can delete reports - DELETE, service_role
```

## Why Public Access is Safe

1. **No sensitive data** - Reports only contain code security findings
2. **UUID filenames** - Not guessable (e.g., `4724cad0-788b-477c-9542-cfe9a22152cd`)
3. **Meant to be shared** - Users need to download and share reports
4. **No PII** - Reports don't contain user personal information
5. **Read-only** - Public can only read, not upload or delete

## Alternative: Signed URLs (More Secure)

If you prefer authenticated downloads:

1. **Keep bucket private** (public = false)
2. **Generate signed URLs** in backend:
   ```javascript
   const { data, error } = await supabase.storage
     .from('reports')
     .createSignedUrl(filePath, 3600); // 1 hour expiry
   
   // Return signed URL to frontend
   ```
3. **Update workflow** to use signed URLs instead of public URLs

This is more secure but requires:
- Backend endpoint for signed URL generation
- Token expiration handling
- More complex frontend logic

## Quick Fix Command

Run this in Supabase SQL Editor:

```sql
-- Quick fix: Make bucket public and add read policy
UPDATE storage.buckets SET public = true WHERE id = 'reports';

DROP POLICY IF EXISTS "Public can read reports" ON storage.objects;

CREATE POLICY "Public can read reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'reports');
```

That's it! Try downloading again.

---

**Files:**
- `fix-storage-bucket-public.sql` - Complete SQL script with all policies
- This guide - Instructions to fix the issue

**Status:** Ready to apply ✅
