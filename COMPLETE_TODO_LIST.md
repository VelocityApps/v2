# VelocityApps - Complete To-Do List

**Last Updated:** 2026-02-01  
**Status:** Day 1 Complete ✅ | Day 2 In Progress

---

## 🚨 LAUNCH BLOCKERS (MUST DO BEFORE LAUNCH)

**These are non-negotiable and must be completed before launch:**

### Security & Compliance
- ✅ **Encrypt Shopify tokens** - DONE (AES-256-GCM encryption in `lib/shopify/oauth.ts`)
- ✅ **Add RLS policies to Supabase** - DONE (RLS policies exist in migrations for all tables)
- ✅ **Terms of Service page** - DONE (`app/terms/page.tsx` - general terms)
- ✅ **Privacy Policy page** - DONE (`app/privacy/page.tsx` - general policy)

### Authentication
- ✅ **Email verification working** - DONE
  - ✅ Supabase "Confirm email" enabled (Sign In / Providers)
  - ✅ Email verification callback page (`app/auth/verify-email/page.tsx`)
  - ☐ Test verification flow: sign up → receive email → click link → verify (recommended before launch)
- ✅ **Password reset working** - DONE
  - ✅ Forgot password page (`app/auth/forgot-password/page.tsx`)
  - ✅ Reset password page (`app/auth/reset-password/page.tsx`) with expired-link handling
  - ✅ `resetPassword` / `updatePassword` in `AuthContext`
  - ☐ Test: request reset → receive email (Resend/Supabase) → click link → set new password

### Payments
- ✅ **Stripe webhooks exist** - DONE (`app/api/webhooks/stripe/route.ts`)
- ☐ **Stripe webhooks fully tested** - PENDING
  - ☐ Test `checkout.session.completed` webhook
  - ☐ Test `customer.subscription.updated` webhook
  - ☐ Test `customer.subscription.deleted` webhook
  - ☐ Test `invoice.payment_succeeded` webhook
  - ☐ Test `invoice.payment_failed` webhook
  - ☐ Verify webhook signature validation works
  - ☐ Test with Stripe CLI locally
  - ☐ Test with production webhook endpoint

### Automations
- ⚠️ **All 5 automations working on 3+ test stores** - PARTIAL
  - ✅ Pinterest Stock Sync - Fully functional
  - ☐ Review Request Automator - Skeleton only (needs implementation)
  - ☐ Low Stock Alerts - Skeleton only (needs implementation)
  - ☐ Abandoned Cart Recovery - Skeleton only (needs implementation)
  - ☐ Best Sellers Collection - Skeleton only (needs implementation)
  - ☐ Test Pinterest Stock Sync on 3+ different Shopify stores
  - ☐ Test each automation on 3+ different Shopify stores (after implementation)

### Monitoring & Support
- ☐ **Error monitoring (Sentry) active** - PENDING
  - ☐ Create Sentry account, set up project, add `SENTRY_DSN`, configure for Next.js, test & set alerts
- ⚠️ **Support email functional** - PARTIAL (Resend configured)
  - ✅ Resend configured (welcome email works, domain verified)
  - ☐ Wire support ticket flow to send via Resend (or existing `lib/email.ts` with SMTP)
  - ☐ Test support ticket and error alert emails

### Launch blocker status summary

| Blocker | Status |
|---------|--------|
| Encrypt Shopify tokens | ✅ Done |
| RLS policies (Supabase) | ✅ Done |
| Terms of Service page | ✅ Done |
| Privacy Policy page | ✅ Done |
| Email verification | ✅ Done |
| Password reset | ✅ Done |
| Stripe webhooks tested | ☐ Pending |
| 5 automations on 3+ stores | ⚠️ Partial |
| Sentry error monitoring | ☐ Pending |
| Support email | ⚠️ Partial (Resend done) |

---

## 📊 Summary

