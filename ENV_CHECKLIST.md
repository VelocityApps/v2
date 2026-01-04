# Environment Variables Checklist

Complete list of all environment variables needed for VelocityApps.

## ✅ Required for Basic Functionality

### 1. Supabase Configuration (REQUIRED)
Get these from: https://supabase.com/dashboard → Your Project → Settings → API

```env
# Your Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Public anon key (safe to expose in client)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (SECRET - server-side only, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find:**
- Go to Supabase Dashboard
- Select your project
- Settings → API
- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role** key (click Reveal) → `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. Anthropic API Key (REQUIRED for Claude models)
Get from: https://console.anthropic.com/settings/keys

```env
# Primary Anthropic API key (required)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Optional: Backup keys for automatic rotation
ANTHROPIC_API_KEY_1=sk-ant-api03-backup-key-1
ANTHROPIC_API_KEY_2=sk-ant-api03-backup-key-2
```

**Where to find:**
- Go to https://console.anthropic.com
- Settings → API Keys
- Create new key or copy existing key
- Starts with `sk-ant-api03-`

---

## 🔧 Optional but Recommended

### 3. OpenAI API Key (OPTIONAL - for GPT-4o alternative)
Get from: https://platform.openai.com/api-keys

```env
# OpenAI API key for GPT-4o model (alternative to Claude)
OPENAI_API_KEY=sk-your-openai-key-here
```

**Where to find:**
- Go to https://platform.openai.com
- API Keys section
- Create new secret key
- Starts with `sk-`

**Note:** Only needed if you want to use GPT-4o mode or enable fallback when Claude is unavailable.

---

### 4. Stripe Configuration (OPTIONAL - for payments)
Get from: https://dashboard.stripe.com/apikeys

```env
# Stripe API keys (use test keys for development)
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Stripe webhook secret (from webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs (from Products in Stripe Dashboard)
STRIPE_PRICE_ID_PRO=price_your_pro_price_id
STRIPE_PRICE_ID_TEAMS=price_your_teams_price_id
```

**Where to find:**
- Go to https://dashboard.stripe.com
- Developers → API keys
- Copy **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Copy **Secret key** → `STRIPE_SECRET_KEY`
- For webhooks: Developers → Webhooks → Add endpoint → Copy signing secret
- For prices: Products → Create product → Copy Price ID

**Note:** Only needed if you want payment/subscription features.

---

### 5. Admin Password (OPTIONAL - for admin routes)
```env
# Password for accessing admin routes
ADMIN_PASSWORD=your_secure_password_here
```

**Note:** Use a strong, randomly generated password. Only needed if you want to access admin routes like `/api/admin/metrics`.

---

## 🌐 Share System Configuration

### 6. Application URL (REQUIRED for Share System)
```env
# Your app URL (required for preview links and sharing)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to set:**
- Local development: `http://localhost:3000`
- Production: `https://yourdomain.com` (your actual domain)

**Why it's needed:**
- Generates preview links for sharing
- Required for social media Open Graph tags
- Used in share card generation

**Note:** This is now **REQUIRED** if you want to use the share system. Without it, preview links won't work correctly.

---

## 📋 Complete .env.local Template

Copy this into your `.env.local` file and fill in the values:

```env
# ============================================
# SUPABASE (REQUIRED)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# ANTHROPIC (REQUIRED for Claude)
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-your-primary-key
# Optional backup keys:
# ANTHROPIC_API_KEY_1=sk-ant-api03-backup-key-1
# ANTHROPIC_API_KEY_2=sk-ant-api03-backup-key-2

# ============================================
# OPENAI (OPTIONAL - for GPT-4o)
# ============================================
OPENAI_API_KEY=sk-your-openai-key-here

# ============================================
# GITHUB (OPTIONAL - for GitHub export)
# ============================================
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback

# ============================================
# RAILWAY (OPTIONAL - for Railway deployment)
# ============================================
RAILWAY_API_TOKEN=your_railway_api_token

# ============================================
# VERCEL (OPTIONAL - for Vercel deployment)
# ============================================
# Create OAuth Integration: https://vercel.com/integrations/new
# See VERCEL_DEPLOY_SETUP.md for detailed instructions
VERCEL_CLIENT_ID=your_vercel_client_id
VERCEL_CLIENT_SECRET=your_vercel_client_secret
VERCEL_REDIRECT_URI=http://localhost:3000/api/auth/vercel/callback

# ============================================
# STRIPE (OPTIONAL - for payments)
# ============================================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_PRO=price_your_pro_price_id
STRIPE_PRICE_ID_TEAMS=price_your_teams_price_id

# ============================================
# ADMIN (OPTIONAL)
# ============================================
ADMIN_PASSWORD=your_secure_password_here

# ============================================
# APP CONFIG (OPTIONAL)
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🎯 Minimum Required Setup

For the app to work at minimum, you need:

1. ✅ **Supabase** (3 keys) - Required for database/auth
2. ✅ **Anthropic** (1 key) - Required for code generation

**Total: 4 environment variables minimum**

---

## 🔍 Quick Verification

After adding your keys, verify they're loaded:

1. **Restart your dev server** (important!)
2. Check the console output - you should see:
   ```
   [supabase-server] NEXT_PUBLIC_SUPABASE_URL: SET (40 chars)
   [supabase-server] SUPABASE_SERVICE_ROLE_KEY: SET (219 chars)
   [AnthropicClient] Initialized client 1/1
   ```

3. If you see "MISSING" errors, check:
   - File is named `.env.local` (not `.env` or `.env.example`)
   - No spaces around `=` sign
   - No quotes around values
   - Keys are on single lines (no line breaks)
   - Dev server was restarted after changes

---

## 📚 More Help

- **Supabase setup:** See `QUICK_FIX.md`
- **Anthropic setup:** See `ANTHROPIC_SETUP.md`
- **GitHub export:** See `GITHUB_EXPORT_SETUP.md`
- **Vercel deployment:** See `VERCEL_DEPLOY_SETUP.md`
- **Stripe setup:** See `STRIPE_SETUP.md`
- **Troubleshooting:** See `ENV_TROUBLESHOOTING.md`

