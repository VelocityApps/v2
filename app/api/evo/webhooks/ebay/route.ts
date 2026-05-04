/**
 * POST /api/evo/webhooks/ebay
 *
 * Stub handler for eBay Notification API events.
 *
 * eBay uses a challenge-response verification on initial endpoint setup,
 * then sends JSON notification payloads for subscribed event types.
 *
 * TODO: implement the following before enabling:
 *   [ ] Handle GET challenge request: return SHA-256 hash of
 *       (challengeCode + verificationToken + endpoint URL) as JSON
 *       { challengeResponse: "<hash>" }
 *   [ ] Verify POST signature via X-EBAY-SIGNATURE header
 *   [ ] Parse notificationEventName (INVENTORY_UPDATE, CHECKOUT_ORDER_CREATION, etc.)
 *   [ ] For INVENTORY_UPDATE: extract sku + quantity
 *   [ ] Look up evo_sku_mappings by (platform='ebay', platform_listing_id=sku)
 *   [ ] Resolve user from seller account embedded in payload
 *   [ ] Call processInventoryUpdate() with sourcePlatform='ebay'
 *   [ ] Handle CHECKOUT_ORDER_CREATION → ingestOrder()
 *
 * eBay Notification API docs:
 *   https://developer.ebay.com/api-docs/commerce/notification/overview.html
 */

import { NextRequest, NextResponse } from 'next/server';

// eBay sends a GET with ?challenge_code= when registering the endpoint
export async function GET(request: NextRequest): Promise<NextResponse> {
  const challengeCode = request.nextUrl.searchParams.get('challenge_code');

  if (!challengeCode) {
    return NextResponse.json({ error: 'Missing challenge_code' }, { status: 400 });
  }

  // TODO: compute SHA-256(challengeCode + EBAY_VERIFICATION_TOKEN + endpointUrl)
  // and return { challengeResponse: "<hex-hash>" }
  console.log('[Evo/eBay] Challenge request received — challenge_code:', challengeCode);

  return NextResponse.json(
    { error: 'eBay webhook verification not yet implemented' },
    { status: 501 },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  await request.text();

  // TODO: verify X-EBAY-SIGNATURE before processing
  console.log('[Evo/eBay] Received notification');

  return NextResponse.json({ success: true });
}
