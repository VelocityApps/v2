# Day 2 Plan - Core User Flows & Testing

**Date:** 2026-01-27  
**Project:** VelocityApps  
**Status:** Day 1 Complete ✅ | Starting Day 2

---

## 🎯 Day 2 Goals

**Primary Focus:** Test and verify all core user flows work end-to-end

**Objectives:**
1. ✅ Test user authentication (sign up/sign in)
2. ✅ Test Shopify OAuth connection
3. ✅ Test automation installation flow
4. ✅ Test dashboard functionality
5. ✅ Identify and fix any issues found

**Time Estimate:** 2-3 hours

---

## ✅ What's Already Done (Day 1)

- ✅ Database connected and tested
- ✅ Supabase client configured
- ✅ Shopify OAuth routes exist
- ✅ Email service code ready (SMTP deferred)
- ✅ Test utilities created
- ✅ Toast notifications configured

---

## 📋 Day 2 Tasks

### Task 1: Test User Authentication Flow (15 minutes)

**Goal:** Verify users can sign up and sign in

**Steps:**
1. [ ] Visit landing page (`http://localhost:3000`)
2. [ ] Click "Sign Up" or "Get Started"
3. [ ] Create a new account (or sign in if exists)
4. [ ] Verify redirect to dashboard or onboarding
5. [ ] Check user profile in Supabase dashboard
6. [ ] Test sign out functionality

**Expected Results:**
- ✅ User can create account
- ✅ User can sign in
- ✅ Session persists on page refresh
- ✅ User redirected appropriately

**Files to Check:**
- `app/page.tsx` (landing page)
- `app/onboarding/page.tsx` (onboarding flow)
- `contexts/AuthContext.tsx` (auth state management)

---

### Task 2: Test Shopify OAuth Connection (30 minutes)

**Goal:** Verify Shopify store connection works end-to-end

**Prerequisites:**
- ✅ Shopify OAuth credentials in `.env.local` (already done)
- ⚠️ Need a Shopify development store for testing

**Steps:**
1. [ ] Sign in to your app
2. [ ] Navigate to dashboard or marketplace
3. [ ] Try to install an automation (or go to onboarding)
4. [ ] Click "Connect Shopify Store"
5. [ ] Enter your Shopify store domain (e.g., `yourstore.myshopify.com`)
6. [ ] Complete OAuth authorization in Shopify
7. [ ] Verify redirect back to your app
8. [ ] Check that store connection is saved in database
9. [ ] Verify token is encrypted and stored securely

**Expected Results:**
- ✅ OAuth URL generated correctly
- ✅ User redirected to Shopify authorization
- ✅ Authorization successful
- ✅ Token exchanged and stored
- ✅ Store connection appears in dashboard

**Files to Check:**
- `app/api/auth/shopify/authorize/route.ts`
- `app/api/auth/shopify/callback/route.ts`
- `lib/shopify/oauth.ts`
- Database: `user_profiles` table (check `shopify_store` column)

**Common Issues to Watch For:**
- ❌ Redirect URI mismatch (check Shopify app settings)
- ❌ Missing scopes (check `lib/shopify/oauth.ts`)
- ❌ Token not stored (check callback route)
- ❌ CORS issues (check Next.js config)

---

### Task 3: Test Automation Installation Flow (30 minutes)

**Goal:** Verify users can browse and install automations

**Steps:**
1. [ ] Visit marketplace (`/marketplace`)
2. [ ] Verify automations are displayed
3. [ ] Click on an automation card
4. [ ] View automation details page
5. [ ] Click "Install" or "Add to Store"
6. [ ] Complete installation flow:
   - If Shopify not connected → redirect to connect
   - If connected → show configuration modal
7. [ ] Fill in configuration (if required)
8. [ ] Complete installation
9. [ ] Verify automation appears in dashboard

**Expected Results:**
- ✅ Marketplace loads with automations
- ✅ Automation details page works
- ✅ Install button triggers correct flow
- ✅ Configuration modal appears (if needed)
- ✅ Installation creates entry in `user_automations` table
- ✅ Automation appears in dashboard

**Files to Check:**
- `app/marketplace/page.tsx`
- `app/automations/[slug]/page.tsx`
- `components/automations/InstallModal.tsx`
- `app/api/automations/install/route.ts`
- Database: `user_automations` table

---

### Task 4: Test Dashboard Functionality (30 minutes)

**Goal:** Verify dashboard features work correctly

**Steps:**
1. [ ] View installed automations in dashboard
2. [ ] Test pause/resume functionality:
   - Click "Pause" on an automation
   - Verify status changes
   - Click "Resume"
   - Verify status changes back
3. [ ] Test configuration update:
   - Click "Configure" on an automation
   - Update settings
   - Save changes
   - Verify changes persisted
4. [ ] Test remove/uninstall:
   - Click "Remove" on an automation
   - Confirm deletion
   - Verify removed from dashboard
5. [ ] Check automation logs/metrics:
   - View execution logs
   - Check success rates
   - Verify metrics display

