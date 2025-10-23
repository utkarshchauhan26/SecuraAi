# Supabase Setup Guide for SecuraAI

This guide will walk you through setting up Supabase for SecuraAI authentication and database.

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in (or create an account)
2. Click "New Project"
3. Fill in the details:
   - **Name**: SecuraAI (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free (sufficient for MVP)
4. Click "Create new project"
5. Wait 2-3 minutes for project provisioning

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...` - keep this secret!)
3. Go to **Settings** → **API** → **JWT Settings**
4. Copy the **JWT Secret** (used to verify tokens)

## Step 3: Configure OAuth Providers

### GitHub OAuth Setup

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name**: SecuraAI
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
4. Click "Register application"
5. Copy the **Client ID**
6. Generate a **Client Secret** and copy it

Now configure in Supabase:
1. Go to **Authentication** → **Providers** in Supabase
2. Find **GitHub** and enable it
3. Paste your GitHub **Client ID** and **Client Secret**
4. Click "Save"

### Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure OAuth consent screen if prompted
6. For **Application type**, choose **Web application**
7. Add **Authorized redirect URIs**:
   - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
8. Click "Create"
9. Copy the **Client ID** and **Client Secret**

Now configure in Supabase:
1. Go to **Authentication** → **Providers** in Supabase
2. Find **Google** and enable it
3. Paste your Google **Client ID** and **Client Secret**
4. Click "Save"

## Step 4: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `backend/prisma/schema.sql`
4. Paste into the SQL editor
5. Click **Run** or press `Ctrl+Enter`
6. Wait for success message

You should see output like:
```
SecuraAI database schema created successfully!
Next steps:
1. Configure OAuth providers in Supabase Auth settings
2. Copy your DATABASE_URL to backend .env file
3. Run: npx prisma generate
4. Test the connection with: npx prisma db pull
```

## Step 5: Get Database Connection String

1. Go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password from Step 1

## Step 6: Configure Backend Environment Variables

1. Navigate to `backend/.env` (create if doesn't exist)
2. Copy contents from `backend/.env.example`
3. Fill in the values from previous steps:

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJ... (from Step 2)
SUPABASE_SERVICE_KEY=eyJ... (from Step 2)
SUPABASE_JWT_SECRET=your-jwt-secret (from Step 2)

# NextAuth
NEXTAUTH_SECRET=generate-random-32-char-string

# OpenAI
OPENAI_API_KEY=sk-... (your OpenAI API key)
```

**To generate NEXTAUTH_SECRET**, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 7: Generate Prisma Client

```bash
cd backend
npx prisma generate
```

This will create the Prisma Client based on your schema.

## Step 8: Test Database Connection

```bash
cd backend
npx prisma db pull
```

If successful, you'll see your schema is in sync.

## Step 9: Configure Frontend Environment Variables

1. Navigate to root directory (where `package.json` is)
2. Create `.env.local` file
3. Add the following:

```bash
# Supabase (Public keys only!)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (anon key from Step 2)

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=same-secret-as-backend

# GitHub OAuth
GITHUB_ID=[YOUR-GITHUB-CLIENT-ID]
GITHUB_SECRET=[YOUR-GITHUB-CLIENT-SECRET]

# Google OAuth
GOOGLE_CLIENT_ID=[YOUR-GOOGLE-CLIENT-ID]
GOOGLE_CLIENT_SECRET=[YOUR-GOOGLE-CLIENT-SECRET]
```

## Step 10: Verify Setup

### Test Backend Connection

```bash
cd backend
npm run dev
```

Visit http://localhost:5000/api/health - should return:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### Test Frontend

```bash
npm run dev
```

Visit http://localhost:3000 - should load without errors

## Troubleshooting

### Issue: "Database connection failed"
- Double-check your DATABASE_URL has the correct password
- Ensure your IP is allowed (Supabase Free tier allows all IPs by default)
- Check database is running in Supabase dashboard

### Issue: "JWT verification failed"
- Verify SUPABASE_JWT_SECRET matches what's in Supabase dashboard
- Ensure NEXTAUTH_SECRET is the same in both backend and frontend .env

### Issue: "OAuth not working"
- Check callback URLs are exactly: `https://[PROJECT-REF].supabase.co/auth/v1/callback`
- Verify Client IDs and Secrets are correct
- Make sure providers are enabled in Supabase Auth settings

### Issue: "Prisma generate fails"
- Run `npm install @prisma/client prisma` in backend directory
- Ensure DATABASE_URL is set in .env file
- Check prisma/schema.prisma syntax is correct

## Security Notes

- **Never commit** `.env` files to git (they're in .gitignore)
- **Never expose** `SUPABASE_SERVICE_KEY` in frontend code
- Use `SUPABASE_ANON_KEY` in frontend (it's safe for public use with RLS)
- Keep your `NEXTAUTH_SECRET` and `SUPABASE_JWT_SECRET` secure

## Production Deployment Notes

When deploying to production:

1. Update callback URLs in GitHub/Google OAuth settings to your production domain
2. Update `NEXTAUTH_URL` to your production URL
3. Update `FRONTEND_URL` in backend to production frontend URL
4. Use environment variable management in your hosting platform (Vercel/Railway)
5. Enable HTTPS (most platforms do this automatically)

## Next Steps

After setup is complete:
- ✅ Database schema created
- ✅ OAuth providers configured
- ✅ Environment variables set
- ✅ Prisma client generated

You're ready to start implementing the authentication flow and scan functionality!

Proceed to `IMPLEMENTATION_PLAN.md` Phase 2.
