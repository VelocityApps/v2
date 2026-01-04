-- =====================================================
-- VERSION HISTORY / CHECKPOINTS TABLE
-- Stores code checkpoints users can restore (Git-like but simpler)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_checkpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  name TEXT, -- Optional checkpoint name (e.g., "Before refactor", "Added login")
  description TEXT, -- Optional description
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for project_checkpoints
CREATE INDEX IF NOT EXISTS project_checkpoints_project_id_idx ON project_checkpoints(project_id);
CREATE INDEX IF NOT EXISTS project_checkpoints_user_id_idx ON project_checkpoints(user_id);
CREATE INDEX IF NOT EXISTS project_checkpoints_created_at_idx ON project_checkpoints(created_at DESC);

-- Enable Row Level Security for project_checkpoints
ALTER TABLE project_checkpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_checkpoints
DROP POLICY IF EXISTS "Users can view their own checkpoints" ON project_checkpoints;
CREATE POLICY "Users can view their own checkpoints"
  ON project_checkpoints FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own checkpoints" ON project_checkpoints;
CREATE POLICY "Users can insert their own checkpoints"
  ON project_checkpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own checkpoints" ON project_checkpoints;
CREATE POLICY "Users can delete their own checkpoints"
  ON project_checkpoints FOR DELETE
  USING (auth.uid() = user_id);