| Status | Count |
|--------|-------|
| ✅ Completed | 45+ |
| 🔄 In Progress | 3 |
| ☐ Pending | 120+ |
| 🚨 Launch Blockers | 10 (6 done, 2 partial, 2 pending) |

---

## ✅ COMPLETED TASKS

### Foundation & Setup
- ✅ Next.js 16 project setup
- ✅ Supabase database connection
- ✅ Database migrations (automations tables)
- ✅ Supabase client files (`lib/supabase.ts`, `lib/supabase-server.ts`)
- ✅ Environment variables configured (Supabase, Shopify OAuth)
- ✅ Test utilities created (`/test` page, test API routes)
- ✅ Email service code (`lib/email.ts` with sendEmail, sendTestEmail, sendWelcomeEmail)
- ✅ Toast notifications configured (react-hot-toast in layout)

### Authentication & OAuth
- ✅ Shopify OAuth routes (`/api/auth/shopify/authorize`, `/callback`, `/get-token`)
- ✅ Shopify OAuth library (`lib/shopify/oauth.ts`)
- ✅ Token encryption/decryption
- ✅ Webhook signature verification
- ✅ Shopify API client (`lib/shopify/client.ts`)

### Automations - Infrastructure
- ✅ Base automation class (`lib/automations/base.ts`)
- ✅ Automation registry system
- ✅ Webhook handling framework
- ✅ Automation logging system
- ✅ Automation monitoring (`lib/automation-monitoring.ts`)

### Automations - Implemented
- ✅ **Pinterest Stock Sync** - Fully functional
  - ✅ Pinterest API integration
  - ✅ Webhook handling for products/update
  - ✅ Pin creation/updates
  - ✅ Board management

### UI & Pages
- ✅ Landing page (`app/landing/page.tsx`)
- ✅ Marketplace page (`app/marketplace/page.tsx`)
- ✅ Dashboard page (`app/dashboard/page.tsx`)
- ✅ Automation detail pages (`app/automations/[slug]/page.tsx`)
- ✅ Navigation component (`components/Navigation.tsx`)
- ✅ Automation cards component
- ✅ Install modal component

### API Endpoints
- ✅ `/api/automations/install` - Install automation
- ✅ `/api/automations/[id]/pause` - Pause automation
- ✅ `/api/automations/[id]/resume` - Resume automation
- ✅ `/api/automations/[id]/configure` - Update configuration
- ✅ `/api/automations/[id]/remove` - Remove automation
- ✅ `/api/automations/[id]/metrics` - Get metrics
- ✅ `/api/webhooks/shopify` - Handle Shopify webhooks
- ✅ `/api/cron` - Cron job endpoint
- ✅ `/api/support/tickets` - Support tickets
- ✅ `/api/admin/error-alerts` - Error alerts
- ✅ `/api/admin/automation-metrics` - Admin metrics
- ✅ `/api/test/email` - Test email
- ✅ `/api/test/database` - Test database

### Design & Branding
- ✅ Design system documentation
- ✅ Brand colors (teal to lime green gradient)
- ✅ Logo updated (circular gradient design)
- ✅ Landing page updated with new messaging
- ✅ Navigation component styled

### Documentation
- ✅ Architecture documentation
- ✅ Automation documentation (Pinterest Stock Sync)
- ✅ Setup guides
- ✅ TODO lists and planning docs

---

## 🔄 IN PROGRESS

### Day 2 Testing
- 🔄 Test user authentication flow
- 🔄 Test Shopify OAuth connection
- 🔄 Test automation installation flow
- 🔄 Test dashboard functionality

### Design System
- 🔄 Complete color migration for remaining components
- 🔄 Build reusable component library (Button, Card, Input, Badge)

---

## ☐ PENDING TASKS

### 🔴 Critical Priority

> **⚠️ IMPORTANT:** See **🚨 LAUNCH BLOCKERS** section above for non-negotiable pre-launch requirements.

