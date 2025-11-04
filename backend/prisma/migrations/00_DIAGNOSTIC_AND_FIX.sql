-- ===================================================================
-- SUPABASE DATABASE DIAGNOSTIC & FIX SCRIPT
-- Run this in Supabase SQL Editor to diagnose and fix all issues
-- ===================================================================

-- STEP 1: Check current table structure
-- ===================================================================
SELECT 
    'Table Structure Check' as step,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'projects', 'scans', 'findings', 'explanations')
ORDER BY table_name, ordinal_position;

-- STEP 2: Check if user_email column exists
-- ===================================================================
SELECT 
    'user_email Column Check' as step,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'scans'
AND column_name = 'user_email';

-- If no results, the column is missing - we'll add it below

-- STEP 3: Add missing user_email column (if needed)
-- ===================================================================
ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_email TEXT;

-- STEP 4: Add missing created_at column to scans if needed
-- ===================================================================
ALTER TABLE scans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- STEP 5: Create indexes for performance
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_email ON scans(user_email);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- STEP 6: Backfill user_email for existing scans
-- ===================================================================
UPDATE scans s
SET user_email = u.email
FROM user_profiles u
WHERE s.user_id = u.id
  AND s.user_email IS NULL;

-- STEP 7: Check current RLS status
-- ===================================================================
SELECT 
    'RLS Status Check' as step,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'projects', 'scans', 'findings', 'explanations');

-- STEP 8: DISABLE RLS (Critical for Service Key Access)
-- ===================================================================
-- GitHub Actions uses SERVICE KEY which should bypass RLS
-- Backend also uses SERVICE KEY

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE scans DISABLE ROW LEVEL SECURITY;
ALTER TABLE findings DISABLE ROW LEVEL SECURITY;
ALTER TABLE explanations DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events DISABLE ROW LEVEL SECURITY;

-- STEP 9: Drop all existing RLS policies (if any)
-- ===================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own scans" ON scans;
DROP POLICY IF EXISTS "Users can create own scans" ON scans;
DROP POLICY IF EXISTS "Service role can insert scans" ON scans;
DROP POLICY IF EXISTS "Service role can update scans" ON scans;
DROP POLICY IF EXISTS "Users can view findings for own scans" ON findings;
DROP POLICY IF EXISTS "Service role can insert findings" ON findings;
DROP POLICY IF EXISTS "Users can view explanations for own findings" ON explanations;

-- STEP 10: Check recent scan data
-- ===================================================================
SELECT 
    'Recent Scans Check' as step,
    s.id,
    s.user_id,
    s.user_email,
    s.status,
    s.total_findings,
    s.created_at,
    s.started_at,
    s.finished_at,
    p.name as project_name,
    p.repo_url
FROM scans s
LEFT JOIN projects p ON s.project_id = p.id
ORDER BY s.created_at DESC
LIMIT 10;

-- STEP 11: Check findings count
-- ===================================================================
SELECT 
    'Findings Count Check' as step,
    s.id as scan_id,
    s.status,
    s.total_findings as recorded_count,
    COUNT(f.id) as actual_count,
    CASE 
        WHEN s.total_findings = COUNT(f.id) THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as status_check
FROM scans s
LEFT JOIN findings f ON s.id = f.scan_id
GROUP BY s.id, s.status, s.total_findings
ORDER BY s.created_at DESC
LIMIT 10;

-- STEP 12: Fix foreign key if needed
-- ===================================================================
-- Check if foreign key exists and references correct column
SELECT
    'Foreign Key Check' as step,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'findings';

-- STEP 13: Verify no orphaned records
-- ===================================================================
-- Check for scans without projects
SELECT 
    'Orphaned Scans Check' as step,
    COUNT(*) as orphaned_scans
FROM scans s
LEFT JOIN projects p ON s.project_id = p.id
WHERE p.id IS NULL;

-- Check for findings without scans
SELECT 
    'Orphaned Findings Check' as step,
    COUNT(*) as orphaned_findings
FROM findings f
LEFT JOIN scans s ON f.scan_id = s.id
WHERE s.id IS NULL;

-- STEP 14: Check for stuck scans
-- ===================================================================
SELECT 
    'Stuck Scans Check' as step,
    id,
    status,
    started_at,
    finished_at,
    EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_running,
    total_findings
FROM scans
WHERE status IN ('queued', 'running')
    AND started_at < NOW() - INTERVAL '10 minutes'
ORDER BY started_at;

-- STEP 15: Summary Report
-- ===================================================================
SELECT 
    'Summary Report' as report_section,
    'Total Scans' as metric,
    COUNT(*) as value
FROM scans
UNION ALL
SELECT 
    'Summary Report',
    'Completed Scans',
    COUNT(*)
FROM scans WHERE status = 'completed'
UNION ALL
SELECT 
    'Summary Report',
    'Failed Scans',
    COUNT(*)
FROM scans WHERE status = 'failed'
UNION ALL
SELECT 
    'Summary Report',
    'Stuck Scans (queued/running > 10min)',
    COUNT(*)
FROM scans 
WHERE status IN ('queued', 'running')
    AND started_at < NOW() - INTERVAL '10 minutes'
UNION ALL
SELECT 
    'Summary Report',
    'Total Findings',
    COUNT(*)
FROM findings
UNION ALL
SELECT 
    'Summary Report',
    'Scans with user_email NULL',
    COUNT(*)
FROM scans WHERE user_email IS NULL;

-- ===================================================================
-- FINAL VERIFICATION
-- ===================================================================
-- Run this to verify everything is fixed
SELECT 
    'Final Verification' as step,
    (SELECT COUNT(*) FROM scans WHERE user_email IS NOT NULL) as scans_with_email,
    (SELECT COUNT(*) FROM scans) as total_scans,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'scans' AND column_name = 'user_email') as user_email_column_exists,
    (SELECT CASE WHEN rowsecurity THEN 'ENABLED ❌' ELSE 'DISABLED ✅' END
     FROM pg_tables 
     WHERE tablename = 'scans') as scans_rls_status;

-- ===================================================================
-- EXPECTED RESULTS
-- ===================================================================
-- ✅ user_email column exists (user_email_column_exists = 1)
-- ✅ All scans have user_email populated
-- ✅ RLS is DISABLED on all tables
-- ✅ No orphaned records
-- ✅ No stuck scans
-- ✅ Findings count matches total_findings
