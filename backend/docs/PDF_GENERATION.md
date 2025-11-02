# PDF Report Generation 📄

## Overview

SecuraAI's PDF generation service creates professional, comprehensive security scan reports with AI-powered insights, risk analysis, and actionable recommendations.

## Features

### ✨ What's Included

1. **Cover Page**
   - Project branding and information
   - Scan metadata (date, type, status)
   - Visual risk score badge with color coding
   - Files and lines of code analyzed

2. **Executive Summary**
   - High-level overview of scan results
   - Statistics table with severity breakdown
   - Key findings highlights (top 5)
   - Quick risk assessment

3. **Risk Analysis**
   - Overall risk level and score
   - Visual distribution chart by severity
   - Detailed risk assessment narrative
   - Contextual risk interpretation

4. **Detailed Findings**
   - Complete vulnerability catalog
   - Each finding includes:
     - Severity-coded header
     - Detailed description
     - File location and line number
     - Code snippet
     - AI-generated explanation
     - Recommended fix steps
     - Best practices

5. **Recommendations**
   - Priority-based action items
   - Timeline for remediation
   - General security best practices
   - Preventive measures

6. **Cost Summary**
   - AI analysis metrics
   - Token usage statistics
   - Cost breakdown (Gemini free tier)
   - Scan duration and metadata

7. **Professional Formatting**
   - Consistent color scheme
   - Page numbers and timestamps
   - Tables and charts
   - Section headers with dividers

## API Usage

### Generate PDF Report

**Endpoint:** `GET /api/reports/:scanId/pdf`

**Authentication:** Required (JWT Bearer token)

**Response:** PDF file download

```bash
# Example request
curl -X GET "http://localhost:5000/api/reports/{scanId}/pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output report.pdf
```

### Get Report Status

**Endpoint:** `GET /api/reports/:scanId/status`

**Authentication:** Required (JWT Bearer token)

**Response:**
```json
{
  "success": true,
  "data": {
    "scanId": "scan_123",
    "status": "completed",
    "canGenerateReport": true,
    "hasFindings": true,
    "findingsCount": 15,
    "reportGenerated": true,
    "reportGeneratedAt": "2024-10-25T10:30:00Z"
  }
}
```

## Service Architecture

### PDFService Class

Located in: `backend/services/pdf.service.js`

#### Key Methods

1. **`generateScanReport(scanId, userId)`**
   - Main entry point for PDF generation
   - Fetches scan data from database
   - Validates user authorization
   - Creates multi-section PDF
   - Returns file path and metadata

2. **`deleteReport(fileName)`**
   - Removes generated PDF after download
   - Cleanup functionality

3. **`cleanupOldReports()`**
   - Removes reports older than 7 days
   - Can be called by cron job

#### Internal Methods

- `_createPDFReport()` - PDF document creation
- `_addCoverPage()` - Cover page with risk badge
- `_addExecutiveSummary()` - Summary with statistics
- `_addRiskAnalysis()` - Risk level and charts
- `_addFindingsDetail()` - Complete findings catalog
- `_addRecommendations()` - Action items
- `_addCostSummary()` - AI usage metrics
- `_addFooter()` - Page numbers and timestamps

## Color Coding

### Severity Colors

- 🔴 **CRITICAL**: `#c0392b` (Dark Red)
- 🟠 **HIGH**: `#e67e22` (Orange)
- 🟡 **MEDIUM**: `#f39c12` (Yellow)
- 🔵 **LOW**: `#3498db` (Blue)

### Risk Level Colors

- 🔴 **CRITICAL** (80-100): Dark Red
- 🟠 **HIGH** (60-79): Orange
- 🟡 **MEDIUM** (40-59): Yellow
- 🔵 **LOW** (20-39): Blue
- 🟢 **MINIMAL** (0-19): Green

## Testing

### Simple Test (No Database)

```bash
cd backend
node test/test-pdf-simple.js
```

Creates a sample PDF with mock data to verify PDF generation functionality.

### Full Integration Test

```bash
cd backend
node test/test-e2e-pdf.js
```

