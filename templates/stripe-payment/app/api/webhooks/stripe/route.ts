import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Stripe Webhook Handler
 * 
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events:
 * - checkout.session.completed: Payment successful
 * - customer.subscription.created: New subscription
 * - customer.subscription.updated: Subscription updated
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_succeeded: Recurring payment successful
 * - invoice.payment_failed: Payment failed
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tierId = session.metadata?.tierId;
        const customerId = session.customer as string;

        console.log('Checkout completed:', {
          sessionId: session.id,
          customerId,
          tierId,
          mode: session.mode,
        });

        // Handle one-time payment
        if (session.mode === 'payment') {
          // Update your database: grant access, send confirmation email, etc.
          console.log('One-time payment completed');
          // Example: await updateUserAccess(customerId, tierId);
        }

        // Handle subscription
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = session.subscription as string;
          console.log('Subscription created:', subscriptionId);
          // Example: await createSubscription(customerId, subscriptionId, tierId);
        }

        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription created:', subscription.id);
        // Example: await activateSubscription(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id, subscription.status);
        
        // Update subscription status in your database
        // Example:
        // if (subscription.status === 'active') {
        //   await updateSubscriptionStatus(subscription.id, 'active');
        // } else if (subscription.status === 'past_due') {
        //   await updateSubscriptionStatus(subscription.id, 'past_due');
        // }
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription cancelled:', subscription.id);
        // Example: await cancelSubscription(subscription.id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment succeeded:', invoice.id);
        
        // Handle successful recurring payment
        // Example: await renewSubscription(invoice.subscription);
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', invoice.id);
        
        // Handle failed payment
        // Example: await handlePaymentFailure(invoice);
        
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