#### Database Migrations
- ☐ Run `supabase/migrations/add_support_tickets_table.sql` in Supabase SQL Editor
- ☐ Run `supabase/migrations/add_monitoring_event_types.sql` in Supabase SQL Editor
- ☐ Verify `support_tickets` table created successfully
- ☐ Verify `monitoring_events` table updated with new event types
- ☐ Test support ticket creation in UI

#### SMTP Configuration
- ☐ Set up Gmail App Password (or other SMTP provider)
- ☐ Add SMTP environment variables to `.env.local`:
  - `SMTP_HOST=smtp.gmail.com`
  - `SMTP_PORT=587`
  - `SMTP_USER=your_email@gmail.com`
  - `SMTP_PASS=your_app_password`
  - `SMTP_FROM="VelocityApps <support@velocityapps.dev>"`
  - `SUPPORT_ALERT_EMAILS=alerts@velocityapps.dev`
- ☐ Restart dev server
- ☐ Test email sending (support ticket notification)
- ☐ Test error alert email system

#### Shopify OAuth Testing
- ☐ Test OAuth flow end-to-end (authorize store, verify connection)
- ☐ Test webhook registration
- ☐ Verify token storage in database
- ☐ Test with production Shopify store

#### Testing Critical Systems
- ☐ Test support ticket system:
  - Create ticket via UI (user menu → Support)
  - Verify email sent to support team
  - Verify confirmation email sent to user
  - Check database entry in `support_tickets` table
- ☐ Test error alert system:
  - Trigger test automation failure
  - Verify alert email sent to `SUPPORT_ALERT_EMAILS`
  - Check `/api/admin/error-alerts` endpoint returns errors

#### Legal Pages (Launch Blocker)
- ☐ Create Terms of Service page (`app/terms/page.tsx`)
  - Include service description
  - User obligations
  - Payment terms
  - Limitation of liability
  - Dispute resolution
  - Last updated date
- ☐ Create Privacy Policy page (`app/privacy/page.tsx`)
  - Data collection practices
  - How data is used
  - Data sharing policies
  - User rights (GDPR compliance)
  - Cookie policy
  - Contact information
- ☐ Add links to Terms and Privacy in footer
- ☐ Add links to Terms and Privacy in signup flow
- ☐ Review with legal counsel (if possible)

**Time:** 2 hours

---

#### Email Verification (Launch Blocker)
- ☐ Enable email verification in Supabase Dashboard
  - Go to Authentication → Settings
  - Enable "Email confirmations"
  - Configure email templates
- ☐ Create email verification callback page (`app/auth/verify-email/page.tsx`)
  - Handle verification token
  - Show success/error states
  - Redirect to dashboard after verification
- ☐ Update signup flow to handle email verification
- ☐ Test email verification flow:
  - Sign up new user
  - Check email for verification link
  - Click verification link
  - Verify user is activated
- ☐ Add "Resend verification email" functionality

**Time:** 1 hour

---

#### Password Reset (Launch Blocker)
- ☐ Create forgot password page (`app/auth/forgot-password/page.tsx`)
  - Email input form
  - Submit button
  - Success message
  - Link back to login
- ☐ Create password reset page (`app/auth/reset-password/page.tsx`)
  - Token validation
  - New password form
  - Confirm password field
  - Submit button
  - Success/error states
- ☐ Add password reset functionality to `AuthContext.tsx`:
  - `resetPassword(email)` function
  - `updatePassword(newPassword, token)` function
- ☐ Test password reset flow:
  - Request password reset
  - Check email for reset link
  - Click reset link
  - Enter new password
  - Verify password changed
  - Test login with new password
- ☐ Add "Forgot password?" link to login page

**Time:** 2 hours

---

### 🟠 High Priority

#### Vercel Cron Setup
- ☐ Generate `CRON_SECRET` (random secure string)
- ☐ Add `CRON_SECRET` to `.env.local`
- ☐ Add `CRON_SECRET` to Vercel environment variables (production)
- ☐ Configure cron job in Vercel dashboard:
  - Path: `/api/cron?secret=YOUR_SECRET`
  - Schedule: `0 * * * *` (hourly) or `0 0 * * *` (daily)
