import { NextRequest, NextResponse } from 'next/server';
import { generateShopifyAuthUrl } from '@/lib/shopify/oauth';

/**
 * GET /api/auth/shopify/authorize
 * Generate Shopify OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop parameter is required (e.g., mystore.myshopify.com)' },
        { status: 400 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/shopify/callback`;
    
    const authUrl = generateShopifyAuthUrl({
      shop,
      redirectUri,
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

