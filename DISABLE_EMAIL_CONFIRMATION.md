# Disable Email Confirmation in Supabase

If signup works but you're not immediately signed in, Supabase might be requiring email confirmation.

## Quick Fix: Disable Email Confirmation

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **ofkohtektddpflcdbsma**
3. Go to **Authentication** → **Settings** (in the left sidebar)
4. Scroll down to **"Email Auth"** section
5. Find **"Enable email confirmations"**
6. **Toggle it OFF** (disable it)
7. Click **Save**

## After Disabling

- Users will be immediately signed in after signup
- No email confirmation required
- Perfect for development/testing

## For Production

In production, you should:
- Keep email confirmation enabled for security
- Set up proper email templates
- Handle the confirmation flow in your app

## Test It

After disabling email confirmation:
1. Try signing up again
2. You should be immediately signed in
3. The app should load with your account

