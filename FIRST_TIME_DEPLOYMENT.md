# 🚀 SecuraAI - First Time Deployment Guide

**Date**: November 2, 2025  
**For**: Students deploying for free (no credit card required)  
**Time needed**: 30-45 minutes

---

## 🎯 What We're Deploying

- **Frontend**: Vercel (100% free, no card needed)
- **Backend**: Vercel Serverless (free tier, recommended) OR Render (free but slower)
- **Database**: Supabase (generous free tier)
- **Storage**: Supabase Storage (for PDFs)
- **AI**: Google Gemini (free tier)

---

## ✅ Prerequisites

Before starting, make sure you have:
- [x] GitHub account
- [x] Vercel account (sign up with GitHub at https://vercel.com)
- [x] Supabase account (sign up at https://supabase.com)
- [x] Google Cloud account for OAuth (https://console.cloud.google.com)
- [x] Google AI Studio API key (https://aistudio.google.com/app/apikey)

---

## 📦 STEP 1: Fix the Supabase Storage Error

### 1.1 Create the Storage Bucket

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Click **Storage** in the left sidebar
   - Click **"Create a new bucket"** button

3. **Create "reports" bucket**
   - **Name**: `reports`
   - **Public bucket**: ❌ **UNCHECK** (keep it private for security)
   - Click **"Create bucket"**

### 1.2 Set Up Storage Policies (Important!)

Since the bucket is private, we need to allow your backend to upload:

1. **Click on the "reports" bucket**

2. **Go to "Policies" tab**

3. **Click "New Policy"** → Choose **"Custom"**

4. **Create Upload Policy**:
   ```sql
   CREATE POLICY "Allow service role to upload"
   ON storage.objects FOR INSERT
   TO service_role
   WITH CHECK (bucket_id = 'reports');
   ```

5. **Create Read Policy** (for signed URLs):
   ```sql
   CREATE POLICY "Allow authenticated users to read"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'reports');
   ```

6. **Click "Review"** then **"Save Policy"**

### 1.3 Optional: Set Up Auto-Delete (Recommended)

To save space, delete PDFs after 30 days:

1. Go to **Storage** → **reports** bucket
2. Click **"Settings"** tab
3. Enable **"Lifecycle"**
4. Add rule: Delete objects older than **30 days**

✅ **Now restart your backend** - the error should be gone!

---

## 🌐 STEP 2: Set Up Google OAuth

### 2.1 Create OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com

2. **Create a new project** (if you don't have one)
   - Click project dropdown → **"New Project"**
   - Name: `SecuraAI` → Click **"Create"**

3. **Enable Google+ API**
   - Go to **"APIs & Services"** → **"Library"**
   - Search for **"Google+ API"**
   - Click **"Enable"**

4. **Configure OAuth Consent Screen**
   - Go to **"APIs & Services"** → **"OAuth consent screen"**
   - User Type: **External** → Click **"Create"**
   - Fill in:
     - App name: `SecuraAI`
     - User support email: Your email
     - Developer contact: Your email
   - Click **"Save and Continue"**
   - Skip scopes → Click **"Save and Continue"**
   - Add test users: Your email → Click **"Save and Continue"**

5. **Create OAuth Client ID**
   - Go to **"Credentials"** → Click **"Create Credentials"** → **"OAuth client ID"**
   - Application type: **Web application**
   - Name: `SecuraAI Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for testing)
     - `https://your-app.vercel.app` (add after deploying)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (for testing)
     - `https://your-app.vercel.app/api/auth/callback/google` (add after deploying)
   - Click **"Create"**

6. **Copy your credentials**:
   - **Client ID**: `123456789-abcdefg.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxxxxxxxxx`
   - ⚠️ **Save these** - you'll need them for environment variables!

---

## 🔑 STEP 3: Get Google Gemini API Key

1. **Go to Google AI Studio**
   - Visit https://aistudio.google.com/app/apikey

2. **Create API Key**
   - Click **"Create API Key"**
   - Select your Google Cloud project (or create new)
   - Click **"Create API Key in existing project"**

3. **Copy the API key**
   - Format: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
   - ⚠️ **Save this** for environment variables!

---

## 📤 STEP 4: Deploy Frontend to Vercel

### 4.1 Push Your Code to GitHub (Already Done ✅)

Your code is already on GitHub: `utkarshchauhan26/SecuraAi`

### 4.2 Deploy to Vercel

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard

2. **Import Your Repository**
   - Click **"Add New..."** → **"Project"**
   - Click **"Import"** next to `utkarshchauhan26/SecuraAi`

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected ✅)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (auto-detected ✅)
   - **Output Directory**: `.next` (auto-detected ✅)

4. **Add Environment Variables** (Click "Environment Variables"):

   ```env
   # NextAuth
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-generated-secret
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Supabase (Public - for frontend)
   NEXT_PUBLIC_SUPABASE_URL=https://xvbgyzreroygnwmcgghh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # Backend API URL (we'll update this after backend deploy)
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

   **How to generate NEXTAUTH_SECRET**:
   - Open terminal and run: `openssl rand -base64 32`
   - Or visit: https://generate-secret.vercel.app/32
   - Copy the generated value

5. **Click "Deploy"**
   - Wait 2-3 minutes for build to complete
   - Copy your deployment URL: `https://your-app.vercel.app`

### 4.3 Update Google OAuth with Vercel URL

1. **Go back to Google Cloud Console**
   - **APIs & Services** → **Credentials**
   - Click on your OAuth client

2. **Add Vercel URLs**:
   - **Authorized JavaScript origins**:
     - Add: `https://your-app.vercel.app`
   - **Authorized redirect URIs**:
     - Add: `https://your-app.vercel.app/api/auth/callback/google`
   - Click **"Save"**

3. **Update Vercel Environment Variable**:
   - Go to Vercel → Your Project → **Settings** → **Environment Variables**
   - Edit `NEXTAUTH_URL` → Change to: `https://your-app.vercel.app`
   - Click **"Save"**
   - Go to **Deployments** → Click **"..."** on latest → **"Redeploy"**

---

## 🔧 STEP 5: Deploy Backend (Option A: Vercel - Recommended for Students)

### Why Vercel for Backend?
- ✅ 100% free (no credit card)
- ✅ No cold starts (faster than Render)
- ✅ Easy setup (just API routes)
- ✅ Integrated with frontend

### 5.1 Move Backend to Vercel API Routes

We'll convert your Express backend to Next.js API routes (I can help with this if needed).

**For now, let's use Option B (Render) to get you deployed quickly.**

---

## 🔧 STEP 5: Deploy Backend (Option B: Render - Quick Setup)

### 5.1 Create Render Account

1. **Sign up at Render**
   - Visit https://render.com
   - Click **"Get Started"** → Sign up with GitHub

2. **Authorize Render** to access your GitHub repos

### 5.2 Create New Web Service

1. **Click "New +"** → **"Web Service"**

2. **Connect Repository**:
   - Select `utkarshchauhan26/SecuraAi`
   - Click **"Connect"**

3. **Configure Service**:
   - **Name**: `securaai-backend`
   - **Region**: Choose closest to you
   - **Branch**: `master`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: **Free** ✅

4. **Add Environment Variables** (Click "Advanced"):

   ```env
   # Supabase
   SUPABASE_URL=https://xvbgyzreroygnwmcgghh.supabase.co
   SUPABASE_SERVICE_KEY=your-supabase-service-role-key
   SUPABASE_REPORTS_BUCKET=reports
   
   # Google Gemini
   GEMINI_API_KEY=your-gemini-api-key
   
   # Server
   PORT=5000
   NODE_ENV=production
   FRONTEND_URL=https://your-app.vercel.app
   ```

   **Where to find Supabase Service Key**:
   - Go to Supabase Dashboard → **Settings** → **API**
   - Copy **"service_role"** key (keep this secret!)

5. **Click "Create Web Service"**
   - Wait 5-10 minutes for deployment
   - Copy your backend URL: `https://securaai-backend.onrender.com`

### 5.3 Update Frontend to Use Backend URL

1. **Go to Vercel Dashboard**
   - Select your project → **Settings** → **Environment Variables**

2. **Update API URL**:
   - Find `NEXT_PUBLIC_API_URL`
   - Change value to: `https://securaai-backend.onrender.com`
   - Click **"Save"**

3. **Redeploy Frontend**:
   - Go to **Deployments**
   - Click **"..."** on latest deployment → **"Redeploy"**

### 5.4 Update Backend CORS

Your backend needs to allow requests from Vercel:

1. **Update `backend/server.js`** (locally):
   ```javascript
   const cors = require('cors');
   
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'https://your-app.vercel.app' // Add your Vercel URL
     ],
     credentials: true
   }));
   ```

2. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: update CORS for production"
   git push origin master
   ```

3. **Render will auto-deploy** the changes (takes 2-3 minutes)

---

## 🧪 STEP 6: Test Your Deployment

### 6.1 Test Frontend

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Click **"Get Started"**
3. Sign in with Google
4. Should redirect to dashboard ✅

### 6.2 Test File Upload

1. Upload a small project (zip file)
2. Wait for scan to complete
3. Check findings appear ✅

### 6.3 Test PDF Generation

1. Click **"Download Report"**
2. PDF should download ✅
3. Open PDF → Check for:
   - ✅ No blank pages
   - ✅ All sections rendered
   - ✅ Professional formatting

### 6.4 Test Supabase Storage

1. **Go to Supabase Dashboard**
   - **Storage** → **reports** bucket
   - Should see: `scans/{scanId}/SecuraAI-Report-*.pdf` ✅

2. **Check Database**:
   - **Table Editor** → **scans** table
   - Find your scan → Check `report_json` column
   - Should contain: `{ signedUrl: "https://...", storagePath: "..." }` ✅

---

## 🔧 STEP 7: Environment Variables Summary

### Frontend (.env.local - Vercel)

```env
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-generated-secret-32-chars
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xvbgyzreroygnwmcgghh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://securaai-backend.onrender.com
```

### Backend (.env - Render)

```env
SUPABASE_URL=https://xvbgyzreroygnwmcgghh.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role...
SUPABASE_REPORTS_BUCKET=reports
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

---

## 🐛 Troubleshooting

### Issue 1: "Bucket not found" error ❌

**Fix**:
1. Create `reports` bucket in Supabase Storage
2. Add upload/read policies (see Step 1.2)
3. Set `SUPABASE_REPORTS_BUCKET=reports` in Render

### Issue 2: OAuth error "redirect_uri_mismatch" ❌

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Add your Vercel URL to authorized redirect URIs:
   - `https://your-app.vercel.app/api/auth/callback/google`
3. Save and wait 5 minutes for propagation

### Issue 3: Backend timeout on Render ❌

**Why**: Render free tier sleeps after 15 minutes of inactivity

**Fix**:
- First request takes 30-60 seconds to wake up (normal)
- Consider upgrading to paid tier ($7/month) if needed
- OR migrate backend to Vercel API routes (no sleep, free)

### Issue 4: PDF generation fails ❌

**Check**:
1. Render logs: `https://dashboard.render.com/web/{your-service}/logs`
2. Look for errors related to:
   - Missing env vars
   - Supabase connection
   - Semgrep not found (should auto-install)

### Issue 5: "Unauthorized" when accessing scan ❌

**Fix**:
1. Make sure you're signed in with Google
2. Check browser console for errors
3. Verify `NEXTAUTH_SECRET` is same across deployments

---

## 📊 Free Tier Limits

### Vercel
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Serverless functions: 100 GB-hours/month
- ✅ 10s max execution time per function
- ⚠️ No credit card needed

### Render
- ✅ 750 hours/month (enough for 1 service 24/7)
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ 512 MB RAM (might struggle with large scans)
- ✅ No credit card needed

### Supabase
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 50 MB file upload limit
- ✅ 2 GB bandwidth/month
- ⚠️ Auto-pauses after 1 week of inactivity

### Google Gemini
- ✅ 15 requests/minute
- ✅ 1 million tokens/minute
- ✅ 1,500 requests/day
- ✅ 100% free (no card needed)

---

## 🎯 Next Steps After Deployment

### 1. Add to Resume/Portfolio
```
SecuraAI - AI-Powered Code Security Auditor
- Built with Next.js, Express, Supabase, Google Gemini
- Automated security scanning with Semgrep
- PDF report generation with 10-12 page professional format
- Deployed on Vercel + Render (zero cost)
- Live demo: https://your-app.vercel.app
```

### 2. Create Demo Video
- Record yourself uploading a project
- Show the scan progress
- Download the PDF report
- Add to LinkedIn/GitHub

### 3. Share on LinkedIn
```
🚀 Just launched SecuraAI - an AI-powered security scanner!

Features:
✅ Automated vulnerability detection
✅ AI-powered insights with Google Gemini
✅ Professional PDF reports
✅ 100% free deployment (no credit card)

Built with: Next.js, Supabase, Semgrep, Google AI
Try it: https://your-app.vercel.app

#WebDev #AI #CyberSecurity #NextJS
```

### 4. Monitor Usage
- Check Vercel Analytics for traffic
- Monitor Supabase dashboard for database size
- Watch Render logs for errors
- Set up alerts for quota limits

---

## ✅ Deployment Checklist

Before marking as "done", verify:

- [ ] Supabase `reports` bucket created with policies
- [ ] Google OAuth credentials created and configured
- [ ] Google Gemini API key obtained
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Render
- [ ] All environment variables set correctly
- [ ] CORS configured for production URLs
- [ ] OAuth redirect URIs updated with Vercel URL
- [ ] Test sign-in works
- [ ] Test file upload and scan works
- [ ] Test PDF download works
- [ ] PDF appears in Supabase Storage
- [ ] `scans.report_json` contains signed URL
- [ ] No errors in browser console
- [ ] No errors in Render logs

---

## 🎉 Congratulations!

You've successfully deployed SecuraAI to production! 🚀

**Your live app**: `https://your-app.vercel.app`

Now you can:
- ✅ Share it with recruiters
- ✅ Add to your resume
- ✅ Demo in interviews
- ✅ Show off on LinkedIn

**Cost**: $0/month (100% free! 🎊)

---

## 📞 Need Help?

If you run into issues:
1. Check the troubleshooting section above
2. Look at Render logs: `https://dashboard.render.com`
3. Check Vercel deployment logs
4. Review Supabase logs

**Common issues are usually**:
- Missing environment variables
- Wrong OAuth redirect URIs
- Storage bucket not created
- CORS not configured

---

**Good luck with your job search! 🍀**

*Built by: Utkarsh Chauhan*
*Date: November 2, 2025*