**Expected Results:**
- ✅ Dashboard displays installed automations
- ✅ Pause/resume updates status in database
- ✅ Configuration updates save correctly
- ✅ Remove deletes from database
- ✅ Logs and metrics display correctly

**Files to Check:**
- `app/dashboard/page.tsx`
- `app/dashboard/automations/[id]/page.tsx`
- `app/api/automations/[id]/pause/route.ts`
- `app/api/automations/[id]/resume/route.ts`
- `app/api/automations/[id]/configure/route.ts`
- `app/api/automations/[id]/remove/route.ts`
- `app/api/automations/[id]/metrics/route.ts`

---

### Task 5: Test Error Handling & Edge Cases (20 minutes)

**Goal:** Verify app handles errors gracefully

**Steps:**
1. [ ] Test with invalid Shopify store URL
2. [ ] Test OAuth cancellation (user clicks "Cancel" in Shopify)
3. [ ] Test installation without Shopify connection
4. [ ] Test with expired/invalid tokens
5. [ ] Test network errors (disconnect internet temporarily)
6. [ ] Verify error messages are user-friendly
7. [ ] Check toast notifications appear for errors

**Expected Results:**
- ✅ Clear error messages displayed
- ✅ Toast notifications show errors
- ✅ App doesn't crash on errors
- ✅ Users can recover from errors

---

### Task 6: Document Issues Found (15 minutes)

**Goal:** Create a list of issues to fix

**Steps:**
1. [ ] Create `DAY2_ISSUES.md` file
2. [ ] List all bugs found during testing
3. [ ] Prioritize issues (Critical, High, Medium, Low)
4. [ ] Note any missing features
5. [ ] Document any UX improvements needed

**Template:**
```markdown
# Day 2 Testing Issues

## Critical (Blocks Core Functionality)
- [ ] Issue 1: Description

## High Priority (Major UX Issues)
- [ ] Issue 2: Description

## Medium Priority (Minor Issues)
- [ ] Issue 3: Description

## Low Priority (Nice to Have)
- [ ] Issue 4: Description
```

---

## 🧪 Testing Checklist

### Authentication
- [ ] Sign up works
- [ ] Sign in works
- [ ] Sign out works
- [ ] Session persists
- [ ] Protected routes redirect correctly

### Shopify OAuth
- [ ] OAuth URL generated
- [ ] Authorization flow works
- [ ] Token exchange successful
- [ ] Store connection saved
- [ ] Token encryption working

### Marketplace
- [ ] Automations display
- [ ] Categories filter work
- [ ] Search works (if implemented)
- [ ] Automation details page loads
- [ ] Install button works

### Installation
- [ ] Install flow works
- [ ] Configuration modal appears
- [ ] Configuration saves
- [ ] Installation creates database entry
- [ ] Redirects to dashboard

### Dashboard
- [ ] Installed automations display
- [ ] Pause works
- [ ] Resume works
- [ ] Configure works
- [ ] Remove works
- [ ] Logs display
- [ ] Metrics display

### Error Handling
- [ ] Invalid inputs handled
- [ ] Network errors handled
- [ ] OAuth errors handled
- [ ] Database errors handled
- [ ] User-friendly error messages

---

## 📝 Notes & Observations

**Document as you test:**
- What works well
- What needs improvement
- Any confusing UX
- Performance issues
- Missing features

---

## 🎯 Success Criteria

**Day 2 is successful if:**
1. ✅ User can sign up and sign in
2. ✅ User can connect Shopify store
3. ✅ User can browse marketplace
4. ✅ User can install an automation
5. ✅ User can manage automations in dashboard
6. ✅ Errors are handled gracefully
7. ✅ All issues documented

---

## 🚀 Next Steps (Day 3)

After Day 2 testing, you'll know:
- What works and what doesn't
- What needs to be fixed
- What features are missing
- What UX improvements are needed

**Day 3 will focus on:**
- Fixing critical issues found
- Implementing missing features
- Improving UX based on testing
- Adding polish and refinements

---

## ⏱️ Time Breakdown

| Task | Time |
|------|------|
| Test Authentication | 15 min |
| Test Shopify OAuth | 30 min |
| Test Installation | 30 min |
| Test Dashboard | 30 min |
| Test Error Handling | 20 min |
| Document Issues | 15 min |
| **Total** | **~2.5 hours** |

---

## 🆘 Troubleshooting

### If Shopify OAuth Fails:
1. Check redirect URI matches in Shopify app settings
2. Verify `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` in `.env.local`
3. Check browser console for errors
4. Verify OAuth scopes are correct

### If Installation Fails:
1. Check database connection
2. Verify `user_automations` table exists
3. Check API route logs
4. Verify user is authenticated

### If Dashboard Doesn't Load:
1. Check authentication state
2. Verify Supabase connection
3. Check browser console for errors
4. Verify RLS policies allow access

---

**Ready to start? Begin with Task 1 and work through each task systematically!**
