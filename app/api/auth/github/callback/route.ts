import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getGitHubUser } from '@/lib/github-client';
import { supabaseAdmin } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabase';

/**
 * Handle GitHub OAuth callback
 * Exchange code for token and store in user profile
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || error;
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?github_auth_error=${encodeURIComponent(errorDescription)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?github_auth_error=No authorization code provided`
      );
    }

    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);

    // Get GitHub user info
    const githubUser = await getGitHubUser(accessToken);

    // Get the authenticated user from session
    // We'll need to pass the user ID via state or session
    // For now, we'll redirect to the app and let the frontend handle it
    // The frontend will need to call an API to store the token

    // Pass token via httpOnly cookie — never expose in URL
    const redirectUrl = new URL(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/github/store`
    );
    redirectUrl.searchParams.set('username', githubUser.username);

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.set('github_token_temp', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('[GitHubAuth] Error in callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?github_auth_error=${encodeURIComponent(error.message || 'Authentication failed')}`
    );
  }
}

