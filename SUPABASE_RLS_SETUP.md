# 🔒 Supabase Storage RLS Configuration - Reports Bucket

## Problem: Authenticated Users Can't Read PDFs

**Error**: `new row violates row-level security policy`

**Current Status**: 
- ❌ Reports bucket has RLS enabled but no policies for authenticated users
- ❌ Users can't download their own PDF reports
- ✅ Backend can write reports (service role key bypasses RLS)

---

## Solution: Enable Authenticated Read Access

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** → **Policies**
4. Find the `reports` bucket

### Step 2: Create Read Policy for Authenticated Users

**Policy Name**: `Authenticated users can read reports`

**Allowed operation**: `SELECT` (Read)

**Target roles**: `authenticated`

**Policy definition**:
```sql
-- Allow authenticated users to read all reports
CREATE POLICY "Authenticated users can read reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');
```

### Step 3: (Optional) User-Specific Read Policy

If you want users to only read their own reports:

```sql
-- Allow users to read only their own reports
CREATE POLICY "Users can read own reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Note**: This requires PDFs to be stored in user-specific folders like:
- `{user_id}/report-{scan_id}.pdf`

---

## Current Policy Status

### Reports Bucket Policies:

1. ✅ **Service role can do everything**
   - Backend can upload/delete PDFs
   - Uses `SUPABASE_SERVICE_KEY`

2. ❌ **Authenticated users can't read** (MISSING)
   - Users get 403 errors when downloading
   - Need to add SELECT policy

3. ❌ **Public access disabled** (CORRECT)
   - Reports should not be publicly accessible
   - Only authenticated users should access

---

## Quick Fix SQL (Run in Supabase SQL Editor)

```sql
-- Enable authenticated users to read reports
CREATE POLICY "Authenticated users can read reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- Verify the policy
SELECT * FROM storage.policies WHERE bucket_id = 'reports';
```

---

## Testing After Applying Policy

### Backend Test (Node.js):
```javascript
const { createClient } = require('@supabase/supabase-js');

// Use SERVICE ROLE key for backend operations
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test upload (should work - uses service role)
const { data, error } = await supabaseService.storage
  .from('reports')
  .upload('test-report.pdf', pdfBuffer);

console.log('Upload:', error ? 'FAILED' : 'SUCCESS');
```

### Frontend Test (Browser):
```javascript
import { createClient } from '@supabase/supabase-js';

// Use ANON key for frontend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// User must be signed in
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  // Test download (should work after adding SELECT policy)
  const { data, error } = await supabase.storage
    .from('reports')
    .download('test-report.pdf');
  
  console.log('Download:', error ? 'FAILED' : 'SUCCESS');
}
```

---

## Architecture Flow

### Current Implementation:

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ 1. Request PDF download
       │    (authenticated with session)
       ▼
┌─────────────┐
│   Backend   │
│  (Express)  │
└──────┬──────┘
       │ 2. Verify user auth
       │ 3. Generate PDF or fetch from storage
       │    (uses SERVICE ROLE key)
       ▼
┌─────────────┐
│  Supabase   │
│   Storage   │
└─────────────┘
  ↓ 4. Return signed URL or blob
┌─────────────┐
│   Frontend  │ 5. Download PDF
└─────────────┘
```

### Why This Works:

1. **Backend → Supabase**: Uses SERVICE ROLE key (bypasses RLS)
2. **Frontend → Backend**: Uses JWT from NextAuth session
3. **Frontend → Supabase** (direct): Uses ANON key + user session (needs RLS policy)

---

## Environment Variables

### Backend (.env):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # Service role key (SECRET!)
```

### Frontend (.env.local):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Anon key (public)
```

---

## Security Best Practices

### ✅ DO:
- ✅ Use service role key ONLY in backend (never in frontend)
- ✅ Enable RLS on all storage buckets
- ✅ Create specific policies for authenticated users
- ✅ Validate user permissions in backend before serving PDFs
- ✅ Use signed URLs with expiration for temporary access

### ❌ DON'T:
- ❌ Expose service role key in frontend code
- ❌ Make reports bucket public
- ❌ Allow unauthenticated access to reports
- ❌ Store PDFs without user association
- ❌ Skip auth validation in backend

---

## Alternative Approach: Signed URLs

If you want more control, use signed URLs instead of direct download:

### Backend Code:
```javascript
// Generate a signed URL (expires in 1 hour)
const { data, error } = await supabaseService.storage
  .from('reports')
  .createSignedUrl('report-123.pdf', 3600); // 1 hour

// Return to frontend
res.json({ signedUrl: data.signedUrl });
```

### Frontend Code:
```javascript
// Fetch signed URL from backend
const response = await fetch('/api/reports/123/download');
const { signedUrl } = await response.json();

// Download using signed URL (works even without RLS policy)
window.location.href = signedUrl;
```

**Benefit**: More secure, URLs expire, no need for complex RLS policies

---

## Recommended RLS Configuration

```sql
-- Policy 1: Service role can do everything (already exists)
-- Policy 2: Authenticated users can read reports (ADD THIS)
CREATE POLICY "Authenticated users can read reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- Policy 3: Prevent authenticated users from writing/deleting
-- (Already enforced - no INSERT/UPDATE/DELETE policies for authenticated role)
```

---

## Deployment Checklist

### Supabase Setup:
- [ ] Create `reports` bucket if not exists
- [ ] Enable RLS on `reports` bucket
- [ ] Add SELECT policy for authenticated users
- [ ] Test download with authenticated user
- [ ] Verify service role can upload

### Backend Setup:
- [ ] Set `SUPABASE_URL` environment variable
- [ ] Set `SUPABASE_SERVICE_KEY` environment variable
- [ ] Verify PDF upload works
- [ ] Verify PDF download endpoint works

### Frontend Setup:
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Test authenticated user can download PDFs
- [ ] Handle 403 errors gracefully

---

## Current Status: READY TO DEPLOY

Once you add the SELECT policy, your setup will be:

✅ **Backend**: Can upload/delete PDFs (service role)  
✅ **Frontend**: Can download PDFs (authenticated users)  
❌ **Public**: Cannot access PDFs (no public policy)  
✅ **Security**: RLS enabled, proper key isolation  

**Next Step**: Run the SQL command in Supabase dashboard to enable authenticated read access.

---

## Quick SQL Command (Copy & Paste)

```sql
CREATE POLICY "Authenticated users can read reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');
```

**Run this in**: Supabase Dashboard → SQL Editor → New Query

After running this, deploy your app and test the PDF download functionality!
