import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
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

    // Persist the token server-side so the install API can retrieve it even if
    // the sessionStorage/cookie window is lost (e.g. email verification round-trip).
    // The install API claims and deletes this record on first use.
    try {
      const { encryptToken } = await import('@/lib/shopify/oauth');
      const encryptedToken = await encryptToken(tokenResponse.access_token);
      const shopNormalized = shop.replace(/^https?:\/\//i, '').toLowerCase().split('/')[0];
      await supabaseAdmin
        .from('shopify_pending_tokens')
        .upsert(
          {
            shop: shopNormalized,
            encrypted_token: encryptedToken,
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
          },
          { onConflict: 'shop' },
        );
    } catch (err: any) {
      // Non-fatal — cookie fallback still works for the common path
      console.warn('[ShopifyCallback] Failed to persist pending token:', err.message);
    }

    // Parse state — expected to be base64url-encoded JSON produced by the install route.
    // The nonce is verified via HMAC signature (nonceSignature) rather than a cookie,
    // because cookies set inside Shopify's iframe are third-party and blocked by
    // modern browsers (Chrome, Safari).
    const oauthState = searchParams.get('state') ?? '';
    let installSlug: string = '';
    let source: string = '';
    let embeddedHost: string = searchParams.get('host') ?? '';

    try {
      const parsed = JSON.parse(Buffer.from(oauthState, 'base64url').toString());
      const { nonce, nonceSignature } = parsed;

      // Verify the nonce was signed by our server
      const expectedSig = crypto
        .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
        .update(nonce ?? '')
        .digest('hex');

      const sigValid =
        nonce &&
        nonceSignature &&
        crypto.timingSafeEqual(
          Buffer.from(expectedSig, 'hex'),
          Buffer.from(nonceSignature, 'hex'),
        );

      if (!sigValid) throw new Error('bad signature');

      // embedded:true means install was initiated from the App Store / Partner dashboard
      if (parsed.embedded) source = 'embedded';
      embeddedHost = parsed.host || embeddedHost;
      installSlug = parsed.installSlug || '';
      if (!parsed.embedded && parsed.source) source = parsed.source;
    } catch {
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
    // lax (not strict) so the cookie survives the top-level cross-site redirect
    // from myshopify.com back to velocityapps.dev. 10-minute window gives the
    // user time to sign in on embed-init and claim the token before it expires.
    response.cookies.set('shopify_token_temp', tokenResponse.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    response.cookies.set('shopify_shop_temp', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
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



