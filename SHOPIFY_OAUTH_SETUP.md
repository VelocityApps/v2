# Shopify OAuth Setup Guide

## What You Need

To set up Shopify OAuth, you need to:

1. **Create a Shopify Partner account** (free)
2. **Create a Shopify App** in the Partner dashboard
3. **Get your Client ID and Client Secret**
4. **Configure the redirect URL**
5. **Add environment variables**

---

## Step-by-Step Instructions

### Step 1: Create Shopify Partner Account

1. Go to: https://partners.shopify.com
2. Click **"Sign up"** (or sign in if you already have an account)
3. Fill in your details and create the account
4. Verify your email if required

### Step 2: Create a New App

1. Once logged in, click **"Apps"** in the left sidebar
2. Click **"Create app"** button (top right)
3. Choose **"Create app manually"** (not "Create app from template")
4. Fill in:
   - **App name**: `VelocityApps` (or your choice)
   - **App URL**: 
     - For development: `http://localhost:3000`
     - For production: `https://yourdomain.com`
5. Click **"Create app"**

### Step 3: Configure OAuth Settings (App URL and redirect URLs)

**Where to find these settings** — Shopify has two dashboards; the layout depends on which you use:

- **If you use Partners (partners.shopify.com):**
  1. Left sidebar: **Apps** → click your app (e.g. Velocity Apps).
  2. Open **Configuration** (or **App setup** / **Settings** — the exact tab name can vary).
  3. Look for **App URL** and **Allowed redirection URL(s)** (sometimes under “URLs” or “OAuth”).
  - If you don’t see a Configuration tab, try **Settings** (gear icon) on the app page, or check the top tabs (Overview, Configuration, API credentials, etc.).

- **If you were moved to the Dev Dashboard (dev.shopify.com):**
  1. Go to [dev.shopify.com/dashboard](https://dev.shopify.com/dashboard) (or from Partners: **Visit Dev Dashboard** → **App distribution** in the left sidebar).
  2. Left sidebar: **Apps** → click your app.
  3. Open the **Versions** tab. Create or edit a version — the **App URL** is set there (e.g. `http://localhost:3000`).
  4. Redirect URLs may be in the same version form, or under **Settings** for that app. Add: `http://localhost:3000/api/auth/shopify/callback`.

**What to set (same in both dashboards):**

- **App URL**: `http://localhost:3000` (for local testing) or your production URL.
- **Allowed redirection URL(s)** (or “Redirect URLs”): add exactly:
  - `http://localhost:3000/api/auth/shopify/callback` (development)
  - `https://yourdomain.com/api/auth/shopify/callback` (production when you deploy)
  - Click **Add URL** / **Save** after adding.

### Step 4: Set Required Scopes

1. Go to **"Configuration"** → **"Scopes"** section
2. Enable these scopes (check the boxes):
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders`
   - ✅ `read_inventory`
   - ✅ `write_inventory`
   - ✅ `read_customers`
   - ✅ `read_content`
   - ✅ `write_content`
3. Click **"Save"**

### Step 5: Get Your Credentials

1. Go to **"API credentials"** section (still in Configuration tab)
2. You'll see:
   - **Client ID** - This is your `SHOPIFY_CLIENT_ID`
   - **Client secret** - Click **"Reveal"** to see it - This is your `SHOPIFY_CLIENT_SECRET`
3. **Copy both values** - you'll need them in the next step

### Step 6: Generate Webhook Secret

You need a secret for webhook verification. Generate a random 32+ character string:

**Option 1: Using PowerShell (Windows)**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 3: Use an online generator**
- Go to: https://randomkeygen.com/
- Copy a "CodeIgniter Encryption Keys" value

### Step 7: Add Environment Variables

Add these to your `.env.local` file:

```env
# Shopify OAuth
SHOPIFY_CLIENT_ID=your_client_id_here
SHOPIFY_CLIENT_SECRET=your_client_secret_here
SHOPIFY_WEBHOOK_SECRET=your_32_char_random_string_here

# Application URL (if not already set)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:**
- Replace `your_client_id_here` with your actual Client ID
- Replace `your_client_secret_here` with your actual Client Secret
- Replace `your_32_char_random_string_here` with the generated secret
- No quotes around the values
- No spaces around the `=` sign

### Step 8: Restart Your Dev Server

After adding the environment variables:

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Testing the OAuth Flow

1. **Visit your marketplace**: `http://localhost:3000/marketplace`
2. **Click "Add to Store"** on any automation
3. **Enter a Shopify store URL** (e.g., `mystore.myshopify.com`)
4. **Click "Connect Shopify Store"**
5. You should be redirected to Shopify's authorization page
6. **Approve the app** in Shopify
7. You should be redirected back to your app

---

## Troubleshooting

### "SHOPIFY_CLIENT_ID environment variable is required"
- Make sure you've added `SHOPIFY_CLIENT_ID` to `.env.local`
- Restart your dev server after adding env variables
- Check for typos in the variable name

### "Invalid redirect_uri" or "redirect_uri and application url must have matching hosts"
- **Hosts must match:** The **App URL** in Shopify and the **redirect_uri** your app sends must use the same host.
  - **Local:** In Shopify Partners → Configuration → set **App URL** to `http://localhost:3000` and **Allowed redirection URL(s)** to `http://localhost:3000/api/auth/shopify/callback`.
  - **Production:** Use your production domain for both (e.g. App URL `https://yourdomain.com`, redirect `https://yourdomain.com/api/auth/shopify/callback`).
- If you test locally, App URL must be `http://localhost:3000` (not your production URL), and `.env.local` must have `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
- No trailing slashes on any URL. Save the app settings in Shopify Partners after changing.

### "Invalid client_id"
- Double-check your Client ID is correct
- Make sure there are no extra spaces or quotes in `.env.local`

### OAuth redirects but shows error
- Check the browser console for errors
- Check your terminal/server logs
- Verify the callback URL is correct in Shopify settings

### "Failed to exchange code for token"
- Verify your Client Secret is correct
- Make sure you clicked "Reveal" to see the full secret
- Check that both Client ID and Secret are in `.env.local`

---

## Production Setup

When deploying to production:

1. **Update Shopify App Settings**:
   - Change **App URL** to your production domain
   - Add production redirect URL: `https://yourdomain.com/api/auth/shopify/callback`

2. **Update Environment Variables**:
   - Set `NEXT_PUBLIC_APP_URL=https://yourdomain.com` in your production environment
   - Keep `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` the same (they work for both dev and prod)

3. **Test in Production**:
   - Use a real Shopify store (not a development store)
   - Test the full OAuth flow

---

## Quick Checklist

- [ ] Shopify Partner account created
- [ ] App created in Partners dashboard
- [ ] Redirect URL configured: `http://localhost:3000/api/auth/shopify/callback`
- [ ] Required scopes enabled
- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Webhook secret generated
- [ ] Environment variables added to `.env.local`
- [ ] Dev server restarted
- [ ] OAuth flow tested

---

## Need Help?

If you run into issues:
1. Check the browser console for errors
2. Check your terminal/server logs
3. Verify all environment variables are set correctly
4. Make sure the redirect URL in Shopify matches exactly

Once you have the credentials, I can help you test the flow!



