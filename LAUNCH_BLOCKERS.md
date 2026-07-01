# Shopify App Store Launch Checklist

**Last updated:** 2026-04-19
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
| 24 | Partner dashboard config — App URL, redirect URL, embedded flag, webhooks, scopes |
| 25 | Production environment variables verified on Vercel |

---

## ❌ Remaining

### ✅ Priority 1 — Partner Dashboard config — DONE

- [x] App URL, redirect URL, embedded flag, webhooks, scopes — all configured

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

### ✅ Priority 3 — End-to-end testing on a dev store — DONE

- [x] Install app on a Shopify development store via the Partner dashboard
- [x] Complete the embedded OAuth + account creation flow
- [x] Install one automation and verify billing prompt appears
- [x] Approve billing and confirm automation status goes `active` in Supabase
- [x] Trigger a test webhook (e.g. set a product out of stock) and verify automation fires
- [x] Uninstall the app and verify `app/uninstalled` fires — automations marked `cancelled` in Supabase
- [x] Test GDPR webhooks — all 3 topics return 200 (fixed `SHOPIFY_WEBHOOK_SECRET` = client secret)

**Note:** Also fixed 100% webhook failure rate caused by `SHOPIFY_WEBHOOK_SECRET` being set to a random string instead of the Shopify client secret. All automation webhooks now passing.

---

### ✅ Priority 4 — Production environment variables — DONE

All env vars verified on Vercel.

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
| ✅ Done | 27 |
| ❌ Remaining | 1 task |

**No more code changes needed. Only remaining task is the app listing content before submitting for review.**

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
