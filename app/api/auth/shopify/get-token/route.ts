import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/shopify/get-token
 * Get Shopify token from secure cookie (set by OAuth callback)
 * This endpoint reads the token from httpOnly cookie and returns it once
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('shopify_token_temp')?.value;
    const shop = request.cookies.get('shopify_shop_temp')?.value;

    if (!token || !shop) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Return token and clear cookies (one-time use)
    const response = NextResponse.json({ token, shop });
    
    // Clear the cookies after reading
    response.cookies.delete('shopify_token_temp');
    response.cookies.delete('shopify_shop_temp');

    return response;
  } catch (error: any) {
    console.error('[GetToken] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve token' },
      { status: 500 }
    );
  }
}

