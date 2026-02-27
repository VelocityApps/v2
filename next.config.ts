import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  /* config options here */
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
