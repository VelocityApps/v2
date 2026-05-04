/**
 * Evo Sync Engine — core inventory propagation logic.
 *
 * Primary entry points:
 *   processInventoryUpdate()  — called by every platform webhook handler
 *   ingestOrder()             — called by order webhook handlers
 *
 * Idempotency contract:
 *   Every inventory event carries source_event_id (the platform's own
 *   webhook/event ID). The partial unique index on evo_inventory_events
 *   (user_id, source_event_id WHERE NOT NULL) makes duplicate deliveries
 *   hit a PostgreSQL unique-violation (code 23505) before any state is
 *   mutated. processInventoryUpdate() inserts the audit event FIRST — if
 *   that insert fails with 23505, the function returns immediately without
 *   touching evo_inventory_levels or propagating to other platforms.
 *
 * Cross-platform propagation:
 *   After a successful event insert the engine loads all other
 *   evo_sku_mappings that share the same (user_id, master_sku), resolves
 *   credentials for each, and calls the platform-specific push function.
 *   Failures are isolated per platform — a failed Amazon push does not
 *   block an eBay push. All propagation errors are logged but not re-thrown
 *   so the originating webhook handler always returns 200 to the source
 *   platform.
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import { decryptCredentials } from './encrypt';
import { withRetry } from './retry';
import { ShopifyClient } from '@/lib/shopify/client';
import { checkAndSendAlerts } from './alerts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EvoPlatform = 'shopify' | 'amazon' | 'etsy' | 'ebay';
export type EvoSourcePlatform = EvoPlatform | 'manual';
export type EvoTrigger = 'webhook' | 'order' | 'manual_adjustment' | 'reconciliation';

export interface ProcessInventoryUpdateParams {
  userId: string;
  /** Row ID from evo_sku_mappings — identifies the specific platform listing that changed. */
  skuMappingId: string;
  /** New absolute stock quantity reported by the source platform. */
  newQuantity: number;
  sourcePlatform: EvoSourcePlatform;
  /** Platform's own webhook/event ID. Used for idempotency. Null for manual entries. */
  sourceEventId?: string | null;
  trigger: EvoTrigger;
  /** Arbitrary extra data attached to the audit event (e.g. location_id, order_id). */
  metadata?: Record<string, unknown>;
}

export interface ProcessInventoryResult {
  /** True when this event was already processed (duplicate delivery). */
  duplicate: boolean;
  /** Platform slugs the update was successfully propagated to. */
  propagated: string[];
}

export interface IngestOrderParams {
  userId: string;
  platform: EvoPlatform;
  platformOrderId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  customerEmail?: string | null;
  customerName?: string | null;
  lineItems: Array<{
    sku?: string;
    title: string;
    quantity: number;
    unit_price?: number;
    platform_line_id?: string;
  }>;
  currency?: string;
  totalPrice?: number | null;
  platformCreatedAt?: string | null;
}

// ── processInventoryUpdate ────────────────────────────────────────────────────

