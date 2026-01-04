# Share System Setup Instructions

## Step 1: Run Database Migrations

You need to run two SQL migrations in your Supabase project to enable the share system.

### 1.1: Open Supabase SQL Editor

1. **Go to Supabase Dashboard:**
   - Open https://supabase.com/dashboard in your browser
   - Sign in if needed

2. **Select Your Project:**
   - If you have multiple projects, click on the one you're using for VelocityApps
   - If you don't have a project yet, click "New Project" and create one

3. **Open SQL Editor:**
   - Look at the left sidebar menu
   - Find and click **"SQL Editor"** (it has a database icon)
   - You should see a code editor area with a toolbar at the top

4. **Create New Query:**
   - Click the **"New query"** button in the top right (or press `Ctrl+N` / `Cmd+N`)
   - A new tab will open with an empty editor

### 1.2: Run First Migration - Share Previews Table

1. **Open the migration file:**
   - In your code editor (VS Code), open: `supabase/migrations/add_share_previews_table.sql`
   - You should see SQL code starting with `-- SHARE PREVIEWS TABLE`

2. **Copy the entire file:**
   - Select all the text (`Ctrl+A` / `Cmd+A`)
   - Copy it (`Ctrl+C` / `Cmd+C`)
   - Make sure you get everything from line 1 to the end

3. **Paste into Supabase SQL Editor:**
   - Go back to your Supabase dashboard (SQL Editor tab)
   - Click in the empty editor area
   - Paste the SQL (`Ctrl+V` / `Cmd+V`)
   - You should see all the SQL code appear

4. **Run the migration:**
   - Click the **"Run"** button (green button, usually top right)
   - OR press `Ctrl+Enter` (Windows) or `Cmd+Enter` (Mac)
   - Wait a few seconds for it to execute

5. **Check for success:**
   - Look at the bottom of the SQL Editor
   - You should see: **"Success. No rows returned"** in green
   - If you see an error (red text), see Troubleshooting below

**What this does:**
- Creates `share_previews` table to store temporary preview links
- Sets up Row Level Security (RLS) policies
- Creates indexes for performance
- Allows public viewing of active previews

### 1.3: Run Second Migration - Share Event Type

1. **Clear or create new query:**
   - In Supabase SQL Editor, either:
     - Clear the current query (select all and delete)
     - OR click "New query" again for a fresh tab

2. **Open the second migration file:**
   - In VS Code, open: `supabase/migrations/add_share_event_type.sql`
   - This file is much shorter (only 9 lines)

3. **Copy and paste:**
   - Select all and copy the entire file
   - Paste it into the Supabase SQL Editor

4. **Run the migration:**
   - Click **"Run"** or press `Ctrl+Enter` / `Cmd+Enter`
   - Wait for success message

5. **Verify:**
   - Should see "Success. No rows returned"
   - This migration updates the existing `monitoring_events` table

**What this does:**
- Updates `monitoring_events` table to allow 'share' event type
- Enables tracking of share activities in analytics

### 1.4: Verify Migrations

Run this query to verify everything was created correctly:

```sql
-- Check if share_previews table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'share_previews';

-- Check if share event type is allowed
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%event_type%';
```

You should see:
- `share_previews` table in the results
- A constraint that includes 'share' in the event_type check

### Troubleshooting

**Error: "relation already exists"**
- The table already exists, which is fine. You can skip this migration or drop and recreate if needed.

**Error: "permission denied"**
- Make sure you're using the SQL Editor (not the Table Editor)
- You need admin access to your Supabase project

**Error: "column does not exist"**
- Make sure you've run the base migrations first (`complete_setup.sql` or individual migrations)

---

## Step 2: Set Environment Variables

You need to add `NEXT_PUBLIC_APP_URL` to your environment variables so preview links work correctly.

### 2.1: Find Your Environment File

