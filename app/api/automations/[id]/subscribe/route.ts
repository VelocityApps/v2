import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';
import { checkCheckoutRateLimit } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

/**
 * POST /api/automations/[id]/subscribe
 * Create a Stripe Checkout session for a per-automation subscription.
 * Returns { url } — the client should redirect to it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkCheckoutRateLimit(user.id);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) },
      });
    }

    const { id } = await params;

    // Fetch user_automations + joined automation, verify ownership
    const { data: userAutomation, error: fetchError } = await supabaseAdmin
      .from('user_automations')
      .select('*, automation:automations(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !userAutomation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Already active with a subscription — nothing to do
    if (userAutomation.status === 'active' && userAutomation.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'This automation already has an active subscription' },
        { status: 400 }
      );
    }

    const automation = userAutomation.automation;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Lazy-create Stripe Product + Price if not yet created for this automation
    let stripePriceId: string = automation.stripe_price_id;

    if (!stripePriceId) {
      const product = await stripe.products.create({
        name: automation.name,
        metadata: {
          automation_id: automation.id,
          slug: automation.slug,
        },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round((automation.price_monthly || 0) * 100),
        currency: 'gbp',
        recurring: { interval: 'month' },
      });

      stripePriceId = price.id;

      // Persist the price ID so future subscribers reuse it
      await supabaseAdmin
        .from('automations')
        .update({ stripe_price_id: stripePriceId })
        .eq('id', automation.id);
    }

    // Get or create Stripe customer from user_profiles
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId: string = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // Carry forward remaining trial days if still in trial
    let subscriptionData: Stripe.Checkout.SessionCreateParams['subscription_data'] | undefined;
    if (userAutomation.status === 'trial' && userAutomation.trial_ends_at) {
      const trialEndsAt = new Date(userAutomation.trial_ends_at).getTime();
      if (trialEndsAt > Date.now()) {
        subscriptionData = {
          trial_end: Math.floor(trialEndsAt / 1000),
        };
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      subscription_data: subscriptionData,
      success_url: `${appUrl}/dashboard/automations/${id}?billing=success`,
      cancel_url: `${appUrl}/dashboard/automations/${id}`,
      metadata: {
        type: 'automation',
        user_automation_id: id,
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[subscribe] Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