export async function processInventoryUpdate(
  params: ProcessInventoryUpdateParams,
): Promise<ProcessInventoryResult> {
  const {
    userId,
    skuMappingId,
    newQuantity,
    sourcePlatform,
    sourceEventId = null,
    trigger,
    metadata = {},
  } = params;

  // ── Step 1: Read current quantity to compute a meaningful delta ─────────────
  const { data: currentLevel } = await supabaseAdmin
    .from('evo_inventory_levels')
    .select('quantity')
    .eq('sku_mapping_id', skuMappingId)
    .maybeSingle();

  const previousQuantity = currentLevel?.quantity ?? newQuantity;
  const delta = newQuantity - previousQuantity;

  // ── Step 2: Insert audit event FIRST — unique constraint enforces idempotency
  // If source_event_id is non-null and already present, this insert will throw
  // PostgreSQL error code 23505 (unique_violation). We treat that as a signal
  // that this webhook delivery was already processed and bail out immediately,
  // leaving evo_inventory_levels and downstream platforms untouched.
  const { error: eventError } = await supabaseAdmin
    .from('evo_inventory_events')
    .insert({
      user_id: userId,
      sku_mapping_id: skuMappingId,
      source_platform: sourcePlatform,
      delta,
      quantity_after: newQuantity,
      trigger,
      source_event_id: sourceEventId,
      metadata,
    });

  if (eventError) {
    if (eventError.code === '23505') {
      // Duplicate delivery — already processed, nothing to do.
      return { duplicate: true, propagated: [] };
    }
    // For any other DB error, log and continue best-effort. Inventory level
    // update and propagation should still happen.
    console.error('[EvoSync] Failed to insert inventory event:', eventError);
  }

  // ── Step 3: Upsert inventory level ─────────────────────────────────────────
  const { error: levelError } = await supabaseAdmin
    .from('evo_inventory_levels')
    .upsert(
      {
        sku_mapping_id: skuMappingId,
        user_id: userId,
        quantity: newQuantity,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'sku_mapping_id' },
    );

  if (levelError) {
    console.error('[EvoSync] Failed to upsert inventory level:', levelError);
  }

  // ── Step 4: Resolve master_sku so we can find sibling platform mappings ─────
  const { data: sourceMapping } = await supabaseAdmin
    .from('evo_sku_mappings')
    .select('master_sku')
    .eq('id', skuMappingId)
    .single();

  if (!sourceMapping) {
    // No mapping record — cannot propagate.
    return { duplicate: false, propagated: [] };
  }

  // ── Step 4.5: Check low-stock alerts ────────────────────────────────────────
  // Fire-and-forget — a failed alert must never abort inventory sync or
  // propagation. Errors are logged inside checkAndSendAlerts().
  checkAndSendAlerts({
    userId,
    masterSku: sourceMapping.master_sku,
    previousQuantity,
    newQuantity,
  }).catch((err) =>
    console.error('[EvoSync] checkAndSendAlerts threw unexpectedly:', err?.message),
  );

  // ── Step 5: Find all OTHER platform mappings for the same master_sku ────────
  const { data: siblings } = await supabaseAdmin
    .from('evo_sku_mappings')
    .select('id, platform, platform_listing_id, platform_variant_id')
    .eq('user_id', userId)
    .eq('master_sku', sourceMapping.master_sku)
    .neq('id', skuMappingId);

  if (!siblings?.length) {
    return { duplicate: false, propagated: [] };
  }

  // ── Step 6: Propagate in parallel — each failure is isolated ────────────────
  const propagated: string[] = [];

  await Promise.allSettled(
    siblings.map(async (sibling) => {
      try {
        await propagateToPlatform({ sibling, userId, newQuantity });
        propagated.push(sibling.platform);
      } catch (err: any) {
        console.error(
          `[EvoSync] Propagation to ${sibling.platform} (mapping ${sibling.id}) failed:`,
          err.message,
        );
      }
    }),
  );

  return { duplicate: false, propagated };
}

// ── ingestOrder ───────────────────────────────────────────────────────────────

/**
 * Upsert a unified order record from any platform.
 * Uses (user_id, platform, platform_order_id) as the conflict key,
 * so re-delivering the same order event is safe.
 */
export async function ingestOrder(params: IngestOrderParams): Promise<void> {
  const {
    userId,
    platform,
    platformOrderId,
    status,
    customerEmail,
    customerName,
    lineItems,
    currency = 'USD',
    totalPrice,
    platformCreatedAt,
  } = params;

  const { error } = await supabaseAdmin
    .from('evo_orders')
    .upsert(
      {
        user_id: userId,
        platform,
        platform_order_id: platformOrderId,
        status,
        customer_email: customerEmail ?? null,
        customer_name: customerName ?? null,
        line_items: lineItems,
        currency,
        total_price: totalPrice ?? null,
        platform_created_at: platformCreatedAt ?? null,
      },
      { onConflict: 'user_id,platform,platform_order_id' },
    );

  if (error) {
    console.error('[EvoSync] Failed to upsert order:', error);
    throw new Error(`ingestOrder failed: ${error.message}`);
  }
}

// ── Internal propagation ──────────────────────────────────────────────────────

interface SiblingMapping {
  id: string;
  platform: string;
  platform_listing_id: string;
  platform_variant_id: string | null;
}

