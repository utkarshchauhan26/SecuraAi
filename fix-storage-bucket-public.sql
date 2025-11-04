-- =====================================================
-- SUPABASE STORAGE: PUBLIC REPORTS BUCKET SETUP
-- =====================================================
-- This file configures the "reports" bucket to allow:
-- 1. Public READ access (anyone can download PDFs)
-- 2. Service role WRITE access (GitHub Actions can upload)
-- 3. Authenticated users can list their own reports
-- =====================================================

-- Step 1: Ensure the bucket is marked as PUBLIC
UPDATE storage.buckets
SET public = true
WHERE id = 'reports';

-- Step 2: Drop existing policies (if any conflicts exist)
DROP POLICY IF EXISTS "Public can read reports" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list reports" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read ppcrwe_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role to upload i3p58f_0" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read reports" ON storage.objects;

-- Step 3: Create PUBLIC READ policy
-- This allows anyone with the URL to download the PDF
CREATE POLICY "Public can read reports"
ON storage.objects
FOR SELECT
USING (bucket_id = 'reports');

-- Step 4: Create SERVICE ROLE UPLOAD policy
-- This allows GitHub Actions to upload PDFs
CREATE POLICY "Service role can upload reports"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'reports');

-- Step 5: Create AUTHENTICATED UPDATE policy
-- This allows authenticated users to update metadata
CREATE POLICY "Authenticated can update reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'reports')
WITH CHECK (bucket_id = 'reports');

-- Step 6: Create SERVICE ROLE DELETE policy
-- This allows cleanup of old reports
CREATE POLICY "Service role can delete reports"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'reports');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify bucket is public
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'reports';

-- Expected output:
-- id: reports
-- name: reports
-- public: true
-- file_size_limit: null (or a number)
-- allowed_mime_types: null (or ['application/pdf'])

-- Verify policies exist
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%reports%'
ORDER BY policyname;

-- Expected output: 4 policies
-- 1. Public can read reports (SELECT)
-- 2. Service role can upload reports (INSERT, service_role)
-- 3. Authenticated can update reports (UPDATE, authenticated)
-- 4. Service role can delete reports (DELETE, service_role)

-- =====================================================
-- TESTING
-- =====================================================

-- Test 1: Check if bucket allows public access
-- Run this in your browser (replace YOUR_PROJECT_REF):
-- https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/reports/test.txt

-- Test 2: Upload a test file via service role (GitHub Actions simulation)
-- This should work if the policy is correct

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- If you still get "Bucket not found" error:
-- 1. Make sure bucket 'reports' exists
-- 2. Make sure bucket.public = true
-- 3. Make sure the URL uses the correct format:
--    https://PROJECT.supabase.co/storage/v1/object/public/reports/...

-- To create the bucket if it doesn't exist:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('reports', 'reports', true)
-- ON CONFLICT (id) DO UPDATE SET public = true;

-- =====================================================
-- SECURITY NOTES
-- =====================================================

-- PUBLIC READ is safe for these reasons:
-- 1. Reports only contain security findings (non-sensitive)
-- 2. File names are UUIDs (not guessable)
-- 3. Reports are meant to be shareable
-- 4. No user PII in reports (only scan data)

-- If you need authentication:
-- Replace "Public can read reports" policy with:
-- CREATE POLICY "Authenticated can read reports"
-- ON storage.objects
-- FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'reports');

-- =====================================================
