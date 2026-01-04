-- =====================================================
-- SHOPIFY MERCHANT UX TABLES
-- User preferences and deployment tracking
-- =====================================================

-- User preferences for Shopify view mode
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  shopify_view_mode TEXT DEFAULT 'merchant' CHECK (shopify_view_mode IN ('merchant', 'developer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Shopify deployments table
CREATE TABLE IF NOT EXISTS shopify_deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  app_name TEXT NOT NULL,
  app_url TEXT NOT NULL,
  shopify_app_id TEXT,
  install_url TEXT,
  database_url TEXT,
  original_code TEXT,
  status TEXT DEFAULT 'deploying' CHECK (status IN ('deploying', 'active', 'stopped', 'error', 'updating')),
  deployed_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE,
  last_health_check TIMESTAMP WITH TIME ZONE,
  monthly_cost DECIMAL(10, 2) DEFAULT 0,
  app_type TEXT, -- reviews, inventory, orders, email, analytics, custom
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS shopify_deployments_user_id_idx ON shopify_deployments(user_id);
CREATE INDEX IF NOT EXISTS shopify_deployments_status_idx ON shopify_deployments(status);
CREATE INDEX IF NOT EXISTS shopify_deployments_project_id_idx ON shopify_deployments(project_id);

-- Enable RLS
ALTER TABLE shopify_deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own deployments" ON shopify_deployments;
CREATE POLICY "Users can view their own deployments"
  ON shopify_deployments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own deployments" ON shopify_deployments;
CREATE POLICY "Users can update their own deployments"
  ON shopify_deployments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own deployments" ON shopify_deployments;
CREATE POLICY "Users can insert their own deployments"
  ON shopify_deployments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_shopify_deployments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_shopify_deployments_updated_at ON shopify_deployments;
CREATE TRIGGER update_shopify_deployments_updated_at
  BEFORE UPDATE ON shopify_deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_deployments_updated_at();

-- Function to update user_preferences updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_preferences updated_at
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

