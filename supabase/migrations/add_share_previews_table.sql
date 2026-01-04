-- =====================================================
-- SHARE PREVIEWS TABLE
-- Stores temporary preview links for sharing projects
-- =====================================================
CREATE TABLE IF NOT EXISTS share_previews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  preview_url TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for share_previews
CREATE INDEX IF NOT EXISTS share_previews_project_id_idx ON share_previews(project_id);
CREATE INDEX IF NOT EXISTS share_previews_user_id_idx ON share_previews(user_id);
CREATE INDEX IF NOT EXISTS share_previews_preview_url_idx ON share_previews(preview_url);
CREATE INDEX IF NOT EXISTS share_previews_expires_at_idx ON share_previews(expires_at);

-- Enable Row Level Security for share_previews
ALTER TABLE share_previews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for share_previews
DROP POLICY IF EXISTS "Users can view their own previews" ON share_previews;
CREATE POLICY "Users can view their own previews"
  ON share_previews FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own previews" ON share_previews;
CREATE POLICY "Users can create their own previews"
  ON share_previews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view active previews" ON share_previews;
CREATE POLICY "Public can view active previews"
  ON share_previews FOR SELECT
  USING (expires_at > TIMEZONE('utc', NOW()));

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_preview_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE share_previews
  SET view_count = view_count + 1
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track views (would be called from API)
-- Note: This is a placeholder - actual view tracking happens via API

