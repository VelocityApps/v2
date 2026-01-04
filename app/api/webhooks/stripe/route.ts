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
          
          // Determine to tier based on price
          const priceId = (session as any).line_items?.data?.[0]?.price?.id;
          const toTier = priceId === process.env.STRIPE_PRICE_ID_TEAMS ? 'teams' : 'pro';

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

          if (profile && profile.subscription_status === 'pro') {
            // Reset credits for pro users on successful payment
            await supabaseAdmin
              .from('user_profiles')
              .update({
                credits_remaining: 500.0,
                credits_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq('user_id', profile.user_id);
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

