import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/shopify/billing/callback
 * No longer used — billing moved to Stripe.
 * Redirect to dashboard to avoid a dead 404.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
  return NextResponse.redirect(`${appUrl}/dashboard/description-writer`);
}
