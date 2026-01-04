# GitHub Export Setup Guide

This guide explains how to set up GitHub OAuth for one-click code export functionality.

## Overview

The GitHub export feature allows users to:
- Connect their GitHub account via OAuth
- Export generated code directly to a new GitHub repository
- Automatically create README.md with setup instructions
- Track exports in the monitoring system

## Step 1: Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
   - Direct link: https://github.com/settings/developers

2. Click **"New OAuth App"**

3. Fill in the form:
   - **Application name**: `ForgedApps` (or your app name)
   - **Homepage URL**: `https://yourdomain.com` (or `http://localhost:3000` for dev)
   - **Authorization callback URL**: 
     - Development: `http://localhost:3000/api/auth/github/callback`
     - Production: `https://yourdomain.com/api/auth/github/callback`

4. Click **"Register application"**

5. Copy the **Client ID** and generate a **Client Secret**
   - Click "Generate a new client secret"
   - **Important**: Copy the secret immediately - you won't be able to see it again!

## Step 2: Add Environment Variables

Add these to your `.env.local` file:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback
```

For production, update `GITHUB_REDIRECT_URI` to your production URL:
```env
GITHUB_REDIRECT_URI=https://yourdomain.com/api/auth/github/callback
```

## Step 3: Update Database Schema

Run the migration to add GitHub columns:

1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/add_github_columns.sql`
3. Or manually run:
   ```sql
   ALTER TABLE user_profiles 
   ADD COLUMN IF NOT EXISTS github_username TEXT,
   ADD COLUMN IF NOT EXISTS github_token TEXT;

   ALTER TABLE projects 
   ADD COLUMN IF NOT EXISTS github_repo_url TEXT;
   ```

## Step 4: Test the Integration

1. Start your dev server: `npm run dev`
2. Generate some code
3. Click "Export to GitHub" button
4. If not connected, click "Connect GitHub"
5. Authorize the app
6. Enter repository name and description
7. Click "Export to GitHub"
8. Your code should be pushed to a new private repository!

## Features

### Automatic README Generation
- Project description from user prompt
- Prerequisites based on code type (React, Python, Node.js, HTML)
- Installation instructions
- Usage examples
- Deployment guides (Vercel, Netlify, Railway)
- "Built with ForgedApps" footer

### Smart File Structure
- Detects code type (React, Python, Node.js, HTML)
- Creates appropriate file names (`App.jsx`, `main.py`, `index.js`, etc.)
- Supports multi-file structures (if code contains file markers)

### Security
- OAuth tokens stored securely in database
- Private repositories by default
- User can only export to their own GitHub account

## Troubleshooting

### "GitHub account not connected"
- Make sure you've completed the OAuth flow
- Check that `github_token` and `github_username` are set in `user_profiles` table

### "Repository name already exists"
- Choose a different repository name
- Repository names must be unique in your GitHub account

### "GitHub authentication failed"
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Verify the redirect URI matches your OAuth app settings
- Make sure the OAuth app is not suspended

### OAuth callback not working
- Verify `GITHUB_REDIRECT_URI` matches exactly (including http/https and port)
- Check that the callback URL in GitHub OAuth app matches
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly

## API Routes

- `GET /api/auth/github` - Initiate OAuth flow
- `GET /api/auth/github/callback` - OAuth callback handler
- `POST /api/auth/github/store` - Store GitHub token (called from frontend)
- `POST /api/github/export` - Export code to GitHub

## Monitoring

GitHub exports are tracked in the `monitoring_events` table with:
- Event type: `github_export`
- Event data: `{ repo_name, repo_url, project_id }`

## Security Best Practices

1. **Never commit `.env.local`** with GitHub secrets
2. **Use different OAuth apps** for development and production
3. **Rotate client secrets** periodically
4. **Monitor OAuth usage** in GitHub settings
5. **Store tokens securely** - consider encryption for production

## Next Steps

- Add support for public repositories
- Allow users to choose existing repositories
- Add branch selection
- Support for GitHub Actions workflows
- Integration with GitHub Pages deployment

