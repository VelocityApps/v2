import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  async headers() {
    return [
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
