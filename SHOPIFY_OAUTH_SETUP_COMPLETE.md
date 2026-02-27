# Shopify OAuth Setup - Complete Guide

## ✅ What's Already Done

Your OAuth implementation is complete! The code is ready, you just need to:
1. Create a Shopify app
2. Get your credentials
3. Add them to `.env.local`

---

## 🚀 Step-by-Step Setup

### Step 1: Create Shopify Partner Account (5 min)

1. Go to: **https://partners.shopify.com**
2. Click **"Sign up"** (or sign in if you have an account)
3. Fill in your details:
   - Email
   - Password
   - Company name (can be your name)
4. Verify your email if required

---

### Step 2: Create a Shopify App (5 min)

1. Once logged in, click **"Apps"** in the left sidebar
2. Click **"Create app"** button (top right, blue button)
3. Choose **"Create app manually"** (NOT "Create app from template")
4. Fill in:
   - **App name**: `VelocityApps` (or your choice)
   - **App URL**: `http://localhost:3000`
5. Click **"Create app"**

---

### Step 3: Configure OAuth Settings (5 min)

1. In your app, go to **"Configuration"** tab (left sidebar)
2. Scroll to **"App URL"** section:
   - **App URL**: `http://localhost:3000`
3. Scroll to **"Allowed redirection URL(s)"**:
   - Click **"Add URL"**
   - Enter: `http://localhost:3000/api/auth/shopify/callback`
   - Click **"Add URL"** again
4. Scroll to **"Scopes"** section and enable these:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders`
   - ✅ `read_inventory`
   - ✅ `write_inventory`
   - ✅ `read_customers`
   - ✅ `read_content`
   - ✅ `write_content`
5. Click **"Save"** at the bottom

---

### Step 4: Get Your Credentials (2 min)

1. Still in **"Configuration"** tab, scroll to **"API credentials"** section
2. You'll see:
   - **Client ID** - Copy this (it's your `SHOPIFY_CLIENT_ID`)
   - **Client secret** - Click **"Reveal"** button, then copy it (it's your `SHOPIFY_CLIENT_SECRET`)
3. **Keep these safe** - you'll need them in the next step

---

### Step 5: Generate Webhook Secret (1 min)

I've generated a secure webhook secret for you. Use this one:

```
5ad92900c5f978a44323e723e4535abbeb4963a4da606346daf7649c78f4bc11
```

Or generate your own using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Step 6: Add to .env.local (2 min)

1. Open or create `.env.local` in your project root
2. Add these lines (replace with YOUR actual values):

```env
# Shopify OAuth Credentials
SHOPIFY_CLIENT_ID=your_client_id_from_step_4
SHOPIFY_CLIENT_SECRET=your_client_secret_from_step_4
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_from_step_5

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:**
- Replace `your_client_id_from_step_4` with your actual Client ID
- Replace `your_client_secret_from_step_4` with your actual Client Secret
- Replace `your_webhook_secret_from_step_5` with the generated secret
- No quotes around values
- No spaces around `=`

---

### Step 7: Restart Dev Server (1 min)

1. Stop your current dev server (press `Ctrl+C` in terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

---

## ✅ Verify It Works

1. Visit: `http://localhost:3000/marketplace`
2. Click **"Add to Store"** on any automation
3. Enter a Shopify store URL (e.g., `mystore.myshopify.com`)
4. Click **"Connect Shopify Store"**
5. You should be redirected to Shopify's authorization page
6. Approve the app
7. You should be redirected back to your app

---

## 🐛 Troubleshooting

### Error: "SHOPIFY_CLIENT_ID environment variable is required"
- **Fix:** Make sure `.env.local` exists and has `SHOPIFY_CLIENT_ID=...`
- **Fix:** Restart your dev server after adding env vars

### Error: "Invalid redirect_uri"
- **Fix:** Make sure the redirect URL in Shopify matches exactly: `http://localhost:3000/api/auth/shopify/callback`
- **Fix:** No trailing slashes, exact match required

### Error: "Invalid client_id"
- **Fix:** Double-check your Client ID is correct (no extra spaces)
- **Fix:** Make sure you copied the full Client ID

### Redirect doesn't work
- **Fix:** Check that `NEXT_PUBLIC_APP_URL=http://localhost:3000` is in `.env.local`
- **Fix:** Make sure the redirect URL in Shopify is exactly: `http://localhost:3000/api/auth/shopify/callback`

---

## 📝 Quick Checklist

- [ ] Shopify Partner account created
- [ ] App created in Shopify Partners
- [ ] App URL set to `http://localhost:3000`
- [ ] Redirect URL added: `http://localhost:3000/api/auth/shopify/callback`
- [ ] Required scopes enabled
- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Webhook secret generated
- [ ] All values added to `.env.local`
- [ ] Dev server restarted
- [ ] OAuth flow tested

---

## 🎯 Next Steps After Setup

Once OAuth is working:
1. Test installing an automation
2. Test the dashboard functionality
3. Test Pinterest Stock Sync (fully functional automation)

---

## 💡 Tips

- **Development Store:** Create a free Shopify development store at https://partners.shopify.com to test with
- **Keep Credentials Safe:** Never commit `.env.local` to git (it's already in `.gitignore`)
- **Production:** When deploying, you'll need to add production URLs to Shopify app settings

---

## 📞 Need Help?

If you get stuck:
1. Check the browser console for errors (F12)
2. Check the terminal for server errors
3. Verify all environment variables are set correctly
4. Make sure the redirect URL in Shopify matches exactly

