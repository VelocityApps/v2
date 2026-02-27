# Supabase Configuration Checklist

## ✅ Tasks for User (When Ready)

### 1. Email Verification Setup
**Location:** Authentication → NOTIFICATIONS → Email

- [ ] Enable "Email confirmations" toggle
- [ ] Review email templates:
  - [ ] Signup confirmation email template
  - [ ] Password reset email template
- [ ] Test that emails are being sent (check spam folder)

**Time:** 5-10 minutes

---

### 2. Password Reset Redirect URLs
**Location:** Authentication → CONFIGURATION → URL Configuration

Add these URLs to "Redirect URLs" list:
- [ ] `http://localhost:3000/auth/reset-password`
- [ ] `http://localhost:3000/auth/verify-email`
- [ ] `https://yourdomain.com/auth/reset-password` (when deployed)
- [ ] `https://yourdomain.com/auth/verify-email` (when deployed)

**Time:** 2 minutes

---

### 3. RLS Policies Verification
**Location:** Authentication → CONFIGURATION → Policies

Verify RLS is enabled on these tables (should already be done via migrations):
- [ ] `projects` - RLS enabled
- [ ] `user_profiles` - RLS enabled
- [ ] `automations` - RLS enabled
- [ ] `user_automations` - RLS enabled
- [ ] `automation_logs` - RLS enabled
- [ ] `support_tickets` - RLS enabled

**Note:** Check in Supabase Dashboard → Table Editor → Select table → Settings → Enable RLS

**Time:** 5 minutes

---

### 4. Email Template Customization (Optional)
**Location:** Authentication → NOTIFICATIONS → Email → Templates

- [ ] Customize signup confirmation email (add branding)
- [ ] Customize password reset email (add branding)
- [ ] Test email delivery

**Time:** 10-15 minutes

---

### 5. Testing Checklist

After configuration, test these flows:

- [ ] **Sign Up Flow:**
  - [ ] Create new account
  - [ ] Check email for verification link
  - [ ] Click verification link
  - [ ] Verify redirects to dashboard

- [ ] **Password Reset Flow:**
  - [ ] Go to `/auth/forgot-password`
  - [ ] Enter email
  - [ ] Check email for reset link
  - [ ] Click reset link
  - [ ] Set new password
  - [ ] Verify can sign in with new password

- [ ] **Email Verification:**
  - [ ] Sign up new user
  - [ ] Verify email arrives
  - [ ] Click verification link
  - [ ] Verify account is activated

**Time:** 15-20 minutes

---

## 📝 Notes

- All code is already implemented and ready
- Just need to enable/configure in Supabase Dashboard
- Email SMTP configuration is separate (in `.env.local`)
- RLS policies should already be applied via migrations, but verify they're enabled

---

**Total Estimated Time:** 30-45 minutes