async function propagateToPlatform({
  sibling,
  userId,
  newQuantity,
}: {
  sibling: SiblingMapping;
  userId: string;
  newQuantity: number;
}): Promise<void> {
  // Resolve active platform credentials
  const { data: platformRecord } = await supabaseAdmin
    .from('evo_platforms')
    .select('platform_account_id, credentials_encrypted, metadata, status')
    .eq('user_id', userId)
    .eq('platform', sibling.platform)
    .eq('status', 'active')
    .maybeSingle();

  if (!platformRecord) {
    // Platform not connected or currently inactive — skip silently.
    return;
  }

  const credentials: Record<string, string> = JSON.parse(
    await decryptCredentials(platformRecord.credentials_encrypted),
  );

  // Call the platform-specific push function
  switch (sibling.platform) {
    case 'shopify':
      await pushToShopify({
        sibling,
        platformAccountId: platformRecord.platform_account_id,
        credentials,
        platformMetadata: platformRecord.metadata ?? {},
        newQuantity,
      });
      break;
    case 'amazon':
      await pushToAmazon({ sibling, credentials, newQuantity });
      break;
    case 'etsy':
      await pushToEtsy({ sibling, credentials, newQuantity });
      break;
    case 'ebay':
      await pushToEbay({ sibling, credentials, newQuantity });
      break;
    default:
      console.warn(`[EvoSync] Unknown platform in propagation: ${sibling.platform}`);
      return;
  }

  // Record the resulting level and an audit event for this platform
  const { data: prevLevel } = await supabaseAdmin
    .from('evo_inventory_levels')
    .select('quantity')
    .eq('sku_mapping_id', sibling.id)
    .maybeSingle();

  const prevQty = prevLevel?.quantity ?? newQuantity;

  await supabaseAdmin
    .from('evo_inventory_levels')
    .upsert(
      {
        sku_mapping_id: sibling.id,
        user_id: userId,
        quantity: newQuantity,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'sku_mapping_id' },
    );

  // Propagated events have no source_event_id (we generated them).
  await supabaseAdmin.from('evo_inventory_events').insert({
    user_id: userId,
    sku_mapping_id: sibling.id,
    source_platform: sibling.platform,
    delta: newQuantity - prevQty,
    quantity_after: newQuantity,
    trigger: 'webhook',
    source_event_id: null,
    metadata: { propagated: true },
  });
}

// ── Platform push functions ───────────────────────────────────────────────────
// Shopify is fully implemented. Amazon, Etsy, and eBay are stubs that log
// the intent and throw a "not yet implemented" error so callers can distinguish
// "push was attempted but unsupported" from a transient API failure.

async function pushToShopify({
  sibling,
  platformAccountId,
  credentials,
  platformMetadata,
  newQuantity,
}: {
  sibling: SiblingMapping;
  platformAccountId: string;
  credentials: Record<string, string>;
  platformMetadata: Record<string, unknown>;
  newQuantity: number;
}): Promise<void> {
  const { access_token: accessToken } = credentials;
  // Primary location ID is stored in evo_platforms.metadata.primary_location_id
  // as a numeric string. Set during the platform connection flow.
  const locationId = String(platformMetadata?.primary_location_id ?? '');

  if (!accessToken) throw new Error('[EvoSync/Shopify] credentials missing access_token');
  if (!locationId) throw new Error('[EvoSync/Shopify] platform metadata missing primary_location_id');

  const shopDomain = platformAccountId; // e.g. mystore.myshopify.com
  const client = new ShopifyClient(shopDomain, accessToken);

  await withRetry(
    () => client.setInventoryLevel(sibling.platform_listing_id, locationId, newQuantity),
    { maxAttempts: 3, initialDelayMs: 500 },
  );
}

// ── Amazon SP-API ─────────────────────────────────────────────────────────────
// Credentials shape: { lwa_refresh_token, seller_id, marketplace_id }
// Uses PATCH /listings/2021-08-01/items/{sellerId}/{sku} to update fulfillment
// availability. The platform_listing_id for Amazon mappings is the listing SKU.

