-- ===================================================================
-- ADD PROGRESS TRACKING COLUMNS TO SCANS TABLE
-- Run this in Supabase SQL Editor
-- ===================================================================

-- Add progress tracking columns
ALTER TABLE scans 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processed_files INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_file TEXT,
ADD COLUMN IF NOT EXISTS elapsed_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_remaining INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scans_progress ON scans(progress);
CREATE INDEX IF NOT EXISTS idx_scans_status_progress ON scans(status, progress);

-- Update existing running scans to show some progress
UPDATE scans
SET progress = 10
WHERE status = 'running' AND progress IS NULL;

-- Verify the changes
SELECT 
    'Column Check' as step,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'scans'
    AND column_name IN ('progress', 'file_count', 'processed_files', 'current_file', 'elapsed_time', 'estimated_remaining')
ORDER BY column_name;

-- Show sample data
SELECT 
    'Sample Data' as step,
    id,
    status,
    progress,
    file_count,
    processed_files,
    created_at
FROM scans
ORDER BY created_at DESC
LIMIT 5;
