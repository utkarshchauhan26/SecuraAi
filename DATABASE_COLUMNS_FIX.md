# 🔧 QUICK FIX: Add Missing Database Columns

## ❌ Problem

The `report_url` column (and possibly others) don't exist in your Supabase `scans` table.

## ✅ Solution

Run this SQL in **Supabase SQL Editor**:

### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Select your project
- Click "SQL Editor" in the left sidebar

### 2. Run This SQL

```sql
-- Add all missing columns to scans table
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_files INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_file TEXT,
  ADD COLUMN IF NOT EXISTS report_url TEXT,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scan_type TEXT DEFAULT 'fast',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scans_report_url 
  ON scans(report_url) 
  WHERE report_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scans_user_id 
  ON scans(user_id);

CREATE INDEX IF NOT EXISTS idx_scans_status 
  ON scans(status);

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'scans'
  AND column_name IN (
    'progress', 'file_count', 'processed_files', 'current_file',
    'report_url', 'risk_score', 'scan_type', 'error_message'
  )
ORDER BY column_name;
```

### 3. Expected Result

You should see 8 rows showing the new columns:

| column_name       | data_type | is_nullable | column_default |
|-------------------|-----------|-------------|----------------|
| current_file      | text      | YES         | NULL           |
| error_message     | text      | YES         | NULL           |
| file_count        | integer   | YES         | 0              |
| processed_files   | integer   | YES         | 0              |
| progress          | integer   | YES         | 0              |
| report_url        | text      | YES         | NULL           |
| risk_score        | integer   | YES         | 0              |
| scan_type         | text      | YES         | 'fast'         |

### 4. Create Supabase Storage Bucket

If you don't have a "reports" bucket yet:

1. Go to **Storage** in Supabase dashboard
2. Click **New Bucket**
3. Name: `reports`
4. Make it **Public** (or set RLS policy)
5. Click **Create**

### 5. Set Storage Policy (Optional)

To allow public read access to reports:

```sql
-- Allow anyone to read reports
CREATE POLICY "Public reports are viewable by everyone"
ON storage.objects FOR SELECT
USING ( bucket_id = 'reports' );
```

### 6. Verify

Run this in your terminal:

```bash
cd backend
node check-reports.js
```

You should see:
```
✅ Found X scan(s)
✅ Report URL: ... (or NULL if no reports generated yet)
```

---

## 🎯 After Running the SQL

1. **Restart backend server** (if running)
2. **Run a new scan** - It will now save progress and report URL
3. **Check reports page** - You should see scans listed
4. **For old scans** - They won't have reports unless you re-run them

---

## 💡 Why This Happened

The database schema was incomplete. These columns are required for:
- **Progress tracking**: `progress`, `file_count`, `processed_files`, `current_file`
- **Reports**: `report_url` (stores PDF link)
- **Risk scoring**: `risk_score`
- **Scan metadata**: `scan_type`, `error_message`

The backend code expects these columns but they weren't created during initial setup.

---

## ✅ Done!

After running the SQL:
- ✅ Progress tracking will work
- ✅ Reports will be saved and downloadable
- ✅ Status updates will show correctly
- ✅ All scan features will work

Run the SQL and then try: `node check-reports.js`
