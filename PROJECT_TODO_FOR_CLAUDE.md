# VelocityApps Project - To-Do List for Planning

**Last Updated:** 2026-01-10  
**Project:** VelocityApps - Shopify Automation Platform  
**Status:** Development & Launch Preparation

---

## 🔴 Critical Priority (Do First - ~1.5 hours)

### 1. Database Migrations
- [ ] Run `supabase/migrations/add_support_tickets_table.sql` in Supabase SQL Editor
- [ ] Run `supabase/migrations/add_monitoring_event_types.sql` in Supabase SQL Editor
- [ ] Verify `support_tickets` table created successfully
- [ ] Verify `monitoring_events` table updated with new event types
- [ ] Test support ticket creation in UI

**Files:**
- `supabase/migrations/add_support_tickets_table.sql`
- `supabase/migrations/add_monitoring_event_types.sql`

**Time:** 10 minutes

---

### 2. SMTP Configuration
- [ ] Set up Gmail App Password (or other SMTP provider)
- [ ] Add SMTP environment variables to `.env.local`:
  - `SMTP_HOST=smtp.gmail.com`
  - `SMTP_PORT=587`
  - `SMTP_USER=your_email@gmail.com`
  - `SMTP_PASS=your_app_password`
  - `SMTP_FROM="VelocityApps <support@velocityapps.dev>"`
  - `SUPPORT_ALERT_EMAILS=alerts@velocityapps.dev`
- [ ] Restart dev server
- [ ] Test email sending (support ticket notification)
- [ ] Test error alert email system

**Time:** 15 minutes

---

### 3. Shopify OAuth Setup
- [ ] Create Shopify Partner account (if not exists): https://partners.shopify.com
- [ ] Create new app in Shopify Partner dashboard
- [ ] Configure OAuth redirect URIs:
  - `http://localhost:3000/api/auth/shopify/callback` (dev)
  - `https://yourdomain.com/api/auth/shopify/callback` (prod)
