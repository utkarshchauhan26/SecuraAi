-- ===================================================================
-- CLEANUP STUCK SCANS
-- Run this in Supabase SQL Editor to fix stuck scans
-- ===================================================================

-- Mark all stuck scans (queued/running > 15 minutes) as failed
UPDATE scans
SET 
    status = 'failed',
    finished_at = started_at + INTERVAL '5 minutes', -- Assume failed shortly after start
    error_message = 'Scan timed out - cleaned up on ' || NOW()::TEXT
WHERE status IN ('queued', 'running')
    AND started_at < NOW() - INTERVAL '15 minutes';

-- Verify cleanup
SELECT 
    'Cleanup Complete' as step,
    COUNT(*) as stuck_scans_fixed
FROM scans
WHERE status = 'failed'
    AND error_message LIKE '%cleaned up%';

-- Show current status distribution
SELECT 
    'Status Distribution' as step,
    status,
    COUNT(*) as count
FROM scans
GROUP BY status
ORDER BY count DESC;
