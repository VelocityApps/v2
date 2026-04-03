import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Content-Security-Policy — keeps Next.js hydration + Stripe + Supabase + Sentry working
const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for its runtime scripts.
  // unsafe-eval is intentionally excluded here — it is added back only for /preview/* via middleware.ts
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://unpkg.com https://us-assets.i.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Broad img-src: Shopify product images, CDNs, data URIs
  "img-src 'self' data: blob: https:",
  // API connections: Supabase (HTTP + WS), Stripe, Sentry, PostHog
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.stripe.com",
    "https://*.sentry.io",
    "https://o4510963733889024.ingest.de.sentry.io",
    "https://*.posthog.com",
    "https://us.i.posthog.com",
    "https://us-assets.i.posthog.com",
  ].join(' '),
  // Stripe's payment iframes
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Cache public read-only API endpoints at the CDN edge (5 min)
        source: '/api/public/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=60' },
        ],
      },
      {
        // Immutable static assets — Next.js already does this but be explicit
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Apply security headers to every response
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organisation + project (used for source map uploads during build)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps when SENTRY_AUTH_TOKEN is present (i.e. in CI/Vercel, not local)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,

  // Upload source maps so stack traces show original TypeScript lines
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Auto-instrument Next.js route handlers and server components
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,

  // Tree-shake Sentry debug code from client bundle
  disableLogger: true,
});
