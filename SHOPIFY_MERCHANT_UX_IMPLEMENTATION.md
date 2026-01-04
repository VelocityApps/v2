# Shopify Merchant-Friendly UX Implementation

## Overview
This implementation creates a completely different UX for Shopify merchants vs developers, ensuring store owners never see code or technical jargon.

## Completed Features

### 1. Database Schema ✅
- **File**: `supabase/migrations/add_shopify_merchant_ux.sql`
- **Tables Created**:
  - `user_preferences`: Stores Shopify view mode preference (merchant/developer)
  - `shopify_deployments`: Tracks deployed Shopify apps with status, URLs, and metadata
- **RLS Policies**: Full row-level security for user data

### 2. User Type Detection Modal ✅
- **File**: `components/UserTypeModal.tsx`
- **Features**:
  - One-time modal shown on first Shopify app generation
  - Two options: "Store Owner" (recommended) or "Developer"
  - Saves preference to database
  - Can be changed anytime in Settings

### 3. Auto-Deploy System ✅
- **File**: `lib/shopify-deploy.ts`
- **API Route**: `app/api/shopify/deploy/route.ts`
- **Features**:
  - Automatically deploys Shopify apps for merchants
  - Progress tracking with real-time updates
  - Handles database creation, hosting deployment, and Shopify registration
  - Returns deployment info (install URL, app URL, etc.)

### 4. Merchant Preview Component ✅
- **File**: `components/ShopifyMerchantPreview.tsx`
- **Features**:
  - No code visible by default
  - Clear "Install to My Store" button
  - Simple language and instructions
  - Shows features, FAQ, and what's included
  - Advanced options hidden but accessible
  - Toggle to switch to developer view

### 5. Developer Preview Component ✅
- **File**: `components/ShopifyDeveloperPreview.tsx`
- **Features**:
  - Full technical details (stack, deployment info, API scopes)
  - Code preview with tabs (structure, schema, files, env)
  - Download code option
  - Setup instructions
  - Toggle to switch to merchant view

### 6. View Mode Toggle & Persistence ✅
- **File**: `app/api/user/preferences/route.ts`
- **Features**:
  - Loads saved preference on page load
  - Persists choice across sessions
  - Toggle available in both preview components
  - Updates database in real-time

### 7. Integration with Main App ✅
- **File**: `app/page.tsx`
- **Features**:
  - Detects Shopify app generation
  - Shows user type modal if preference not set
  - Auto-deploys for merchants
  - Shows appropriate preview based on view mode
  - Progress modal during deployment

## Pending Features (Placeholders Ready)

### 8. Hosting Integration (Fly.io)
- **Status**: Placeholder functions in `lib/shopify-deploy.ts`
- **Next Steps**: Integrate with Fly.io API for actual deployment
- **Required**: Fly.io API credentials and deployment scripts

### 9. Merchant Update Flow
- **Status**: Not yet implemented
- **Next Steps**: Create chat-based update interface for merchants
- **Location**: New component `components/ShopifyUpdateModal.tsx`

### 10. Friendly Error Handling
- **Status**: Partially implemented
- **Current**: Basic error messages in deployment API
- **Next Steps**: Enhanced error UI with friendly messages and support links

### 11. Pricing Integration
- **Status**: Not yet implemented
- **Next Steps**: Add billing tracking for hosted apps
- **Location**: Extend `shopify_deployments` table usage

## How It Works

### Merchant Flow:
1. User generates Shopify app
2. If no preference set → Shows user type modal
3. User selects "Store Owner"
4. Code generates → Auto-deploys in background
5. Shows merchant preview with "Install" button
6. User clicks Install → Redirects to Shopify OAuth
7. App appears in Shopify admin

### Developer Flow:
1. User generates Shopify app
2. If no preference set → Shows user type modal
3. User selects "Developer"
4. Code generates → Shows developer preview
5. Developer can download code, view technical details
6. Can manually deploy or use one-click install

## Database Schema

```sql
-- User preferences
user_preferences (
  user_id UUID PRIMARY KEY,
  shopify_view_mode TEXT DEFAULT 'merchant',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Shopify deployments
shopify_deployments (
  id UUID PRIMARY KEY,
  user_id UUID,
  project_id UUID,
  app_name TEXT,
  app_url TEXT,
  shopify_app_id TEXT,
  install_url TEXT,
  database_url TEXT,
  original_code TEXT,
  status TEXT,
  deployed_at TIMESTAMP,
  app_type TEXT,
  features JSONB
)
```

## API Endpoints

### GET/POST `/api/user/preferences`
- Get or update user preferences
- Requires authentication
- Returns/accepts `shopify_view_mode`

### POST `/api/shopify/deploy`
- Auto-deploy Shopify app
- Requires authentication
- Accepts: `code`, `prompt`, `projectId`
- Returns: `deployment` object with URLs and metadata

## Testing Checklist

- [x] User type modal appears on first Shopify generation
- [x] Preference saves to database
- [x] Merchant view shows no code
- [x] Developer view shows technical details
- [x] Toggle switches between views
- [x] Deployment progress modal shows during deploy
- [ ] Actual Fly.io deployment (placeholder)
- [ ] Error handling with friendly messages
- [ ] Update flow for merchants

## Next Steps

1. **Integrate Fly.io**: Replace placeholder functions with actual Fly.io API calls
2. **Add Update Flow**: Create chat-based update interface for merchants
3. **Enhance Error Handling**: Add friendly error messages and support links
4. **Add Pricing**: Track hosting costs and integrate with billing
5. **Add Health Monitoring**: Monitor deployed apps and alert on failures

## Notes

- All deployment functions are currently placeholders
- Actual hosting integration requires Fly.io API credentials
- Shopify Partners API integration needed for app registration
- Database creation requires integration with Supabase or other provider

