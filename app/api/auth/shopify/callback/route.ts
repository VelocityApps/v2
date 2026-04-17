import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/shopify/oauth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { checkIpRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Handle Shopify OAuth callback
 * Exchange code for token and store in user profile
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkIpRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?error=too_many_requests`
    );
  }

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

    // Parse state — expected to be base64url-encoded JSON produced by the install route.
    const oauthState = searchParams.get('state') ?? '';
    let stateNonce: string;
    let installSlug: string = '';
    let source: string = '';
    let embeddedHost: string = searchParams.get('host') ?? '';

    try {
      const parsed = JSON.parse(Buffer.from(oauthState, 'base64url').toString());
      stateNonce = parsed.nonce ?? '';
      // embedded:true means install was initiated from the App Store / Partner dashboard
      if (parsed.embedded) source = 'embedded';
      embeddedHost = parsed.host || embeddedHost;
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?shopify_auth_error=${encodeURIComponent('Invalid OAuth state — please try again')}`
      );
    }

    // Verify nonce matches what we set in the authorize step
    const storedNonce = request.cookies.get('shopify_oauth_nonce')?.value;
    if (!storedNonce || storedNonce !== stateNonce) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?shopify_auth_error=${encodeURIComponent('Invalid OAuth state — please try again')}`
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Embedded install (from App Store or Partner dashboard) → send to embed-init
    // so App Bridge can be initialised before the merchant sees any UI.
    let redirectUrl: URL;
    if (source === 'embedded' && embeddedHost) {
      redirectUrl = new URL(`${baseUrl}/shopify/embed-init`);
      redirectUrl.searchParams.set('shop', shop);
      redirectUrl.searchParams.set('host', embeddedHost);
      redirectUrl.searchParams.set('installed', '1');
    } else {
      // Standalone web install — keep existing behaviour
      const destination = source === 'onboarding' ? 'onboarding' : 'marketplace';
      redirectUrl = new URL(`${baseUrl}/${destination}`);
      redirectUrl.searchParams.set('shopify_auth_success', '1');
      redirectUrl.searchParams.set('shop', shop);
      if (installSlug && destination === 'marketplace') {
        redirectUrl.searchParams.set('install', installSlug);
      }
    }
    
    // Store token in httpOnly cookie (more secure than URL param)
    const response = NextResponse.redirect(redirectUrl.toString());
    // Clear the nonce cookie — it's single-use
    response.cookies.delete('shopify_oauth_nonce');
    response.cookies.set('shopify_token_temp', tokenResponse.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60, // 1 minute - frontend should read and clear immediately
      path: '/',
    });
    response.cookies.set('shopify_shop_temp', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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



