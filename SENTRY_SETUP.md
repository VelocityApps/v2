# Sentry Setup Guide

## ⚠️ Important: Next.js 16 Compatibility

**Sentry doesn't officially support Next.js 16 yet.** The integration is prepared but disabled.

When Sentry adds Next.js 16 support, you can enable it by following these steps.

---

## Installation (When Available)

```bash
npm install @sentry/nextjs --legacy-peer-deps
```

---

## Configuration

### 1. Get Your Sentry DSN

1. Go to [sentry.io](https://sentry.io)
2. Create a new project (or use existing)
3. Copy your DSN (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)

### 2. Add Environment Variables

Add to `.env.local`:

```env
# Sentry Configuration (Optional)
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name

# Sentry Performance Monitoring
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% of profiles
```

### 3. Enable Sentry in next.config.ts

Uncomment the Sentry integration code in `next.config.ts`:

```typescript
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// Only enable Sentry if DSN is configured
const sentryEnabled = !!process.env.SENTRY_DSN;

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    })
  : nextConfig;
```

### 4. Create Sentry Config Files

**sentry.client.config.ts:**
```typescript
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    debug: false,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
  });
}
```

**sentry.server.config.ts:**
```typescript
import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    debug: false,
  });
}
```

**sentry.edge.config.ts:**
```typescript
import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    debug: false,
  });
}
```

---

## What Gets Tracked

With Sentry enabled:
- ✅ Client-side errors
- ✅ Server-side errors
- ✅ API route errors
- ✅ Performance metrics
- ✅ User sessions (optional)

---

## Testing

Test that Sentry is working:

```typescript
// In any component or API route
throw new Error('Test Sentry error');
```

Check your Sentry dashboard to see the error.

---

## Current Status

**Sentry is currently DISABLED** because it doesn't support Next.js 16 yet.

Email alerts are working instead via `lib/email.ts`.

When Sentry adds Next.js 16 support, follow the steps above to enable it.

---

## Alternative: Email Alerts (Currently Active)

Email alerts are configured in `lib/email.ts` and work independently of Sentry.

See `EMAIL_SETUP.md` for configuration.
