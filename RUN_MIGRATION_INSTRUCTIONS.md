# How to Run the Migration

## Option 1: Supabase Dashboard (Recommended - Easiest)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in if needed
   - Select your project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"** button (top right)

3. **Copy the Migration**
   - Open the file: `supabase/migrations/add_more_automations.sql`
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

4. **Paste and Run**
   - Paste into the SQL Editor
   - Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
   - Wait a few seconds

5. **Verify Success**
   - Look for: **"Success. No rows returned"** (green message)
   - Go to **Table Editor** → `automations` table
   - You should see **20 rows** (5 original + 15 new)

---

## Option 2: Supabase CLI (If Configured)

If you have Supabase CLI linked to your project:

```bash
# Make sure you're in the project root
cd C:\Users\petes\forge44

# Run the migration
npx supabase db push --file supabase/migrations/add_more_automations.sql
```

Or if you want to apply all migrations:

```bash
npx supabase db push
```

---

## Troubleshooting

### Error: "relation automations does not exist"
- You need to run the first migration first: `add_automations_tables.sql`
- Run that one first, then run this one

### Error: "duplicate key value violates unique constraint"
- This means some automations already exist
- The migration uses `ON CONFLICT DO NOTHING`, so it's safe to run again
- It will only add the new ones that don't exist

### No automations showing in marketplace
- Check that `active = true` in the database
- Refresh your browser
- Check browser console for errors

---

## What This Migration Does

- Adds 15 new automations to the marketplace
- Total automations: 20 (5 original + 15 new)
- All automations are set to `active = true`
- Safe to run multiple times (won't create duplicates)

