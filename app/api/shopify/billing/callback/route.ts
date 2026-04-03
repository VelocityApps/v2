import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';

/**
 * GET /api/shopify/billing/callback
 * Shopify redirects here after the merchant approves (or declines) the
 * AI Description Writer subscription.
 *
 * Query params:
 *   user_id   — our internal user ID (embedded in the returnUrl we passed)
 *   charge_id — numeric AppSubscription ID appended by Shopify
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const chargeId = searchParams.get('charge_id');

  if (!userId || !chargeId) {
    return NextResponse.redirect(`${appUrl}/dashboard/description-writer?billing=error&reason=missing_params`);
  }

  try {
    // Get user's Shopify connection
    const { data: ua } = await supabaseAdmin
      .from('user_automations')
      .select('shopify_store_url, shopify_access_token_encrypted')
      .eq('user_id', userId)
      .not('shopify_access_token_encrypted', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!ua?.shopify_access_token_encrypted || !ua?.shopify_store_url) {
      return NextResponse.redirect(`${appUrl}/dashboard/description-writer?billing=error&reason=no_store`);
    }

    const accessToken = await decryptToken(ua.shopify_access_token_encrypted);
    const shopify = new ShopifyClient(ua.shopify_store_url, accessToken);

    const gid = `gid://shopify/AppSubscription/${chargeId}`;
    const subscription = await shopify.getAppSubscription(gid);

    if (!subscription) {
      return NextResponse.redirect(`${appUrl}/dashboard/description-writer?billing=error&reason=not_found`);
    }

    const status = subscription.status.toUpperCase();

    if (status === 'ACTIVE' || status === 'PENDING') {
      await supabaseAdmin
        .from('user_profiles')
        .update({
          has_description_writer: true,
          description_writer_charge_id: chargeId,
        })
        .eq('user_id', userId);

      return NextResponse.redirect(`${appUrl}/dashboard/description-writer?activated=true`);
    }

    if (status === 'DECLINED') {
      // Clear the pending charge ID — merchant chose not to approve
      await supabaseAdmin
        .from('user_profiles')
        .update({ description_writer_charge_id: null })
        .eq('user_id', userId);
      return NextResponse.redirect(`${appUrl}/dashboard/description-writer?billing=declined`);
    }

    return NextResponse.redirect(
      `${appUrl}/dashboard/description-writer?billing=error&reason=${status.toLowerCase()}`
    );
  } catch (err: any) {
    console.error('[shopify/billing/callback] Error:', err);
    return NextResponse.redirect(`${appUrl}/dashboard/description-writer?billing=error&reason=server_error`);
  }
}
