/**
 * POST /api/evo/webhooks/etsy
 *
 * Stub handler for Etsy API v3 push notifications.
 *
 * Etsy delivers webhooks with an X-Etsy-Signature header (HMAC-SHA256 of
 * the raw body, keyed with the shared secret from the developer portal).
 *
 * TODO: implement the following before enabling:
 *   [ ] Verify X-Etsy-Signature (HMAC-SHA256, key = ETSY_WEBHOOK_SECRET env var)
 *   [ ] Parse topic from payload (listing_inventory.update, receipt.create, etc.)
 *   [ ] For listing_inventory.update: extract listing_id + quantity_sold/available
 *   [ ] Look up evo_sku_mappings by (platform='etsy', platform_listing_id=listing_id)
 *   [ ] Resolve user from shop domain embedded in payload or webhook config
 *   [ ] Call processInventoryUpdate() with sourcePlatform='etsy'
 *   [ ] Handle receipt.create → ingestOrder()
 *
 * Etsy API v3 docs:
 *   https://developers.etsy.com/documentation/reference#tag/ShopListing
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  await request.text();

  // TODO: verify X-Etsy-Signature before processing
  console.log('[Evo/Etsy] Received webhook');

  return NextResponse.json({ success: true });
}
