# Marketplace Page Testing Checklist

## ✅ Pre-Test Setup

1. **Verify Environment Variables**
   - Check `.env.local` has:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - If missing, get them from: Supabase Dashboard → Settings → API

2. **Verify Database Migration**
   - Go to Supabase Dashboard → Table Editor
   - Check if `automations` table exists
   - If not, run `supabase/migrations/add_automations_tables.sql` in SQL Editor
   - Verify 5 automations are seeded (should see rows in the table)

3. **Start Dev Server**
   ```bash
   npm run dev
   ```
   - Server should start on `http://localhost:3000`

---

## 🧪 Testing Steps

### 1. Basic Page Load
- [ ] Visit `http://localhost:3000/marketplace`
- [ ] Page should load without errors
- [ ] Navigation header should be visible at top
- [ ] Should see "Automation Marketplace" heading
- [ ] Should see category filter buttons

**Expected Result:**
- Page loads successfully
- No console errors
- Navigation is visible

---

### 2. Loading State
- [ ] On initial load, should see loading spinner
- [ ] Loading message: "Loading automations..."

**Expected Result:**
- Loading spinner appears briefly
- Smooth transition to content

---

### 3. Automation Display
- [ ] Should see 5 automation cards (if migration ran)
- [ ] Each card should show:
  - [ ] Icon/emoji
  - [ ] Automation name
  - [ ] Category badge
  - [ ] Description
  - [ ] Price (£19-39/month)
  - [ ] User count ("X stores using this")
  - [ ] "Add to Store" button

**Expected Automations:**
1. 📌 Pinterest Stock Sync - £19/month
2. ⭐ Review Request Automator - £19/month
3. 📊 Low Stock Alerts - £29/month
4. 💌 Abandoned Cart Recovery - £29/month
5. 🔥 Best Sellers Auto-Collection - £19/month

**Expected Result:**
- All 5 automations visible
- Cards are properly styled
- Information is readable

---

### 4. Category Filtering
- [ ] Click "All" category (should be selected by default)
- [ ] Click "Marketing" - should show 3 automations:
  - Pinterest Stock Sync
  - Review Request Automator
  - Abandoned Cart Recovery
- [ ] Click "Inventory" - should show 1 automation:
  - Low Stock Alerts
- [ ] Click "Automation" - should show 1 automation:
  - Best Sellers Auto-Collection
- [ ] Click "SEO" - should show empty state
- [ ] Click "Analytics" - should show empty state

**Expected Result:**
- Category buttons highlight when clicked
- Filtering works correctly
- Empty state shows when no automations in category

---

### 5. Empty State
- [ ] If no automations in database, should see:
  - 🔍 icon
  - "No automations found" message
  - Helpful text about running migration

**Expected Result:**
- Empty state is user-friendly
- Clear message about what to do

---

### 6. "Add to Store" Button
- [ ] Click "Add to Store" on any automation
- [ ] Should open InstallModal
- [ ] Modal should show:
  - [ ] Automation name in header
  - [ ] "Connect Shopify Store" step
  - [ ] Input field for store URL
  - [ ] "Connect Shopify Store" button
  - [ ] Close button (X)

**Expected Result:**
- Modal opens smoothly
- All elements visible
- Can close modal with X button

---

### 7. Responsive Design
- [ ] Test on desktop (1920x1080)
  - [ ] 3 columns of automation cards
  - [ ] Full navigation visible
- [ ] Test on tablet (768px)
  - [ ] 2 columns of automation cards
  - [ ] Navigation still visible
- [ ] Test on mobile (375px)
  - [ ] 1 column of automation cards
  - [ ] Mobile menu works
  - [ ] Cards stack vertically

**Expected Result:**
- Layout adapts to screen size
- All content remains accessible
- No horizontal scrolling

---

### 8. Error Handling
- [ ] Disconnect from internet
- [ ] Refresh marketplace page
- [ ] Should handle error gracefully
- [ ] Check browser console for error messages

**Expected Result:**
- Error is caught and logged
- User sees appropriate message (or loading state)
- App doesn't crash

---

### 9. Navigation Integration
- [ ] Click "Marketplace" in navigation
- [ ] Should navigate to `/marketplace`
- [ ] Click "Home" in navigation
- [ ] Should navigate to `/`
- [ ] Click logo
- [ ] Should navigate to `/`

**Expected Result:**
- Navigation works correctly
- Active route is highlighted
- Smooth transitions

---

## 🐛 Common Issues & Fixes

### Issue: "No automations found"
**Fix:**
1. Check if database migration ran
2. Go to Supabase → SQL Editor
3. Run `supabase/migrations/add_automations_tables.sql`
4. Verify in Table Editor that `automations` table has 5 rows

### Issue: "Error fetching automations" in console
**Fix:**
1. Check `.env.local` has Supabase credentials
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Restart dev server after adding env vars

### Issue: Page shows loading forever
**Fix:**
1. Check browser console for errors
2. Verify Supabase connection
3. Check network tab for failed requests
4. Verify RLS policies allow public read on `automations` table

### Issue: Modal doesn't open
**Fix:**
1. Check browser console for errors
2. Verify `InstallModal` component exists
3. Check if `ConfigForm` component exists

---

## ✅ Success Criteria

The marketplace page is working correctly if:
- ✅ Page loads without errors
- ✅ All 5 automations are visible
- ✅ Category filtering works
- ✅ "Add to Store" button opens modal
- ✅ Responsive design works on all screen sizes
- ✅ Navigation is integrated and working
- ✅ Loading and empty states display correctly

---

## 📝 Notes

- The marketplace page uses public RLS policies, so it should work even without authentication
- If you see 0 automations, the database migration hasn't been run yet
- The "Add to Store" button will work even without Shopify OAuth setup (it will just show the modal)
- All styling should match the dark theme (`#0a0a0a` background)

