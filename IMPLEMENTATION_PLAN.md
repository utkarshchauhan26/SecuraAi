# SecuraAI MVP Implementation Plan

## Current State Analysis

### ✅ What's Already Built
- **Frontend Structure**: Next.js with app router, UI components (shadcn/ui), landing page, dashboard layout
- **Backend Structure**: Express server with routes, controllers, services pattern
- **Existing Services**: 
  - Semgrep service (basic structure, needs real CLI integration)
  - AI service (OpenAI integration with caching)
  - Scoring service
  - Usage tracking service
- **File Handling**: Multer setup for uploads, file validation middleware
- **API Client**: TypeScript API client for frontend-backend communication

### ❌ What's Missing/Needs Implementation
- **Authentication**: No auth system (needs Supabase + NextAuth)
- **Database**: No persistent storage (using in-memory Maps)
- **Real Semgrep Integration**: Service exists but doesn't actually run Semgrep CLI
- **GitHub Cloning**: GitHub controller exists but not implemented
- **PDF Generation**: Report routes exist but no PDF export
- **Frontend Auth**: No session management or protected routes
- **Real Data Flow**: All frontend uses mock data
- **Cost Tracking**: Basic structure but no real implementation
- **Deployment Configs**: No Docker, no deployment scripts

---

## Phase 1: Database & Authentication Foundation (Week 1)

### 1.1 Supabase Setup
**Tasks:**
- [ ] Create Supabase project at https://supabase.com
- [ ] Enable GitHub OAuth in Supabase Auth settings
- [ ] Enable Google OAuth in Supabase Auth settings
- [ ] Create database schema (see schema below)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Get connection string and anon/service keys

**Database Schema (Postgres/Supabase):**
```sql
-- Users table (managed by Supabase Auth, we'll extend it)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  daily_budget_cents INT DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('upload', 'github')),
  repo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scans table
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  risk_score INT DEFAULT 0,
  total_findings INT DEFAULT 0,
  critical_count INT DEFAULT 0,
  high_count INT DEFAULT 0,
  medium_count INT DEFAULT 0,
  low_count INT DEFAULT 0,
  report_json JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Findings table
CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  file_path TEXT NOT NULL,
  start_line INT NOT NULL,
  end_line INT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  code_snippet TEXT,
  category TEXT,
  cwe TEXT[],
  owasp TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Explanations table
CREATE TABLE public.explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID UNIQUE NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  why_it_matters TEXT,
  fix_steps TEXT,
  best_practices TEXT,
  prevention_tips TEXT,
  cached_key TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  cost_cents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on cached_key for faster lookups
CREATE INDEX idx_explanations_cached_key ON public.explanations(cached_key);

-- Usage Events table (for cost tracking)
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('openai', 'semgrep', 'pdf', 'scan')),
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  metadata JSONB,
  cost_cents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own scans" ON public.scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own scans" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view findings from own scans" ON public.findings FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.scans WHERE scans.id = findings.scan_id AND scans.user_id = auth.uid()));

CREATE POLICY "Users can view explanations from own findings" ON public.explanations FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.findings 
    JOIN public.scans ON scans.id = findings.scan_id 
    WHERE findings.id = explanations.finding_id AND scans.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own usage events" ON public.usage_events FOR SELECT USING (auth.uid() = user_id);
```

### 1.2 Backend: Prisma Setup
**Tasks:**
- [ ] Install Prisma: `cd backend && npm install prisma @prisma/client`
- [ ] Initialize Prisma: `npx prisma init`
- [ ] Create `backend/prisma/schema.prisma` with models matching Supabase schema
- [ ] Configure DATABASE_URL in `.env` (from Supabase connection string)
- [ ] Run `npx prisma generate` to generate Prisma Client
- [ ] Create `backend/lib/prisma.js` singleton

