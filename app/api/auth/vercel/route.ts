import { NextRequest, NextResponse } from 'next/server';
import { getVercelAuthUrl } from '@/lib/vercel-client';

/**
 * Initiate Vercel OAuth flow
 * Redirects user to Vercel authorization page
 * Also supports HEAD requests for configuration checks
 */
export async function GET(request: NextRequest) {
  // Check if Vercel OAuth is configured
  if (!process.env.VERCEL_CLIENT_ID) {
    return NextResponse.json(
      { 
        error: 'Vercel integration is not configured. Please contact support or check environment variables.',
        code: 'VERCEL_NOT_CONFIGURED'
      },
      { status: 503 }
    );
  }

  try {
    const authUrl = getVercelAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[VercelAuth] Error initiating OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Vercel authentication' },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  // Check if Vercel OAuth is configured
  if (!process.env.VERCEL_CLIENT_ID) {
    return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(null, { status: 200 });
}

