-- =====================================================
-- ADD VERCEL INTEGRATION COLUMNS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add Vercel token to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS vercel_token TEXT;

-- Add Vercel deployment URL to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS vercel_deployment_url TEXT;

-- Add comment to columns
COMMENT ON COLUMN user_profiles.vercel_token IS 'Vercel OAuth access token (encrypted in production)';
COMMENT ON COLUMN projects.vercel_deployment_url IS 'URL of Vercel deployment if deployed';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles' 
  AND column_name = 'vercel_token'
UNION ALL
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' 
  AND column_name = 'vercel_deployment_url';