**Prisma Schema File:**
```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model UserProfile {
  id              String         @id @db.Uuid
  email           String
  name            String?
  avatarUrl       String?        @map("avatar_url")
  dailyBudgetCents Int           @default(200) @map("daily_budget_cents")
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  projects        Project[]
  scans           Scan[]
  usageEvents     UsageEvent[]   @relation("UserUsageEvents")

  @@map("user_profiles")
}

model Project {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  name      String
  source    String
  repoUrl   String?  @map("repo_url")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  user      UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)
  scans     Scan[]

  @@map("projects")
}

model Scan {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId      String    @map("project_id") @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  status         String
  startedAt      DateTime? @map("started_at") @db.Timestamptz(6)
  finishedAt     DateTime? @map("finished_at") @db.Timestamptz(6)
  riskScore      Int       @default(0) @map("risk_score")
  totalFindings  Int       @default(0) @map("total_findings")
  criticalCount  Int       @default(0) @map("critical_count")
  highCount      Int       @default(0) @map("high_count")
  mediumCount    Int       @default(0) @map("medium_count")
  lowCount       Int       @default(0) @map("low_count")
  reportJson     Json?     @map("report_json")
  errorMessage   String?   @map("error_message")
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  
  project        Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user           UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)
  findings       Finding[]

  @@map("scans")
}

model Finding {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  scanId      String   @map("scan_id") @db.Uuid
  ruleId      String   @map("rule_id")
  severity    String
  filePath    String   @map("file_path")
  startLine   Int      @map("start_line")
  endLine     Int      @map("end_line")
  title       String
  message     String?
  codeSnippet String?  @map("code_snippet")
  category    String?
  cwe         String[]
  owasp       String[]
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  scan        Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  explanation Explanation?

  @@map("findings")
}

model Explanation {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  findingId         String   @unique @map("finding_id") @db.Uuid
  summary           String
  whyItMatters      String?  @map("why_it_matters")
  fixSteps          String?  @map("fix_steps")
  bestPractices     String?  @map("best_practices")
  preventionTips    String?  @map("prevention_tips")
  cachedKey         String   @map("cached_key")
  model             String
  promptTokens      Int      @default(0) @map("prompt_tokens")
  completionTokens  Int      @default(0) @map("completion_tokens")
  costCents         Int      @default(0) @map("cost_cents")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  finding           Finding  @relation(fields: [findingId], references: [id], onDelete: Cascade)

  @@index([cachedKey], map: "idx_explanations_cached_key")
  @@map("explanations")
}

model UsageEvent {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  eventType String   @map("event_type")
  scanId    String?  @map("scan_id") @db.Uuid
  metadata  Json?
  costCents Int      @default(0) @map("cost_cents")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  user      UserProfile @relation("UserUsageEvents", fields: [userId], references: [id], onDelete: Cascade)

  @@map("usage_events")
}
```

### 1.3 Backend: Auth Middleware
**Tasks:**
- [ ] Install JWT library: `npm install jsonwebtoken @supabase/supabase-js`
- [ ] Create `backend/middleware/auth.js` to verify Supabase JWT tokens
- [ ] Update all protected routes to use auth middleware
- [ ] Create user profile on first login (trigger)

**File: `backend/middleware/auth.js`**

### 1.4 Frontend: NextAuth Setup
**Tasks:**
- [ ] Install NextAuth: `npm install next-auth @auth/prisma-adapter`
- [ ] Create `app/api/auth/[...nextauth]/route.ts`
- [ ] Configure GitHub and Google OAuth providers
- [ ] Add session provider wrapper in root layout
- [ ] Create auth utility hooks (`useSession`, `getServerSession`)
- [ ] Add sign-in/sign-out buttons to navigation

---

## Phase 2: Real Scanning Implementation (Week 1-2)

### 2.1 Semgrep CLI Integration
**Tasks:**
- [ ] Update `backend/services/semgrep.service.js` to actually run Semgrep CLI
- [ ] Add proper error handling and timeouts (30s max)
- [ ] Configure rulesets: `p/owasp-top-ten`, `p/security-audit`, `p/secrets`
- [ ] Add file/directory ignore patterns (node_modules, .git, etc.)
- [ ] Parse Semgrep JSON output correctly
- [ ] Map severity levels (INFO/WARNING/ERROR → LOW/MEDIUM/HIGH/CRITICAL)
- [ ] Extract CWE and OWASP categories from metadata
- [ ] Add size limits (max 100MB, max 10k files)

**Key Implementation Points:**
- Use `child_process.spawn` with proper stream handling
- Set `--max-target-bytes`, `--timeout`, `--skip-unknown-extensions`
- Handle non-zero exit codes (Semgrep returns 1 when findings exist)
- Sanitize file paths to prevent path traversal