- ☐ Test cron endpoint manually (curl with secret)
- ☐ Verify scheduled automations run (Best Sellers Collection)

#### Optional: Sentry Setup
- ☐ Create Sentry account (if not exists)
- ☐ Create new project in Sentry dashboard
- ☐ Get `SENTRY_DSN`
- ☐ Add to `.env.local`:
  - `SENTRY_DSN=your_dsn_here`
  - `SENTRY_TRACES_SAMPLE_RATE=0.1`
- ☐ Verify Sentry integration works (test error)
- **Note:** Currently optional - Next.js 16 support may be needed

---

### 🟡 Medium Priority - Automations

#### Review Request Automator
**Location:** `lib/automations/review-request-automator/index.ts`

- ☐ Implement email sending logic (use Resend, SendGrid, or similar)
- ☐ Add AI-personalized subject line generation
- ☐ Set up email template system
- ☐ Add tracking for open/click rates
- ☐ Test with real Shopify order data
- ☐ Handle edge cases (no email, invalid order, customer already reviewed)
- ☐ Add conversion tracking (review received)
- ☐ Implement delay logic (days_after_delivery)
- ☐ Generate review links
- ☐ Track email opens/clicks

**Time:** 2-3 hours

---

#### Low Stock Alerts
**Location:** `lib/automations/low-stock-alerts/index.ts`

- ☐ Implement inventory monitoring logic
- ☐ Add Slack webhook integration
- ☐ Add email notification option
- ☐ Set up per-product threshold checking
- ☐ Add daily digest option (batch alerts)
- ☐ Calculate sales velocity
- ☐ Test with real inventory data
- ☐ Handle inventory_levels/update webhook
- ☐ Alert formatting (product details, current stock, threshold)

**Time:** 2-3 hours

---

#### Abandoned Cart Recovery
**Location:** `lib/automations/abandoned-cart-recovery/index.ts`

- ☐ Implement 3-email sequence logic
- ☐ Add timing configuration (1hr, 24hr, 72hr)
- ☐ Create email templates (with discount codes)
- ☐ Add AI-personalized message generation
- ☐ Track conversion rates
- ☐ Handle cart recovery (mark as recovered, cancel remaining emails)
- ☐ Test with real abandoned carts
- ☐ Implement cart tracking (carts/create webhook)
- ☐ Schedule email delivery
- ☐ Generate discount codes
- ☐ Track email performance

**Time:** 3-4 hours

---

#### Best Sellers Collection
**Location:** `lib/automations/best-sellers-collection/index.ts`

- ☐ Implement sales data aggregation
- ☐ Query Shopify orders API for sales data
- ☐ Calculate best sellers by revenue/quantity
- ☐ Create/update Shopify collection automatically
- ☐ Set up scheduled execution (weekly/daily) - requires cron
- ☐ Test collection updates
- ☐ Handle edge cases (no sales, collection already exists)
- ☐ Implement collection size configuration
- ☐ Update frequency configuration

**Time:** 2-3 hours

---

### 🟡 Medium Priority - Billing & Payments

#### Stripe Integration
- ☐ Create Stripe account (if not exists)
- ☐ Create products in Stripe Dashboard:
  - Pro (£29/month, £290/year)
  - Business (£79/month, £792/year)
  - Agency (£199/month, £1,992/year)
- ☐ Get price IDs for each product (monthly & annual)
- ☐ Configure Stripe webhooks:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- ☐ Add subscription columns to `user_automations` table (if needed):
  - `subscription_tier` (free, pro, business, agency)
  - `subscription_id` (Stripe subscription ID)
  - `subscription_status` (active, canceled, past_due)
  - `billing_period` (monthly, annual)
  - `executions_used` (current period)
  - `executions_limit` (based on tier)
- ☐ Test subscription flow (create, upgrade, downgrade, cancel)
- ☐ Add Stripe webhook handler (`/api/webhooks/stripe`)