1. **Open your project in VS Code:**
   - The project should be at: `c:\Users\petes\forge44`
   - Open this folder in VS Code if not already open

2. **Look for environment file:**
   - In the file explorer (left sidebar), look for:
     - `.env.local` (this is what you want)
     - `.env` (fallback, but `.env.local` is preferred)
   - These files might be hidden (start with a dot)

3. **If the file doesn't exist, create it:**
   - Right-click in the file explorer (in the root folder)
   - Select **"New File"**
   - Type exactly: `.env.local` (including the dot at the start)
   - Press Enter
   - The file will be created and opened in the editor

### 2.2: Add the Environment Variable

1. **Open `.env.local` in VS Code:**
   - Click on the file in the file explorer
   - It should open in the editor

2. **Add the new variable:**
   - Scroll to the bottom of the file (or add it anywhere)
   - Add this line:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Important formatting:**
   - No spaces around the `=` sign
   - No quotes around the value
   - No trailing spaces
   - Should look exactly like: `NEXT_PUBLIC_APP_URL=http://localhost:3000`

4. **For different environments:**
   - **Local development:** `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - **Production:** `NEXT_PUBLIC_APP_URL=https://velocityapps.dev` (use your actual domain)

5. **Save the file:**
   - Press `Ctrl+S` / `Cmd+S` to save
   - The file should show as saved (no dot next to filename)

### 2.3: Verify Your Current Environment Variables

Your `.env.local` should now include (at minimum):

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic API (Required for code generation)
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI API (Optional, for GPT-4o fallback)
OPENAI_API_KEY=sk-...

# App URL (Required for share system)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.4: Restart Your Development Server

**Important:** Environment variables are only loaded when the server starts, so you MUST restart.

1. **Find your terminal:**
   - Look at the bottom panel in VS Code (Terminal tab)
   - OR use a separate terminal/command prompt window
   - You should see `npm run dev` running

2. **Stop the server:**
   - Click in the terminal window
   - Press `Ctrl+C` (Windows) or `Cmd+C` (Mac)
   - You should see the process stop

3. **Start it again:**
   - In the same terminal, type:
   ```bash
   npm run dev
   ```
   - Press Enter
   - Wait for it to start (you'll see "Ready" message)

4. **Verify it loaded:**
   - Look at the terminal output
   - You should see the server starting without errors
   - The new environment variable is now loaded

### 2.5: Verify It's Working

1. Open your app in the browser
2. Generate some code
3. Click the Share icon in the toolbar
4. Click "Copy Share Link"
5. The generated URL should use your `NEXT_PUBLIC_APP_URL`

**Expected URL format:**
```
http://localhost:3000/preview/abc123def456...
```

### Troubleshooting

**Variable not loading:**
- Make sure the file is named `.env.local` (not `.env.local.txt`)
- Restart your dev server after adding variables
- Check for typos in the variable name (must be exactly `NEXT_PUBLIC_APP_URL`)

**Preview links show wrong URL:**
- Check that `NEXT_PUBLIC_APP_URL` is set correctly
- Make sure you restarted the server
- For production, ensure it's set to your actual domain (not localhost)

**"Cannot read property of undefined":**
- The variable might not be accessible in the component
- Check that it starts with `NEXT_PUBLIC_` (required for client-side access)

---

## Quick Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Ran `add_share_previews_table.sql` migration
- [ ] Ran `add_share_event_type.sql` migration
- [ ] Verified tables were created
- [ ] Added `NEXT_PUBLIC_APP_URL` to `.env.local`
- [ ] Restarted development server
- [ ] Tested share link generation

---

## Next: Test the Share System

Once both steps are complete:

1. Generate some code in VelocityApps
2. Click the **Share** icon in the left toolbar
3. Try "Copy Share Link" - it should generate a preview URL
4. Open the preview URL in a new tab - it should show your code
5. Try other share options (X, Instagram, etc.)

If everything works, you're all set! 🎉