- [ ] Set required scopes: `read_products`, `write_products`, `read_orders`, `read_inventory`, `write_inventory`
- [ ] Get `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`
- [ ] Generate `SHOPIFY_WEBHOOK_SECRET` (random 32-char string)
- [ ] Add to `.env.local`:
  - `SHOPIFY_CLIENT_ID`
  - `SHOPIFY_CLIENT_SECRET`
  - `SHOPIFY_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- [ ] Test OAuth flow end-to-end (authorize store, verify connection, test webhook registration)

**Time:** 30 minutes

---

### 4. Testing Critical Systems
- [ ] Test support ticket system:
  - Create ticket via UI (user menu → Support)
  - Verify email sent to support team
  - Verify confirmation email sent to user
  - Check database entry in `support_tickets` table
- [ ] Test error alert system:
  - Trigger test automation failure
  - Verify alert email sent to `SUPPORT_ALERT_EMAILS`
  - Check `/api/admin/error-alerts` endpoint returns errors
- [ ] Test Shopify OAuth:
  - Authorize test store
  - Verify token exchange works
  - Test webhook registration
  - Confirm store connection appears in dashboard

**Time:** 30 minutes

---

## 🟠 High Priority (Next - ~1 hour)

### 5. Vercel Cron Setup
- [ ] Create `/api/cron` route (if not exists) - check `app/api/cron/route.ts`
- [ ] Generate `CRON_SECRET` (random secure string)
- [ ] Add `CRON_SECRET` to `.env.local`
- [ ] Add `CRON_SECRET` to Vercel environment variables (production)
- [ ] Configure cron job in Vercel dashboard:
  - Path: `/api/cron?secret=YOUR_SECRET`
  - Schedule: `0 * * * *` (hourly) or `0 0 * * *` (daily)
- [ ] Test cron endpoint manually (curl with secret)
- [ ] Verify scheduled automations run (Best Sellers Collection)

**Time:** 20 minutes

---

### 6. Optional: Sentry Setup (When Next.js 16 Supported)
- [ ] Create Sentry account (if not exists)
- [ ] Create new project in Sentry dashboard
- [ ] Get `SENTRY_DSN`
- [ ] Add to `.env.local`:
  - `SENTRY_DSN=your_dsn_here`
  - `SENTRY_TRACES_SAMPLE_RATE=0.1`
- [ ] Verify Sentry integration works (test error)

**Time:** 15 minutes  
**Note:** Currently optional - Next.js 16 support may be needed

---

## 🟡 Medium Priority (Before Launch - ~11 hours)

### 7. Complete Skeleton Automations

#### 7a. Review Request Automator
**Location:** `lib/automations/review-request-automator/index.ts`

- [ ] Implement email sending logic (use Resend, SendGrid, or similar)
- [ ] Add AI-personalized subject line generation
- [ ] Set up email template system
- [ ] Add tracking for open/click rates
- [ ] Test with real Shopify order data
- [ ] Handle edge cases (no email, invalid order, customer already reviewed)
- [ ] Add conversion tracking (review received)

**Time:** 2-3 hours

---

#### 7b. Low Stock Alerts
**Location:** `lib/automations/low-stock-alerts/index.ts`

- [ ] Implement inventory monitoring logic
- [ ] Add Slack webhook integration
- [ ] Add email notification option
- [ ] Set up per-product threshold checking
- [ ] Add daily digest option (batch alerts)
- [ ] Calculate sales velocity
- [ ] Test with real inventory data

**Time:** 2-3 hours

---

#### 7c. Abandoned Cart Recovery
**Location:** `lib/automations/abandoned-cart-recovery/index.ts`

- [ ] Implement 3-email sequence logic
- [ ] Add timing configuration (1hr, 24hr, 72hr)
- [ ] Create email templates (with discount codes)
- [ ] Add AI-personalized message generation
- [ ] Track conversion rates
- [ ] Handle cart recovery (mark as recovered, cancel remaining emails)
- [ ] Test with real abandoned carts

**Time:** 3-4 hours

---

#### 7d. Best Sellers Collection
**Location:** `lib/automations/best-sellers-collection/index.ts`

- [ ] Implement sales data aggregation
- [ ] Query Shopify orders API for sales data
- [ ] Calculate best sellers by revenue/quantity
- [ ] Create/update Shopify collection automatically
- [ ] Set up scheduled execution (weekly/daily) - requires cron
- [ ] Test collection updates
- [ ] Handle edge cases (no sales, collection already exists)

**Time:** 2-3 hours

---

### 8. Stripe Integration
- [ ] Create Stripe account (if not exists)
- [ ] Create products in Stripe Dashboard:
  - Pro (£29/month, £290/year)
  - Business (£79/month, £792/year)
  - Agency (£199/month, £1,992/year)
- [ ] Get price IDs for each product (monthly & annual)
- [ ] Configure Stripe webhooks:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Add subscription columns to `user_automations` table (if needed):
  - `subscription_tier` (free, pro, business, agency)
  - `subscription_id` (Stripe subscription ID)
  - `subscription_status` (active, canceled, past_due)
  - `billing_period` (monthly, annual)
  - `executions_used` (current period)
  - `executions_limit` (based on tier)
- [ ] Test subscription flow (create, upgrade, downgrade, cancel)
- [ ] Add Stripe webhook handler (`/api/webhooks/stripe`)

**Time:** 2 hours

---

### 9. Pricing Page
- [ ] Design pricing page layout (4 tiers: Free, Pro, Business, Agency)
- [ ] Create `PricingTier` component
- [ ] Add monthly/annual toggle
- [ ] Implement Stripe checkout integration
- [ ] Add social proof ("Join 500+ merchants")
- [ ] Add FAQ section
- [ ] Mobile responsive design
- [ ] Test on different screen sizes

**Files:**
- `app/pricing/page.tsx`
- `components/pricing/PricingTier.tsx`
- `components/pricing/PriceToggle.tsx`

**Time:** 3 hours

---

### 10. Upgrade Flow
- [ ] Create upgrade prompts:
  - Execution limit reached (show at 80% of limit)
  - Try 2nd automation (show when attempting to activate 2nd)
  - After 30 days free (email + in-app banner)
- [ ] Build `/api/billing/upgrade` endpoint (create Stripe checkout session)
- [ ] Build `/api/billing/downgrade` endpoint (change subscription tier)
- [ ] Build `/api/billing/cancel` endpoint (cancel subscription)
- [ ] Handle Stripe webhooks (subscription events)
- [ ] Create success/cancel pages (`/pricing/success`, `/pricing/canceled`)
- [ ] Test upgrade/downgrade flow end-to-end

**Time:** 4 hours

---

## 🟢 Lower Priority (Before Launch - ~28 hours)

### 11. Support System Setup
- [ ] Choose ticketing system (Help Scout, Intercom, or Zendesk)
- [ ] Configure `support@velocityapps.dev` email
- [ ] Set up auto-responder (receipt only, "We'll respond within 2 hours")
- [ ] Create knowledge base (`docs.velocityapps.dev` or `/docs`)
- [ ] Set up monitoring alerts (Slack #support-alerts channel)
- [ ] Configure support metrics dashboard

**Time:** 2 hours

---

### 12. Onboarding Email Sequences
- [ ] Welcome email (Day 0 - immediate)
- [ ] Activation confirmation (Day 0-1 - after activation)
- [ ] First results celebration (Day 1-7 - after first execution)
- [ ] 7-day check-in (Day 7 - engagement)
- [ ] Monthly report (Day 30 - results summary)
- [ ] Set up email automation (Resend, Mailchimp, or similar)
- [ ] Test email sequences

**Time:** 3 hours

---

### 13. Status Page
- [ ] Build `status.velocityapps.dev` (or `/status`)
- [ ] Show automation health (all operational, degraded, down)
- [ ] Incident history (transparent)
- [ ] Planned maintenance section
- [ ] Subscribe for updates (SMS, email, Slack)
- [ ] Auto-update from monitoring system

**Time:** 4 hours

---

### 14. Documentation Site
- [ ] Build `docs.velocityapps.dev` (or `/docs` on main site)
- [ ] Migrate automation documentation:
  - Pinterest Stock Sync
  - Review Request Automator
  - Low Stock Alerts
  - Abandoned Cart Recovery
  - Best Sellers Collection
- [ ] Add video tutorials (1 per automation)
- [ ] Implement search functionality
- [ ] Add FAQ section
- [ ] Mobile responsive design

**Time:** 6 hours

---

### 15. Theme Compatibility Testing
- [ ] Set up 10+ test Shopify stores (different themes)
- [ ] Test each automation on each theme:
  - Pinterest Stock Sync
  - Review Request Automator
  - Low Stock Alerts
  - Abandoned Cart Recovery
  - Best Sellers Collection
- [ ] Document any issues found
- [ ] Fix compatibility issues
- [ ] Create compatibility matrix (which themes work best)

**Themes to Test:**
- Dawn (default Shopify theme)
- Debut
- Brooklyn
- Minimal
- Supply
- Impulse
- Prestige
- Empire
- Narrative
- 10+ more popular themes

**Time:** 8 hours

---

### 16. Automation Quality Checklist
- [ ] Create checklist template for each automation
- [ ] Test Pinterest Stock Sync:
  - [ ] Product goes OOS → Pin created
  - [ ] Product back in stock → Pin updated/removed
  - [ ] Pinterest API failures → Queued for retry
  - [ ] Invalid board name → Auto-creates board
  - [ ] Multiple products OOS → All pinned
  - [ ] Works with different themes
- [ ] Test Review Request Automator:
  - [ ] Order fulfilled → Email sent after delay
  - [ ] Email subject line personalized
  - [ ] Review link works
  - [ ] Conversion tracked
  - [ ] Customer already reviewed → Skips
- [ ] Test Low Stock Alerts:
  - [ ] Inventory < threshold → Alert sent
  - [ ] Alert includes product details
  - [ ] Sales velocity calculated correctly
  - [ ] Daily digest mode works
- [ ] Test Abandoned Cart Recovery:
  - [ ] Cart abandoned → Email 1 sent (1 hour)
  - [ ] Email 2 sent (24 hours) with discount
  - [ ] Email 3 sent (72 hours) with larger discount
  - [ ] Customer completes purchase → Remaining emails cancelled
- [ ] Test Best Sellers Collection:
  - [ ] Collection created automatically
  - [ ] Products added based on sales data
  - [ ] Products removed when sales drop
  - [ ] Updates on schedule (daily/weekly/monthly)
- [ ] Mark each automation as "Ready" or "Needs Work"

**Time:** 10 hours

---

## 🚀 Launch Preparation (~43 hours)

### 17. Beta Testing
- [ ] Recruit 20 beta testers:
  - Post on r/shopify, r/ecommerce
  - Twitter announcement
  - LinkedIn post
  - Indie Hackers
  - Personal network
- [ ] Beta offer: Free Pro (3 months) + lifetime 50% discount
- [ ] Send onboarding emails to beta users
- [ ] Collect feedback (survey after 7 days)
- [ ] Get 10+ testimonials
- [ ] Create case studies (5+)

**Time:** 20 hours (spread over 2 weeks)

---

### 18. Launch Content Creation
- [ ] Product Hunt post (write, design thumbnail)
- [ ] Twitter launch thread (10-15 tweets)
- [ ] Reddit posts (5 subreddits: r/shopify, r/ecommerce, r/SaaS, r/Entrepreneur, r/startups)
- [ ] Demo video (2-minute overview)
- [ ] 5 automation explainer videos (60s each)
- [ ] Marketing assets:
  - Product Hunt thumbnail (240x240)
  - Twitter share card (1200x628)
  - LinkedIn post image
  - Screenshot/GIF library (20+ visuals)
- [ ] Press kit (logo, screenshots, description, founder bio)

**Time:** 15 hours

---

### 19. Pre-Launch Final Testing
- [ ] Test all 5 automations on 10+ themes
- [ ] Verify payment flow (Stripe subscriptions)
- [ ] Test support system (create ticket, verify emails)
- [ ] Load testing (handle 1,000 concurrent users)
- [ ] Error monitoring (Sentry or internal system)
- [ ] Backup systems tested
- [ ] Rollback plan documented
- [ ] All environment variables set in production
- [ ] Database migrations run in production
- [ ] SSL certificates valid
- [ ] Domain configured (if custom domain)

**Time:** 8 hours

---

## 📋 Quick Wins (Can Do Anytime)

- [ ] Update README.md with new product description
- [ ] Remove old "AI app builder" references in docs
- [ ] Add more automations to marketplace (ideas in seed data)
- [ ] Improve error messages (make them user-friendly)
- [ ] Add retry logic for failed webhook operations
- [ ] Add analytics tracking (optional)
- [ ] Create demo video or screenshots
- [ ] Add toast notifications (react-hot-toast)
- [ ] Improve loading states (skeletons, spinners)
- [ ] Add admin authentication to `/api/admin/*` routes

---

## 📊 Time Estimates Summary

| Priority | Tasks | Total Time |
|----------|-------|------------|
| 🔴 Critical | Migrations, SMTP, OAuth, Testing | ~1.5 hours |
| 🟠 High | Vercel Cron, Sentry (optional) | ~1 hour |
| 🟡 Medium | Automations, Stripe, Pricing, Upgrade | ~11 hours |
| 🟢 Lower | Support, Docs, Testing, Quality | ~28 hours |
| 🚀 Launch | Beta, Content, Final Testing | ~43 hours |
| **Total** | | **~84 hours** |

---

## 🎯 Recommended Order (Quick Start)

1. **Database migrations** (10 min) - Enable support tickets
2. **SMTP configuration** (15 min) - Enable email alerts
3. **Shopify OAuth** (30 min) - Core functionality
4. **Testing** (30 min) - Verify everything works
5. **Vercel Cron** (20 min) - Scheduled automations
6. **Complete automations** (10-12 hours) - Core product value
7. **Stripe integration** (2 hours) - Payments
8. **Pricing page** (3 hours) - Monetization
9. **Upgrade flow** (4 hours) - Conversions
10. **Everything else** - Polish and launch prep

---

## 📝 Environment Variables Checklist

```env
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# SMTP (for email alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="VelocityApps <support@velocityapps.dev>"
SUPPORT_ALERT_EMAILS=alerts@velocityapps.dev

# Shopify OAuth
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel Cron
CRON_SECRET=random_secret_string

# Sentry (optional, when Next.js 16 supported)
SENTRY_DSN=...
SENTRY_TRACES_SAMPLE_RATE=0.1

# Email Service (for automations - Resend, SendGrid, etc.)
RESEND_API_KEY=...
# OR
SENDGRID_API_KEY=...
```

---

## ✅ Recently Completed

- ✅ Support ticket system implemented
- ✅ Error monitoring system implemented
- ✅ Email alert system implemented (needs SMTP config)
- ✅ Security improvements (token encryption, input validation)
- ✅ Design system created
- ✅ Brand colors updated (teal to lime green gradient)
- ✅ Logo updated (circular gradient design)
- ✅ Landing page updated with new messaging
- ✅ Marketplace page built
- ✅ Automation monitoring system (`lib/automation-monitoring.ts`)

---

**Next Review:** Update based on progress
