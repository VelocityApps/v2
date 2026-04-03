import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware: scoped Content-Security-Policy overrides.
 *
 * The global CSP in next.config.ts intentionally omits 'unsafe-eval'.
 * The /preview/* pages use Babel standalone which requires eval() to
 * transpile user-submitted React code in the browser. We add it back
 * here for that path only, keeping every other route eval-free.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/preview/')) {
    const response = NextResponse.next();
    // Override CSP for preview pages to allow Babel standalone's eval()
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
      ].join('; ')
    );
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Only run on preview pages — skip static assets and API routes
  matcher: ['/preview/:path*'],
};