Complete workflow test:
1. Creates test user and project
2. Scans vulnerable file with Semgrep
3. Stores findings in database
4. Generates AI explanations
5. Calculates risk score
6. Creates PDF report

**Note:** Requires valid Supabase database connection.

### Test from Existing Scan

```bash
cd backend
node test/test-pdf.js
```

Generates PDF from an existing completed scan in the database.

## File Locations

### Generated Reports

PDFs are saved to: `backend/reports/`

Filename format: `security-report-{scanId}-{timestamp}.pdf`

### Cleanup

- Reports are automatically deleted 1 minute after download
- Old reports (>7 days) can be cleaned up via `/api/reports/cleanup` endpoint

## Database Integration

### Required Data

PDF generation requires a completed scan with:

```javascript
{
  scan: {
    id: string,
    status: 'completed',
    scanType: 'file' | 'repository',
    riskScore: number,
    filesScanned: number,
    linesScanned: number,
    createdAt: Date,
    completedAt: Date,
    project: {
      name: string,
      userId: string,
      userProfile: { ... }
    },
    findings: [
      {
        id: string,
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        checkId: string,
        message: string,
        filePath: string,
        line: number,
        code: string,
        explanations: [
          {
            summary: string,
            fixSteps: string,
            bestPractices: string,
            ...
          }
        ]
      }
    ]
  }
}
```

### Authorization

- Users can only generate reports for their own scans
- Authorization validated via `scan.project.userId === userId`
- Returns `403 Forbidden` for unauthorized access

## Performance

### Benchmarks

- **Small scan** (1-10 findings): ~0.5-1s
- **Medium scan** (11-50 findings): ~1-2s
- **Large scan** (50+ findings): ~2-5s

### Optimization

- Findings are ordered by severity
- AI explanations limited to top 10 findings
- Images and charts are vector-based (small file size)
- PDFs typically range from 50KB to 500KB

## Frontend Integration

### React/Next.js Example

```typescript
async function downloadReport(scanId: string) {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`/api/reports/${scanId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to generate report');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${scanId}.pdf`;
    a.click();
    
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading report:', error);
  }
}
```

### Status Check Before Download

```typescript
async function checkReportStatus(scanId: string) {
  const token = await getAuthToken();
  
  const response = await fetch(`/api/reports/${scanId}/status`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  if (data.data.canGenerateReport) {
    // Enable download button
    await downloadReport(scanId);
  } else {
    // Show "Scan in progress" message
    console.log('Scan not complete yet');
  }
}
```

## Error Handling

### Common Errors

| Error | Status | Solution |
|-------|--------|----------|
| Scan not found | 404 | Verify scan ID exists |
| Unauthorized access | 403 | Check user owns the scan |
| Scan not completed | 400 | Wait for scan to finish |
| PDF generation failed | 500 | Check server logs |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Customization

### Modify Report Template

Edit methods in `pdf.service.js`:

1. **Change colors**: Update `_getSeverityColor()`, `_getRiskColor()`
2. **Add sections**: Create new `_addCustomSection()` method
3. **Modify layout**: Adjust margins, fonts, spacing
4. **Add branding**: Update cover page logo/text

### Example: Add Company Logo

```javascript
_addCoverPage(doc, scan) {
  // Add logo
  const logoPath = path.join(__dirname, '../assets/logo.png');
  doc.image(logoPath, centerX - 50, 50, { width: 100 });
  
  // ... rest of cover page
}
```

## Dependencies

```json
{
  "pdfkit": "^0.15.1"
}
```

PDFKit is a lightweight, pure JavaScript PDF generation library that works in Node.js.

## Roadmap

### Planned Features

- [ ] Custom report templates
- [ ] Charts and graphs (pie charts, bar charts)
- [ ] Trend analysis (multiple scans over time)
- [ ] Compliance reports (OWASP, CWE mapping)
- [ ] Executive vs Technical report variants
- [ ] Email delivery option
- [ ] Schedule automated report generation

## Support

For issues or questions about PDF generation:

1. Check server logs for error details
2. Verify database connection is working
3. Ensure scan is completed before generating report
4. Test with simple mock data test first
5. Check file permissions on `reports/` directory

## License

Part of SecuraAI - MIT License
