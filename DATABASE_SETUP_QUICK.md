# Quick Database Setup

## The Error
"Database error saving new user" or similar database errors when signing up.

## The Solution

Supabase creates the user in `auth.users`, then a trigger inserts a row into `user_profiles`. That step is failing because either the table/trigger don’t exist or RLS is blocking the insert. Fix it by running the right SQL in Supabase.

### Option A: First-time setup (no tables yet)

If you haven’t run any migrations yet:

1. Go to **Supabase Dashboard** → your project → **SQL Editor** → **New query**.
2. Open `supabase/migrations/complete_setup.sql` in your project, copy **all** of it, paste into the editor, and **Run**.
3. In **Table Editor**, confirm `user_profiles` (and other tables) exist.
4. Try signing up again.

### Option B: Tables exist but signup still fails

If you already have tables (or you get the error after running migrations):

1. Go to **Supabase Dashboard** → your project → **SQL Editor** → **New query**.
2. Open `supabase/migrations/fix_signup_trigger.sql` in your project, copy **all** of it, paste into the editor, and **Run**.
3. This fixes the trigger and RLS so the “create profile on signup” insert is allowed.
4. Try signing up again.

### Step-by-step (SQL Editor)

1. Go to https://supabase.com/dashboard
2. Select your project (e.g. **ofkohtektddpflcdbsma**)
3. Click **SQL Editor** in the left sidebar
4. Click **New query**
5. Paste the full contents of either `complete_setup.sql` (first time) or `fix_signup_trigger.sql` (fix only)
6. Click **Run** (or Ctrl+Enter)
7. Wait for it to complete

### Verify

1. Go to **Table Editor** in Supabase Dashboard.
2. You should see **user_profiles** (and with Option A, also `projects`, `monitoring_events`, etc.).
3. Try signing up again; the error should be gone.

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

