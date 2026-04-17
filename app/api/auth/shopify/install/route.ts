import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateShopifyStoreUrl } from '@/lib/validation';
import { checkIpRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * GET /api/auth/shopify/install
 *
 * App URL entry point — Shopify sends the merchant here when they click
 * "Add app" in the App Store or "Install" in the Partner dashboard.
 *
 * Query params Shopify provides:
 *   shop      — the merchant's myshopify.com domain
 *   hmac      — request signature (must be validated before trusting anything else)
 *   host      — base64url-encoded admin URL (required for App Bridge)
 *   timestamp — Unix timestamp of the request
 *
 * On success: server-side 302 directly to Shopify's OAuth consent screen.
 * On failure: redirect to onboarding with an error param.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkIpRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/onboarding?error=too_many_requests`
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
  const { searchParams } = request.nextUrl;

  const shop = searchParams.get('shop')?.trim() ?? '';
  const hmac = searchParams.get('hmac') ?? '';
  const host = searchParams.get('host') ?? '';
  const timestamp = searchParams.get('timestamp') ?? '';

  // ── 1. Validate shop format ───────────────────────────────────────────────
  const normalizedShop = shop.replace(/^https?:\/\//i, '').toLowerCase().split('/')[0];
  if (!normalizedShop || !validateShopifyStoreUrl(normalizedShop)) {
    return NextResponse.redirect(`${appUrl}/onboarding?shopify_auth_error=Invalid+shop+domain`);
  }
  if (!normalizedShop.endsWith('.myshopify.com')) {
    return NextResponse.redirect(`${appUrl}/onboarding?shopify_auth_error=Invalid+shop+domain`);
  }

  // ── 2. Validate timestamp (reject requests older than 5 minutes) ──────────
  const ts = parseInt(timestamp, 10);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
    return NextResponse.redirect(`${appUrl}/onboarding?shopify_auth_error=Request+expired`);
  }

  // ── 3. Validate HMAC — this MUST happen before trusting any other param ───
  if (!hmac || !validateShopifyInstallHmac(searchParams)) {
    return NextResponse.redirect(`${appUrl}/onboarding?shopify_auth_error=Invalid+signature`);
  }

  // ── 4. Build OAuth URL with nonce + encoded host in state ─────────────────
  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  if (!clientId) {
    console.error('[install] SHOPIFY_CLIENT_ID is not set');
    return NextResponse.redirect(`${appUrl}/onboarding?shopify_auth_error=Server+misconfiguration`);
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  // State is base64url-encoded JSON — more robust than colon-delimited strings
  // and safely handles edge cases where the host value itself contains colons.
  const state = Buffer.from(
    JSON.stringify({ nonce, embedded: true, host: host ?? '' })
  ).toString('base64url');

  const scopes = [
    'read_products',
    'write_products',
    'read_orders',
    'read_inventory',
    'write_inventory',
    'read_customers',
    'read_content',
    'write_content',
    'write_price_rules',
    'write_discounts',
  ].join(',');

  const redirectUri = encodeURIComponent(`${appUrl}/api/auth/shopify/callback`);

  const authUrl =
    `https://${normalizedShop}/admin/oauth/authorize?` +
    `client_id=${clientId}&` +
    `scope=${scopes}&` +
    `redirect_uri=${redirectUri}&` +
    `state=${state}`;

  // Store nonce in httpOnly cookie for CSRF verification in callback
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('shopify_oauth_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // must be lax here — the redirect crosses origins
    maxAge: 300,
    path: '/',
  });

  return response;
}

/**
 * Validate the HMAC Shopify sends on install requests.
 * https://shopify.dev/docs/apps/build/authentication-authorization/get-access-tokens/token-exchange/getting-started
 */
function validateShopifyInstallHmac(params: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const hmac = params.get('hmac');
  if (!secret || !hmac) return false;

  // Build message: all params except hmac, percent-encode key=value pairs, sort, join
  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== 'hmac') {
      // Shopify uses a specific encoding: & and % in values are escaped
      const encodedKey = key.replace(/%/g, '%25').replace(/&/g, '%26');
      const encodedValue = value.replace(/%/g, '%25').replace(/&/g, '%26');
      pairs.push(`${encodedKey}=${encodedValue}`);
    }
  });
  pairs.sort();

  const message = pairs.join('&');
  const calculated = crypto.createHmac('sha256', secret).update(message).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hmac, 'hex'));
  } catch {
    return false;
  }
}
