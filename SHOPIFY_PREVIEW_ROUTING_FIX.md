# Shopify Preview Routing Fix

## Problem
Merchants selecting "Store Owner" were seeing technical Prisma schema previews instead of the merchant-friendly "Install to Store" view.

## Root Cause
The preview routing logic was checking code type (`DATABASE`, `SHOPIFY_APP`) **before** checking if there was a Shopify deployment. When a Shopify app included a Prisma schema file, the system detected it as `DATABASE` type and showed the technical Prisma preview instead of the merchant preview.

## Solution

### 1. Priority Check in `app/page.tsx`
**Before code type detection**, check for Shopify deployment:
```typescript
// CRITICAL: Check for Shopify deployment FIRST
if (shopifyDeployment && shopifyViewMode === 'merchant') {
  // Force merchant preview regardless of code type
  return <CodePreview deployment={shopifyDeployment} forceMerchantView={true} />;
}
```

### 2. Database Schema Handling
If a database schema is detected but user is in merchant mode:
```typescript
if (codeType.type === 'DATABASE' && shopifyViewMode === 'merchant') {
  const isShopifyRelated = code.includes('shopify') || selectedTemplate === 'shopify';
  if (isShopifyRelated && shopifyDeployment) {
    // Show merchant preview, not Prisma preview
    return <ShopifyMerchantPreview deployment={shopifyDeployment} />;
  }
}
```

### 3. CodePreview Component Updates
- Added `forceMerchantView` prop to override code type detection
- Added `shopifyViewMode` prop to pass user preference from parent
- Check for deployment **before** routing by code type
- Added console logs for debugging

### 4. Enhanced Preference Loading
- Load preferences for any Shopify-related code (not just `SHOPIFY_APP` type)
- Use parent view mode if provided (avoids unnecessary API calls)
- Console log preference loading for debugging

## Flow for Merchants

1. **User selects "Store Owner"** → Preference saved to `user_preferences.shopify_view_mode = 'merchant'`
2. **User generates Shopify app** → Code generated (includes Prisma schema)
3. **Auto-deploy triggered** → `shopifyDeployment` state set
4. **Preview routing**:
   - ✅ Check `shopifyDeployment` FIRST
   - ✅ If exists and merchant mode → Show `ShopifyMerchantPreview`
   - ❌ Skip code type detection for database schemas
   - ❌ Never show Prisma preview for merchants

## Flow for Developers

1. **User selects "Developer"** → Preference saved to `user_preferences.shopify_view_mode = 'developer'`
2. **User generates Shopify app** → Code generated
3. **Preview routing**:
   - Check code type normally
   - Show `ShopifyDeveloperPreview` with full technical details
   - Show Prisma schema preview if database code detected

## Debug Console Logs

Added console logs at key points:
- `[Generate] Shopify app detected:` - When Shopify app is detected
- `[Preview] Showing merchant preview for deployed Shopify app` - When forcing merchant view
- `[Preview] Database schema detected but merchant mode` - When intercepting database preview
- `[CodePreview] Debug:` - CodePreview component state
- `[UserTypeModal] Preference saved:` - When preference is saved

## Testing Checklist

- [x] Merchant selects "Store Owner" → Preference saved
- [x] Merchant generates Shopify app → Auto-deploys
- [x] Merchant sees merchant preview (not Prisma) → ✅ Fixed
- [x] Developer sees technical preview → Still works
- [x] Database schemas hidden for merchants → ✅ Fixed
- [x] View mode toggle works → Still works

## Files Modified

1. `app/page.tsx`:
   - Added priority check for `shopifyDeployment` before code type detection
   - Added database schema handling for merchant mode
   - Added console logs

2. `components/preview/CodePreview.tsx`:
   - Added `forceMerchantView` prop
   - Added `shopifyViewMode` prop
   - Enhanced preference loading logic
   - Added database schema check for merchant mode
   - Added console logs

3. `components/UserTypeModal.tsx`:
   - Added console log for preference saving

## Key Insight

**The fix prioritizes user intent (merchant vs developer) over code type detection.** 

For merchants:
- If there's a Shopify deployment → Show merchant preview (always)
- If generating Shopify app → Show merchant preview (even if database schema detected)
- Never show technical previews (Prisma, SQL, etc.)

For developers:
- Show all technical details
- Show code type-specific previews (Prisma, SQL, etc.)
- Full transparency

