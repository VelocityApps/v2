import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptCredentials } from '@/lib/evo/encrypt';
import { validateUUID } from '@/lib/validation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';

/**
 * GET /api/shopify/billing/evo/callback
 * Shopify redirects here after the merchant approves (or declines) the Evo
 * subscription.
 *
 * Query params:
 *   user_id   — our internal user ID (embedded in the returnUrl we passed)
 *   charge_id — numeric AppSubscription ID appended by Shopify
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId  = searchParams.get('user_id');
  const chargeId = searchParams.get('charge_id');

  const errorRedirect = (reason: string) =>
    NextResponse.redirect(`${APP_URL}/dashboard/evo?billing=error&reason=${reason}`);

  if (!userId || !chargeId) return errorRedirect('missing_params');
  if (!validateUUID(userId)) return errorRedirect('invalid_params');

  try {
    // IDOR guard: the charge_id must have been issued for this exact user_id.
    const { data: pendingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .eq('evo_charge_id', chargeId)
      .maybeSingle();

    if (!pendingProfile) return errorRedirect('invalid');

    // Resolve Evo Shopify credentials
    const { data: platform } = await supabaseAdmin
      .from('evo_platforms')
      .select('platform_account_id, credentials_encrypted')
      .eq('user_id', userId)
      .eq('platform', 'shopify')
      .maybeSingle();

    if (!platform?.credentials_encrypted) return errorRedirect('no_store');

    const creds = JSON.parse(await decryptCredentials(platform.credentials_encrypted));
    const shopify = new ShopifyClient(platform.platform_account_id, creds.access_token);

    const gid = `gid://shopify/AppSubscription/${chargeId}`;
    const subscription = await shopify.getAppSubscription(gid);

    if (!subscription) return errorRedirect('not_found');

    const status = subscription.status.toUpperCase();

    if (status === 'ACTIVE' || status === 'PENDING') {
      await supabaseAdmin
        .from('user_profiles')
        .update({ has_evo: true, evo_charge_id: chargeId })
        .eq('user_id', userId);

      return NextResponse.redirect(`${APP_URL}/dashboard/evo?activated=true`);
    }

    if (status === 'DECLINED') {
      await supabaseAdmin
        .from('user_profiles')
        .update({ evo_charge_id: null })
        .eq('user_id', userId);

      return NextResponse.redirect(`${APP_URL}/dashboard/evo?billing=declined`);
    }

    return errorRedirect(status.toLowerCase());
  } catch (err: any) {
    console.error('[billing/evo/callback] Error:', err.message);
    return errorRedirect('server_error');
  }
}
