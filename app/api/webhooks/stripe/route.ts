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

        if (session.metadata?.type === 'description_writer') {
          // AI Description Writer add-on
          const userId = session.metadata.user_id;
          if (userId && session.subscription) {
            await supabaseAdmin
              .from('user_profiles')
              .update({
                has_description_writer: true,
                description_writer_charge_id: session.subscription as string,
              })
              .eq('user_id', userId);
          }
        } else if (session.metadata?.type === 'automation') {
          // Per-automation subscription checkout completed
          const userAutomationId = session.metadata.user_automation_id;
          if (userAutomationId && session.subscription) {
            await supabaseAdmin
              .from('user_automations')
              .update({
                status: 'active',
                stripe_subscription_id: session.subscription as string,
                error_message: null,
              })
              .eq('id', userAutomationId);
          }
        } else {
          // Account-level plan checkout
          const userId = session.metadata?.user_id;

          if (userId && session.subscription) {
            const { data: currentProfile } = await supabaseAdmin
              .from('user_profiles')
              .select('subscription_status')
              .eq('user_id', userId)
              .single();

            const fromTier = currentProfile?.subscription_status || 'free';
            const toTier = (session.metadata?.plan_type === 'teams') ? 'teams' : 'pro';

            await supabaseAdmin
              .from('user_profiles')
              .update({
                subscription_status: toTier,
                stripe_subscription_id: session.subscription as string,
                credits_remaining: toTier === 'teams' ? 2000.0 : 500.0,
                credits_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq('user_id', userId);

            if (fromTier !== toTier) {
              await logUpgrade(userId, {
                from_tier: fromTier,
                to_tier: toTier,
                amount: toTier === 'teams' ? 99 : 29,
              });
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Check if this subscription belongs to a user_automation first
        const { data: ua } = await supabaseAdmin
          .from('user_automations')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (ua) {
          const newStatus = (subscription.status === 'active' || subscription.status === 'trialing')
            ? 'active'
            : 'paused';
          await supabaseAdmin
            .from('user_automations')
            .update({ status: newStatus })
            .eq('id', ua.id);
        } else {
          // Fall through to account-level plan logic
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
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Check if this is a description writer subscription
        const { data: dwProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id')
          .eq('description_writer_charge_id', subscription.id)
          .maybeSingle();

        if (dwProfile) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ has_description_writer: false, description_writer_charge_id: null })
            .eq('user_id', dwProfile.user_id);
          break;
        }

        // Check if this subscription belongs to a user_automation first
        const { data: ua } = await supabaseAdmin
          .from('user_automations')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (ua) {
          await supabaseAdmin
            .from('user_automations')
            .update({ status: 'cancelled', stripe_subscription_id: null })
            .eq('id', ua.id);
        } else {
          // Fall through to account-level plan logic
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('user_id, subscription_status')
            .eq('stripe_customer_id', subscription.customer as string)
            .single();

          if (profile) {
            const previousTier = profile.subscription_status || 'free';

            await supabaseAdmin
              .from('user_profiles')
              .update({
                subscription_status: 'free',
                credits_remaining: 10.0,
                credits_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                stripe_subscription_id: null,
              })
              .eq('user_id', profile.user_id);

            if (previousTier !== 'free' && previousTier !== 'cancelled') {
              await logChurn(profile.user_id, {
                subscription_tier: previousTier,
              });
            }
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
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

          if (profile && (profile.subscription_status === 'pro' || profile.subscription_status === 'teams')) {
            const credits = profile.subscription_status === 'teams' ? 2000.0 : 500.0;
            await supabaseAdmin
              .from('user_profiles')
              .update({
                credits_remaining: credits,
                credits_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq('user_id', profile.user_id);
          }
          // Automation subscriptions don't use credits — no action needed for them
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
          // Check if this belongs to an automation subscription
          const { data: ua } = await supabaseAdmin
            .from('user_automations')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (ua) {
            // Pause the automation; Stripe retries automatically.
            // customer.subscription.deleted fires if all retries are exhausted.
            await supabaseAdmin
              .from('user_automations')
              .update({ status: 'paused' })
              .eq('id', ua.id);
          } else {
            // Account-level plan payment failure
            const { data: profile } = await supabaseAdmin
              .from('user_profiles')
              .select('user_id, subscription_status')
              .eq('stripe_subscription_id', subscriptionId)
              .single();

            if (profile) {
              console.error(`[Stripe] Payment failed for user ${profile.user_id}, subscription ${subscriptionId}`);

              const { sendAlertEmail } = await import('@/lib/email');
              await sendAlertEmail(
                `Payment failed – user ${profile.user_id}`,
                `<p>Stripe payment failed for subscription <strong>${subscriptionId}</strong> (user: ${profile.user_id}, tier: ${profile.subscription_status}).</p><p>Stripe will retry automatically. No action needed unless retries are exhausted.</p>`
              ).catch(() => {}); // non-blocking
            }
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
