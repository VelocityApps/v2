import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { ShopifyClient } from '@/lib/shopify/client';

/**
 * DEBUG ONLY - remove before launch
 * GET /api/debug/shopify-webhooks?user_automation_id=xxx
 * Lists webhooks registered on Shopify for a given user automation
 */
export async function GET(request: NextRequest) {
  const userAutomationId = request.nextUrl.searchParams.get('user_automation_id');
  if (!userAutomationId) {
    return NextResponse.json({ error: 'user_automation_id required' }, { status: 400 });
  }

  const { data: ua } = await supabaseAdmin
    .from('user_automations')
    .select('*')
    .eq('id', userAutomationId)
    .single();

  if (!ua) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const shopify = await ShopifyClient.fromEncryptedToken(
    ua.shopify_store_url,
    ua.shopify_access_token_encrypted
  );

  const webhooks = await shopify.getWebhooks();

  const { data: registeredWebhooks } = await supabaseAdmin
    .from('automation_webhooks')
    .select('*')
    .eq('user_automation_id', userAutomationId);

  return NextResponse.json({ shopify_webhooks: webhooks, db_webhooks: registeredWebhooks, store: ua.shopify_store_url });
}
