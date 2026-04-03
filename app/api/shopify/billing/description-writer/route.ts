import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';
import { checkCheckoutRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/shopify/billing/description-writer
 * Creates a Shopify AppSubscription charge for the AI Description Writer add-on (£19/mo).
 * Returns { url } — redirect the user to Shopify's hosted approval page.
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
    .select('has_description_writer')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.has_description_writer) {
    return NextResponse.json({ error: 'Already subscribed to AI Description Writer' }, { status: 400 });
  }

  // Get a Shopify connection for this user (any active automation)
  const { data: ua } = await supabaseAdmin
    .from('user_automations')
    .select('shopify_store_url, shopify_access_token_encrypted')
    .eq('user_id', user.id)
    .not('shopify_access_token_encrypted', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!ua?.shopify_access_token_encrypted || !ua?.shopify_store_url) {
    return NextResponse.json({ error: 'No Shopify store connected. Install an automation first.' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
  const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
  const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);

  const returnUrl = `${appUrl}/api/shopify/billing/callback?user_id=${user.id}`;
  const isTest = process.env.NODE_ENV !== 'production';

  const { confirmationUrl, gid } = await shopify.createAppSubscription({
    name: 'AI Description Writer',
    returnUrl,
    priceMonthly: 19,
    currencyCode: 'GBP',
    trialDays: 0,
    test: isTest,
  });

  // Store pending charge ID so callback can verify it
  const chargeId = gid.split('/').pop() || '';
  await supabaseAdmin
    .from('user_profiles')
    .update({ description_writer_charge_id: chargeId })
    .eq('user_id', user.id);

  return NextResponse.json({ url: confirmationUrl });
}
