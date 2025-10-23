-- SecuraAI Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Users table extension (Supabase Auth already has auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  daily_budget_cents INT DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('upload', 'github')),
  repo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scans table
CREATE TABLE IF NOT EXISTS public.scans (
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
CREATE TABLE IF NOT EXISTS public.findings (
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
CREATE TABLE IF NOT EXISTS public.explanations (
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
CREATE INDEX IF NOT EXISTS idx_explanations_cached_key ON public.explanations(cached_key);

-- Usage Events table (for cost tracking)
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('openai', 'semgrep', 'pdf', 'scan')),
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  metadata JSONB,
  cost_cents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can create own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can view findings from own scans" ON public.findings;
DROP POLICY IF EXISTS "Users can view explanations from own findings" ON public.explanations;
DROP POLICY IF EXISTS "Users can view own usage events" ON public.usage_events;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" 
  ON public.user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.user_profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view own projects" 
  ON public.projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" 
  ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON public.projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON public.projects FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for scans
CREATE POLICY "Users can view own scans" 
  ON public.scans FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scans" 
  ON public.scans FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans" 
  ON public.scans FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for findings
CREATE POLICY "Users can view findings from own scans" 
  ON public.findings FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.scans 
    WHERE scans.id = findings.scan_id 
    AND scans.user_id = auth.uid()
  ));

CREATE POLICY "Service can insert findings" 
  ON public.findings FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.scans 
    WHERE scans.id = findings.scan_id 
    AND scans.user_id = auth.uid()
  ));

-- RLS Policies for explanations
CREATE POLICY "Users can view explanations from own findings" 
  ON public.explanations FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.findings 
    JOIN public.scans ON scans.id = findings.scan_id 
    WHERE findings.id = explanations.finding_id 
    AND scans.user_id = auth.uid()
  ));

CREATE POLICY "Service can insert explanations" 
  ON public.explanations FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.findings 
    JOIN public.scans ON scans.id = findings.scan_id 
    WHERE findings.id = explanations.finding_id 
    AND scans.user_id = auth.uid()
  ));

-- RLS Policies for usage_events
CREATE POLICY "Users can view own usage events" 
  ON public.usage_events FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service can create usage events" 
  ON public.usage_events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_project_id ON public.scans(project_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON public.scans(status);
CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON public.findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON public.findings(severity);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON public.usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON public.usage_events(created_at);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SecuraAI database schema created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Configure OAuth providers in Supabase Auth settings';
  RAISE NOTICE '2. Copy your DATABASE_URL to backend .env file';
  RAISE NOTICE '3. Run: npx prisma generate';
  RAISE NOTICE '4. Test the connection with: npx prisma db pull';
END $$;
