-- =====================================================
-- DATA SOURCES TABLE
-- Stores user-connected data sources (REST APIs, databases, Notion, Airtable)
-- =====================================================
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rest_api', 'notion', 'airtable', 'database', 'supabase', 'postgres', 'mysql', 'mongodb')),
  -- Connection configuration (encrypted credentials)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Detected schema (for automatic schema detection)
  schema JSONB DEFAULT '{}'::jsonb,
  -- Last successful connection test
  last_tested_at TIMESTAMP WITH TIME ZONE,
  -- Connection status
  is_active BOOLEAN DEFAULT true,
  -- Optional: which project this source is associated with
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for data_sources
CREATE INDEX IF NOT EXISTS data_sources_user_id_idx ON data_sources(user_id);
CREATE INDEX IF NOT EXISTS data_sources_type_idx ON data_sources(type);
CREATE INDEX IF NOT EXISTS data_sources_project_id_idx ON data_sources(project_id);
CREATE INDEX IF NOT EXISTS data_sources_is_active_idx ON data_sources(is_active);

-- Enable Row Level Security for data_sources
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_sources
DROP POLICY IF EXISTS "Users can view their own data sources" ON data_sources;
CREATE POLICY "Users can view their own data sources"
  ON data_sources FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own data sources" ON data_sources;
CREATE POLICY "Users can insert their own data sources"
  ON data_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own data sources" ON data_sources;
CREATE POLICY "Users can update their own data sources"
  ON data_sources FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own data sources" ON data_sources;
CREATE POLICY "Users can delete their own data sources"
  ON data_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources;
CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