**Time:** 2 hours

---

#### Pricing Page
- ☐ Design pricing page layout (4 tiers: Free, Pro, Business, Agency)
- ☐ Create `PricingTier` component
- ☐ Add monthly/annual toggle
- ☐ Implement Stripe checkout integration
- ☐ Add social proof ("Join 500+ merchants")
- ☐ Add FAQ section
- ☐ Mobile responsive design
- ☐ Test on different screen sizes

**Files:**
- `app/pricing/page.tsx`
- `components/pricing/PricingTier.tsx`
- `components/pricing/PriceToggle.tsx`

**Time:** 3 hours

---

#### Upgrade Flow
- ☐ Create upgrade prompts:
  - Execution limit reached (show at 80% of limit)
  - Try 2nd automation (show when attempting to activate 2nd)
  - After 30 days free (email + in-app banner)
- ☐ Build `/api/billing/upgrade` endpoint (create Stripe checkout session)
- ☐ Build `/api/billing/downgrade` endpoint (change subscription tier)
- ☐ Build `/api/billing/cancel` endpoint (cancel subscription)
- ☐ Handle Stripe webhooks (subscription events)
- ☐ Create success/cancel pages (`/pricing/success`, `/pricing/canceled`)
- ☐ Test upgrade/downgrade flow end-to-end

**Time:** 4 hours

---

### 🟡 Medium Priority - UX Improvements

#### Loading States
- ☐ Add loading spinners to all async operations
- ☐ Add skeleton loaders for marketplace
- ☐ Add skeleton loaders for dashboard
- ☐ Disable buttons during operations
- ☐ Add progress indicators where appropriate

**Time:** 1-2 hours

---

#### Error Handling
- ☐ Improve error messages (make them user-friendly)
- ☐ Add retry logic for failed webhook operations
- ☐ Add global error boundary component
- ☐ Create error pages (404, 500, etc.)
- ☐ Add offline state handling

**Time:** 2-3 hours

---

### 🟢 Lower Priority - Support & Operations

