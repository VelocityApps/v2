# Quick Fix: Missing Supabase Service Role Key

## The Error
```
Runtime Error: supabaseKey is required.
```

## The Solution

Add the `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local` file.

### Step 1: Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **Project API keys**
5. Find the **`service_role`** key (it's the secret one, starts with `eyJ...`)
6. Click **Reveal** and copy it

### Step 2: Add to `.env.local`

Create or update `.env.local` in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important:** Replace the `SUPABASE_SERVICE_ROLE_KEY` value with your actual service role key from Supabase!

### Step 3: Restart Your Dev Server

After adding the key, restart your Next.js dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Also: Run SQL Migrations

You also need to create the database tables. Run the SQL migration:

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy the entire contents of `supabase/migrations/complete_setup.sql`
3. Paste and run it

This creates all the tables your app needs.

## Verify It Works

After adding the key and restarting, the error should disappear and your app should load!

