import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Lower sample rate on server – traces add latency overhead
  tracesSampleRate: 0.05,

  debug: false,
});
