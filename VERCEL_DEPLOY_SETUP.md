# Vercel Deployment Setup Guide

This guide explains how to set up Vercel OAuth for one-click deployment functionality.

## Overview

The Vercel deployment feature allows users to:
- Connect their Vercel account via OAuth
- Deploy generated code directly to Vercel's edge network
- Auto-detect framework (Next.js, React, Vue, etc.)
- Configure environment variables
- Track deployments in the monitoring system

## How It Works

**Important:** You (the admin) need to create **one** Vercel OAuth Integration for your platform. Then **each user** connects their **own** Vercel account through OAuth. Users deploy to their own Vercel account, not yours.

## Step 1: Create Vercel OAuth Integration

1. Go to Vercel → Account Settings → Integrations
   - Direct link: https://vercel.com/integrations/new
   - Or: https://vercel.com/account/integrations → "Create Integration"

2. Click **"Create Integration"** or **"New Integration"**

3. Fill in the integration details:
   - **Integration Name**: `VelocityApps` (or your app name)
   - **Logo**: Upload your app logo (optional)
   - **Homepage URL**: Your app URL (e.g., `https://velocityapps.dev`)
   - **Redirect URI**: 
     - Development: `http://localhost:3000/api/auth/vercel/callback`
     - Production: `https://yourdomain.com/api/auth/vercel/callback`
   - **Description**: "AI-powered app builder with one-click Vercel deployment"

4. Click **"Create"**

5. After creation, you'll see:
   - **Client ID** (OAuth Client ID)
   - **Client Secret** (OAuth Client Secret)
   - **Important**: Copy the Client Secret immediately - you won't be able to see it again!

## Step 2: Add Environment Variables

Add these to your `.env.local` file:

```env
# Vercel OAuth Integration
VERCEL_CLIENT_ID=your_vercel_client_id_here
VERCEL_CLIENT_SECRET=your_vercel_client_secret_here
VERCEL_REDIRECT_URI=http://localhost:3000/api/auth/vercel/callback
```

For production, update `VERCEL_REDIRECT_URI` to your production URL:
```env
VERCEL_REDIRECT_URI=https://yourdomain.com/api/auth/vercel/callback
```

**Important Notes:**
- These credentials are for **your integration** (the platform)
- Users will authorize **their own** Vercel accounts through this integration
- Each user's access token is stored separately in their profile

## Step 3: Update Database Schema

The database schema should already include Vercel columns. If not, run:

1. Go to Supabase Dashboard → SQL Editor
2. Run this migration:
   ```sql
   ALTER TABLE user_profiles 
   ADD COLUMN IF NOT EXISTS vercel_token TEXT;
   ```

Or check if `supabase/migrations/add_vercel_columns.sql` exists and run it.

## Step 4: Test the Integration

1. Start your dev server: `npm run dev`
2. Generate some code
3. Click "Deploy" → "Deploy to Vercel"
4. Click "Connect Vercel" if not already connected
5. You'll be redirected to Vercel to authorize
6. Authorize the integration with your Vercel account
7. You'll be redirected back to the app
8. Enter project name and environment variables (if needed)
9. Click "Deploy to Vercel"
10. Your code should deploy to your Vercel account!

## How Users Connect Their Accounts

When a user clicks "Connect Vercel":

1. They're redirected to Vercel's authorization page
2. They log in to **their own** Vercel account (if not already logged in)
3. They authorize your integration to access their Vercel account
4. Vercel redirects back with an authorization code
5. Your app exchanges the code for an access token
6. The access token is stored securely in the user's profile
7. Future deployments use the user's token to deploy to **their** Vercel account

## Features

### Automatic Framework Detection
- Detects React, Next.js, Vue, Nuxt, Svelte, etc.
- Configures build settings automatically
- Generates `vercel.json` if needed

### Environment Variables
- Auto-detects environment variables from code
- User can configure values before deployment
- Variables are set for production, preview, and development

