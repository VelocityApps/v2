import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

/**
 * PATCH /api/automations/[id]/resume
 * Resume a paused automation
 */
export async function PATCH(
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

    const { id } = await params;

    // Verify ownership
    const { data: userAutomation, error: fetchError } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !userAutomation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    // Require an active subscription — prevents bypassing billing wall
    if (!userAutomation.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'A subscription is required to resume this automation' },
        { status: 402 }
      );
    }

    // Verify the subscription is actually active in Stripe
    const subscription = await stripe.subscriptions.retrieve(
      userAutomation.stripe_subscription_id
    );
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return NextResponse.json(
        { error: 'Subscription is not active. Please update your payment method.' },
        { status: 402 }
      );
    }

    // Update status to active
    const { data, error } = await supabaseAdmin
      .from('user_automations')
      .update({ status: 'active', error_message: null })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, userAutomation: data });
  } catch (error: any) {
    console.error('Error resuming automation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume automation' },
      { status: 500 }
    );
  }
}



