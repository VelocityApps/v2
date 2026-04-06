# Shopify App Store Launch Checklist

**Last updated:** 2026-04-06
**Target:** Shopify App Store submission

---

## ✅ Done

| # | Item |
|---|------|
| 1 | Encrypt Shopify tokens (AES-256-GCM) |
| 2 | RLS policies (Supabase) |
| 3 | Terms of Service page |
| 4 | Privacy Policy page |
| 5 | Email verification (Supabase + Resend) |
| 6 | Password reset flow |
| 7 | **Abandoned Cart Recovery** – 3-email sequence, discount codes, recovery detection |
| 8 | **Review Request Automator** – fulfillment-triggered, multi-platform, cancellation handling |
| 9 | **Low Stock Alerts** – immediate + daily-digest, email + Slack, per-product cooldown |
| 10 | **Best Sellers Collection** – real sales ranking, diff-based collection sync |
| 11 | **Pinterest Stock Sync** |
| 12 | **Welcome Email Series** – first-time buyer detection, 3-email sequence, cron-driven |
| 13 | Shopify Billing API (AppSubscription per automation — not Stripe) |
| 14 | Vercel cron job (`vercel.json` – runs `/api/cron` hourly) |
| 15 | Sentry error monitoring |
| 16 | Automation registry (`load-all.ts` – all automations load in webhook/cron/install routes) |
| 17 | GDPR webhooks — `customers/data_request`, `customers/redact`, `shop/redact` |
| 18 | Embedded app (App Bridge 3.x, `/shopify/` route group, no nav chrome) |
| 19 | Install entry point (`/api/auth/shopify/install` — HMAC-validated, embedded-aware) |
| 20 | CSP + frame-ancestors configured for `admin.shopify.com` and `*.myshopify.com` |
| 21 | `app/uninstalled` webhook — cancels automations and clears revoked tokens immediately |
| 22 | Embedded signup UX — `emailRedirectTo` brings merchant back after verification |
| 23 | Coming soon labels removed — all automations show "Add to Store" |

---

## ❌ Remaining

### 🔴 Priority 1 — Partner Dashboard config (required before review)

- [ ] **App URL** → `https://velocityapps.dev/api/auth/shopify/install`
- [ ] **Allowed redirect URL** → `https://velocityapps.dev/api/auth/shopify/callback`
- [ ] **Embedded in admin** → Yes
- [ ] **Register mandatory webhooks** in Partner dashboard:
  - `app/uninstalled` → `https://velocityapps.dev/api/webhooks/shopify`
  - `customers/data_request` → `https://velocityapps.dev/api/webhooks/shopify`
  - `customers/redact` → `https://velocityapps.dev/api/webhooks/shopify`
  - `shop/redact` → `https://velocityapps.dev/api/webhooks/shopify`
- [ ] **Scopes declared** in Partner dashboard match what the app requests:
  `read_products`, `write_products`, `read_orders`, `read_inventory`, `write_inventory`, `read_customers`, `read_content`, `write_content`, `write_price_rules`, `write_discounts`

**Time:** 15 minutes

---

### 🔴 Priority 2 — App listing (required before submitting for review)

- [ ] **App icon** — 1024×1024 PNG, no rounded corners (Shopify adds them)
- [ ] **App name** — confirm final name shown on App Store
- [ ] **Tagline** — one sentence, max 100 chars
- [ ] **Description** — up to 2800 chars; lead with the problem you solve, then features
- [ ] **Screenshots** — minimum 3, max 10 (1600×900 desktop or 900×1600 mobile)
- [ ] **Support email** — e.g. `support@velocityapps.dev`
- [ ] **Privacy policy URL** — `https://velocityapps.dev/privacy`
- [ ] **Pricing** — per-automation pricing listed on the listing must match in-app pricing

**Time:** 1–2 hours (most time will be screenshots)

---

### 🟡 Priority 3 — End-to-end testing on a dev store

- [ ] Install app on a Shopify development store via the Partner dashboard
- [ ] Complete the embedded OAuth + account creation flow
- [ ] Install one automation and verify billing prompt appears
- [ ] Approve billing and confirm automation status goes `active` in Supabase
- [ ] Trigger a test webhook (e.g. set a product out of stock) and verify automation fires
- [ ] Uninstall the app and verify `app/uninstalled` fires — automations marked `cancelled` in Supabase
- [ ] Test GDPR webhooks using the Partner dashboard test tool

**Time:** 1 hour

---

### 🟡 Priority 4 — Production environment variables

Verify these are all set in the Vercel dashboard:

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ |
| `SHOPIFY_CLIENT_ID` | ✓ |
| `SHOPIFY_CLIENT_SECRET` | ✓ |
| `SHOPIFY_WEBHOOK_SECRET` | ✓ |
| `RESEND_API_KEY` | ✓ |
| `FROM_EMAIL` | ✓ |
| `SUPPORT_ALERT_EMAILS` | ✓ |
| `CRON_SECRET` | ✓ |
| `ENCRYPTION_KEY` | **verify** |
| `NEXT_PUBLIC_APP_URL` | must be `https://velocityapps.dev` |
| `NEXT_PUBLIC_SHOPIFY_CLIENT_ID` | needed for App Bridge client-side init |
| `NEXT_PUBLIC_SENTRY_DSN` | optional — set up sentry.io if desired |

**Note:** `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` are no longer needed for the App Store version — billing goes through Shopify.

**Time:** 10 minutes

---

### 🟢 Priority 5 — Submit for review

- [ ] Run through Shopify's pre-submission checklist in the Partner dashboard
- [ ] Submit app for review
- [ ] Monitor for reviewer feedback (typical turnaround: 5–10 business days)
- [ ] Common rejection reasons to pre-empt:
  - GDPR webhooks not responding (they'll send test payloads)
  - Billing not activating correctly
  - App crashes during install flow
  - Missing support contact

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Done | 23 |
| ❌ Remaining | 5 tasks |

**No more code changes needed. Everything remaining is config, listing content, and testing.**

---

## 🗺️ Post-Launch: Automations Pending Third-Party Integrations

These are in the marketplace but need external API work before they're functional:

| Automation | Blocker | Est. effort |
|---|---|---|
| **Social Media Auto-Post** | Facebook/Instagram Graph API + per-merchant OAuth | 2–3 days |
| **Google Shopping Feed Sync** | Google Merchant Center API + OAuth per merchant | 2 days |
| **Competitor Price Monitoring** | Web scraping legally grey; needs paid scraping API | 1–2 days |
| **Product Image Optimizer** | Image pipeline (Sharp + re-upload to Shopify CDN) | 1 day |
| **Inventory Sync Across Channels** | Amazon SP-API / eBay / Etsy (start Amazon-only) | 3–5 days |

**Recommended order:** Product Image Optimizer → Social Media → Google Shopping → Inventory Sync → Competitor Monitoring
