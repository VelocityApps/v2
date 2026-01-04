-- =====================================================
-- ADD GITHUB INTEGRATION COLUMNS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add GitHub columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS github_username TEXT,
ADD COLUMN IF NOT EXISTS github_token TEXT;

-- Add GitHub repo URL to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS github_repo_url TEXT;

-- Create index on github_username for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_github_username 
ON user_profiles(github_username) 
WHERE github_username IS NOT NULL;

-- Add comment to columns
COMMENT ON COLUMN user_profiles.github_username IS 'GitHub username for OAuth integration';
COMMENT ON COLUMN user_profiles.github_token IS 'GitHub OAuth access token (encrypted in production)';
COMMENT ON COLUMN projects.github_repo_url IS 'URL of GitHub repository if exported';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles' 
  AND column_name IN ('github_username', 'github_token')
UNION ALL
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' 
  AND column_name = 'github_repo_url';

