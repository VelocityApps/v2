# Quick Setup Guide - Share System

## 🚀 Fast Track (5 minutes)

### Step 1: Database Migrations (2 minutes)

1. **Go to Supabase:** https://supabase.com/dashboard → Your Project → **SQL Editor**

2. **Run Migration 1:**
   - Open `supabase/migrations/add_share_previews_table.sql` in VS Code
   - Copy ALL the code (Ctrl+A, Ctrl+C)
   - Paste into Supabase SQL Editor
   - Click **Run** (or Ctrl+Enter)
   - ✅ Should see "Success. No rows returned"

3. **Run Migration 2:**
   - Open `supabase/migrations/add_share_event_type.sql` in VS Code
   - Copy ALL the code
   - Paste into Supabase SQL Editor (new query or clear previous)
   - Click **Run**
   - ✅ Should see "Success. No rows returned"

**Done!** Your database is ready.

---

### Step 2: Environment Variable (1 minute)

1. **Open `.env.local`** in your project root

2. **Add this line:**
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Save the file** (Ctrl+S)

4. **Restart your dev server:**
   - Stop: `Ctrl+C` in terminal
   - Start: `npm run dev`

**Done!** Share system is ready.

---

## ✅ Test It

1. Generate some code in VelocityApps
2. Click the **Share** icon (arrow out of box) in left toolbar
3. Click **"Copy Share Link"**
4. Should generate a URL like: `http://localhost:3000/preview/abc123...`

If it works, you're all set! 🎉

---

## 🆘 Troubleshooting

**Migration errors?**
- Make sure you copied the ENTIRE file (all lines)
- Check you're in SQL Editor (not Table Editor)
- Verify you have admin access to Supabase

**Environment variable not working?**
- File must be named `.env.local` (with the dot)
- No spaces around `=`
- Must restart dev server after adding
- Check terminal for any error messages

**Need more help?**
- See `SHARE_SYSTEM_SETUP.md` for detailed instructions
- Check `ENV_CHECKLIST.md` for all environment variables

