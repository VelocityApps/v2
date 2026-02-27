# VelocityApps Transformation - TODO List

**Last Updated:** 2026-01-10  
**Status:** Design system complete, brand migration in progress

---

## 🎨 Recent Progress (Design System & Branding)

### ✅ Just Completed (2026-01-10)
- **Design System Created** - Complete design system documentation (`/docs/design/design-system.md`)
  - Brand identity, color palette, typography, components, layouts
  - Primary colors: Teal (#00bcd4) to Lime Green (#32cd32) gradient
  - Full component library specifications
  
- **Brand Colors Migration**
  - ✅ Landing page hero section updated
  - ✅ Navigation component fully updated
  - ✅ Logo updated to circular gradient design
  - ✅ CTA buttons using new gradient colors
  
- **Status Documentation** - Created comprehensive build status document (`/docs/WEBSITE_PLATFORM_STATUS.md`)

### 🔄 In Progress
- Color migration for remaining components (AutomationCard, Dashboard, Marketplace, etc.)
- Design system component library creation (Button, Card, Input, Badge, etc.)

---

## 🎯 Priority 1: Make Marketplace Visible (Do These First)

### ✅ Completed
- [x] Database migration run successfully
- [x] Tables created (automations, user_automations, automation_logs, shopify_webhooks)
- [x] 5 automations seeded in database
- [x] **Design System Created** (`/docs/design/design-system.md`) - Complete design system with colors, typography, components
- [x] **Brand Colors Updated** - New teal (#00bcd4) to lime green (#32cd32) gradient
- [x] **Logo Updated** - Circular gradient logo with V shapes across all components
- [x] **Landing Page Hero Updated** - New brand colors, logo, and CTA buttons
- [x] **Navigation Component Updated** - Logo, buttons, active states use new brand colors
- [x] **CTA Section Updated** - Final CTA section uses new gradient colors

### 🔴 Critical - Make It Work

1. **Update Landing Page** (`app/landing/page.tsx`) - ⚠️ PARTIALLY DONE
   - [x] Hero section updated with new brand colors and logo
   - [x] Main CTA updated with new gradient colors
   - [x] CTA section updated with new colors
   - [ ] Add automation showcase section (top 3 automations) - **IN PROGRESS** (code exists but needs styling update)
   - [ ] Update feature descriptions section (if exists)
   - [ ] Remove/hide old code generation UI

2. **Add Navigation Links** - ✅ DONE
   - [x] Navigation component exists (`components/Navigation.tsx`)
   - [x] "Marketplace" link exists in navigation
   - [x] "Dashboard" link exists (shown when logged in)
   - [x] Logo/branding updated to new circular gradient design

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

## 🎨 Design System & Branding - IN PROGRESS

### ✅ Completed
- [x] Complete design system documentation (`/docs/design/design-system.md`)
- [x] Brand colors defined (primary: #00bcd4, secondary: #32cd32)
- [x] Logo updated across components (Navigation, Landing, ActionSidebar)
- [x] Landing page hero section updated
- [x] Navigation component updated with new colors

### 🔄 Remaining Color Migration
- [ ] Update `components/AutomationCard.tsx` - Marketplace cards
- [ ] Update `components/automations/InstallModal.tsx` - Installation flow
- [ ] Update `components/automations/ConfigForm.tsx` - Configuration forms
- [ ] Update `app/marketplace/page.tsx` - Marketplace page
- [ ] Update `app/dashboard/page.tsx` - Dashboard page
- [ ] Update `components/ActionSidebar.tsx` - Sidebar buttons
- [ ] Update `components/Toolbar.tsx` - Toolbar buttons
- [ ] Update `components/ProfileModal.tsx` - User profile
- [ ] Update `components/SettingsModal.tsx` - Settings
- [ ] Update `components/UpgradeModal.tsx` - Upgrade flow

### 📋 Design System Components Needed
- [ ] Create reusable Button component with variants (Primary, Secondary, Ghost)
- [ ] Create reusable Card component (for automations, metrics, etc.)
- [ ] Create reusable Input component
- [ ] Create reusable Badge component (for status, tags, etc.)
- [ ] Create reusable Modal component
- [ ] Create reusable Toast/Notification system
- [ ] Create reusable Loading/Skeleton components
- [ ] Update `app/globals.css` with design system CSS variables

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

## 🟢 Priority 3: Platform Enhancement

### Marketing Pages
- [ ] Pricing page (`/pricing`) - Display pricing tiers, feature comparison
- [ ] Features page (`/features`) - Detailed feature descriptions, use cases
- [ ] About page (`/about`) - Company story, mission, values
- [ ] Blog/Resources section (`/blog` or `/resources`) - Content marketing
- [ ] Footer component - Links, legal, social media
- [ ] FAQ section - Common questions and answers

### Dashboard Enhancements
- [ ] Dashboard metrics cards - Quick stats overview
- [ ] Activity feed/timeline - Recent automation activity
- [ ] Quick actions sidebar - Fast access to common actions
- [ ] Empty states - Better UX when no automations installed
- [ ] Onboarding prompts - Guide new users through setup
- [ ] Performance overview - Revenue impact, time saved, etc.

### Marketplace Improvements
- [ ] Filter system - By category, price, popularity
- [ ] Search functionality - Search automations by name/description
- [ ] Sorting options - Price, popularity, newest, rating
- [ ] Category tabs/pills - Easy category navigation
- [ ] Featured/Popular section - Highlight top automations
- [ ] "New" badges - Show recently added automations
- [ ] Better automation preview cards - More info, better design

### Subscription & Billing (CRITICAL)
- [ ] Subscription management page (`/dashboard/billing`)
- [ ] Plan upgrade/downgrade flow
- [ ] Payment method management
- [ ] Invoice history
- [ ] Usage tracking - Automations used vs plan limits
- [ ] Upgrade prompts when at limit
- [ ] Free trial countdown/tracking
- [ ] Cancellation flow

## 🔵 Priority 4: Polish & Cleanup

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

## ⚙️ Priority 5: Advanced Features

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
   - [ ] Add toast notifications for success/error (create notification system)
   - [ ] Improve error messages with actionable steps
   - [ ] Add loading states everywhere (skeletons, spinners)
   - [ ] Add retry logic for failed operations
   - [ ] Global error boundary component
   - [ ] Error pages (404, 500, etc.)
   - [ ] Offline state handling

14. **SEO & Performance**
   - [ ] Meta tags for all pages (title, description)
   - [ ] Open Graph tags (for social sharing)
   - [ ] Twitter Card tags
   - [ ] Structured data (JSON-LD)
   - [ ] Sitemap generation
   - [ ] Robots.txt configuration
   - [ ] Image optimization (Next.js Image component)
   - [ ] Code splitting and lazy loading
   - [ ] Bundle size optimization

15. **Analytics & Monitoring**
   - [ ] Google Analytics integration
   - [ ] Mixpanel or similar product analytics
   - [ ] Conversion tracking (sign-ups, installs, purchases)
   - [ ] User behavior tracking
   - [ ] Error tracking (Sentry integration)
   - [ ] Performance monitoring
   - [ ] Uptime monitoring

---

## 📋 Quick Start Checklist

**To see the marketplace working RIGHT NOW:**

1. ✅ Database migration - DONE
2. ✅ Landing page updated with new brand colors - DONE
3. ✅ Navigation component updated - DONE
4. ✅ Logo updated across components - DONE
5. ⏳ Visit `http://localhost:3000/marketplace` - Should work!
6. ⏳ Update remaining components with new brand colors (see above)

**To actually install automations:**

5. ⏳ Set up Shopify OAuth (see SETUP_GUIDE.md)
6. ⏳ Add environment variables
7. ⏳ Test full flow

---

## 🎯 Current Sprint Goals

**Design System & Branding (COMPLETED ✅):**
- [x] Create complete design system documentation
- [x] Update brand colors across landing page and navigation
- [x] Update logo to new circular gradient design
- [ ] Complete color migration across all components (IN PROGRESS)

**Next Sprint - Platform Enhancement:**
- [ ] Complete color migration (remaining components)
- [ ] Build subscription/billing pages (CRITICAL for monetization)
- [ ] Enhance dashboard with metrics and quick actions
- [ ] Improve marketplace with filtering and search
- [ ] Add error handling and loading states throughout

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



