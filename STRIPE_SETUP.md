# Stripe Subscription Setup Guide

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Stripe Dashboard)
STRIPE_PRICE_ID_PRO=price_1SdDAAHCnow4YMXXv3N7Nc3C  # $29/month Pro plan
STRIPE_PRICE_ID_TEAMS=price_1SdDFIHCnow4YMXXdFkkyvJX  # $99/month Teams plan

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Service Role Key (for webhooks)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step-by-Step Setup

### 1. Create Stripe Account & Get API Keys

1. Go to https://dashboard.stripe.com
2. Navigate to **Developers** → **API keys**
3. Copy your **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)
4. Add them to `.env.local` as `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`

### 2. Price IDs (Already Created)

The following Price IDs are already configured:
- **Pro Plan**: `price_1SdDAAHCnow4YMXXv3N7Nc3C` ($29/month)
- **Teams Plan**: `price_1SdDFIHCnow4YMXXdFkkyvJX` ($99/month)

Add them to `.env.local`:
```env
STRIPE_PRICE_ID_PRO=price_1SdDAAHCnow4YMXXv3N7Nc3C
STRIPE_PRICE_ID_TEAMS=price_1SdDFIHCnow4YMXXdFkkyvJX
```

### 3. Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. Enter endpoint URL:
   - **Local**: `http://localhost:3000/api/webhooks/stripe` (use Stripe CLI)
   - **Production**: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 4. Test Webhooks Locally (Optional)

Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
# Download from https://github.com/stripe/stripe-cli/releases
```

Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret from the output and use it for `STRIPE_WEBHOOK_SECRET` in development.

### 5. Run Database Migration

Run the migration to create the `user_profiles` table:

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy and paste the SQL from `supabase/migrations/002_create_user_profiles_table.sql`
3. Run the query

Or use Supabase CLI:
```bash
supabase db push
```

### 6. Update Next.js Environment Variables

Make sure your `.env.local` includes:

```env
# Existing Supabase vars
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe vars
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Update API Route with Your Price ID

Edit `app/api/checkout/session/route.ts` and replace the placeholder:

```typescript
price: process.env.STRIPE_PRICE_ID_PRO || 'price_1234567890',
```

Should be:

```typescript
price: process.env.STRIPE_PRICE_ID_PRO,
```

## Testing

### Test Checkout Flow

1. Sign in to your app
2. Click "Upgrade" button
3. Use Stripe test card: `4242 4242 4242 4242`
4. Any future expiry date, any CVC
5. Complete checkout
6. Verify subscription status updates in database

### Test Webhooks

1. Use Stripe CLI to forward webhooks locally
2. Complete a test checkout
3. Check server logs for webhook processing
4. Verify user profile updated in Supabase

## Pricing Tiers

### Free Plan
- **Cost**: $0/month
- **Credits**: 10/month
- **Projects**: 3 max
- **Support**: Basic

### Pro Plan
- **Cost**: $29/month
- **Price ID**: `price_1SdDAAHCnow4YMXXv3N7Nc3C`
- **Credits**: 500/month
- **Projects**: Unlimited
- **Support**: Priority

### Teams Plan
- **Cost**: $99/month
- **Price ID**: `price_1SdDFIHCnow4YMXXdFkkyvJX`
- **Credits**: 2000/month
- **Projects**: Unlimited
- **Team Collaboration**: Yes
- **Support**: Priority

## Credit System

- Credits reset monthly based on `credits_reset_date`
- Free users: 10 credits/month
- Pro users: 500 credits/month
- Credits deducted per generation based on mode:
  - Turbo: 0.5 credits
  - Forge: 1 credit
  - Anvil: 2 credits

## Production Checklist

- [ ] Replace test keys with live keys
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set up production webhook endpoint in Stripe
- [ ] Test checkout flow end-to-end
- [ ] Set up monthly credit reset cron job (optional)
- [ ] Monitor webhook events in Stripe Dashboard
- [ ] Set up error monitoring for failed webhooks

## Troubleshooting

**Webhook not receiving events:**
- Verify webhook URL is correct
- Check webhook secret matches
- Ensure endpoint is publicly accessible (for production)
- Check Stripe Dashboard → Webhooks for error logs

**Credits not updating:**
- Verify database migration ran successfully
- Check webhook is processing events
- Review server logs for errors
- Verify user profile exists in database

**Checkout not working:**
- Verify Stripe keys are correct
- Check Price ID matches Stripe Dashboard
- Ensure `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Check browser console for errors

