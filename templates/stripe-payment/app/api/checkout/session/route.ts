import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Create Stripe Checkout Session
 * 
 * POST /api/checkout/session
 * 
 * Body:
 * {
 *   priceId: string,        // Stripe Price ID
 *   mode: 'subscription' | 'payment',  // subscription for recurring, payment for one-time
 *   tierId?: string,        // Optional: your internal tier identifier
 *   customerId?: string,    // Optional: existing Stripe customer ID
 *   email?: string,         // Optional: customer email
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, mode = 'subscription', tierId, customerId, email } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Validate mode
    if (mode !== 'subscription' && mode !== 'payment') {
      return NextResponse.json(
        { error: 'Mode must be "subscription" or "payment"' },
        { status: 400 }
      );
    }

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create or retrieve customer
    let stripeCustomerId = customerId;
    if (!stripeCustomerId && email) {
      // Search for existing customer by email
      const customers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email,
          metadata: {
            tierId: tierId || '',
          },
        });
        stripeCustomerId = customer.id;
      }
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      metadata: {
        tierId: tierId || '',
      },
      // Enable automatic tax calculation (optional)
      // automatic_tax: { enabled: true },
    };

    // Add customer if available
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else if (email) {
      sessionParams.customer_email = email;
    }

    // For subscriptions, add billing portal configuration
    if (mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          tierId: tierId || '',
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