async function pushToAmazon({
  sibling,
  credentials,
  newQuantity,
}: {
  sibling: SiblingMapping;
  credentials: Record<string, string>;
  newQuantity: number;
}): Promise<void> {
  const { lwa_refresh_token, seller_id, marketplace_id } = credentials;
  const clientId     = process.env.AMAZON_LWA_CLIENT_ID;
  const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET;

  if (!lwa_refresh_token || !seller_id || !marketplace_id) {
    throw new Error('[EvoSync/Amazon] credentials missing lwa_refresh_token, seller_id, or marketplace_id');
  }
  if (!clientId || !clientSecret) {
    throw new Error('[EvoSync/Amazon] AMAZON_LWA_CLIENT_ID / AMAZON_LWA_CLIENT_SECRET not configured');
  }

  // Refresh the LWA access token
  const tokenRes = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: lwa_refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`[EvoSync/Amazon] LWA token refresh failed: ${tokenRes.status} ${body}`);
  }
  const { access_token: accessToken } = await tokenRes.json() as { access_token: string };

  const sku = sibling.platform_listing_id;
  const patchRes = await fetch(
    `https://sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/${encodeURIComponent(seller_id)}/${encodeURIComponent(sku)}?marketplaceIds=${encodeURIComponent(marketplace_id)}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productType: 'PRODUCT',
        patches: [
          {
            op: 'replace',
            path: '/attributes/fulfillment_availability',
            value: [{ fulfillment_channel_code: 'DEFAULT', quantity: newQuantity }],
          },
        ],
      }),
    },
  );

  if (!patchRes.ok) {
    const errBody = await patchRes.text();
    throw new Error(`[EvoSync/Amazon] PATCH listings failed: ${patchRes.status} ${errBody}`);
  }
}

// ── Etsy API v3 ────────────────────────────────────────────────────────────────
// Credentials shape: { refresh_token, shop_id }
// GET existing listing inventory first (to preserve product/offering structure),
// then PUT back with updated quantities on every offering.
// platform_listing_id = numeric Etsy listing ID.

async function pushToEtsy({
  sibling,
  credentials,
  newQuantity,
}: {
  sibling: SiblingMapping;
  credentials: Record<string, string>;
  newQuantity: number;
}): Promise<void> {
  const { refresh_token, shop_id } = credentials;
  const clientId = process.env.ETSY_CLIENT_ID;

  if (!refresh_token || !shop_id) {
    throw new Error('[EvoSync/Etsy] credentials missing refresh_token or shop_id');
  }
  if (!clientId) {
    throw new Error('[EvoSync/Etsy] ETSY_CLIENT_ID not configured');
  }

  // Refresh OAuth token
  const tokenRes = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token,
    }),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`[EvoSync/Etsy] token refresh failed: ${tokenRes.status} ${body}`);
  }
  const { access_token: accessToken } = await tokenRes.json() as { access_token: string };

  const listingId = sibling.platform_listing_id;
  const authHeaders = {
    'x-api-key': clientId,
    'Authorization': `Bearer ${accessToken}`,
  };

  // GET existing inventory to preserve product/offering structure
  const getRes = await fetch(
    `https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`,
    { headers: authHeaders },
  );
  if (!getRes.ok) {
    const errBody = await getRes.text();
    throw new Error(`[EvoSync/Etsy] GET inventory failed: ${getRes.status} ${errBody}`);
  }
  const existing = await getRes.json() as { products?: any[] };

  // Update quantity on all offerings — preserve all other fields
  const products = (existing.products ?? []).map((p: any) => ({
    ...p,
    offerings: (p.offerings ?? []).map((o: any) => ({
      ...o,
      quantity: newQuantity,
    })),
  }));

  const putRes = await fetch(
    `https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`,
    {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    },
  );
  if (!putRes.ok) {
    const errBody = await putRes.text();
    throw new Error(`[EvoSync/Etsy] PUT inventory failed: ${putRes.status} ${errBody}`);
  }
}

// ── eBay Inventory API ────────────────────────────────────────────────────────
// Credentials shape: { refresh_token }
// GET existing inventory_item to preserve all non-quantity fields, then PUT
// with updated shipToLocationAvailability.quantity.
// platform_listing_id = eBay SKU (used as the inventory item key).

async function pushToEbay({
  sibling,
  credentials,
  newQuantity,
}: {
  sibling: SiblingMapping;
  credentials: Record<string, string>;
  newQuantity: number;
}): Promise<void> {
  const { refresh_token } = credentials;
  const clientId     = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!refresh_token) {
    throw new Error('[EvoSync/eBay] credentials missing refresh_token');
  }
  if (!clientId || !clientSecret) {
    throw new Error('[EvoSync/eBay] EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not configured');
  }

  // Refresh OAuth token
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory',
    }),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`[EvoSync/eBay] token refresh failed: ${tokenRes.status} ${body}`);
  }
  const { access_token: accessToken } = await tokenRes.json() as { access_token: string };

  const sku = sibling.platform_listing_id;
  const ebayHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Content-Language': 'en-US',
  };

  // GET existing inventory_item to preserve product details, condition, etc.
  const getRes = await fetch(
    `https://api.ebay.com/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } },
  );
  if (!getRes.ok) {
    const errBody = await getRes.text();
    throw new Error(`[EvoSync/eBay] GET inventory_item failed: ${getRes.status} ${errBody}`);
  }
  const existing = await getRes.json() as Record<string, any>;

  // PUT with updated quantity — keep all other fields intact
  const putRes = await fetch(
    `https://api.ebay.com/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
    {
      method: 'PUT',
      headers: ebayHeaders,
      body: JSON.stringify({
        ...existing,
        availability: {
          ...existing.availability,
          shipToLocationAvailability: {
            ...(existing.availability?.shipToLocationAvailability ?? {}),
            quantity: newQuantity,
          },
        },
      }),
    },
  );
  if (!putRes.ok) {
    const errBody = await putRes.text();
    throw new Error(`[EvoSync/eBay] PUT inventory_item failed: ${putRes.status} ${errBody}`);
  }
}
