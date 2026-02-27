# VelocityApps Setup Guide

## 🚀 Quick Start Checklist

Follow these steps to get your Shopify automation marketplace running:

### 1. ✅ Run Database Migration

**Action Required:**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **"New Query"**
5. Open the file: `supabase/migrations/add_automations_tables.sql`
6. Copy the entire contents
7. Paste into the SQL Editor
8. Click **"Run"** (or press `Ctrl+Enter`)

**What this does:**
- Creates 4 new tables: `automations`, `user_automations`, `automation_logs`, `shopify_webhooks`
- Seeds 5 initial automations
- Sets up Row Level Security policies

**Verify it worked:**
- Check the **Table Editor** in Supabase
- You should see the new tables
- The `automations` table should have 5 rows

---

### 2. 🔑 Set Up Shopify OAuth

**Action Required:**

1. **Create a Shopify App:**
   - Go to: https://partners.shopify.com
   - Sign in or create a Partner account
   - Click **"Apps"** → **"Create app"**
   - Choose **"Custom app"**
   - Name it: "VelocityApps" (or your choice)
   - Click **"Create app"**

2. **Configure OAuth:**
   - In your app settings, go to **"Configuration"**
   - Under **"App URL"**, set:
     - App URL: `https://yourdomain.com` (or `http://localhost:3000` for dev)
     - Allowed redirection URL(s): 
       - `http://localhost:3000/api/auth/shopify/callback` (dev)
       - `https://yourdomain.com/api/auth/shopify/callback` (production)

3. **Get Your Credentials:**
   - In **"API credentials"** section, you'll see:
     - **Client ID** (this is your `SHOPIFY_CLIENT_ID`)
     - **Client secret** (this is your `SHOPIFY_CLIENT_SECRET`)
   - Copy both values

4. **Set Required Scopes:**
   - Go to **"Configuration"** → **"Scopes"**
   - Enable these scopes:
     - `read_products`
     - `write_products`
     - `read_orders`
     - `read_inventory`
     - `write_inventory`
     - `read_customers`
     - `read_content`
     - `write_content`

5. **Add to `.env.local`:**
   ```env
   SHOPIFY_CLIENT_ID=your_client_id_here
   SHOPIFY_CLIENT_SECRET=your_client_secret_here
   SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
   ```
   - For `SHOPIFY_WEBHOOK_SECRET`, you can generate a random string (32+ characters)
   - Or use: `openssl rand -hex 32` in terminal

---

### 3. 📌 Set Up Pinterest API (For Pinterest Stock Sync)

**Action Required:**

1. **Create Pinterest App:**
   - Go to: https://developers.pinterest.com/apps/
   - Sign in or create a developer account
   - Click **"Create app"**
   - Fill in app details
   - Get your **Access Token**

2. **Add to `.env.local`:**
   ```env
   PINTEREST_ACCESS_TOKEN=your_pinterest_access_token_here
   ```

**Note:** Pinterest Stock Sync is the only automation that requires this. Other automations don't need it.

---

### 4. 🌐 Set Application URL

**Action Required:**

Add to `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, change to:
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

### 5. 🔐 Encryption Key (Optional)

The system uses `SUPABASE_SERVICE_ROLE_KEY` for encryption by default. If you want a separate key:

```env
ENCRYPTION_KEY=your_32_character_random_string
```

Generate one with: `openssl rand -hex 32`

---

## 📋 Complete `.env.local` Template

Here's what your `.env.local` should look like:

```env
# ============================================
# EXISTING VARIABLES (Keep these)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# NEW VARIABLES (Add these)
# ============================================
# Shopify OAuth
SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
SHOPIFY_WEBHOOK_SECRET=your_32_char_random_string

# Pinterest API (for Pinterest Stock Sync)
PINTEREST_ACCESS_TOKEN=your_pinterest_token

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Separate encryption key
# ENCRYPTION_KEY=your_encryption_key
```

---

## ✅ Testing Your Setup

### 1. Test Database
```bash
# Start your dev server
npm run dev

# Visit: http://localhost:3000/marketplace
# You should see 5 automations listed
```

### 2. Test Shopify OAuth
1. Go to: http://localhost:3000/marketplace
2. Click "Add to Store" on any automation
3. Enter a Shopify store URL (e.g., `mystore.myshopify.com`)
4. Click "Connect Shopify Store"
5. You should be redirected to Shopify for authorization
6. After authorizing, you should return to the app

### 3. Test Pinterest Stock Sync
1. Install the "Pinterest Stock Sync" automation
2. Configure it (board name, pin template)
3. In your Shopify store, set a product to out of stock
4. The automation should create a pin on Pinterest

---

## 🐛 Troubleshooting

### "SHOPIFY_CLIENT_ID environment variable is required"
- Make sure you've added `SHOPIFY_CLIENT_ID` to `.env.local`
- Restart your dev server after adding env variables

### "Table 'automations' does not exist"
- Run the database migration (Step 1)
- Make sure you're connected to the correct Supabase project

### "Invalid signature" (webhook errors)
- Check that `SHOPIFY_WEBHOOK_SECRET` matches what Shopify expects
- For development, webhook signature verification is optional

### OAuth redirect not working
- Make sure the redirect URL in Shopify app settings matches exactly:
  - `http://localhost:3000/api/auth/shopify/callback` (dev)
  - `https://yourdomain.com/api/auth/shopify/callback` (prod)
- No trailing slashes!

---

## 📚 Next Steps

Once setup is complete:

1. **Test the full flow:**
   - Sign up / Sign in
   - Connect Shopify store
   - Install an automation
   - Configure it
   - Test it works

2. **Update Landing Page:**
   - Edit `app/page.tsx`
   - Replace "AI app builder" messaging
   - Add automation showcase

3. **Archive Old Code:**
   - Move unused components to `/archived`
   - Clean up imports

4. **Deploy to Production:**
   - Set up production environment variables
   - Update `NEXT_PUBLIC_APP_URL`
   - Update Shopify OAuth redirect URLs

---

## 🆘 Need Help?

- Check `TRANSFORMATION_SUMMARY.md` for what's been implemented
- Check Supabase logs for database errors
- Check browser console for frontend errors
- Check terminal for server errors

---

## ✨ You're Ready!

Once you've completed these steps, your Shopify automation marketplace is ready to use! 🎉