#### Support System Setup
- ☐ Choose ticketing system (Help Scout, Intercom, or Zendesk)
- ☐ Configure `support@velocityapps.dev` email
- ☐ Set up auto-responder (receipt only, "We'll respond within 2 hours")
- ☐ Create knowledge base (`docs.velocityapps.dev` or `/docs`)
- ☐ Set up monitoring alerts (Slack #support-alerts channel)
- ☐ Configure support metrics dashboard

**Time:** 2 hours

---

#### Onboarding Email Sequences
- ☐ Welcome email (Day 0 - immediate)
- ☐ Activation confirmation (Day 0-1 - after activation)
- ☐ First results celebration (Day 1-7 - after first execution)
- ☐ 7-day check-in (Day 7 - engagement)
- ☐ Monthly report (Day 30 - results summary)
- ☐ Set up email automation (Resend, Mailchimp, or similar)
- ☐ Test email sequences

**Time:** 3 hours

---

#### Status Page
- ☐ Build `status.velocityapps.dev` (or `/status`)
- ☐ Show automation health (all operational, degraded, down)
- ☐ Incident history (transparent)
- ☐ Planned maintenance section
- ☐ Subscribe for updates (SMS, email, Slack)
- ☐ Auto-update from monitoring system

**Time:** 4 hours

---

#### Documentation Site
- ☐ Build `docs.velocityapps.dev` (or `/docs` on main site)
- ☐ Migrate automation documentation:
  - Pinterest Stock Sync
  - Review Request Automator
  - Low Stock Alerts
  - Abandoned Cart Recovery
  - Best Sellers Collection
- ☐ Add video tutorials (1 per automation)
- ☐ Implement search functionality
- ☐ Add FAQ section
- ☐ Mobile responsive design

**Time:** 6 hours

---

### 🟢 Lower Priority - Testing & Quality

#### Theme Compatibility Testing
- ☐ Set up 10+ test Shopify stores (different themes)
- ☐ Test each automation on each theme:
  - Pinterest Stock Sync
  - Review Request Automator
  - Low Stock Alerts
  - Abandoned Cart Recovery
  - Best Sellers Collection
- ☐ Document any issues found
- ☐ Fix compatibility issues
- ☐ Create compatibility matrix (which themes work best)

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

#### Automation Quality Checklist
- ☐ Create checklist template for each automation
- ☐ Test Pinterest Stock Sync:
  - ☐ Product goes OOS → Pin created
  - ☐ Product back in stock → Pin updated/removed
  - ☐ Pinterest API failures → Queued for retry
  - ☐ Invalid board name → Auto-creates board
  - ☐ Multiple products OOS → All pinned
  - ☐ Works with different themes
- ☐ Test Review Request Automator:
  - ☐ Order fulfilled → Email sent after delay
  - ☐ Email subject line personalized
  - ☐ Review link works
  - ☐ Conversion tracked
  - ☐ Customer already reviewed → Skips
- ☐ Test Low Stock Alerts:
  - ☐ Inventory < threshold → Alert sent
  - ☐ Alert includes product details
  - ☐ Sales velocity calculated correctly
  - ☐ Daily digest mode works
- ☐ Test Abandoned Cart Recovery:
  - ☐ Cart abandoned → Email 1 sent (1 hour)
  - ☐ Email 2 sent (24 hours) with discount
  - ☐ Email 3 sent (72 hours) with larger discount
  - ☐ Customer completes purchase → Remaining emails cancelled
- ☐ Test Best Sellers Collection:
  - ☐ Collection created automatically
  - ☐ Products added based on sales data
  - ☐ Products removed when sales drop
  - ☐ Updates on schedule (daily/weekly/monthly)
- ☐ Mark each automation as "Ready" or "Needs Work"

**Time:** 10 hours

---

### 🚀 Launch Preparation

#### Beta Testing
- ☐ Recruit 20 beta testers:
  - Post on r/shopify, r/ecommerce
  - Twitter announcement
  - LinkedIn post
  - Indie Hackers
  - Personal network
- ☐ Beta offer: Free Pro (3 months) + lifetime 50% discount
- ☐ Send onboarding emails to beta users
- ☐ Collect feedback (survey after 7 days)
- ☐ Get 10+ testimonials
- ☐ Create case studies (5+)

**Time:** 20 hours (spread over 2 weeks)

---

#### Launch Content Creation
- ☐ Product Hunt post (write, design thumbnail)
- ☐ Twitter launch thread (10-15 tweets)
- ☐ Reddit posts (5 subreddits: r/shopify, r/ecommerce, r/SaaS, r/Entrepreneur, r/startups)
- ☐ Demo video (2-minute overview)
- ☐ 5 automation explainer videos (60s each)
- ☐ Marketing assets:
  - Product Hunt thumbnail (240x240)
  - Twitter share card (1200x628)
  - LinkedIn post image
  - Screenshot/GIF library (20+ visuals)
- ☐ Press kit (logo, screenshots, description, founder bio)

**Time:** 15 hours

---

#### Pre-Launch Final Testing
- ☐ Test all 5 automations on 10+ themes
- ☐ Verify payment flow (Stripe subscriptions)
- ☐ Test support system (create ticket, verify emails)
- ☐ Load testing (handle 1,000 concurrent users)
- ☐ Error monitoring (Sentry or internal system)
- ☐ Backup systems tested
- ☐ Rollback plan documented
- ☐ All environment variables set in production
- ☐ Database migrations run in production
- ☐ SSL certificates valid
- ☐ Domain configured (if custom domain)

**Time:** 8 hours

---

### 📋 Quick Wins (Can Do Anytime)

- ☐ Update README.md with new product description
- ☐ Remove old "AI app builder" references in docs
- ☐ Add more automations to marketplace (ideas in seed data)
- ☐ Add analytics tracking (optional)
- ☐ Create demo video or screenshots
- ☐ Add admin authentication to `/api/admin/*` routes
- ☐ Improve marketplace filtering/search
- ☐ Add sorting options to marketplace
- ☐ Add "New" badges to recently added automations
- ☐ Add featured/popular section to marketplace

---

## 📝 TODO Comments in Code

### Admin Routes
- ☐ Add admin authentication to `/api/admin/error-alerts` (`app/api/admin/error-alerts/route.ts`)
- ☐ Add admin authentication check to `/api/admin/automation-metrics` (`app/api/admin/automation-metrics/route.ts`)

### Feedback System
- ☐ Integrate with email service (Resend, SendGrid, etc.) in `/api/feedback` (`app/api/feedback/route.ts`)
- ☐ Store testimonials in testimonials collection or send to admin (`app/api/feedback/route.ts`)

### Automation TODOs
- ☐ Implement review request logic (`lib/automations/review-request-automator/index.ts`)
- ☐ Implement low stock alert logic (`lib/automations/low-stock-alerts/index.ts`)
- ☐ Implement abandoned cart recovery logic (`lib/automations/abandoned-cart-recovery/index.ts`)
- ☐ Implement best sellers collection logic (`lib/automations/best-sellers-collection/index.ts`)

---

## 📊 Time Estimates Summary

| Priority | Tasks | Total Time |
|----------|-------|------------|
| 🔴 Critical | Migrations, SMTP, OAuth Testing | ~1.5 hours |
| 🟠 High | Vercel Cron, Sentry (optional) | ~1 hour |
| 🟡 Medium | Automations, Stripe, Pricing, Upgrade | ~20 hours |
| 🟢 Lower | Support, Docs, Testing, Quality | ~28 hours |
| 🚀 Launch | Beta, Content, Final Testing | ~43 hours |
| **Total** | | **~93 hours** |

---

## 🎯 Recommended Priority Order

### Phase 1: Launch Blockers (MUST DO FIRST)
1. **Terms of Service + Privacy Policy** (2 hours) - Legal requirement
2. **Email verification** (1 hour) - Enable and test
3. **Password reset** (2 hours) - Create pages and flow
4. **Complete 4 skeleton automations** (10-12 hours) - Core product value
5. **Test all automations on 3+ stores** (4 hours) - Quality assurance
6. **Stripe webhooks testing** (2 hours) - Payment reliability
7. **Sentry error monitoring** (1 hour) - Production monitoring
8. **Support email (SMTP)** (15 min) - Customer support

### Phase 2: Critical Setup
9. **Database migrations** (10 min) - Enable support tickets
10. **Shopify OAuth testing** (30 min) - Verify core functionality
11. **Vercel Cron** (20 min) - Scheduled automations

### Phase 3: Monetization
12. **Stripe integration** (2 hours) - Payments
13. **Pricing page** (3 hours) - Monetization
14. **Upgrade flow** (4 hours) - Conversions

### Phase 4: Polish & Launch
15. **Everything else** - Polish and launch prep

---

---

## 🚨 Launch Blocker Status Summary

| Blocker | Status | Priority |
|---------|--------|----------|
| Encrypt Shopify tokens | ✅ DONE | - |
| Add RLS policies to Supabase | ✅ DONE | - |
| Terms of Service + Privacy Policy | ✅ DONE | - |
| Email verification working | ✅ DONE | - |
| Password reset working | ✅ DONE | - |
| Stripe webhooks fully tested | ⚠️ EXISTS, NOT TESTED | 🔴 CRITICAL |
| All 5 automations working on 3+ stores | ⚠️ 1/5 DONE | 🔴 CRITICAL |
| Error monitoring (Sentry) active | ☐ NOT ACTIVE | 🔴 CRITICAL |
| Support email functional | ☐ NOT FUNCTIONAL | 🔴 CRITICAL |

**Progress:** 6/9 complete (67%)  
**Estimated Time to Complete:** ~20-25 hours

---

**Last Updated:** 2026-01-27  
**Next Review:** After Day 2 testing complete
