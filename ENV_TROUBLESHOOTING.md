# Environment Variable Troubleshooting Guide

## Issue: SUPABASE_SERVICE_ROLE_KEY not loading

### Quick Fix Steps:

1. **Stop the Next.js dev server completely** (Ctrl+C in the terminal)

2. **Clear Next.js cache:**
   ```powershell
   Remove-Item -Recurse -Force .next
   ```

3. **Verify .env.local file:**
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is on its own line
   - No spaces around the `=` sign
   - No quotes around the value
   - No trailing spaces
   - The key should be on a single line (no line breaks)

4. **Restart the dev server:**
   ```powershell
   npm run dev
   ```

### Verify the Key is Loaded:

The key should be 219 characters long. Check the console output when starting the server - you should see:
```
[supabase-server] SUPABASE_SERVICE_ROLE_KEY: SET (219 chars)
```

### Common Issues:

1. **Key has line breaks:** The JWT token must be on a single line
2. **Spaces around =:** Should be `KEY=value` not `KEY = value`
3. **Quotes:** Don't use quotes: `KEY="value"` ❌ Use: `KEY=value` ✅
4. **Cached .next folder:** Delete `.next` folder and restart
5. **Dev server not restarted:** Always restart after changing .env.local

### Current .env.local Structure:

Your key is on line 4, which is fine. The order doesn't matter, but here's the recommended structure:

```env
# API Keys
ANTHROPIC_API_KEY=your_key_here

# Supabase (Public - can be exposed)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase (SECRET - server-side only)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_PRICE_ID_PRO=your_pro_price_id
STRIPE_PRICE_ID_TEAMS=your_teams_price_id

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_PASSWORD=your_admin_password
```

### Testing if Key is Loaded:

Run this in a separate terminal (while dev server is running):
```powershell
node -e "require('dotenv').config({path:'.env.local'}); console.log('Key loaded:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'YES (' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ' chars)' : 'NO');"
```

If this shows "YES", the file is correct but Next.js isn't loading it. Try:
1. Full restart (stop server, delete .next, restart)
2. Check for typos in variable name
3. Make sure there are no special characters or encoding issues

### Still Not Working?

If the key still isn't loading after a full restart:

1. **Check for hidden characters:**
   - Open .env.local in a text editor
   - Make sure the line doesn't have any invisible characters
   - Try retyping the line manually

2. **Verify the key value:**
   - Copy the key directly from Supabase Dashboard
   - Settings → API → service_role key
   - Make sure you're copying the full key (should be ~219 characters)

3. **Try moving it to the top:**
   - Sometimes Next.js loads variables in order
   - Move `SUPABASE_SERVICE_ROLE_KEY` to line 1 or 2

4. **Check file encoding:**
   - Make sure .env.local is saved as UTF-8
   - No BOM (Byte Order Mark)

### Fallback System:

The code has a fallback that reads .env.local directly if Next.js doesn't load it. This should work, but if you're still seeing errors, the fallback might not be executing. Check the console for:
```
[supabase-server] ✅ Loaded SUPABASE_SERVICE_ROLE_KEY from .env.local file directly
```

If you see this message, the fallback is working and the key should be available.

