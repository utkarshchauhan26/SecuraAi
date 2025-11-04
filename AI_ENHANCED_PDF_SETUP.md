# AI-Enhanced PDF Setup for GitHub Actions

## Overview
The workflow now uses the **AI-Enhanced PDF service** which includes:
- 🤖 **Gemini AI Recommendations** - Smart security insights
- 📊 **EU AI Act Compliance Scores** - Regulatory compliance metrics
- 🎨 **Professional formatting** - Well-structured PDF reports

## Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### 1. DATABASE_URL
Your Supabase database connection string.

**Format:**
```
postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

**How to get it:**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click **Settings** → **Database**
3. Scroll to **Connection String**
4. Copy the **URI** (not Transaction pooler)
5. Replace `[YOUR-PASSWORD]` with your actual database password

**Example:**
```
postgresql://postgres:your-password-here@abc123xyz.supabase.co:5432/postgres
```

### 2. GEMINI_API_KEY
Google Gemini API key for AI-powered recommendations.

**How to get it:**
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API Key**
3. Select your Google Cloud project (or create new)
4. Copy the API key (starts with `AIza...`)

**Example:**
```
AIzaSyAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQq
```

### 3. SUPABASE_URL
Your Supabase project URL (already required).

**Format:**
```
https://[PROJECT-REF].supabase.co
```

**How to get it:**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click **Settings** → **API**
3. Copy **Project URL**

### 4. SUPABASE_SERVICE_KEY
Your Supabase service role key (already required).

**How to get it:**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click **Settings** → **API**
3. Copy **service_role** key (not anon key!)
4. ⚠️ Keep this secret - it bypasses RLS policies

## Adding Secrets to GitHub

### Step-by-Step:

1. **Go to your repository on GitHub:**
   ```
   https://github.com/utkarshchauhan26/SecuraAi
   ```

2. **Navigate to Settings:**
   - Click **Settings** tab
   - Click **Secrets and variables** → **Actions**

3. **Add each secret:**
   - Click **New repository secret**
   - Enter **Name** (exactly as shown above)
   - Enter **Secret** value
   - Click **Add secret**

4. **Verify all 4 secrets are added:**
   - [ ] `DATABASE_URL`
   - [ ] `GEMINI_API_KEY`
   - [ ] `SUPABASE_URL`
   - [ ] `SUPABASE_SERVICE_KEY`

## Testing the Setup

After adding secrets, trigger a scan:

1. **Start a new scan** from your dashboard
2. **Watch GitHub Actions** run
3. **Check the logs** for:
   ```
   ✅ Prisma client generated successfully
   📄 Generating AI-Enhanced PDF report for scan: xxx
   🤖 Including Gemini AI recommendations
   📊 Including EU AI Compliance scores
   ✅ AI-Enhanced PDF generated successfully!
   ```

## Troubleshooting

### Error: "DATABASE_URL is not defined"
- Check that `DATABASE_URL` secret is added to GitHub
- Verify the format matches: `postgresql://...`
- Make sure password doesn't contain special characters that need URL encoding

### Error: "@prisma/client did not initialize"
- The workflow now runs `npx prisma generate` automatically
- Check that `backend/prisma/schema.prisma` exists in your repository

### Error: "Invalid Gemini API key"
- Verify the API key starts with `AIza`
- Check it's not expired or revoked
- Ensure billing is enabled in Google Cloud (free tier available)

### Error: "Failed to fetch AI recommendations"
- This is non-critical - PDF will still generate without AI insights
- Check Gemini API quota limits
- Verify API key has Gemini API enabled

## What's Included in AI-Enhanced PDF

### 📊 Executive Summary
- Overall risk score
- Compliance status
- Finding statistics
- AI-generated insights

### 🎯 EU AI Act Compliance
- Risk level classification
- Transparency score
- Data governance score
- Human oversight score
- Technical robustness score

### 🤖 Gemini AI Recommendations
- Priority-based action items
- Security best practices
- Code improvement suggestions
- Compliance guidance

### 📝 Detailed Findings
- Categorized by severity
- Code snippets
- File locations
- Remediation steps

### 📈 Trend Analysis
- Historical comparison
- Progress tracking
- Risk evolution

## Cost Considerations

### Gemini API Pricing
- **Free tier:** 15 requests/minute, 1500 requests/day
- **Paid tier:** $0.00025 per 1K characters

**Estimated cost per scan:**
- ~2-3 API calls per scan
- ~$0.001 - $0.005 per scan with AI recommendations
- Free tier should cover most usage

### Disable AI Features (Optional)

If you want basic PDFs without AI (no cost):
1. Edit `.github/workflows/semgrep-scan.yml`
2. Change `pdf-report-ai-enhanced.service.js` to `pdf-report.service.js`
3. Remove Gemini API steps

## Support

If you encounter issues:
1. Check GitHub Actions logs
2. Verify all secrets are correctly set
3. Test Prisma connection: `cd backend && npx prisma db pull`
4. Test Gemini API: Visit https://aistudio.google.com/

---

**Last Updated:** November 4, 2025
**Version:** 2.0 (AI-Enhanced)
