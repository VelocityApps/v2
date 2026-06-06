import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptCredentials } from '@/lib/evo/encrypt';
import { checkCheckoutRateLimit } from '@/lib/rate-limit';
import { isTestCharge } from '@/lib/shopify/billing';

const EVO_PRICE_MONTHLY = 29;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';

/**
 * POST /api/shopify/billing/evo
 * Creates a Shopify AppSubscription charge for the Evo multi-platform inventory
 * sync product ($29/mo). Returns { url } — redirect the merchant to the hosted
 * Shopify approval page.
 *
 * Prerequisites:
 *   - The merchant must have connected their Shopify store to Evo via
 *     POST /api/evo/platforms/connect (this creates the evo_platforms row and
 *     stores their access token there).
 */
export async function POST(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Rate limit ────────────────────────────────────────────────────────────
  const rl = checkCheckoutRateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) },
    });
  }

  // ── Already subscribed? ───────────────────────────────────────────────────
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('has_evo')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.has_evo) {
    return NextResponse.json({ error: 'Already subscribed to Evo' }, { status: 400 });
  }

  // ── Resolve Evo Shopify platform ──────────────────────────────────────────
  const { data: platform } = await supabaseAdmin
    .from('evo_platforms')
    .select('platform_account_id, credentials_encrypted')
    .eq('user_id', user.id)
    .eq('platform', 'shopify')
    .eq('status', 'active')
    .maybeSingle();

  if (!platform?.credentials_encrypted) {
    return NextResponse.json(
      { error: 'Connect your Shopify store to Evo first.' },
      { status: 422 },
    );
  }

  // ── Create AppSubscription ────────────────────────────────────────────────
  let accessToken: string;
  try {
    const creds = JSON.parse(await decryptCredentials(platform.credentials_encrypted));
    accessToken = creds.access_token;
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt Shopify credentials' }, { status: 500 });
  }

  const shopDomain = platform.platform_account_id;
  const shopify = new ShopifyClient(shopDomain, accessToken);

  // Only fetch shop plan in production — in dev NODE_ENV check is sufficient
  const shopPlan = process.env.NODE_ENV === 'production' ? await shopify.getShopPlan() : null;

  const returnUrl = `${APP_URL}/api/shopify/billing/evo/callback?user_id=${user.id}`;

  const { confirmationUrl, gid } = await shopify.createAppSubscription({
    name: 'Evo — Multi-Platform Inventory Sync',
    returnUrl,
    priceMonthly: EVO_PRICE_MONTHLY,
    currencyCode: 'USD',
    trialDays: 7,
    test: isTestCharge(shopPlan),
  });

  // Store pending charge ID so the callback can verify it (IDOR protection)
  const chargeId = gid.split('/').pop() || '';
  await supabaseAdmin
    .from('user_profiles')
    .upsert({ user_id: user.id, evo_charge_id: chargeId }, { onConflict: 'user_id' });

  return NextResponse.json({ url: confirmationUrl });
}