### 2.2 GitHub Repository Cloning
**Tasks:**
- [ ] Update `backend/controllers/github.controller.js`
- [ ] Use `simple-git` for shallow clones (`--depth 1`)
- [ ] Support branch selection (default: main/master)
- [ ] Accept Personal Access Token for private repos (never store, memory only)
- [ ] Clone to temp directory with unique ID
- [ ] Add timeout on clone operation (2 minutes max)
- [ ] Clean up temp directory after scan completes
- [ ] Validate repo URLs (whitelist github.com, gitlab.com, etc.)

### 2.3 Update Scan Controller
**Tasks:**
- [ ] Replace in-memory Map with Prisma database calls
- [ ] Create user profile if doesn't exist
- [ ] Create project record
- [ ] Create scan record with status 'queued'
- [ ] Run Semgrep scan
- [ ] Store findings in database
- [ ] Trigger AI explanations asynchronously
- [ ] Update scan status to 'completed' or 'failed'
- [ ] Calculate and store risk score
- [ ] Track usage event

---

## Phase 3: AI Explanations & Cost Tracking (Week 2)

### 3.1 Enhanced AI Service
**Tasks:**
- [ ] Update `backend/services/ai.service.js` with Prisma
- [ ] Check cache in database (by `cachedKey`)
- [ ] Check user's daily budget before calling OpenAI
- [ ] Generate detailed prompt with best practices section
- [ ] Parse response into structured sections
- [ ] Calculate token cost accurately (gpt-4o-mini pricing)
- [ ] Store explanation in database
- [ ] Create usage event record
- [ ] Return cached vs fresh indicator

**Prompt Template:**
```
You are a senior security consultant explaining a vulnerability to a developer.

VULNERABILITY DETAILS:
- Rule: {ruleId}
- Severity: {severity}
- File: {filePath}:{startLine}-{endLine}
- Category: {category}

CODE SNIPPET:
{codeSnippet}

Please provide:

1. SUMMARY (2-3 sentences)
Explain what the vulnerability is in plain English.

2. WHY IT MATTERS (2-3 sentences)
Explain the real-world security impact and potential attacks.

3. FIX STEPS (numbered list, code examples)
Provide concrete steps to fix this issue with code snippets.

4. BEST PRACTICES (3-5 bullet points)
Language-specific security best practices to prevent this in the future.

5. PREVENTION TIPS (3-5 bullet points)
Development practices, code review checklist items, and tools to prevent this vulnerability class.

Keep explanations practical, actionable, and avoid security jargon where possible.
```

### 3.2 Cost Tracking & Budgets
**Tasks:**
- [ ] Create `backend/services/cost.service.js`
- [ ] Implement budget check before AI calls
- [ ] Track daily usage per user
- [ ] Calculate estimated cost before scan
- [ ] Show cost breakdown in UI
- [ ] Allow users to set custom daily budgets
- [ ] Add cost summary to PDF reports

**Pricing (as of Oct 2025):**
- gpt-4o-mini: $0.150/1M input tokens, $0.600/1M output tokens
- Average explanation: ~500 input + 300 output tokens = $0.00027 (~$0.0003)
- Default budget: $2/day = ~6,600 explanations

---

## Phase 4: PDF Report Generation (Week 2)

### 4.1 PDF Export with Puppeteer
**Tasks:**
- [ ] Install Puppeteer: `npm install puppeteer`
- [ ] Create `backend/services/pdf.service.js`
- [ ] Design HTML template for report
- [ ] Include: project name, scan date, risk score, findings table, explanations
- [ ] Add charts/graphs (risk score gauge, severity distribution)
- [ ] Include cost summary and AI usage stats
- [ ] Generate PDF with proper styling
- [ ] Add SecuraAI branding
- [ ] Handle large reports (pagination)

**Alternative (if Puppeteer is too heavy):**
- Use `pdfkit` or `jsPDF` for simpler PDF generation
- Or use external service like PDF.co API

### 4.2 Report Controller
**Tasks:**
- [ ] Create `backend/routes/report.routes.js`
- [ ] Add `GET /api/report/:scanId` (JSON report)
- [ ] Add `GET /api/report/:scanId/pdf` (download PDF)
- [ ] Verify user owns the scan (auth check)
- [ ] Add download tracking (usage event)

---

## Phase 5: Frontend Integration (Week 2-3)

### 5.1 Update API Client
**Tasks:**
- [ ] Update `lib/api.ts` to include auth headers
- [ ] Add `getSession()` to fetch JWT token
- [ ] Add error handling for 401 (redirect to login)
- [ ] Add retry logic for network errors
- [ ] Update all endpoints to match new backend routes

