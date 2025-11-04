# GitHub Secrets Setup Guide

## Required Secrets for GitHub Actions

Your `.github/workflows/semgrep-scan.yml` workflow requires these secrets to be configured in your GitHub repository:

### 1. Existing Secrets (Already Configured)
- ✅ `SUPABASE_URL` - Your Supabase project URL
- ✅ `SUPABASE_SERVICE_KEY` - Your Supabase service role key (for server-side access)
- ✅ `BACKEND_URL` - Your Render backend URL

### 2. New Secret Required for AI-Enhanced PDF
- ⚠️ **`GEMINI_API_KEY`** - Google Gemini AI API key for AI-powered recommendations

---

## How to Add GEMINI_API_KEY

### Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated API key

### Step 2: Add to GitHub Repository Secrets

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click **"New repository secret"**
3. Name: `GEMINI_API_KEY`
4. Value: Paste your Gemini API key
5. Click **"Add secret"**

---

## What the AI-Enhanced PDF Includes

With `GEMINI_API_KEY` configured, your PDF reports will include:

### 🎯 SecuraAI Smart Score
- **Severity Analysis** - Critical/High/Medium/Low distribution
- **Code Coverage** - Percentage of code analyzed
- **Remediation Complexity** - Effort required to fix
- **Security Impact** - Potential business risk
- **AI Confidence** - Machine learning confidence level

### 🇪🇺 Europe AI Code of Practice Score
Five pillar assessment:
1. **Transparency & Explainability** - AI decision clarity
2. **Fairness & Non-discrimination** - Bias detection
3. **Human Oversight** - Manual review capability
4. **Safety & Robustness** - Security resilience
5. **Privacy & Data Governance** - Data protection compliance

### 🤖 Gemini AI Recommendations
- Smart remediation suggestions
- Context-aware security guidance
- Best practice recommendations
- Priority-based fix ordering

---

## Testing Without Gemini (Optional)

If you want to test the workflow WITHOUT Gemini AI (basic PDF only):

The AI-enhanced service will gracefully degrade if `GEMINI_API_KEY` is missing:
- ✅ PDF will still generate
- ✅ All findings included
- ✅ SecuraAI score calculated
- ✅ EU AI compliance score calculated
- ❌ No Gemini AI recommendations section

---

## Verification

After adding the secret, trigger a new scan:

```bash
# The workflow will automatically use the AI-enhanced PDF service
# Check GitHub Actions logs for:
# ✅ AI-Enhanced PDF generated
# ✅ EU AI Compliance Score included
# ✅ Gemini AI Recommendations included
```

---

## Troubleshooting

### Error: "Gemini API key not configured"
→ Add `GEMINI_API_KEY` to GitHub repository secrets

### Error: "Invalid API key"
→ Verify your Gemini API key is correct at [Google AI Studio](https://makersuite.google.com/app/apikey)

### Error: "Quota exceeded"
→ Check your Gemini API usage limits at [Google Cloud Console](https://console.cloud.google.com/)

---

## Summary of Changes

### What Changed in GitHub Actions Workflow:

1. **Updated PDF Service**: 
   - Old: `pdf-report.service.js` (basic)
   - New: `pdf-report-ai-enhanced.service.js` (AI-powered)

2. **Added Dependencies**:
   ```yaml
   npm install pdfkit @google/generative-ai
   ```

3. **Added Environment Variable**:
   ```yaml
   env:
     GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
   ```

4. **Added Final Status Update**:
   - Updates scan to `status='completed'`, `progress=100`
   - Includes all findings counts
   - Sets `report_url` to Supabase Storage URL

---

## Next Steps

1. ✅ Add `GEMINI_API_KEY` to GitHub secrets
2. ✅ Commit and push the workflow changes
3. ✅ Run a new scan from your dashboard
4. ✅ Verify PDF has EU compliance scores and AI recommendations
5. ✅ Confirm progress reaches 100% when completed

