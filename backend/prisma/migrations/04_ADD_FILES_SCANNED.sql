-- ===================================================================
-- ADD FILES_SCANNED COLUMN TO SCANS TABLE
-- Run this in Supabase SQL Editor
-- ===================================================================

-- Add files_scanned column to track total files scanned (not just files with findings)
ALTER TABLE scans 
ADD COLUMN IF NOT EXISTS files_scanned INTEGER DEFAULT 0;

-- Update existing completed scans to set files_scanned = file_count as a fallback
UPDATE scans
SET files_scanned = COALESCE(file_count, 0)
WHERE files_scanned = 0 AND status = 'completed';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scans_files_scanned ON scans(files_scanned);

-- Verify the changes
SELECT 
    'Column Check' as step,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'scans'
    AND column_name = 'files_scanned';

-- Show sample data
SELECT 
    'Sample Data' as step,
    id,
    status,
    files_scanned,
    file_count,
    total_findings,
    created_at
FROM scans
ORDER BY created_at DESC
LIMIT 5;
