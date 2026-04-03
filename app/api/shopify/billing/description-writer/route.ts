import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';
import { checkCheckoutRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/shopify/billing/description-writer
 * Creates a Shopify AppSubscription charge for the AI Description Writer add-on (£19/mo).
 * Returns { url } — the Shopify confirmation URL the merchant must visit to approve billing.
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

  // Check if already subscribed
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('has_description_writer')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.has_description_writer) {
    return NextResponse.json({ error: 'Already subscribed to AI Description Writer' }, { status: 400 });
  }

  // Find a connected Shopify store from any active/trial automation
  const { data: userAutomation } = await supabaseAdmin
    .from('user_automations')
    .select('shopify_store_url, shopify_access_token_encrypted')
    .eq('user_id', user.id)
    .in('status', ['active', 'trial'])
    .not('shopify_access_token_encrypted', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!userAutomation) {
    return NextResponse.json(
      { error: 'No connected Shopify store found. Please install an automation first to link your store.' },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
  const accessToken = await decryptToken(userAutomation.shopify_access_token_encrypted);
  const shopify = new ShopifyClient(userAutomation.shopify_store_url, accessToken);

  const returnUrl = `${appUrl}/api/shopify/billing/callback?user_id=${user.id}`;
  const isTest = process.env.NODE_ENV !== 'production';

  const { confirmationUrl, gid } = await shopify.createAppSubscription({
    name: 'AI Description Writer',
    returnUrl,
    priceMonthly: 19.00,
    currencyCode: 'GBP',
    trialDays: 0,
    test: isTest,
  });

  const numericId = gid.split('/').pop() || '';

  // Persist pending charge so the callback can verify it
  await supabaseAdmin
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        description_writer_charge_id: numericId,
        description_writer_shopify_store: userAutomation.shopify_store_url,
      },
      { onConflict: 'user_id' }
    );

  return NextResponse.json({ url: confirmationUrl });
}
