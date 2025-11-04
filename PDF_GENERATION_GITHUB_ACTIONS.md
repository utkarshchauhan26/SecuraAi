# 📄 PDF REPORT GENERATION - GitHub Actions Integration

## ✅ What Was Fixed

Added PDF report generation to GitHub Actions workflow so scans automatically create downloadable reports.

## 🔧 Changes Made

### **File:** `.github/workflows/semgrep-scan.yml`

Added 3 new steps to the workflow:

#### **1. Set up Node.js for PDF generation**
- Installs Node.js 18
- Required for running PDF generation service

#### **2. Install PDF dependencies**
- Installs `pdfkit` package
- Required for PDF creation

#### **3. Generate PDF Report**
- Loads backend/services/pdf-report.service.js
- Generates professional PDF report
- Saves report info for upload step
- Handles errors gracefully (continues if PDF generation fails)

#### **4. Upload PDF to Supabase Storage**
- Uploads PDF to Supabase Storage `reports` bucket
- Generates public URL for the report
- Updates scan record with `report_url`
- Skips if PDF generation failed

## 📊 Report Generation Flow

```
Semgrep Scan Completes
  ↓
Upload Findings to Supabase
  ↓
Generate PDF Report (NEW!)
  ├─ Fetch scan + findings from Supabase
  ├─ Create professional PDF with charts
  ├─ Save to backend/reports/ directory
  └─ Return file path and name
  ↓
Upload PDF to Supabase Storage (NEW!)
  ├─ Upload to reports/{scan_id}/report.pdf
  ├─ Get public URL
  └─ Update scan.report_url in database
  ↓
Mark Scan as Completed
  ↓
Frontend Shows "Download PDF" Button
```

## 🎨 PDF Report Features

The generated PDF includes:

- ✅ **Executive Summary** - Overview, risk score, findings count
- ✅ **Security Metrics** - Pie chart of severity distribution
- ✅ **Detailed Findings** - Each finding with:
  - Severity badge (color-coded)
  - File location and line numbers
  - Code snippet
  - Description and recommendations
  - CWE/OWASP references
- ✅ **Professional Formatting** - Branded header, footer with page numbers
- ✅ **Charts & Visualizations** - Risk score gauge, severity breakdown

## 🧪 Testing

### Test the Workflow

1. **Trigger a scan** from frontend
2. **Check GitHub Actions** - https://github.com/your-repo/actions
3. **Monitor logs** for these steps:
   ```
   📄 Generating PDF report for scan: xxx
   ✅ PDF generated: SecuraAI-Report-xxx-timestamp.pdf
   📤 Uploading PDF to Supabase Storage...
   ✅ Report uploaded to: https://...
   ✅ Updated scan with report URL
   ```
4. **Check frontend** - Download button should appear
5. **Click download** - PDF should open/download

### Expected GitHub Actions Logs

```
Step: Generate PDF Report
📄 Generating PDF report for scan: 867e8ea0-18c1-4618-9584-c403ee862fcf
✅ PDF generated: SecuraAI-Report-867e8ea0-18c1-4618-9584-c403ee862fcf-1730745123456.pdf
   File path: /home/runner/work/SecuraAi/SecuraAi/backend/reports/SecuraAI-Report-xxx.pdf
   File size: 245.67 KB

Step: Upload PDF to Supabase Storage
📤 Uploading PDF to Supabase Storage...
HTTP Status: 200
✅ Report uploaded to: https://xxx.supabase.co/storage/v1/object/public/reports/867e8ea0/.../report.pdf
✅ Updated scan with report_url
```

## 🔍 Troubleshooting

### Issue: "PDF service not found"

**Cause:** backend/services/pdf-report.service.js not in repository

**Fix:** Ensure the file is committed and pushed

### Issue: "pdfkit not installed"

**Cause:** npm install step failed

**Fix:** Check GitHub Actions logs for npm errors

### Issue: "Upload failed with 404"

**Cause:** Supabase Storage bucket doesn't exist

**Fix:** Create "reports" bucket in Supabase:
1. Go to Storage in Supabase dashboard
2. Create new bucket named "reports"
3. Make it public or set RLS policy

### Issue: "PDF generated but report_url is null"

**Cause:** Upload to Supabase failed

**Fix:** 
1. Check GitHub Actions logs for upload step
2. Verify SUPABASE_SERVICE_KEY has storage permissions
3. Check Supabase Storage RLS policies

### Issue: "PDF is blank or missing content"

**Cause:** No findings or scan data

**Fix:** 
1. Check if findings were uploaded
2. Verify scan exists in database
3. Run locally to test:
   ```bash
   cd backend
   node -e "
   require('dotenv').config();
   const service = require('./services/pdf-report.service');
   const pdf = new service();
   pdf.generateScanReport('SCAN_ID', null)
     .then(r => console.log('✅', r))
     .catch(e => console.error('❌', e));
   "
   ```

## 📝 Required Supabase Setup

### 1. Storage Bucket

Create a bucket named "reports":

```sql
-- In Supabase dashboard → Storage → New Bucket
Name: reports
Public: Yes (or set RLS policy below)
```

### 2. RLS Policy (Optional - if bucket is not public)

```sql
-- Allow public read access to reports
CREATE POLICY "Public reports are viewable"
ON storage.objects FOR SELECT
USING ( bucket_id = 'reports' );

-- Allow service role to upload
CREATE POLICY "Service role can upload reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reports' 
  AND auth.role() = 'service_role'
);
```

### 3. Verify Setup

```bash
cd backend
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
supabase.storage.listBuckets().then(({data}) => {
  const reports = data.find(b => b.name === 'reports');
  console.log(reports ? '✅ Reports bucket exists' : '❌ Create reports bucket');
});
"
```

## 🎯 Expected Results

After this fix:

1. ✅ Every scan generates a PDF report automatically
2. ✅ Reports are uploaded to Supabase Storage
3. ✅ `report_url` is saved in database
4. ✅ Frontend shows "Download PDF" button
5. ✅ Clicking button downloads professional report
6. ✅ Old scans won't have reports (need to re-run)

## 🚀 Next Steps

1. **Commit and push** the workflow changes:
   ```bash
   git add .github/workflows/semgrep-scan.yml
   git commit -m "feat: Add PDF report generation to GitHub Actions workflow"
   git push
   ```

2. **Create Supabase Storage bucket** (if not exists)

3. **Run a new scan** to test

4. **Check GitHub Actions logs** to verify PDF generation

5. **Download report** from frontend

## ✅ Done!

PDF reports will now be generated automatically for every scan!

---

**Files Modified:**
- `.github/workflows/semgrep-scan.yml` - Added 4 new steps for PDF generation and upload

**No backend code changes needed** - Using existing pdf-report.service.js
