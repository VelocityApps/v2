import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';
import { decryptToken } from '@/lib/shopify/oauth';
import { validateUUID } from '@/lib/validation';

/**
 * GET /api/billing/shopify/callback
 * Shopify redirects the merchant here after they approve (or decline) the subscription.
 *
 * Query params:
 *   user_automation_id  — our internal ID (embedded in the returnUrl we passed)
 *   charge_id           — numeric Shopify AppSubscription ID appended by Shopify
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev';
  const { searchParams } = new URL(request.url);
  const userAutomationId = searchParams.get('user_automation_id');
  const chargeId = searchParams.get('charge_id');
  const isEmbedded = searchParams.get('embedded') === '1';
  const embeddedHost = searchParams.get('host') ?? '';
  // Embedded merchants go to /shopify/dashboard, standalone to /dashboard
  const dashBase = isEmbedded ? '/shopify/dashboard' : '/dashboard';
  const hostSuffix = isEmbedded && embeddedHost ? `&host=${encodeURIComponent(embeddedHost)}` : '';

  // Reject obviously invalid params before hitting the DB
  if (!userAutomationId || !chargeId) {
    return NextResponse.redirect(`${appUrl}/dashboard?billing=error&reason=missing_params`);
  }
  if (!validateUUID(userAutomationId)) {
    return NextResponse.redirect(`${appUrl}/dashboard?billing=error&reason=invalid_params`);
  }

  try {
    // Tie user_automation_id to charge_id: prevents IDOR where an attacker
    // substitutes someone else's user_automation_id with their own charge_id.
    const { data: userAutomation, error } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .eq('shopify_charge_id', chargeId)
      .single();

    if (error || !userAutomation) {
      return NextResponse.redirect(`${appUrl}/dashboard?billing=error&reason=not_found`);
    }

    if (!userAutomation.shopify_access_token_encrypted) {
      return NextResponse.redirect(`${appUrl}/dashboard?billing=error&reason=no_token`);
    }

    const accessToken = await decryptToken(userAutomation.shopify_access_token_encrypted);
    const shopify = new ShopifyClient(userAutomation.shopify_store_url, accessToken);

    const gid = `gid://shopify/AppSubscription/${chargeId}`;
    const subscription = await shopify.getAppSubscription(gid);

    if (!subscription) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/automations/${userAutomationId}?billing=error&reason=subscription_not_found`
      );
    }

    const shopifyStatus = subscription.status.toUpperCase();

    if (shopifyStatus === 'ACTIVE' || shopifyStatus === 'PENDING') {
      await supabaseAdmin
        .from('user_automations')
        .update({
          status: 'active',
          shopify_charge_id: chargeId,
          error_message: null,
        })
        .eq('id', userAutomationId);

      return NextResponse.redirect(
        `${appUrl}${dashBase}/automations/${userAutomationId}?billing=success${hostSuffix}`
      );
    }

    if (shopifyStatus === 'DECLINED') {
      return NextResponse.redirect(
        `${appUrl}${dashBase}/automations/${userAutomationId}?billing=declined${hostSuffix}`
      );
    }

    return NextResponse.redirect(
      `${appUrl}${dashBase}/automations/${userAutomationId}?billing=error&reason=${shopifyStatus.toLowerCase()}${hostSuffix}`
    );
  } catch (err: any) {
    console.error('[billing/shopify/callback] Error:', err);
    return NextResponse.redirect(
      `${appUrl}/dashboard/automations/${userAutomationId}?billing=error&reason=server_error`
    );
  }
}
