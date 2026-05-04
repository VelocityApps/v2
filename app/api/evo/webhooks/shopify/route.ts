/**
 * POST /api/evo/webhooks/shopify
 *
 * Receives Shopify webhooks for Evo inventory and order sync.
 *
 * Topics handled:
 *   inventory_levels/update  — propagate absolute quantity change to all
 *                              connected platforms for the same master SKU.
 *   orders/create            — ingest into unified evo_orders queue.
 *   orders/updated           — update status on existing evo_orders row.
 *   orders/cancelled         — mark order cancelled.
 *
 * Security:
 *   Every request is verified against SHOPIFY_WEBHOOK_SECRET using HMAC-SHA256
 *   (identical to the existing /api/webhooks/shopify handler). Requests that
 *   fail verification receive 401; the raw body is consumed before any parsing.
 *
 * Idempotency:
 *   The x-shopify-webhook-id header is forwarded as source_event_id to
 *   processInventoryUpdate(). The partial unique index on evo_inventory_events
 *   makes duplicate deliveries a no-op. Order upserts use the Supabase
 *   onConflict key (user_id, platform, platform_order_id).
 *
 * Timeout:
 *   Shopify requires a response within 5 seconds. Inventory propagation to
 *   other platforms runs inside the request but each platform call uses
 *   withRetry() which is bounded. For slower propagation paths we log
 *   failures and return 200 regardless — Shopify should not be penalised for
 *   our downstream latency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/shopify/oauth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { processInventoryUpdate, ingestOrder } from '@/lib/evo/sync';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Read raw body (must happen before any .json() call) ──────────────────
  const body = await request.text();

  // ── 2. Extract and validate required headers ─────────────────────────────────
  const signature = request.headers.get('x-shopify-hmac-sha256');
  const topic     = request.headers.get('x-shopify-topic');
  const shop      = request.headers.get('x-shopify-shop-domain');
  const webhookId = request.headers.get('x-shopify-webhook-id'); // idempotency key

  if (!signature || !topic || !shop) {
    return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
  }

  // Validate shop domain format — must be a plain *.myshopify.com hostname
  if (!shop.endsWith('.myshopify.com') || shop.includes('/') || shop.includes('..')) {
    return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 });
  }

  // ── 3. Verify HMAC signature ─────────────────────────────────────────────────
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Evo/Shopify] SHOPIFY_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (!verifyWebhookSignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── 4. Parse payload ─────────────────────────────────────────────────────────
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── 5. Resolve user from shop domain ─────────────────────────────────────────
  // evo_platforms.platform_account_id stores the normalised shop domain,
  // e.g. "mystore.myshopify.com".
  const shopNormalized = shop.toLowerCase().replace(/^https?:\/\//, '');

  const { data: platformRecord } = await supabaseAdmin
    .from('evo_platforms')
    .select('user_id')
    .eq('platform', 'shopify')
    .eq('platform_account_id', shopNormalized)
    .eq('status', 'active')
    .maybeSingle();

  if (!platformRecord) {
    // Shop not connected to Evo — acknowledge and ignore.
    return NextResponse.json({ success: true });
  }

  const { user_id: userId } = platformRecord;

  // ── 6. Dispatch by topic ─────────────────────────────────────────────────────
  try {
    switch (topic) {
      case 'inventory_levels/update':
        await handleInventoryUpdate({ payload, userId, webhookId, shop: shopNormalized });
        break;

      case 'orders/create':
        await handleOrderCreate({ payload, userId });
        break;

      case 'orders/updated':
        await handleOrderUpdated({ payload, userId });
        break;

      case 'orders/cancelled':
        await handleOrderCancelled({ payload, userId });
        break;

      default:
        // Unrecognised topic — acknowledge without processing
        break;
    }
  } catch (err: any) {
    // Log but still return 200. Shopify will retry on non-2xx, which would
    // cause repeated processing attempts; better to absorb and alert separately.
    console.error(`[Evo/Shopify] Unhandled error for topic ${topic}:`, err.message);
  }

  return NextResponse.json({ success: true });
}

// ── inventory_levels/update ───────────────────────────────────────────────────
// Payload shape:
// {
//   inventory_item_id: number,
//   location_id: number,
//   available: number,
//   updated_at: string,
//   admin_graphql_api_id: string
// }

async function handleInventoryUpdate({
  payload,
  userId,
  webhookId,
  shop,
}: {
  payload: Record<string, any>;
  userId: string;
  webhookId: string | null;
  shop: string;
}): Promise<void> {
  const inventoryItemId = String(payload.inventory_item_id);
  const available: number = payload.available ?? 0;
  const locationId = String(payload.location_id);

  if (!inventoryItemId) {
    console.warn('[Evo/Shopify] inventory_levels/update missing inventory_item_id');
    return;
  }

  // Resolve the evo_sku_mappings row for this inventory item
  const { data: mapping } = await supabaseAdmin
    .from('evo_sku_mappings')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', 'shopify')
    .eq('platform_listing_id', inventoryItemId)
    .maybeSingle();

  if (!mapping) {
    // Inventory item not tracked in Evo — nothing to do.
    return;
  }

  await processInventoryUpdate({
    userId,
    skuMappingId: mapping.id,
    newQuantity: available,
    sourcePlatform: 'shopify',
    sourceEventId: webhookId,
    trigger: 'webhook',
    metadata: { location_id: locationId, shop },
  });
}

// ── orders/create ─────────────────────────────────────────────────────────────

async function handleOrderCreate({
  payload,
  userId,
}: {
  payload: Record<string, any>;
  userId: string;
}): Promise<void> {
  const order = payload;
  if (!order?.id) return;

  await ingestOrder({
    userId,
    platform: 'shopify',
    platformOrderId: String(order.id),
    status: mapShopifyOrderStatus(order),
    customerEmail: order.email ?? order.customer?.email ?? null,
    customerName: buildCustomerName(order.customer),
    lineItems: (order.line_items ?? []).map((li: any) => ({
      sku: li.sku ?? undefined,
      title: li.title ?? '',
      quantity: li.quantity ?? 1,
      unit_price: li.price ? parseFloat(li.price) : undefined,
      platform_line_id: String(li.id),
    })),
    currency: order.currency ?? 'USD',
    totalPrice: order.total_price ? parseFloat(order.total_price) : null,
    platformCreatedAt: order.created_at ?? null,
  });
}

// ── orders/updated ────────────────────────────────────────────────────────────

async function handleOrderUpdated({
  payload,
  userId,
}: {
  payload: Record<string, any>;
  userId: string;
}): Promise<void> {
  const order = payload;
  if (!order?.id) return;

  const newStatus = mapShopifyOrderStatus(order);

  const { error } = await supabaseAdmin
    .from('evo_orders')
    .update({ status: newStatus })
    .eq('user_id', userId)
    .eq('platform', 'shopify')
    .eq('platform_order_id', String(order.id));

  if (error) {
    console.error('[Evo/Shopify] orders/updated — failed to update status:', error);
  }
}

// ── orders/cancelled ──────────────────────────────────────────────────────────

async function handleOrderCancelled({
  payload,
  userId,
}: {
  payload: Record<string, any>;
  userId: string;
}): Promise<void> {
  if (!payload?.id) return;

  const { error } = await supabaseAdmin
    .from('evo_orders')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('platform', 'shopify')
    .eq('platform_order_id', String(payload.id));

  if (error) {
    console.error('[Evo/Shopify] orders/cancelled — failed to update status:', error);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapShopifyOrderStatus(
  order: Record<string, any>,
): 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' {
  if (order.cancelled_at) return 'cancelled';

  const financial: string = (order.financial_status ?? '').toLowerCase();
  const fulfillment: string = (order.fulfillment_status ?? '').toLowerCase();

  if (financial === 'refunded' || financial === 'partially_refunded') return 'refunded';
  if (fulfillment === 'fulfilled') return 'shipped';
  if (financial === 'paid' || financial === 'partially_paid') return 'processing';

  return 'pending';
}

function buildCustomerName(customer: Record<string, any> | null | undefined): string | null {
  if (!customer) return null;
  const first = customer.first_name ?? '';
  const last  = customer.last_name ?? '';
  const name  = `${first} ${last}`.trim();
  return name || null;
}
