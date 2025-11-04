-- Migration: Add report_url and other missing columns to scans table
-- Run this in Supabase SQL Editor

-- Add report_url column for storing PDF report links
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS report_url TEXT;

-- Add risk_score column for overall risk assessment
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- Add scan_type column to track fast vs deep scans
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS scan_type TEXT DEFAULT 'fast';

-- Add error_message column for failed scans
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create index on report_url for faster queries
CREATE INDEX IF NOT EXISTS idx_scans_report_url ON scans(report_url) WHERE report_url IS NOT NULL;

-- Create index on user_id for faster user queries
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);

-- Verify columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'scans'
  AND column_name IN ('report_url', 'risk_score', 'scan_type', 'error_message', 'progress', 'file_count', 'processed_files', 'current_file')
ORDER BY column_name;
