import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';
import { checkCheckoutRateLimit } from '@/lib/rate-limit';
import { validateUUID } from '@/lib/validation';

/**
 * POST /api/automations/[id]/subscribe
 * Creates a Shopify AppSubscription charge for a per-automation subscription.
 * Returns { url } — the confirmation URL the merchant must visit to approve billing.
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

    if (!validateUUID(id)) {
      return NextResponse.json({ error: 'Invalid automation ID' }, { status: 400 });
    }

    const { data: userAutomation, error: fetchError } = await supabaseAdmin
      .from('user_automations')
      .select('*, automation:automations(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !userAutomation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Already active with a Shopify subscription — nothing to do
    if (userAutomation.status === 'active' && userAutomation.shopify_charge_id) {
      return NextResponse.json(
        { error: 'This automation already has an active subscription' },
        { status: 400 }
      );
    }

    if (!userAutomation.shopify_access_token_encrypted) {
      return NextResponse.json({ error: 'Shopify store not connected' }, { status: 400 });
    }

    const automation = userAutomation.automation;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';

    // Optional: embedded context passes host so billing callback can redirect
    // back into the Shopify admin rather than the standalone dashboard.
    const body = await request.json().catch(() => ({}));
    const embeddedHost: string = typeof body.host === 'string' ? body.host : '';

    // Carry forward remaining trial days if still within trial
    let trialDays = 0;
    if (userAutomation.status === 'trial' && userAutomation.trial_ends_at) {
      const msRemaining = new Date(userAutomation.trial_ends_at).getTime() - Date.now();
      if (msRemaining > 0) {
        trialDays = Math.ceil(msRemaining / 86_400_000);
      }
    }

    const accessToken = await decryptToken(userAutomation.shopify_access_token_encrypted);
    const shopify = new ShopifyClient(userAutomation.shopify_store_url, accessToken);

    const returnUrl = embeddedHost
      ? `${appUrl}/api/billing/shopify/callback?user_automation_id=${id}&embedded=1&host=${encodeURIComponent(embeddedHost)}`
      : `${appUrl}/api/billing/shopify/callback?user_automation_id=${id}`;
    const isTest = process.env.NODE_ENV !== 'production';

    const { confirmationUrl, gid } = await shopify.createAppSubscription({
      name: automation.name,
      returnUrl,
      priceMonthly: automation.price_monthly || 0,
      currencyCode: 'GBP',
      trialDays,
      test: isTest,
    });

    // Store the pending GID so we can look it up on callback
    const numericId = gid.split('/').pop() || '';
    await supabaseAdmin
      .from('user_automations')
      .update({ shopify_charge_id: numericId })
      .eq('id', id);

    return NextResponse.json({ url: confirmationUrl });
  } catch (error: any) {
    console.error('[subscribe] Error creating Shopify subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
