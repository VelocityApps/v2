# VelocityApps Transformation - TODO List

## 🎯 Priority 1: Make Marketplace Visible (Do These First)

### ✅ Completed
- [x] Database migration run successfully
- [x] Tables created (automations, user_automations, automation_logs, shopify_webhooks)
- [x] 5 automations seeded in database

### 🔴 Critical - Make It Work

1. **Update Landing Page** (`app/page.tsx`)
   - [ ] Replace hero section: "AI app builder" → "Shopify automation marketplace"
   - [ ] Update main CTA: "Build apps" → "Browse Automations" (link to `/marketplace`)
   - [ ] Add automation showcase section (top 3 automations)
   - [ ] Update feature descriptions
   - [ ] Remove/hide old code generation UI

2. **Add Navigation Links**
   - [ ] Check if there's a header/nav component
   - [ ] Add "Marketplace" link to navigation
   - [ ] Add "Dashboard" link (if not already there)
   - [ ] Update logo/branding if needed

3. **Set Up Environment Variables** (Required for Shopify OAuth)
   - [ ] Add `SHOPIFY_CLIENT_ID` to `.env.local`
   - [ ] Add `SHOPIFY_CLIENT_SECRET` to `.env.local`
   - [ ] Add `SHOPIFY_WEBHOOK_SECRET` to `.env.local` (generate random 32-char string)
   - [ ] Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local`
   - [ ] Add `PINTEREST_ACCESS_TOKEN` (optional, only for Pinterest Stock Sync)
   - [ ] Restart dev server after adding env vars

4. **Test Basic Flow**
   - [ ] Visit `http://localhost:3000/marketplace` - should see 5 automations
   - [ ] Click on an automation - should see detail page
   - [ ] Try "Add to Store" button (will fail without Shopify setup, but should show modal)

---

## 🟡 Priority 2: Core Functionality

5. **Set Up Shopify OAuth** (Required for installing automations)
   - [ ] Create Shopify Partner account: https://partners.shopify.com
   - [ ] Create new app in Shopify Partners
   - [ ] Configure OAuth redirect URL: `http://localhost:3000/api/auth/shopify/callback`
   - [ ] Set required scopes (read_products, write_products, read_orders, etc.)
   - [ ] Copy Client ID and Secret to `.env.local`
   - [ ] Test OAuth flow: Connect store → Authorize → Return to app

6. **Test Pinterest Stock Sync** (Fully functional automation)
   - [ ] Install Pinterest Stock Sync automation
   - [ ] Configure board name and pin template
   - [ ] In Shopify, set a product to out of stock
   - [ ] Verify pin is created on Pinterest
   - [ ] Check automation logs in dashboard

7. **Test Dashboard**
   - [ ] Sign up / Sign in
   - [ ] Connect Shopify store
   - [ ] Install an automation
   - [ ] View installed automations in dashboard
   - [ ] Test pause/resume functionality
   - [ ] Test configuration updates
   - [ ] View execution logs

---

## 🟢 Priority 3: Polish & Cleanup

8. **Archive Old Code** (Optional - can do later)
   - [ ] Create `/archived` directory
   - [ ] Move code generation components to `/archived`
   - [ ] Move deployment components to `/archived`
   - [ ] Move preview components to `/archived`
   - [ ] Update any broken imports

9. **Update Documentation**
   - [ ] Update README.md with new product description
   - [ ] Update any user-facing documentation
   - [ ] Remove references to "AI app builder"

10. **Complete Skeleton Automations** (Post-launch)
    - [ ] Review Request Automator - Email sending logic
    - [ ] Low Stock Alerts - Slack/Email integration
    - [ ] Abandoned Cart Recovery - Email sequences
    - [ ] Best Sellers Collection - Sales data aggregation

---

## 🔵 Priority 4: Advanced Features

11. **Set Up Cron Jobs** (For scheduled automations)
    - [ ] Create `/app/api/cron/route.ts`
    - [ ] Set up Vercel Cron (or similar)
    - [ ] Test scheduled execution for Best Sellers Collection

12. **Billing Integration** (Per-automation pricing)
    - [ ] Update Stripe integration
    - [ ] Create subscription per automation
    - [ ] Handle billing webhooks
    - [ ] Update pricing display

13. **Error Handling & Notifications**
    - [ ] Add toast notifications for success/error
    - [ ] Improve error messages
    - [ ] Add loading states everywhere
    - [ ] Add retry logic for failed operations

---

## 📋 Quick Start Checklist

**To see the marketplace working RIGHT NOW:**

1. ✅ Database migration - DONE
2. ⏳ Visit `http://localhost:3000/marketplace` - Should work!
3. ⏳ Update landing page - Make it visible
4. ⏳ Add navigation link to marketplace

**To actually install automations:**

5. ⏳ Set up Shopify OAuth (see SETUP_GUIDE.md)
6. ⏳ Add environment variables
7. ⏳ Test full flow

---

## 🎯 Today's Goals

**Minimum to see it working:**
- [ ] Visit `/marketplace` page (should already work!)
- [ ] Update landing page to link to marketplace
- [ ] Add marketplace link to navigation

**To actually use it:**
- [ ] Set up Shopify OAuth
- [ ] Add environment variables
- [ ] Test installing an automation

---

## 📝 Notes

- The marketplace page (`/marketplace`) should already be working if the database migration ran successfully
- The landing page still shows the old "AI builder" interface - that's why it looks the same
- Once you update the landing page and add navigation, users will see the new marketplace
- Shopify OAuth is required to actually install automations, but you can browse without it