### Deployment Status
- Real-time deployment status polling
- Shows deployment URL when ready
- Error handling with helpful messages

### Security
- OAuth tokens stored securely in database
- Users can only deploy to their own Vercel account
- Tokens are scoped to your integration (read/write)

## Troubleshooting

### "Vercel integration is not configured"
- Make sure `VERCEL_CLIENT_ID` and `VERCEL_CLIENT_SECRET` are set in `.env.local`
- Restart your dev server after adding environment variables
- Check that the values are correct (no extra spaces)

### "Vercel account not connected"
- User needs to complete the OAuth flow
- Check that `vercel_token` is set in `user_profiles` table for the user
- Try disconnecting and reconnecting

### "OAuth authorization failed"
- Check that `VERCEL_CLIENT_ID` and `VERCEL_CLIENT_SECRET` are correct
- Verify the redirect URI matches exactly (including http/https and port)
- Ensure the redirect URI in Vercel integration matches your `.env.local`
- Make sure `NEXT_PUBLIC_APP_URL` is set correctly

### "Deployment failed"
- Check Vercel dashboard for build logs
- Verify the code is valid for the detected framework
- Check that environment variables are set correctly
- Some code types (CLI, backend-only) may not deploy well to Vercel

### OAuth callback not working
- Verify `VERCEL_REDIRECT_URI` matches exactly (including http/https and port)
- Check that the callback URL in Vercel integration matches
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly
- For localhost: Make sure you're using `http://localhost:3000` (not 127.0.0.1)

## API Routes

- `GET /api/auth/vercel` - Initiate OAuth flow (redirects to Vercel)
- `GET /api/auth/vercel/callback` - OAuth callback handler
- `POST /api/auth/vercel/store` - Store Vercel token (called from frontend)
- `POST /api/vercel/deploy` - Deploy code to Vercel
- `GET /api/vercel/deploy?deploymentId=xxx` - Check deployment status

## Monitoring

Vercel deployments are tracked in the `monitoring_events` table with:
- Event type: `vercel_deploy`
- Event data: `{ projectName, deploymentUrl, status }`

## Security Best Practices

1. **Never commit `.env.local`** with Vercel secrets
2. **Use different integrations** for development and production (recommended)
3. **Rotate client secrets** periodically
4. **Monitor OAuth usage** in Vercel integration settings
5. **Store tokens securely** - tokens are stored encrypted in Supabase
6. **Scope appropriately** - your integration requests `read write` scope (required for deployments)

## OAuth Flow Diagram

```
User clicks "Connect Vercel"
    ↓
App redirects to: https://vercel.com/integrations/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI
    ↓
User logs in to their Vercel account (if needed)
    ↓
User authorizes your integration
    ↓
Vercel redirects to: YOUR_REDIRECT_URI?code=AUTH_CODE&state=STATE
    ↓
App exchanges code for access token: POST https://api.vercel.com/v2/oauth/access_token
    ↓
App stores token in user_profiles.vercel_token
    ↓
Future deployments use the stored token to deploy to user's Vercel account
```

## Next Steps

- Add support for Vercel Teams
- Allow users to select Vercel project (instead of always creating new)
- Support for custom domains
- Integration with Vercel Analytics
- Preview deployments before production

## FAQ

**Q: Do I need a Vercel account to set this up?**
A: Yes, you need a Vercel account to create the OAuth integration. However, each user will connect their own Vercel account.

**Q: Can users deploy to my Vercel account?**
A: No. Each user connects their own Vercel account and deployments go to their account, not yours.

**Q: What happens if a user revokes access?**
A: If a user revokes the integration in Vercel settings, they'll need to reconnect. The stored token will become invalid.

**Q: Can I see users' deployments?**
A: No. Deployments are in each user's own Vercel account. You can only track that a deployment was initiated (via monitoring_events table).

**Q: Is there a limit on deployments?**
A: Deployment limits depend on each user's Vercel plan (Hobby, Pro, Enterprise). Your integration doesn't have separate limits.

