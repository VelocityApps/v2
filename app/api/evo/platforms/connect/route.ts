/**
 * POST /api/evo/platforms/connect
 *
 * Connects a platform to Evo for a merchant.
 *
 * Shopify: reuses the access token already granted during the Velocity Apps
 * automation setup — no additional OAuth scopes are required because
 * read_inventory + write_inventory are already in the default scope list.
 * Steps:
 *   1. Find the merchant's active user_automations record for this shop
 *   2. Decrypt the stored access token
 *   3. Fetch the primary location ID from Shopify
 *   4. Register inventory_levels/update + orders/create webhooks
 *   5. Upsert an evo_platforms row with the encrypted credentials
 *
 * Amazon / Etsy / eBay: returns 501 Not Implemented (future release).
 *
 * Body: { platform: 'shopify' | 'amazon' | 'etsy' | 'ebay' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { encryptCredentials, decryptCredentials } from '@/lib/evo/encrypt';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? '';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────────
  let body: { platform?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { platform } = body;
  if (!platform) {
    return NextResponse.json({ error: 'platform is required' }, { status: 400 });
  }

  // ── Dispatch by platform ──────────────────────────────────────────────────────
  switch (platform) {
    case 'shopify':
      return connectShopify(user.id);
    case 'amazon':
    case 'etsy':
    case 'ebay':
      return NextResponse.json(
        { error: `${platform} connections are not yet available` },
        { status: 501 },
      );
    default:
      return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  }
}

// ── Shopify connection ────────────────────────────────────────────────────────

async function connectShopify(userId: string): Promise<NextResponse> {
  // Find an active automation record that has a Shopify token
  const { data: uas } = await supabaseAdmin
    .from('user_automations')
    .select('shopify_store_url, shopify_access_token_encrypted')
    .eq('user_id', userId)
    .in('status', ['active', 'trial'])
    .not('shopify_access_token_encrypted', 'is', null)
    .limit(1);

  const ua = uas?.[0];
  if (!ua) {
    return NextResponse.json(
      { error: 'No active Shopify store found. Install at least one automation first.' },
      { status: 422 },
    );
  }

  // Decrypt the existing access token
  let accessToken: string;
  try {
    accessToken = await decryptCredentials(ua.shopify_access_token_encrypted);
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt Shopify credentials' }, { status: 500 });
  }

  // Normalise shop domain
  const shopDomain = ua.shopify_store_url
    .replace(/^https?:\/\//i, '')
    .toLowerCase()
    .split('/')[0];

  // Fetch the primary location from Shopify
  let primaryLocationId: string | null = null;
  try {
    const locRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/locations.json?active=true&limit=1`,
      { headers: { 'X-Shopify-Access-Token': accessToken } },
    );
    if (locRes.ok) {
      const locData = await locRes.json();
      primaryLocationId = locData.locations?.[0]?.id ? String(locData.locations[0].id) : null;
    }
  } catch (err: any) {
    console.warn('[Evo/Connect/Shopify] Could not fetch locations:', err.message);
  }

  // Register Evo webhooks (idempotent — Shopify returns existing if already registered)
  const webhookBase = APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`;
  const webhookTopics = ['inventory_levels/update', 'orders/create', 'orders/updated', 'orders/cancelled'];

  for (const topic of webhookTopics) {
    try {
      await fetch(`https://${shopDomain}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: `${webhookBase}/api/evo/webhooks/shopify`,
            format: 'json',
          },
        }),
      });
    } catch (err: any) {
      // Non-fatal — the webhook may already exist. Proceed.
      console.warn(`[Evo/Connect/Shopify] Webhook registration for ${topic}:`, err.message);
    }
  }

  // Encrypt credentials blob for evo_platforms
  const credentialsJson = JSON.stringify({ access_token: accessToken });
  const credentialsEncrypted = await encryptCredentials(credentialsJson);

  // Upsert evo_platforms record
  const { error: upsertError } = await supabaseAdmin
    .from('evo_platforms')
    .upsert(
      {
        user_id: userId,
        platform: 'shopify',
        platform_account_id: shopDomain,
        credentials_encrypted: credentialsEncrypted,
        status: 'active',
        error_message: null,
        last_synced_at: new Date().toISOString(),
        metadata: primaryLocationId ? { primary_location_id: primaryLocationId } : {},
      },
      { onConflict: 'user_id,platform,platform_account_id' },
    );

  if (upsertError) {
    console.error('[Evo/Connect/Shopify] Upsert error:', upsertError);
    return NextResponse.json({ error: 'Failed to save platform connection' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    shop: shopDomain,
    primary_location_id: primaryLocationId,
    webhooks_registered: webhookTopics,
  });
}
