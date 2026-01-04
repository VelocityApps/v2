# Quick Database Setup

## The Error
"Database error saving new user" or similar database errors.

## The Solution

You need to run the SQL migration to create the database tables.

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **ofkohtektddpflcdbsma**
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Copy the Migration SQL

1. Open the file `supabase/migrations/complete_setup.sql` in your project
2. **Select ALL** the contents (Ctrl+A)
3. **Copy** it (Ctrl+C)

### Step 3: Paste and Run

1. Paste the SQL into the Supabase SQL Editor
2. Click **Run** (or press Ctrl+Enter)
3. Wait for it to complete (should take a few seconds)

### Step 4: Verify

1. Go to **Table Editor** in Supabase Dashboard
2. You should see these tables:
   - ✅ `projects`
   - ✅ `user_profiles`
   - ✅ `monitoring_events`
   - ✅ `costs`
   - ✅ `feedback`

### Step 5: Try Signing Up Again

After running the migration, try signing up again. The error should be gone!

## What This Migration Creates

- **user_profiles** table - Stores user subscription and credits
- **projects** table - Stores user projects
- **monitoring_events** table - Tracks app events
- **costs** table - Tracks API costs
- **feedback** table - Stores user feedback
- **Triggers** - Automatically creates user profile on signup
- **RLS Policies** - Security rules for data access

## Still Having Issues?

If you still get errors after running the migration:

1. Check the SQL Editor for any error messages
2. Make sure you copied the ENTIRE file (it's ~334 lines)
3. Try running it again - some parts use `IF NOT EXISTS` so it's safe to run multiple times

