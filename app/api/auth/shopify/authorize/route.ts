import { NextRequest, NextResponse } from 'next/server';
import { generateShopifyAuthUrl } from '@/lib/shopify/oauth';
import { validateShopifyStoreUrl } from '@/lib/validation';
import { checkIpRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * GET /api/auth/shopify/authorize
 * Generate Shopify OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkIpRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) },
    });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    let shop = searchParams.get('shop')?.trim() ?? '';

    // Normalize: strip protocol and path so we only have host (e.g. store.myshopify.com)
    if (shop) {
      shop = shop.replace(/^https?:\/\//i, '').toLowerCase().split('/')[0];
    }

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop parameter is required (e.g., mystore.myshopify.com)' },
        { status: 400 }
      );
    }

    // Validate shop URL format
    if (!validateShopifyStoreUrl(shop)) {
      return NextResponse.json(
        { error: 'Invalid Shopify store URL format' },
        { status: 400 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/shopify/callback`;
    const installSlug = searchParams.get('install')?.trim() || '';
    const crypto = await import('crypto');
    const state = installSlug
      ? `${crypto.randomBytes(16).toString('hex')}:${installSlug}`
      : undefined;

    const authUrl = generateShopifyAuthUrl({
      shop,
      redirectUri,
      state,
    });

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('[ShopifyAuth] Error generating auth URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}