### 5.2 Protected Routes
**Tasks:**
- [ ] Create `middleware.ts` for Next.js middleware
- [ ] Protect `/dashboard/*` routes
- [ ] Redirect unauthenticated users to landing page
- [ ] Show loading state while checking auth

### 5.3 Dashboard Updates
**Tasks:**
- [ ] Remove all mock data
- [ ] Connect upload form to real API
- [ ] Add GitHub repo input with PAT field (optional)
- [ ] Show real-time scan status (polling)
- [ ] Display actual findings from database
- [ ] Show AI explanations for each finding
- [ ] Add "Download PDF" button

### 5.4 Reports Page
**Tasks:**
- [ ] Fetch user's past scans from API
- [ ] Display scan history with status
- [ ] Show risk scores and finding counts
- [ ] Link to detailed scan results
- [ ] Add filters (date, status, severity)

### 5.5 Settings Page
**Tasks:**
- [ ] Show user profile info
- [ ] Display daily budget setting
- [ ] Show usage stats (API calls, tokens, cost)
- [ ] Add budget adjustment control
- [ ] Show billing/usage history table

---

## Phase 6: Deployment (Week 3)

### 6.1 Backend Deployment (Railway/Render)
**Tasks:**
- [ ] Create `Dockerfile` for backend
- [ ] Install Python and Semgrep in Docker image
- [ ] Set up environment variables
- [ ] Configure Railway/Render service
- [ ] Add health check endpoint
- [ ] Test Semgrep installation
- [ ] Test Puppeteer (if using)
- [ ] Monitor logs

**Dockerfile Template:**
```dockerfile
FROM node:18-slim

# Install Python and Semgrep
RUN apt-get update && apt-get install -y python3 python3-pip git
RUN pip3 install semgrep

# Install Puppeteer dependencies (if needed)
RUN apt-get install -y chromium

# App setup
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 5000
CMD ["node", "server.js"]
```

### 6.2 Frontend Deployment (Vercel)
**Tasks:**
- [ ] Connect GitHub repo to Vercel
- [ ] Set environment variables (NEXTAUTH_SECRET, NEXTAUTH_URL, API_URL, Supabase keys)
- [ ] Configure build settings
- [ ] Deploy and test
- [ ] Set up custom domain (optional)

### 6.3 Environment Variables Checklist

