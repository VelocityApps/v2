import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware: per-path Content-Security-Policy overrides.
 *
 * Framing policy for /shopify/* is handled entirely in next.config.ts via a
 * shopify-specific header block — Next.js applies config headers after
 * middleware, so trying to modify CSP/X-Frame-Options here is unreliable.
 *
 * /preview/*  — Babel standalone code runner. Needs unsafe-eval for
 *               transpilation. Scope it tightly so the rest of the app
 *               stays eval-free.
 */

const PREVIEW_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/preview/')) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', PREVIEW_CSP);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/preview/:path*'],
};
