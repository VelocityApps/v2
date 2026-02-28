# Launch Blockers

**Last updated:** 2026-02-28

---

## ✅ Done

| # | Item |
|---|------|
| 1 | Encrypt Shopify tokens |
| 2 | RLS policies (Supabase) |
| 3 | Terms of Service page |
| 4 | Privacy Policy page |
| 5 | Email verification (Supabase + Resend) |
| 6 | Password reset (forgot/reset pages, expired-link handling) |
| 7 | **Abandoned Cart Recovery** – full 3-email sequence, real Shopify discount codes, recovery detection |
| 8 | **Review Request Automator** – fulfillment-triggered scheduling, multi-platform review URLs, cancellation handling |
| 9 | **Low Stock Alerts** – immediate + daily-digest modes, email + Slack + both, per-product cooldown |
| 10 | **Best Sellers Collection** – real sales ranking, diff-based collection sync, fixed revenue/pagination |
| 11 | **Pinterest Stock Sync** (was already complete) |
| 12 | **Welcome Email Series** – first-time buyer detection, 3-email sequence, optional discount code, cron-driven |
| 13 | Stripe webhook handler (checkout, subscription updated/deleted, invoice paid) |
| 14 | Vercel cron job config (`vercel.json` – runs `/api/cron` hourly) |
| 15 | Sentry error monitoring (installed, configured, global error boundary) |
| 16 | Automation registry fix (`load-all.ts` – all automations now load in webhook/cron/install routes) |
| 17 | `welcome_email_series` DB table + config_schema migrations applied |

---

## ❌ Remaining (2 blockers)

### 1. Production Environment Variables on Vercel

Set these in the Vercel dashboard before deploying:

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Set locally ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set locally ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | Set locally ✓ |
| `SHOPIFY_CLIENT_ID` | Set locally ✓ |
| `SHOPIFY_CLIENT_SECRET` | Set locally ✓ |
| `SHOPIFY_WEBHOOK_SECRET` | Set locally ✓ |
| `STRIPE_SECRET_KEY` | Set locally ✓ |
| `STRIPE_WEBHOOK_SECRET` | Set locally ✓ |
| `RESEND_API_KEY` | Set locally ✓ |
| `FROM_EMAIL` | Set locally ✓ |
| `SUPPORT_ALERT_EMAILS` | Set locally ✓ |
| `CRON_SECRET` | Set locally ✓ |
| `ENCRYPTION_KEY` | **Verify this is set** |
| `NEXT_PUBLIC_APP_URL` | Set to production URL (https://velocityapps.dev) |
| `NEXT_PUBLIC_SENTRY_DSN` | **Not set** – create account at sentry.io first |
| `SENTRY_ORG` | **Not set** |
| `SENTRY_PROJECT` | **Not set** |
| `SENTRY_AUTH_TOKEN` | **Not set** (only needed for source map uploads in CI) |

**Time:** 15 minutes

---

### 2. Stripe Webhooks – End-to-End Test

The handler code is complete. What's needed:
- [ ] Register the webhook endpoint in Stripe Dashboard → `https://velocityapps.dev/api/webhooks/stripe`
- [ ] Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Trigger test events: `stripe trigger checkout.session.completed`
- [ ] Verify subscription status updates in Supabase
- [ ] Test `customer.subscription.deleted` (cancellation → downgrade to free)

**Time:** 30 minutes

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Done | 17 |
| ❌ Remaining | 2 |

**All 6 automations complete. 2 remaining items are ops/infra tasks — no more code changes needed to launch.**
