# Supabase Full-Stack Starter

A complete Next.js application with Supabase authentication, database operations, Row Level Security, real-time subscriptions, and file uploads.

## Features

- ✅ **Authentication**: Email/password + OAuth (GitHub, Google, Apple)
- ✅ **Database CRUD**: Full create, read, update, delete operations
- ✅ **Row Level Security**: Secure data access with RLS policies
- ✅ **Real-time Updates**: Live data synchronization
- ✅ **File Upload**: Supabase Storage integration
- ✅ **Protected Routes**: Server-side and client-side route protection
- ✅ **User Profiles**: Extended user data management

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- npm or yarn package manager

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: Your project name
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
4. Wait for project to be created (~2 minutes)

### 2. Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

### 3. Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Open `supabase/migrations/001_initial_schema.sql` from this template
4. Copy the entire file contents
5. Paste into SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for success message

This creates:
- `profiles` table (extends auth.users)
- `items` table (example CRUD table)
- Row Level Security policies
- Storage bucket for file uploads
- Triggers for automatic profile creation

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important**: Never commit `.env.local` to version control!

### 5. Install Dependencies

```bash
npm install
# or
yarn install
```

### 6. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
supabase-starter/
├── app/
│   ├── login/          # Login page
│   ├── signup/         # Signup page
│   ├── dashboard/      # Protected dashboard
│   ├── profile/        # User profile page
│   ├── auth/
│   │   └── callback/   # OAuth callback handler
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page (redirects)
│   └── globals.css     # Global styles
├── components/
│   ├── DataTable.tsx   # CRUD data table with real-time
│   └── FileUpload.tsx  # File upload component
├── lib/
│   ├── supabase-client.ts  # Client-side Supabase client
│   └── supabase-server.ts  # Server-side Supabase client
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
├── package.json
└── README.md
```

## Features Explained

### Authentication

- **Email/Password**: Traditional signup and login
- **OAuth**: GitHub, Google, and Apple authentication
- **Protected Routes**: Automatic redirects for unauthenticated users
- **Session Management**: Automatic session refresh

### Database Operations

The `items` table demonstrates:
- **Create**: Add new items
- **Read**: View all your items
- **Update**: Click to edit items inline
- **Delete**: Remove items with confirmation

All operations are protected by Row Level Security - users can only access their own data.

### Real-time Updates

The DataTable component subscribes to database changes. When you:
- Add an item in one browser tab
- Update an item in another tab
- Delete an item anywhere

All tabs update automatically in real-time!

### File Upload

The FileUpload component:
- Uploads files to Supabase Storage
- Organizes files by user ID
- Provides public URLs for uploaded files
- Respects RLS policies

## Configuring OAuth Providers

### GitHub OAuth

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Set:
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000` (or your domain)
   - **Authorization callback URL**: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase dashboard → Authentication → Providers → GitHub
6. Enable GitHub provider
7. Paste Client ID and Secret
8. Save

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://your-project.supabase.co/auth/v1/callback`
6. Copy Client ID and Secret
7. In Supabase dashboard → Authentication → Providers → Google
8. Enable Google provider
9. Paste Client ID and Secret
10. Save

### Apple OAuth (Sign in with Apple)

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Sign in with your Apple Developer account
3. Go to **Certificates, Identifiers & Profiles**
4. Click **Identifiers** → **+** button
5. Select **Services IDs** → Continue
6. Fill in:
   - **Description**: Your app name
   - **Identifier**: `com.yourcompany.yourapp` (unique identifier)
7. Enable **Sign in with Apple** → Continue → Register
8. Click on your newly created Service ID
9. Click **Configure** next to "Sign in with Apple"
10. Set:
    - **Primary App ID**: Select your app
    - **Website URLs**:
      - **Domains and Subdomains**: `your-project.supabase.co`
      - **Return URLs**: `https://your-project.supabase.co/auth/v1/callback`
11. Save and Continue
12. Go to **Keys** → **+** button
13. Fill in:
    - **Key Name**: Sign in with Apple key
    - Enable **Sign in with Apple**
14. Click **Configure** → Select your Primary App ID → Save
15. Click **Continue** → **Register**
16. Download the key file (`.p8` file) - **You can only download this once!**
17. Note the **Key ID**
18. In Supabase dashboard → Authentication → Providers → Apple
19. Enable Apple provider
20. Fill in:
    - **Services ID**: The identifier you created (e.g., `com.yourcompany.yourapp`)
    - **Secret Key**: Open the downloaded `.p8` file and copy its contents
    - **Key ID**: The Key ID from step 17
    - **Team ID**: Found in Apple Developer Portal → Membership (top right)
21. Save

**Note**: Apple OAuth requires an active Apple Developer account ($99/year). For development, you can use GitHub or Google OAuth instead.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy!

### Update OAuth Redirect URLs

After deployment, update OAuth provider redirect URLs:
- GitHub: `https://your-project.supabase.co/auth/v1/callback`
- Google: `https://your-project.supabase.co/auth/v1/callback`
- Apple: `https://your-project.supabase.co/auth/v1/callback` (configured in Apple Developer Portal)

## Security Best Practices

1. **Never commit `.env.local`** - It contains sensitive keys
2. **Use RLS policies** - Always enable Row Level Security
3. **Service Role Key** - Only use server-side, never expose to client
4. **Environment Variables** - Use different keys for dev/prod
5. **OAuth Secrets** - Keep OAuth client secrets secure

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the SQL migration in Supabase SQL Editor
- Check that tables exist in Table Editor

### OAuth not working
- Verify redirect URLs match exactly
- Check that OAuth providers are enabled in Supabase
- Ensure Client ID and Secret are correct

### Real-time not updating
- Check browser console for errors
- Verify RLS policies allow SELECT operations
- Ensure you're subscribed to the correct channel

### File upload fails
- Verify storage bucket exists (`files`)
- Check storage policies allow INSERT
- Ensure user is authenticated

## Next Steps

- Customize the `items` table schema for your use case
- Add more tables and relationships
- Implement additional OAuth providers
- Add more file upload features (image preview, progress, etc.)
- Customize the UI/UX
- Add email templates for auth flows

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

## License

MIT License - feel free to use this template for personal or commercial projects.

---

**Built with [ForgedApps](https://forgedapps.dev)** - AI-powered app builder

