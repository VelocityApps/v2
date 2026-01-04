# Environment Variables Guide

This document lists all environment variables required for Forge44.

## Required Variables

### Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Anthropic API Keys

```bash
# Primary key (required)
ANTHROPIC_API_KEY=sk-ant-api03-your-primary-key

# Backup keys for rotation (optional but recommended)
ANTHROPIC_API_KEY_1=sk-ant-api03-backup-key-1
ANTHROPIC_API_KEY_2=sk-ant-api03-backup-key-2
```

### OpenAI API Key (Optional - for GPT-4o alternative)

```bash
# OpenAI API key for GPT-4o model (alternative to Claude)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### GitHub OAuth (Optional - for GitHub export)

```bash
# GitHub OAuth App credentials for one-click export
# Create OAuth App: https://github.com/settings/developers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback
```

### Railway API (Optional - for Railway deployment)

```bash
# Railway API token for one-click deployment
# Get from: https://railway.app/account/tokens
RAILWAY_API_TOKEN=your_railway_api_token
```

### Vercel OAuth (Optional - for Vercel deployment)

```bash
# Vercel OAuth App credentials for one-click deployment
# Create OAuth App: https://vercel.com/integrations
VERCEL_CLIENT_ID=your_vercel_client_id
VERCEL_CLIENT_SECRET=your_vercel_client_secret
VERCEL_REDIRECT_URI=http://localhost:3000/api/auth/vercel/callback
```

### Stripe Configuration

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_PRO=price_your_pro_price_id
STRIPE_PRICE_ID_TEAMS=price_your_teams_price_id
```

### Admin Access

```bash
# Password for admin routes (e.g., /api/admin/metrics)
# Use a strong, randomly generated password
ADMIN_PASSWORD=your_secure_password_here
```

## Optional Variables

### Application URLs

```bash
# Default: https://forgedapps.dev
NEXT_PUBLIC_APP_URL=https://forgedapps.dev
```

## Setup Instructions

1. Copy `.env.local.example` to `.env.local` (if it exists)
2. Fill in all required variables
3. For production, set these in your hosting platform's environment variable settings:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Railway: Project Settings → Variables

## Security Notes

- **Never commit `.env.local` to version control**
- Use strong, unique passwords for `ADMIN_PASSWORD`
- Rotate API keys regularly
- Use different keys for development and production
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (it bypasses RLS)

## Admin Routes

Admin routes require the `ADMIN_PASSWORD` query parameter:

```
GET /api/admin/metrics?password=your_admin_password
GET /api/admin/users/expensive?password=your_admin_password
```

## Cost Tracking

The cost tracking system uses these estimated costs per generation:
- **Haiku (Turbo)**: $0.003 per generation
- **Sonnet (Forge)**: $0.010 per generation
- **Opus (Anvil)**: $0.030 per generation

These are stored in the `costs` table for analysis.

