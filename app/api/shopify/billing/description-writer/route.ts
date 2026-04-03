import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';
import { checkCheckoutRateLimit } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

/**
 * POST /api/shopify/billing/description-writer
 * Creates a Stripe checkout session for the AI Description Writer add-on (£19/mo).
 * Returns { url } — redirect the user to this Stripe-hosted checkout page.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkCheckoutRateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) },
    });
  }

  // Already subscribed
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('has_description_writer, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.has_description_writer) {
    return NextResponse.json({ error: 'Already subscribed to AI Description Writer' }, { status: 400 });
  }

  // Get or create Stripe customer
  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from('user_profiles')
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: 'user_id' });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
  const priceId = process.env.STRIPE_PRICE_ID_DESCRIPTION_WRITER;

  if (!priceId) {
    console.error('[description-writer/billing] STRIPE_PRICE_ID_DESCRIPTION_WRITER is not set');
    return NextResponse.json({ error: 'Billing not configured' }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/description-writer?activated=true`,
    cancel_url: `${appUrl}/dashboard/description-writer?billing=declined`,
    metadata: {
      user_id: user.id,
      type: 'description_writer',
    },
  });

  return NextResponse.json({ url: session.url });
}
