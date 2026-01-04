import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getVercelUser } from '@/lib/vercel-client';

/**
 * Handle Vercel OAuth callback
 * Exchange code for token and redirect to app
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
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?vercel_auth_error=${encodeURIComponent(errorDescription)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?vercel_auth_error=No authorization code provided`
      );
    }

    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);

    // Get Vercel user info
    const vercelUser = await getVercelUser(accessToken);

    // Redirect to app with success message
    // The frontend will call POST /api/auth/vercel/store to securely store the token
    const redirectUrl = new URL(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`
    );
    redirectUrl.searchParams.set('vercel_auth_success', '1');
    redirectUrl.searchParams.set('vercel_token', accessToken);
    redirectUrl.searchParams.set('vercel_username', vercelUser.username);
    redirectUrl.searchParams.set('vercel_email', vercelUser.email || '');

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error('[VercelAuth] Error in callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?vercel_auth_error=${encodeURIComponent(error.message || 'Authentication failed')}`
    );
  }
}

