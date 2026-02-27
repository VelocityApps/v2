import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/shopify/oauth';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Handle Shopify OAuth callback
 * Exchange code for token and store in user profile
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || error;
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?shopify_auth_error=${encodeURIComponent(errorDescription)}`
      );
    }

    if (!code || !shop) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?shopify_auth_error=Missing authorization code or shop`
      );
    }

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(shop, code);

    // SECURITY: Store token in session/cookie instead of URL
    // For now, we'll use a secure cookie to pass token to frontend
    // In production, consider storing in database immediately

    const redirectUrl = new URL(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/marketplace`
    );
    redirectUrl.searchParams.set('shopify_auth_success', '1');
    redirectUrl.searchParams.set('shop', shop);
    const oauthState = searchParams.get('state') ?? '';
    const installSlug = oauthState.includes(':') ? oauthState.split(':').slice(1).join(':') : '';
    if (installSlug) redirectUrl.searchParams.set('install', installSlug);
    
    // Store token in httpOnly cookie (more secure than URL param)
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.set('shopify_token_temp', tokenResponse.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // 1 minute - frontend should read and clear immediately
      path: '/',
    });
    response.cookies.set('shopify_shop_temp', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[ShopifyAuth] Error in callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?shopify_auth_error=${encodeURIComponent(error.message || 'Authentication failed')}`
    );
  }
}



