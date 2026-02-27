import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logUpgrade, logChurn } from '@/lib/monitoring';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

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
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (userId && session.subscription) {
          // Get current profile to determine upgrade from tier
          const { data: currentProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('subscription_status')
            .eq('user_id', userId)
            .single();

          const fromTier = currentProfile?.subscription_status || 'free';

          // Use plan_type metadata stored at checkout creation time.
          // line_items is not populated in webhook payloads without explicit expansion.
          const toTier = (session.metadata?.plan_type === 'teams') ? 'teams' : 'pro';

          // Update user profile to pro/teams
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_status: toTier,
              stripe_subscription_id: session.subscription as string,
              credits_remaining: toTier === 'teams' ? 2000.0 : 500.0,
              credits_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('user_id', userId);

          // Log upgrade event
          if (fromTier !== toTier) {
            await logUpgrade(userId, {
              from_tier: fromTier,
              to_tier: toTier,
              amount: toTier === 'teams' ? 99 : 29,
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by customer ID
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (profile) {
          const status = subscription.status === 'active' ? 'pro' : 'cancelled';
          
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_status: status,
              stripe_subscription_id: subscription.id,
            })
            .eq('user_id', profile.user_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id, subscription_status')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (profile) {
          const previousTier = profile.subscription_status || 'free';
          
          // Downgrade to free plan
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_status: 'free',
              credits_remaining: 10.0,
              credits_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              stripe_subscription_id: null,
            })
            .eq('user_id', profile.user_id);

          // Log churn event
          if (previousTier !== 'free' && previousTier !== 'cancelled') {
            await logChurn(profile.user_id, {
              subscription_tier: previousTier,
            });
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Invoice subscription can be a string ID or a Subscription object
        const invoiceData = invoice as any;
        const subscriptionId = typeof invoiceData.subscription === 'string' 
          ? invoiceData.subscription 
          : invoiceData.subscription?.id || null;
        
        if (subscriptionId) {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('user_id, subscription_status')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (profile && (profile.subscription_status === 'pro' || profile.subscription_status === 'teams')) {
            // Reset credits on monthly renewal for both pro and teams
            const credits = profile.subscription_status === 'teams' ? 2000.0 : 500.0;
            await supabaseAdmin
              .from('user_profiles')
              .update({
                credits_remaining: credits,
                credits_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq('user_id', profile.user_id);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as any;
        const subscriptionId = typeof invoiceData.subscription === 'string'
          ? invoiceData.subscription
          : invoiceData.subscription?.id || null;

        if (subscriptionId) {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('user_id, subscription_status')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (profile) {
            // Log the failure – Stripe will retry automatically (Smart Retries).
            // We don't downgrade yet; Stripe will fire customer.subscription.deleted
            // if all retries fail and the subscription is cancelled.
            console.error(`[Stripe] Payment failed for user ${profile.user_id}, subscription ${subscriptionId}`);

            // Optionally notify the user via email
            const { sendAlertEmail } = await import('@/lib/email');
            await sendAlertEmail(
              `Payment failed – user ${profile.user_id}`,
              `<p>Stripe payment failed for subscription <strong>${subscriptionId}</strong> (user: ${profile.user_id}, tier: ${profile.subscription_status}).</p><p>Stripe will retry automatically. No action needed unless retries are exhausted.</p>`
            ).catch(() => {}); // non-blocking
          }
        }
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

