-- =====================================================
-- COMPLETE FORGE44 DATABASE SETUP
-- Paste this entire file into Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PROJECTS TABLE
-- Stores user projects (code, messages, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  messages JSONB DEFAULT '[]'::jsonb,
  github_repo_url TEXT,
  vercel_deployment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for projects
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);

-- Enable Row Level Security for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. USER_PROFILES TABLE
-- Stores subscription status, credits, and Stripe info
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'teams', 'cancelled')),
  credits_remaining DECIMAL(10, 2) DEFAULT 10.0,
  credits_reset_date TIMESTAMP WITH TIME ZONE DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '1 month'),
  -- Referral system fields
  referrer_id UUID REFERENCES auth.users(id),
  referral_count INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  github_username TEXT,
  github_token TEXT,
  vercel_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for user_profiles
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_stripe_customer_id_idx ON user_profiles(stripe_customer_id);

-- Enable Row Level Security for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert profiles" ON user_profiles;
-- Allow inserts when user_id exists in auth.users (works for both trigger and regular inserts)
CREATE POLICY "System can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE id = user_id));

-- =====================================================
-- 3. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp for projects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update updated_at timestamp for user_profiles
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, subscription_status, credits_remaining, credits_reset_date)
  VALUES (
    NEW.id,
    'free',
    10.0,
    TIMEZONE('utc', NOW()) + INTERVAL '1 month'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to reset monthly credits (can be called via cron or manually)
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET 
    credits_remaining = CASE 
      WHEN subscription_status = 'teams' THEN 2000.0
      WHEN subscription_status = 'pro' THEN 500.0
      ELSE 10.0
    END,
    credits_reset_date = TIMEZONE('utc', NOW()) + INTERVAL '1 month'
  WHERE credits_reset_date <= TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE PROFILES FOR EXISTING USERS (if any)
-- =====================================================
INSERT INTO user_profiles (user_id, subscription_status, credits_remaining, credits_reset_date)
SELECT 
  id,
  'free',
  10.0,
  TIMEZONE('utc', NOW()) + INTERVAL '1 month'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 5. COMMUNITY TEMPLATES (for template marketplace prep)
-- =====================================================
CREATE TABLE IF NOT EXISTS community_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for community_templates
CREATE INDEX IF NOT EXISTS community_templates_user_id_idx ON community_templates(user_id);
CREATE INDEX IF NOT EXISTS community_templates_category_idx ON community_templates(category);

-- Enable RLS for community_templates
ALTER TABLE community_templates ENABLE ROW LEVEL SECURITY;

-- Users can manage their own templates
DROP POLICY IF EXISTS "Users manage own templates" ON community_templates;
CREATE POLICY "Users manage own templates"
  ON community_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. COSTS TABLE
-- Tracks API costs per generation for cost analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id TEXT,
  model_used TEXT NOT NULL CHECK (model_used IN ('haiku', 'sonnet', 'opus', 'gpt-4o')),
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for costs table
CREATE INDEX IF NOT EXISTS idx_costs_user_id ON costs(user_id);
CREATE INDEX IF NOT EXISTS idx_costs_created_at ON costs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_costs_model_used ON costs(model_used);

-- Enable Row Level Security for costs
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for costs
DROP POLICY IF EXISTS "Users can view their own costs" ON costs;
CREATE POLICY "Users can view their own costs"
  ON costs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert costs" ON costs;
CREATE POLICY "System can insert costs"
  ON costs FOR INSERT
  WITH CHECK (true); -- System can insert costs for any user

-- =====================================================
-- 6. MONITORING_EVENTS TABLE
-- Tracks application events for monitoring and analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS monitoring_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'generation', 'upgrade', 'error', 'churn', 'github_export', 'railway_deploy', 'vercel_deploy')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for monitoring_events table
CREATE INDEX IF NOT EXISTS idx_monitoring_events_type ON monitoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_user_id ON monitoring_events(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_created_at ON monitoring_events(created_at DESC);

-- Enable Row Level Security for monitoring_events
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitoring_events
DROP POLICY IF EXISTS "System can insert events" ON monitoring_events;
CREATE POLICY "System can insert events"
  ON monitoring_events FOR INSERT
  WITH CHECK (true); -- System can insert events

DROP POLICY IF EXISTS "Admins can view all events" ON monitoring_events;
CREATE POLICY "Admins can view all events"
  ON monitoring_events FOR SELECT
  USING (true); -- For now, allow all reads (can restrict to admins later)

-- =====================================================
-- VERIFICATION QUERIES (optional - run these to check)
-- =====================================================

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('projects', 'user_profiles', 'community_templates', 'costs', 'monitoring_events');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('projects', 'user_profiles', 'community_templates', 'costs', 'monitoring_events');

-- =====================================================
-- 7. FEEDBACK TABLE
-- Stores user feedback and NPS scores
-- =====================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature_request', 'love_it', 'nps', 'testimonial')),
  message TEXT,
  email TEXT,
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for feedback table
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Enable Row Level Security for feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback
DROP POLICY IF EXISTS "Users can insert their own feedback" ON feedback;
CREATE POLICY "Users can insert their own feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT
  USING (true); -- Admins can view all feedback

-- =====================================================
-- VERIFICATION QUERIES (optional - run these to check)
-- =====================================================

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('projects', 'user_profiles', 'community_templates', 'costs', 'monitoring_events', 'feedback');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('projects', 'user_profiles', 'community_templates', 'costs', 'monitoring_events', 'feedback');

-- Check policies
-- SELECT schemaname, tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('projects', 'user_profiles', 'community_templates', 'costs', 'monitoring_events', 'feedback');

