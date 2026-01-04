# Database Setup Guide

## Complete Database Setup

This guide covers setting up the complete database schema for Forge44, including tables, Row Level Security (RLS) policies, and performance indexes.

## Quick Start (Recommended)

For a complete setup, use the all-in-one migration:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the SQL from `supabase/migrations/complete_setup.sql`
4. Run the SQL query

This single migration creates everything you need: tables, RLS policies, triggers, and indexes.

## Step-by-Step Setup

If you prefer to run migrations individually:

### Step 1: Create Tables

Run `supabase/migrations/001_create_projects_table.sql` and `002_create_user_profiles_table.sql` (or use `complete_setup.sql`).

### Step 2: Add RLS Policies and Indexes

Run `supabase/migrations/002_add_rls_policies.sql` to add:
- Row Level Security policies
- Performance indexes

## Database Schema

### Projects Table

- **projects table** with columns:
  - `id` (UUID, primary key)
  - `user_id` (UUID, foreign key to auth.users)
  - `name` (TEXT, project name)
  - `code` (TEXT, generated code)
  - `messages` (JSONB, chat messages array)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

### User Profiles Table

- **user_profiles table** with columns:
  - `id` (UUID, primary key)
  - `user_id` (UUID, unique foreign key to auth.users)
  - `subscription_status` (TEXT: 'free', 'pro', 'teams', 'cancelled')
  - `credits_remaining` (DECIMAL, default 10.0)
  - `credits_reset_date` (TIMESTAMP)
  - `stripe_customer_id` (TEXT, nullable)
  - `stripe_subscription_id` (TEXT, nullable)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

## Row Level Security (RLS) Policies

### Projects Table Policies

**Policy: "Users manage own projects"**
- **Scope**: ALL operations (SELECT, INSERT, UPDATE, DELETE)
- **Rule**: Users can only access projects where `auth.uid() = user_id`
- **Security**: Prevents users from viewing or modifying other users' projects

### User Profiles Table Policies

**Policy: "Users manage own profile"**
- **Scope**: ALL operations (SELECT, INSERT, UPDATE, DELETE)
- **Rule**: Users can only access profiles where `auth.uid() = user_id`
- **Security**: Ensures users can only view and modify their own profile data

### How RLS Works

Row Level Security is enforced at the database level:
- Every query automatically filters rows based on the authenticated user
- Policies use `auth.uid()` to get the current user's ID
- No application-level filtering needed - database handles security

## Performance Indexes

### Projects Table Indexes

- `idx_projects_user_id` - Fast lookups by user
- `idx_projects_created_at` - Efficient sorting by creation date (DESC)

### User Profiles Table Indexes

- `idx_user_profiles_user_id` - Fast user profile lookups
- `idx_user_profiles_subscription_status` - Filter pro/teams users
- `idx_user_profiles_stripe_customer_id` - Webhook lookups
- `idx_user_profiles_stripe_subscription_id` - Webhook lookups

## Triggers and Functions

### Automatic Profile Creation

When a new user signs up via Supabase Auth, a trigger automatically:
- Creates a `user_profiles` record
- Sets `subscription_status` to 'free'
- Initializes `credits_remaining` to 10.0
- Sets `credits_reset_date` to 1 month from now

### Automatic Timestamp Updates

Both tables have triggers that automatically update `updated_at` when rows are modified.

## Verification

After running migrations, verify setup:

1. Go to **Table Editor** in Supabase dashboard
2. You should see:
   - `projects` table
   - `user_profiles` table
3. Check that RLS is enabled (lock icon next to table names)
4. Go to **Authentication > Policies** to verify policies exist

## Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Push all migrations
supabase db push

# Or run specific migration
supabase db execute -f supabase/migrations/002_add_rls_policies.sql
```

## Troubleshooting

### Permission Errors

If you get permission errors:
- Make sure RLS policies are created correctly
- Verify your Supabase project has authentication enabled
- Check that the `auth.users` table exists
- Ensure you're authenticated when testing queries

### Policy Not Working

If RLS policies aren't working:
- Check that RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- Verify policies exist in **Authentication > Policies**
- Ensure `auth.uid()` returns the correct user ID
- Check that `user_id` column matches `auth.uid()` in policies

### Index Performance

If queries are slow:
- Verify indexes were created: Check **Table Editor > Indexes**
- Use `EXPLAIN ANALYZE` to see query plans
- Ensure indexes match your query patterns

