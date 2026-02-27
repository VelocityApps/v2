# VelocityApps To-Do List

**Last Updated:** 2026-01-10  
**Status:** Development & Launch Preparation | Design System Complete, Brand Migration In Progress

---

## 🎨 Recent Progress (2026-01-10)

### ✅ Design System & Branding - COMPLETED
- [x] **Complete design system documentation** (`/docs/design/design-system.md`)
  - Brand identity, color palette (#00bcd4 to #32cd32 gradient)
  - Typography system, component library, layouts
- [x] **Brand colors updated** - Landing page, Navigation component
- [x] **Logo updated** - Circular gradient design across all components
- [x] **Status documentation** - Build status document created

### 🔄 In Progress
- [ ] Complete color migration for remaining components
- [ ] Build reusable component library (Button, Card, Input, Badge, etc.)

**See `/docs/WEBSITE_PLATFORM_STATUS.md` for detailed status**

---

## 🔴 Critical (Do First)

### 1. Database Migrations
- [ ] Run `add_support_tickets_table.sql` in Supabase SQL Editor
- [ ] Run `add_monitoring_event_types.sql` in Supabase SQL Editor
- [ ] Verify tables created successfully
- [ ] Test support ticket creation in UI

**Files:**
- `supabase/migrations/add_support_tickets_table.sql`
- `supabase/migrations/add_monitoring_event_types.sql`

**Time:** 10 minutes

---

### 2. SMTP Configuration
- [ ] Set up Gmail App Password (or other SMTP provider)
- [ ] Add SMTP env variables to `.env.local`:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
  - `SUPPORT_ALERT_EMAILS`
- [ ] Restart dev server
- [ ] Test email sending (support ticket notification)

**Time:** 15 minutes

---

### 3. Shopify OAuth Setup
- [ ] Create Shopify Partner account (if not exists)
- [ ] Create new app in Shopify Partner dashboard
- [ ] Configure OAuth redirect URIs:
  - `http://localhost:3000/api/auth/shopify/callback` (dev)
  - `https://yourdomain.com/api/auth/shopify/callback` (prod)
- [ ] Get `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`
- [ ] Generate `SHOPIFY_WEBHOOK_SECRET`
- [ ] Add to `.env.local`:
  - `SHOPIFY_CLIENT_ID`
  - `SHOPIFY_CLIENT_SECRET`
  - `SHOPIFY_WEBHOOK_SECRET`
- [ ] Test OAuth flow end-to-end (authorize store, verify connection)

**Time:** 30 minutes

---

## 🟠 High Priority (Next)

### 4. Testing
- [ ] Test support ticket system:
  - Create ticket via UI (user menu → Support)
  - Verify email sent to support
  - Verify email sent to user
  - Check database entry
- [ ] Test error alert system:
  - Trigger test automation failure
  - Verify alert email sent
  - Check `/api/admin/error-alerts` endpoint
- [ ] Test Shopify OAuth:
  - Authorize test store
  - Verify token exchange
  - Test webhook registration
  - Confirm store connection works

**Time:** 30 minutes

---

### 5. Vercel Cron Setup
- [ ] Create `/api/cron` route (if not exists)
- [ ] Generate `CRON_SECRET` (random string)
- [ ] Add `CRON_SECRET` to `.env.local`
- [ ] Add `CRON_SECRET` to Vercel environment variables
- [ ] Configure cron job in Vercel dashboard:
  - Path: `/api/cron`
  - Schedule: `0 * * * *` (hourly)
- [ ] Test cron endpoint (manual trigger)

**Time:** 20 minutes

---

## 🟡 Medium Priority (Before Launch)

### 6. Stripe Integration
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
- [ ] Add subscription columns to `user_automations` table:
  - `subscription_tier` (free, pro, business, agency)
  - `subscription_id` (Stripe subscription ID)
  - `subscription_status` (active, canceled, past_due)
  - `billing_period` (monthly, annual)
  - `executions_used` (current period)
  - `executions_limit` (based on tier)
- [ ] Test subscription flow (create, upgrade, downgrade, cancel)

**Time:** 2 hours

---

### 7. Pricing Page
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

### 8. Upgrade Flow
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

### 9. Support System Setup
- [ ] Choose ticketing system (Help Scout, Intercom, or Zendesk)
- [ ] Configure `support@velocityapps.dev` email
- [ ] Set up auto-responder (receipt only, "We'll respond within 2 hours")
- [ ] Create knowledge base (`docs.velocityapps.dev` or `/docs`)
- [ ] Set up monitoring alerts (Slack #support-alerts channel)
- [ ] Configure support metrics dashboard

**Time:** 2 hours

---

### 10. Onboarding Email Sequences
- [ ] Welcome email (Day 0 - immediate)
- [ ] Activation confirmation (Day 0-1 - after activation)
- [ ] First results celebration (Day 1-7 - after first execution)
- [ ] 7-day check-in (Day 7 - engagement)
- [ ] Monthly report (Day 30 - results summary)
- [ ] Set up email automation (Resend, Mailchimp, or similar)
- [ ] Test email sequences

**Time:** 3 hours

---

## 🟢 Lower Priority (Before Launch)

### 11. Status Page
- [ ] Build `status.velocityapps.dev`
- [ ] Show automation health (all operational, degraded, down)
- [ ] Incident history (transparent)
- [ ] Planned maintenance section
- [ ] Subscribe for updates (SMS, email, Slack)
- [ ] Auto-update from monitoring system

**Time:** 4 hours

---

### 12. Documentation Site
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

### 13. Theme Compatibility Testing
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

### 14. Automation Quality Checklist
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

## 🚀 Launch Preparation

### 15. Beta Testing
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

### 16. Launch Content Creation
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

### 17. Pre-Launch Final Testing
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

## 📊 Quick Reference

### Time Estimates

| Task | Time |
|------|------|
| Critical (migrations, SMTP, OAuth) | 1 hour |
| High Priority (testing, cron) | 1 hour |
| Medium Priority (Stripe, pricing, support) | 11 hours |
| Lower Priority (status page, docs, testing) | 28 hours |
| Launch Prep (beta, content, testing) | 43 hours |
| **Total** | **~84 hours** |

### Priority Order

1. **Database migrations** (10 min) - Enable support tickets
2. **SMTP configuration** (15 min) - Enable email alerts
3. **Shopify OAuth** (30 min) - Core functionality
4. **Testing** (30 min) - Verify everything works
5. **Vercel Cron** (20 min) - Scheduled automations
6. **Stripe integration** (2 hours) - Payments
7. **Pricing page** (3 hours) - Monetization
8. **Upgrade flow** (4 hours) - Conversions
9. **Support system** (2 hours) - Customer experience
10. **Onboarding emails** (3 hours) - Activation
11. **Status page** (4 hours) - Transparency
12. **Documentation** (6 hours) - Self-service
13. **Theme testing** (8 hours) - Compatibility
14. **Quality checklist** (10 hours) - Launch readiness
15. **Beta testing** (20 hours) - Feedback & testimonials
16. **Launch content** (15 hours) - Marketing
17. **Final testing** (8 hours) - Launch readiness

---

## ✅ Completed (Recently)

- ✅ Comprehensive documentation created:
  - Research (competitor analysis, winning strategies, market opportunities)
  - Technical architecture
  - Business (pricing strategy)
  - Marketing (launch plan, growth strategy, content strategy)
  - Operations (support playbook, incident response, onboarding)
- ✅ Support ticket system implemented
- ✅ Error monitoring system implemented
- ✅ Email alert system implemented (needs SMTP config)
- ✅ Security improvements (token encryption, input validation)
- ✅ "What Makes Us Different" landing page section
- ✅ Dev server fixed (Sentry removed, optional for future)

---

## 📝 Notes

### Environment Variables Needed

```env
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

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel Cron
CRON_SECRET=random_secret_string

# Sentry (optional, when Next.js 16 supported)
SENTRY_DSN=...
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Quick Start Tomorrow

1. **Run migrations** (10 min)
   - Supabase SQL Editor → Run `add_support_tickets_table.sql`
   - Supabase SQL Editor → Run `add_monitoring_event_types.sql`

2. **Configure SMTP** (15 min)
   - Get Gmail App Password
   - Add to `.env.local`
   - Restart dev server

3. **Configure Shopify OAuth** (30 min)
   - Create Shopify app
   - Get credentials
   - Add to `.env.local`

4. **Test everything** (30 min)
   - Test support tickets
   - Test error alerts
   - Test Shopify OAuth

**Total: ~1.5 hours to get fully operational**

---

**Next Review:** Weekly (update based on progress)

