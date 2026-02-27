# Current To-Do List - VelocityApps

**Last Updated:** Today  
**Status:** Ready to tackle after slow days

---

## 🔴 Priority 1: Critical Setup (Do These First)

### 1. Verify Database Migration ✅/❌
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Check if `automations` table exists (Table Editor)
- [ ] If not, run `supabase/migrations/add_automations_tables.sql`
- [ ] Verify 5 automations are seeded in the table

**Time:** 5 minutes  
**Why:** Marketplace won't work without the database tables

---

### 2. Set Up Shopify OAuth Credentials
- [ ] Create Shopify Partner account: https://partners.shopify.com
- [ ] Create new app in Shopify Partners
- [ ] Configure OAuth redirect URL: `http://localhost:3000/api/auth/shopify/callback`
- [ ] Set required scopes: `read_products`, `write_products`, `read_orders`, `read_inventory`, `write_inventory`
- [ ] Copy Client ID and Secret
- [ ] Add to `.env.local`:
  ```env
  SHOPIFY_CLIENT_ID=your_client_id_here
  SHOPIFY_CLIENT_SECRET=your_client_secret_here
  SHOPIFY_WEBHOOK_SECRET=generate_random_32_char_string
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
- [ ] Restart dev server

**Time:** 15-20 minutes  
**Why:** Required to actually install automations

---

### 3. Add Global Navigation Header
- [ ] Create `components/Navigation.tsx` or update `app/layout.tsx`
- [ ] Add header with links: Home, Marketplace, Dashboard
- [ ] Add user menu (if logged in)
- [ ] Make it responsive for mobile
- [ ] Apply consistent styling with dark theme

**Time:** 30-45 minutes  
**Why:** Users need easy navigation between pages

---

## 🟡 Priority 2: Testing & Verification

### 4. Test Marketplace Page
- [ ] Visit `http://localhost:3000/marketplace`
- [ ] Verify automations are loading (should see 5 automations)
- [ ] Test category filtering
- [ ] Click on an automation card
- [ ] Verify detail page loads correctly
- [ ] Test "Add to Store" button (will show modal even without Shopify setup)

**Time:** 10 minutes  
**Why:** Core user-facing feature

---

### 5. Test Shopify OAuth Flow
- [ ] Sign up / Sign in to your app
- [ ] Go to dashboard
- [ ] Try to install an automation
- [ ] Click "Connect Shopify Store"
- [ ] Complete OAuth flow
- [ ] Verify you're redirected back
- [ ] Check Supabase `user_automations` table for new entry

**Time:** 15 minutes  
**Why:** Core functionality - must work for users

---

### 6. Test Pinterest Stock Sync (Fully Functional)
- [ ] Install Pinterest Stock Sync automation
- [ ] Configure board name and pin template
- [ ] Get Pinterest Access Token (optional - can skip for now)
- [ ] In Shopify test store, set a product to out of stock
- [ ] Verify webhook is received (check logs)
- [ ] Check automation logs in dashboard
- [ ] Verify pin is created on Pinterest (if token configured)

**Time:** 20-30 minutes  
**Why:** This is the only fully functional automation - good test case

---

### 7. Test Dashboard Functionality
- [ ] View installed automations
- [ ] Test pause/resume buttons
- [ ] Update automation configuration
- [ ] View execution logs
- [ ] Test uninstall/remove automation
- [ ] Verify all API endpoints work

**Time:** 20 minutes  
**Why:** Core user experience

---

## 🟢 Priority 3: Complete Skeleton Automations

### 8. Complete Review Request Automator
**Location:** `lib/automations/review-request-automator/`

- [ ] Implement email sending logic (use Resend, SendGrid, or similar)
- [ ] Add AI-personalized subject line generation
- [ ] Set up email template system
- [ ] Add tracking for open/click rates
- [ ] Test with real Shopify order data
- [ ] Handle edge cases (no email, invalid order, etc.)

**Time:** 2-3 hours  
**Why:** High-value automation, commonly requested

---

### 9. Complete Low Stock Alerts
**Location:** `lib/automations/low-stock-alerts/`

- [ ] Implement inventory monitoring logic
- [ ] Add Slack webhook integration
- [ ] Add email notification option
- [ ] Set up per-product threshold checking
- [ ] Add daily digest option
- [ ] Test with real inventory data

