-- Add user_email column to scans table
-- This allows frontend to filter scans by email in addition to user_id

ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_scans_user_email ON scans(user_email);

-- Backfill existing scans with user email from user_profiles
UPDATE scans s
SET user_email = u.email
FROM user_profiles u
WHERE s.user_id = u.id
  AND s.user_email IS NULL;

-- Comment for documentation
COMMENT ON COLUMN scans.user_email IS 'User email address for filtering scans in frontend';
