# Launch Blockers

**Last updated:** 2026-02-27

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
| 11 | Pinterest Stock Sync (was already complete) |
| 12 | Stripe webhook handler (checkout, subscription updated/deleted, invoice paid) |

---

## ❌ Remaining (4 blockers)

### 1. `vercel.json` — Cron Job Config
**CRITICAL** – without this, no scheduled automation (abandoned cart emails, review requests, low stock digests, best sellers updates) will ever run in production.

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 * * * *"
    }
  ]
}
```

Also add `CRON_SECRET` to Vercel env vars and to `.env.local`, then update the cron path to `/api/cron?secret=YOUR_SECRET`.

**Time:** 10 minutes

---

### 2. Production Environment Variables on Vercel
These must be set in the Vercel dashboard before deploying:

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Set locally |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set locally |
| `SUPABASE_SERVICE_ROLE_KEY` | Set locally |
| `SHOPIFY_CLIENT_ID` | Set locally |
| `SHOPIFY_CLIENT_SECRET` | Set locally |
| `SHOPIFY_WEBHOOK_SECRET` | Set locally |
| `STRIPE_SECRET_KEY` | Set locally |
| `STRIPE_WEBHOOK_SECRET` | Set locally |
| `RESEND_API_KEY` | Set locally |
| `NEXT_PUBLIC_APP_URL` | Set to production URL |
| `CRON_SECRET` | **Not set** – add before deploying |
| `SUPPORT_ALERT_EMAILS` | **Not set** – needed for low stock alerts fallback |
| `ENCRYPTION_KEY` | Check if set |

**Time:** 15 minutes

---

### 3. Stripe Webhooks – End-to-End Test
The handler code is complete. What's needed:
- [ ] Register the webhook endpoint in Stripe Dashboard → `https://yourdomain.com/api/webhooks/stripe`
- [ ] Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Trigger test events: `stripe trigger checkout.session.completed`
- [ ] Verify subscription status updates in Supabase
- [ ] Test `customer.subscription.deleted` (cancellation → downgrade to free)

**Time:** 30 minutes

---

### 4. Sentry Error Monitoring
Currently there is zero error monitoring in production. If an automation fails silently, you won't know.

- [ ] Create account at sentry.io
- [ ] Create a Next.js project
- [ ] `npm install @sentry/nextjs`
- [ ] Run `npx @sentry/wizard@latest -i nextjs`
- [ ] Add `SENTRY_DSN` to Vercel env vars
- [ ] Test: throw an intentional error, verify it appears in Sentry

**Time:** 30 minutes

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Done | 12 |
| ❌ Remaining | 4 |

**All 5 automations are complete.** The 4 remaining items are infrastructure/ops tasks (cron config, env vars, Stripe test, Sentry) — none require code changes except `vercel.json`.
