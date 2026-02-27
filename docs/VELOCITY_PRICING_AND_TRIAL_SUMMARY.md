# VelocityApps: Pricing Updates & 7-Day Free Trial — Summary

## Summary of changes

### 1. Pricing (market research)

- **Increases:** Pinterest Stock Sync £29, Low Stock £34, Welcome Email £24, Post-Purchase Upsell £29, Social Media Auto-Post £34, Auto-Restock £29, Inventory Sync £49, Auto SEO £34, Sales Report £24, CLV Tracker £39, Competitor Price £49, Product Image Optimizer £24, Customer Segmentation £34, Bulk Price Updates £34.
- **Decreases:** Best Sellers £15, Sitemap Auto-Update £9, Auto-Tag Products £15.
- **Unchanged:** Review Request £19, Abandoned Cart £29, Birthday Discount £19, Win-Back £29, Google Shopping Feed £29, Order Status £24.

All stored in DB in `automations.price_monthly` (migration).

### 2. Free trial (7 days)

- **Activation:** New install sets `status = 'trial'`, `trial_started_at = now`, `trial_ends_at = now + 7 days` when user is eligible (no prior trial for that automation).
- **Eligibility:** One trial per user per automation type (any existing `user_automations` row with same user + automation and non-null `trial_started_at` = already used).
- **During trial:** Automations run the same as active (webhooks and cron include `status IN ('active','trial')`).
- **End of trial:** Cron expires trials (`trial_ends_at <= now`): sets `status = 'paused'`, sends “trial ended” email. Auto-convert to paid when user has payment method is **not** implemented yet (see manual review).
- **Emails:** Day 0 welcome (install API), Day ~5 “2 days left” (cron), Day 7 “trial ended” (cron). User email from `auth.admin.getUserById` in cron (not `profiles`).

### 3. UI

- **Marketplace:** “7-Day Free Trial” + “then £X/month”; if user already used trial for that automation: “£X/month — no trial available”.
- **Dashboard card:** “Trial” badge and “X days left in trial” when `status === 'trial'`.
- **Automation detail page:** Trial banner with “Free trial ends [date]”, “Then £X/month”, “Add Payment Method” → `/dashboard/settings`.

### 4. Abuse prevention

- One trial per user per automation: enforced in install API by checking for existing `user_automations` with same user + automation and non-null `trial_started_at`.

---

## Files changed (reference)

| Area | File | What changed |
|------|------|--------------|
| DB | `supabase/migrations/add_pricing_and_trial.sql` | Pricing updates; `user_automations`: `trial_started_at`, `trial_ends_at`, `trial_reminder_sent_at`; status allows `'trial'`; index on `trial_ends_at` |
| Install | `app/api/automations/install/route.ts` | Trial eligibility check; insert with trial fields when eligible; send Day 0 welcome email |
| Types | `lib/automations/base.ts` | `status` includes `'trial'`; `updateStatus` allows `'trial'` |
| Card | `components/automations/AutomationCard.tsx` | Marketplace: trial badge vs “no trial available”; installed: trial badge + “X days left” (moved out of marketplace block); `trialAlreadyUsed` prop |
| Dashboard | `app/dashboard/page.tsx` | Passes `trialEndsAt` to cards |
| Detail | `app/dashboard/automations/[id]/page.tsx` | Trial banner, “Add Payment Method” link |
| Webhooks | `app/api/webhooks/shopify/route.ts` | Deliver to automations with `status IN ('active','trial')` |
| Cron | `app/api/cron/route.ts` | Scheduled runs: `.in('status', ['active','trial'])` |
| Trial cron | `app/api/cron/trial/route.ts` | Expire trials (pause + email); send reminder; user email via `auth.admin.getUserById`; automation name from `automations` table |
| Emails | `lib/email/trial.ts` | `sendTrialStartedEmail`, `sendTrialReminderEmail`, `sendTrialEndedEmail` |
| Marketplace | `app/marketplace/page.tsx` | Fetch user’s trialed automation IDs; pass `trialAlreadyUsed` to cards |

---

## Manual review / follow-up

1. **Trial end → paid conversion**  
   Spec: if user has payment method at trial end, auto-convert to paid and charge.  
   Current: trial cron only pauses and sends “trial ended” email.  
   **Action:** Implement Stripe (or existing billing) flow: on trial end, if payment method exists, create/charge subscription and set `status = 'active'`; otherwise keep current pause + email.

2. **“Add Payment Method” link**  
   Links to `/dashboard/settings`. That page may not exist or may not have billing.  
   **Action:** Add a real settings/billing page or point the link to your Stripe customer portal / billing URL.

3. **Trial cron scheduling**  
   **Action:** Schedule daily calls to `GET/POST /api/cron/trial` (e.g. Vercel Cron or external cron) with `CRON_SECRET` in `Authorization: Bearer <secret>` or `?secret=<CRON_SECRET>`.

4. **Reminder timing**  
   Cron sends “2 days left” when `trial_ends_at` is within the next 2 days. That approximates “Day 5” (2 days before Day 7). If you want exactly “Day 5”, narrow the window (e.g. 2–2.5 days before end).

5. **Run migration**  
   **Action:** Apply `supabase/migrations/add_pricing_and_trial.sql` to your Supabase project if not already applied.

6. **Env**  
   Ensure `CRON_SECRET` and email (Resend/SMTP) env vars are set so trial cron and emails work in production.

---

## Quick verification

- **Pricing:** Query `automations` and confirm `price_monthly` for each slug matches the table above.
- **Trial install:** Install an automation while logged in → new row has `status = 'trial'`, `trial_ends_at` in 7 days; welcome email sent.
- **Marketplace:** Logged-in user who already trialed an automation sees “no trial available” for that card.
- **Dashboard:** Trial automation shows “Trial” and “X days left in trial”.
- **Cron:** Call `/api/cron/trial` with secret → expired trials paused and emails sent; reminders sent for trials ending in ~2 days.
