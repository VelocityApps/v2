# Stripe Payment Integration Template

A complete Stripe payment integration template with pricing pages, checkout sessions, webhooks, customer portal, and success/cancel pages.

## ✨ Features

- ✅ **Pricing Cards** - Beautiful, responsive pricing tiers
- ✅ **Checkout Sessions** - One-time payments and subscriptions
- ✅ **Webhook Handler** - Process payment events securely
- ✅ **Success/Cancel Pages** - User-friendly post-payment experience
- ✅ **Customer Portal** - Let customers manage subscriptions
- ✅ **Multiple Pricing Tiers** - Free, Pro, Teams examples
- ✅ **Fully Styled** - Modern UI with Tailwind CSS
- ✅ **TypeScript** - Fully typed for better development experience
- ✅ **Production Ready** - Error handling and security best practices

## 🚀 Quick Start

### 1. Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in top right)
3. Navigate to **Developers** → **API keys**
4. Copy your keys:
   - **Publishable key** (`pk_test_...`)
   - **Secret key** (`sk_test_...`)

### 2. Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PRICE_ID_PRO=price_1234567890
STRIPE_PRICE_ID_TEAMS=price_0987654321

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Create Products and Prices in Stripe

1. Go to **Products** in Stripe Dashboard
2. Click **+ Add product**
3. Create your products:
   - **Pro Plan**: $29/month (recurring)
   - **Teams Plan**: $99/month (recurring)
4. Copy the **Price ID** (starts with `price_...`)
5. Add them to your `.env.local` file

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/pricing` to see the pricing page.

## 📋 Setup Instructions

### Setting Up Products

1. **Go to Stripe Dashboard** → **Products**
2. **Click "+ Add product"**
3. **Fill in product details:**
   - Name: "Pro Plan"
   - Description: "Professional features"
   - Pricing: $29/month (recurring)
4. **Save and copy the Price ID** (starts with `price_...`)
5. **Repeat for other tiers**

### Setting Up Webhooks

#### For Local Development:

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows (using Scoop)
   scoop install stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe CLI:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copy the webhook signing secret** (starts with `whsec_...`) and add to `.env.local`

#### For Production:

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** and add to your production environment variables

### Testing with Test Cards

Stripe provides test card numbers for testing:

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Declined Payment:**
- Card: `4000 0000 0000 0002`

**Requires Authentication (3D Secure):**
- Card: `4000 0025 0000 3155`

**More test cards:** [Stripe Test Cards](https://stripe.com/docs/testing)

## 🏗️ Project Structure

```
stripe-payment/
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   │   └── session/
│   │   │       └── route.ts          # Create checkout session
│   │   ├── webhooks/
│   │   │   └── stripe/
│   │   │       └── route.ts          # Webhook handler
│   │   └── customer-portal/
│   │       └── route.ts              # Customer portal session
│   └── checkout/
│       ├── success/
│       │   └── page.tsx               # Success page
│       └── cancel/
│           └── page.tsx               # Cancel page
├── components/
│   ├── PricingCard.tsx                # Pricing tier card
│   └── CheckoutButton.tsx             # Checkout button
├── pricing-page.tsx                   # Main pricing page
├── package.json
├── .env.example
└── README.md
```

## 🔧 API Endpoints

### POST `/api/checkout/session`

Create a Stripe checkout session.

**Request Body:**
```json
{
  "priceId": "price_1234567890",
  "mode": "subscription",  // or "payment" for one-time
  "tierId": "pro",          // optional
  "customerId": "cus_...",  // optional
  "email": "user@example.com" // optional
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### POST `/api/webhooks/stripe`

Handle Stripe webhook events. This endpoint:
- Verifies webhook signatures
- Processes payment events
- Updates your database
- Sends confirmation emails (if configured)

### POST `/api/customer-portal`

Create a customer portal session.

**Request Body:**
```json
{
  "customerId": "cus_1234567890"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

## 💳 Usage Examples

### Creating a Checkout Session

```typescript
const response = await fetch('/api/checkout/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    priceId: 'price_1234567890',
    mode: 'subscription',
    tierId: 'pro',
    email: 'customer@example.com',
  }),
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe Checkout
```

### Opening Customer Portal

```typescript
const response = await fetch('/api/customer-portal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customerId: 'cus_1234567890',
  }),
});

const { url } = await response.json();
window.location.href = url; // Redirect to Customer Portal
```

## 🔒 Security Best Practices

1. **Never expose secret keys** - Keep `STRIPE_SECRET_KEY` server-side only
2. **Verify webhook signatures** - Always verify webhook requests
3. **Use HTTPS in production** - Required for webhooks
4. **Validate user input** - Always validate price IDs and customer IDs
5. **Handle errors gracefully** - Don't expose sensitive error details
6. **Use environment variables** - Never hardcode API keys

## 🚀 Going Live

### 1. Switch to Live Mode

1. Go to Stripe Dashboard
2. Toggle from **Test mode** to **Live mode**
3. Get your **live API keys** (different from test keys)
4. Update environment variables with live keys

### 2. Update Webhook Endpoint

1. Create a new webhook endpoint with your production URL
2. Update `STRIPE_WEBHOOK_SECRET` with the live webhook secret

### 3. Update Price IDs

1. Create products in live mode
2. Update `STRIPE_PRICE_ID_PRO` and `STRIPE_PRICE_ID_TEAMS` with live price IDs

### 4. Test Everything

- Test checkout flow
- Test webhook events
- Test customer portal
- Test subscription cancellation

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Test Cards](https://stripe.com/docs/testing)

## 🐛 Troubleshooting

### Webhook not receiving events

1. Check webhook endpoint URL is correct
2. Verify webhook secret is set correctly
3. Check Stripe Dashboard → Webhooks for event logs
4. For local development, use Stripe CLI

### Checkout session not creating

1. Verify Stripe API keys are correct
2. Check price ID exists in Stripe Dashboard
3. Ensure mode is 'subscription' or 'payment'
4. Check server logs for errors

### Customer portal not working

1. Verify customer ID is correct
2. Ensure customer exists in Stripe
3. Check return URL is set correctly

## 📝 License

MIT

---

**Happy Building! 💳**