**Backend (.env):**
```
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://...from-supabase...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_KEY=eyJhb...
NEXTAUTH_SECRET=your-secret-here
OPENAI_API_KEY=sk-...
FRONTEND_URL=https://your-app.vercel.app
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=same-as-backend
GITHUB_CLIENT_ID=your-github-oauth-app-id
GITHUB_CLIENT_SECRET=your-github-oauth-app-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

---

## Phase 7: Testing & Polish (Week 3)

### 7.1 E2E Testing
**Tasks:**
- [ ] Test sign-up flow (GitHub OAuth)
- [ ] Test file upload scan
- [ ] Test GitHub repo scan (public repo)
- [ ] Test GitHub repo scan (private repo with PAT)
- [ ] Verify findings are correct
- [ ] Verify AI explanations generate
- [ ] Test PDF download
- [ ] Test budget enforcement
- [ ] Test error states (invalid repo, timeout, etc.)

### 7.2 Performance Optimization
**Tasks:**
- [ ] Add loading skeletons
- [ ] Optimize database queries (indexes)
- [ ] Add request caching where appropriate
- [ ] Lazy load AI explanations (on-demand)
- [ ] Compress PDF output
- [ ] Add rate limiting per user

### 7.3 Security Hardening
**Tasks:**
- [ ] Validate all user inputs
- [ ] Sanitize file paths
- [ ] Set proper CORS policies
- [ ] Add CSRF protection
- [ ] Audit dependencies for CVEs
- [ ] Add logging (no sensitive data)
- [ ] Set up error monitoring (Sentry)

---

## Success Metrics (MVP)

- [ ] User can sign in with GitHub/Google
- [ ] User can upload a .zip file and get real Semgrep results
- [ ] User can scan a public GitHub repo
- [ ] User can scan a private GitHub repo with PAT
- [ ] Findings display correctly with severity, file, lines
- [ ] AI generates explanations with fixes and best practices
- [ ] Risk score calculates correctly
- [ ] PDF report downloads with all data
- [ ] Usage tracking shows token counts and costs
- [ ] Daily budget enforcement works
- [ ] App is deployed and publicly accessible
- [ ] All features work end-to-end with real data

---

## Out of Scope for MVP (Future Enhancements)

- GitHub App integration (use PAT for now)
- CI/CD integrations (GitHub Actions, GitLab CI)
- Teams/organizations
- Advanced RBAC
- Scheduled scans
- Webhook notifications
- Email reports
- Advanced analytics dashboard
- Multiple AI model selection
- Custom Semgrep rules
- Integration with other SAST tools
- Mobile app
- Enterprise SSO

---

## Development Timeline

**Week 1 (Days 1-7):**
- Days 1-2: Supabase setup, database schema, Prisma configuration
- Days 3-4: Auth middleware, NextAuth integration, protected routes
- Days 5-7: Real Semgrep integration, GitHub cloning, scan controller updates

**Week 2 (Days 8-14):**
- Days 8-9: AI service enhancements, cost tracking, budget enforcement
- Days 10-11: PDF generation service, report endpoints
- Days 12-14: Frontend integration, replace mocks, connect to real APIs

**Week 3 (Days 15-21):**
- Days 15-16: Backend deployment (Railway/Render)
- Days 17-18: Frontend deployment (Vercel)
- Days 19-20: E2E testing, bug fixes
- Day 21: Polish, documentation, launch prep

---

## Files to Create/Modify

### Backend Files to Create:
1. `backend/prisma/schema.prisma` - Database schema
2. `backend/lib/prisma.js` - Prisma client singleton
3. `backend/middleware/auth.js` - JWT verification
4. `backend/services/cost.service.js` - Cost tracking
5. `backend/services/pdf.service.js` - PDF generation
6. `backend/Dockerfile` - Container configuration
7. `backend/.env.example` - Update with all new vars

### Backend Files to Modify:
1. `backend/services/semgrep.service.js` - Real CLI integration
2. `backend/services/ai.service.js` - Database integration, enhanced prompts
3. `backend/controllers/scan.controller.js` - Prisma integration
4. `backend/controllers/github.controller.js` - Real cloning logic
5. `backend/controllers/report.controller.js` - PDF endpoints
6. `backend/routes/*.routes.js` - Add auth middleware
7. `backend/package.json` - Add new dependencies

### Frontend Files to Create:
1. `app/api/auth/[...nextauth]/route.ts` - NextAuth config
2. `middleware.ts` - Route protection
3. `lib/auth.ts` - Auth helpers
4. `components/auth/sign-in-button.tsx` - Auth UI
5. `components/usage-panel.tsx` - Cost tracking UI

### Frontend Files to Modify:
1. `lib/api.ts` - Add auth headers, update endpoints
2. `app/layout.tsx` - Add SessionProvider
3. `app/page.tsx` - Update navigation with auth
4. `app/dashboard/page.tsx` - Remove mocks, real API calls
5. `app/dashboard/reports/page.tsx` - Real data fetching
6. `app/dashboard/settings/page.tsx` - User settings, budget controls
7. `components/upload-zone.tsx` - Real upload logic
8. `components/results-table.tsx` - Real findings display
9. `package.json` - Add NextAuth dependency

---

## Quick Start Commands

### Setup Backend:
```bash
cd backend
npm install prisma @prisma/client @supabase/supabase-js jsonwebtoken puppeteer
npx prisma init
# Edit prisma/schema.prisma
npx prisma generate
npm run dev
```

### Setup Frontend:
```bash
npm install next-auth @auth/core
# Configure OAuth apps on GitHub and Google
# Create .env.local with all secrets
npm run dev
```

### Test Locally:
```bash
# Install Semgrep
pip install semgrep

# Verify installation
semgrep --version

# Test scan
semgrep --config=p/owasp-top-ten . --json
```

---

## Ready to Start?

The plan is comprehensive but broken into manageable chunks. We'll tackle this in order:

1. ✅ **DONE**: Analysis complete, plan documented
2. **NEXT**: Set up Supabase database and auth
3. **THEN**: Implement Prisma and backend auth middleware
4. **THEN**: Build real Semgrep integration
5. **CONTINUE**: Following the phase order above

Let me know when you're ready to proceed with Phase 1!
