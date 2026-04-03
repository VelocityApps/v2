import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware: per-path Content-Security-Policy and framing overrides.
 *
 * /shopify/*  — Shopify admin embedded routes. Must allow framing by
 *               admin.shopify.com and *.myshopify.com. The global
 *               X-Frame-Options: DENY set in next.config.ts is removed here.
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

const SHOPIFY_FRAME_ANCESTORS =
  "frame-ancestors https://admin.shopify.com https://*.myshopify.com 'self'";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Shopify embedded routes ──────────────────────────────────────────────
  if (pathname.startsWith('/shopify/')) {
    const response = NextResponse.next();

    // Remove the blanket DENY from next.config.ts
    response.headers.delete('X-Frame-Options');

    // Inject frame-ancestors that permits Shopify admin only
    const existingCSP = response.headers.get('Content-Security-Policy') || '';
    const updatedCSP = existingCSP
      // Replace any existing frame-ancestors directive
      .replace(/frame-ancestors[^;]*(;|$)/g, '')
      .trimEnd()
      .replace(/;$/, '') +
      '; ' + SHOPIFY_FRAME_ANCESTORS;

    response.headers.set('Content-Security-Policy', updatedCSP);
    return response;
  }

  // ── Preview pages ────────────────────────────────────────────────────────
  if (pathname.startsWith('/preview/')) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', PREVIEW_CSP);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/preview/:path*', '/shopify/:path*'],
};
