/**
 * POST /api/evo/webhooks/amazon
 *
 * Stub handler for Amazon SP-API push notifications.
 *
 * Amazon uses SNS (Simple Notification Service) for push notifications:
 *   1. Amazon sends a SubscriptionConfirmation message first — respond by
 *      visiting the SubscribeURL to confirm.
 *   2. Subsequent Notification messages carry inventory/order events.
 *
 * TODO: implement the following before enabling:
 *   [ ] Verify SNS message signature (x-amz-sns-message-type header + AWS
 *       public certificate from SigningCertURL)
 *   [ ] Handle SubscriptionConfirmation type (visit SubscribeURL)
 *   [ ] Parse Notification type — extract ASIN / SellerSKU + quantity
 *   [ ] Look up evo_sku_mappings by (platform='amazon', platform_listing_id=ASIN)
 *   [ ] Call processInventoryUpdate() with sourcePlatform='amazon'
 *   [ ] Handle order notifications → ingestOrder()
 *
 * SP-API docs:
 *   https://developer-docs.amazon.com/sp-api/docs/notifications-api-v1-reference
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Always consume the body to avoid connection issues
  await request.text();

  const messageType = request.headers.get('x-amz-sns-message-type');

  // TODO: verify SNS signature before processing any message
  console.log('[Evo/Amazon] Received SNS message — type:', messageType ?? 'unknown');

  // Acknowledge immediately — SNS expects 200 within 15 seconds or will retry
  return NextResponse.json({ success: true });
}