**Time:** 2-3 hours  
**Why:** Critical for inventory management

---

### 10. Complete Abandoned Cart Recovery
**Location:** `lib/automations/abandoned-cart-recovery/`

- [ ] Implement 3-email sequence logic
- [ ] Add timing configuration (1hr, 24hr, 72hr)
- [ ] Create email templates
- [ ] Add AI-personalized message generation
- [ ] Track conversion rates
- [ ] Handle cart recovery (mark as recovered)

**Time:** 3-4 hours  
**Why:** High conversion potential

---

### 11. Complete Best Sellers Collection
**Location:** `lib/automations/best-sellers-collection/`

- [ ] Implement sales data aggregation
- [ ] Query Shopify orders API for sales data
- [ ] Calculate best sellers by revenue/quantity
- [ ] Create/update Shopify collection
- [ ] Set up scheduled execution (weekly/daily)
- [ ] Test collection updates

**Time:** 2-3 hours  
**Why:** Requires cron job setup (see #12)

---

## 🔵 Priority 4: Infrastructure & Polish

### 12. Set Up Vercel Cron Job
- [ ] Create `vercel.json` in project root (if not exists)
- [ ] Add cron configuration:
  ```json
  {
    "crons": [{
      "path": "/api/cron?secret=YOUR_SECRET",
      "schedule": "0 * * * *"
    }]
  }
  ```
- [ ] Set `CRON_SECRET` in Vercel environment variables
- [ ] Test cron endpoint manually
- [ ] Verify scheduled automations run

**Time:** 30 minutes  
**Why:** Required for scheduled automations (Best Sellers Collection)

---

### 13. Add Toast Notifications
- [ ] Install react-hot-toast or similar
- [ ] Add success notifications for:
  - Automation installed
  - Configuration updated
  - Store connected
  - Automation paused/resumed
- [ ] Add error notifications with helpful messages
- [ ] Add loading states with toasts

**Time:** 1-2 hours  
**Why:** Better user experience, immediate feedback

---

### 14. Improve Loading States
- [ ] Add loading spinners to all async operations
- [ ] Add skeleton loaders for marketplace
- [ ] Add loading states to dashboard
- [ ] Disable buttons during operations
- [ ] Add progress indicators where appropriate

**Time:** 1-2 hours  
**Why:** Professional UX, prevents double-clicks

---

### 15. Set Up Billing Integration
- [ ] Review current Stripe integration
- [ ] Update to support per-automation subscriptions
- [ ] Create subscription when automation is installed
- [ ] Handle subscription cancellation
- [ ] Update pricing display throughout app
- [ ] Test payment flow

**Time:** 3-4 hours  
**Why:** Required for monetization

---

## 📋 Quick Wins (Can Do Anytime)

- [ ] Update README.md with new product description
- [ ] Remove old "AI app builder" references in docs
- [ ] Add more automations to marketplace (ideas in seed data)
- [ ] Improve error messages (make them user-friendly)
- [ ] Add retry logic for failed webhook operations
- [ ] Add analytics tracking (optional)
- [ ] Create demo video or screenshots

---

## 🎯 Today's Focus (If Starting Fresh)

**Minimum to see it working:**
1. ✅ Verify database migration (5 min)
2. ✅ Test marketplace page (10 min)
3. ✅ Add navigation header (30-45 min)

**To actually use it:**
4. ✅ Set up Shopify OAuth (15-20 min)
5. ✅ Test OAuth flow (15 min)
6. ✅ Test Pinterest Stock Sync (20-30 min)

**Total:** ~2 hours to get core functionality working

---

## 📝 Notes

- **Landing page** ✅ Already updated with new messaging
- **Marketplace page** ✅ Already built and should work
- **Database migration** ⚠️ Need to verify it's been run
- **Shopify OAuth** ❌ Not set up yet (required for installs)
- **Cron jobs** ✅ Code exists, needs Vercel config
- **Skeleton automations** ⚠️ 4 automations need completion

---

## 🚀 Next Steps After Today

1. Complete skeleton automations (Priority 3)
2. Set up production deployment
3. Configure production environment variables
4. Test end-to-end with real Shopify stores
5. Launch! 🎉

