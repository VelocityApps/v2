import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';

/**
 * GET /api/shopify/billing/callback
 * Shopify redirects the merchant here after they approve (or decline) the
 * AI Description Writer subscription charge.
 *
 * Query params (sent by us via returnUrl):
 *   user_id   — our internal user UUID
 * Query params (appended by Shopify):
 *   charge_id — numeric AppSubscription ID
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const chargeId = searchParams.get('charge_id');

  if (!userId || !chargeId) {
    return NextResponse.redirect(`${appUrl}/dashboard?billing=error&reason=missing_params`);
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('description_writer_charge_id, description_writer_shopify_store')
      .eq('user_id', userId)
      .single();

    if (!profile?.description_writer_shopify_store) {
      return NextResponse.redirect(`${appUrl}/dashboard?billing=error&reason=no_store`);
    }

    // Find the Shopify access token for this store
    const storeHost = profile.description_writer_shopify_store
      .replace(/^https?:\/\//i, '')
      .toLowerCase()
      .split('/')[0];

    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('shopify_access_token_encrypted')
      .eq('user_id', userId)
      .ilike('shopify_store_url', `%${storeHost}%`)
      .not('shopify_access_token_encrypted', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!userAutomation) {
      return NextResponse.redirect(`${appUrl}/dashboard?billing=error&reason=no_token`);
    }

    const accessToken = await decryptToken(userAutomation.shopify_access_token_encrypted);
    const shopify = new ShopifyClient(profile.description_writer_shopify_store, accessToken);

    const gid = `gid://shopify/AppSubscription/${chargeId}`;
    const subscription = await shopify.getAppSubscription(gid);

    if (!subscription) {
      return NextResponse.redirect(`${appUrl}/dashboard/description-writer?billing=error&reason=not_found`);
    }

    const shopifyStatus = subscription.status.toUpperCase();

    if (shopifyStatus === 'ACTIVE' || shopifyStatus === 'PENDING') {
      await supabaseAdmin
        .from('user_profiles')
        .update({
          has_description_writer: true,
          description_writer_charge_id: chargeId,
        })
        .eq('user_id', userId);

      return NextResponse.redirect(`${appUrl}/dashboard/description-writer?activated=true`);
    }

    if (shopifyStatus === 'DECLINED') {
      return NextResponse.redirect(`${appUrl}/dashboard/description-writer?billing=declined`);
    }

    return NextResponse.redirect(
      `${appUrl}/dashboard/description-writer?billing=error&reason=${shopifyStatus.toLowerCase()}`
    );
  } catch (err: any) {
    console.error('[shopify/billing/callback] Error:', err);
    return NextResponse.redirect(`${appUrl}/dashboard/description-writer?billing=error&reason=server_error`);
  }
}
