-- =====================================================
-- RLS Policies and Performance Indexes Migration
-- =====================================================
-- This migration adds comprehensive Row Level Security policies
-- and performance indexes for projects and user_profiles tables.

-- =====================================================
-- 1. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables (idempotent - safe to run multiple times)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP EXISTING POLICIES (if they exist)
-- =====================================================

-- Drop existing policies for projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
DROP POLICY IF EXISTS "Users manage own projects" ON projects;

-- Drop existing policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users manage own profile" ON user_profiles;

-- =====================================================
-- 3. CREATE UNIFIED RLS POLICIES
-- =====================================================

-- Users can only see/edit their own projects
-- This policy covers SELECT, INSERT, UPDATE, and DELETE operations
CREATE POLICY "Users manage own projects"
ON projects FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only see/edit their own profile
-- Note: Uses user_id (not id) since user_id references auth.users(id)
CREATE POLICY "Users manage own profile"
ON user_profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. PERFORMANCE INDEXES
-- =====================================================

-- Indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Indexes for user_profiles table
-- Note: user_profiles doesn't have an email column (email is in auth.users)
-- Adding index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Additional index on subscription_status for filtering pro/teams users
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);

-- Index on stripe_customer_id for webhook lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id ON user_profiles(stripe_customer_id);

-- Index on stripe_subscription_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription_id ON user_profiles(stripe_subscription_id);

