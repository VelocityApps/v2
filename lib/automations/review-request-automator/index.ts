/**
 * Review Request Automator
 * Sends a review request email after an order is fulfilled.
 *
 * Webhooks used:
 *   orders/fulfilled  – schedule a review request
 *   orders/cancelled  – cancel any pending review request
 *
 * Cron (runScheduled, every hour):
 *   – sends pending review requests whose send_at <= now
 *
 * Supported review platforms (config.review_platform):
 *   "shopify"     – links to the product page (native Shopify reviews)
 *   "google"      – requires config.google_place_id
 *   "trustpilot"  – requires config.trustpilot_domain  (e.g. "mystore.com")
 *   "judge_me"    – links to the Judge.me review widget URL
 *   "custom"      – uses config.review_url with {{product_url}} / {{store_url}} tokens
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

const CRON_INTERVAL_HOURS = 1;

export class ReviewRequestAutomator extends BaseAutomation {
  name = 'Review Request Automator';
  slug = 'review-request-automator';

  // ─── Install / Uninstall ────────────────────────────────────────────────────

  async install(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (!userAutomation) throw new Error('User automation not found');

    const shopify = await this.getShopifyClient(userAutomation as UserAutomation);
    const address = WEBHOOK_ADDRESS();

    for (const topic of ['orders/fulfilled', 'orders/cancelled'] as const) {
      const webhook = await shopify.createWebhook(topic, address);
      await this.registerWebhook(userAutomationId, topic, webhook.id);
    }

    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: hoursFromNow(CRON_INTERVAL_HOURS) })
      .eq('id', userAutomationId);

    await this.log(userAutomationId, 'success', 'Installed – webhooks registered, cron scheduled');
  }

  async uninstall(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (userAutomation) {
      const shopify = await this.getShopifyClient(userAutomation as UserAutomation);
      const webhooks = await this.getWebhooks(userAutomationId);

      for (const wh of webhooks) {
        if (wh.webhook_id) {
          try {
            await shopify.deleteWebhook(wh.webhook_id);
          } catch {
            // Webhook may already be gone
          }
        }
        await this.unregisterWebhook(userAutomationId, wh.topic);
      }
    }

    await this.log(userAutomationId, 'info', 'Uninstalled – webhooks removed');
  }

  // ─── Webhook Handler ─────────────────────────────────────────────────────────

  async handleWebhook(
    topic: string,
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    if (topic === 'orders/fulfilled') {
      await this.handleOrderFulfilled(payload, userAutomation);
    } else if (topic === 'orders/cancelled') {
      await this.handleOrderCancelled(payload, userAutomation);
    }
  }

  private async handleOrderFulfilled(
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    const orderId = String(payload.id);
    const customerEmail: string | undefined = payload.email || payload.customer?.email;

    if (!customerEmail) {
      await this.log(userAutomation.id, 'warning', `Order ${payload.name} has no email – skipping`);
      return;
    }

    // Idempotency – skip if already scheduled for this order
    const { data: existing } = await supabaseAdmin
      .from('scheduled_review_requests')
      .select('id')
      .eq('user_automation_id', userAutomation.id)
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) return;

    const config = userAutomation.config || {};
    const daysAfterDelivery: number = config.days_after_delivery ?? 3;

    // Use actual fulfillment date, not order creation date
    const fulfillmentDate = new Date(
      payload.fulfillments?.[0]?.created_at || payload.updated_at || new Date().toISOString()
    );
    const sendAt = new Date(fulfillmentDate.getTime() + daysAfterDelivery * 86_400_000);

    // Snapshot line items at webhook time so send works even if products change
    const lineItems: LineItemSnapshot[] = (payload.line_items || []).map((item: any) => ({
      product_id: String(item.product_id || ''),
      variant_id: String(item.variant_id || ''),
      title: item.title || item.name || 'Product',
      quantity: item.quantity || 1,
      price: item.price || '0.00',
      image_url: item.image?.src || '',
      product_handle: item.handle || slugify(item.title || ''),
    }));

    const customerName: string =
      payload.customer?.first_name ||
      payload.billing_address?.first_name ||
      payload.shipping_address?.first_name ||
      '';

    const storeName = storeNameFromUrl(userAutomation.shopify_store_url);

    await supabaseAdmin.from('scheduled_review_requests').insert({
      user_automation_id: userAutomation.id,
      order_id: orderId,
      order_name: payload.name || `#${orderId}`,
      customer_email: customerEmail,
      product_ids: lineItems.map((i) => i.product_id).filter(Boolean),
      send_at: sendAt.toISOString(),
      status: 'pending',
      config: {
        // Config snapshot
        review_platform: config.review_platform || 'shopify',
        review_url: config.review_url || '',
        google_place_id: config.google_place_id || '',
        trustpilot_domain: config.trustpilot_domain || '',
        subject_template: config.subject_template || '',
        from_name: config.from_name || storeName,
        // Order snapshot
        customer_name: customerName,
        line_items: lineItems,
        store_name: storeName,
        store_url: normalizeShop(userAutomation.shopify_store_url),
      },
    });

    await this.log(
      userAutomation.id,
      'success',
      `Review request scheduled for order ${payload.name} (${customerEmail}) – sends ${sendAt.toLocaleDateString()}`,
      { orderId, sendAt: sendAt.toISOString() }
    );

    await this.updateLastRun(userAutomation.id);
  }

  private async handleOrderCancelled(
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    const orderId = String(payload.id);

    const { data: request } = await supabaseAdmin
      .from('scheduled_review_requests')
      .select('id, status')
      .eq('user_automation_id', userAutomation.id)
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!request) return;

    await supabaseAdmin
      .from('scheduled_review_requests')
      .update({ status: 'cancelled' })
      .eq('id', request.id);

    await this.log(userAutomation.id, 'info', `Review request cancelled – order ${payload.name} was cancelled`);
  }

  // ─── Scheduled Processing (Cron) ─────────────────────────────────────────────

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    await this.sendScheduledReviewRequests(userAutomation);

    await supabaseAdmin
      .from('user_automations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: hoursFromNow(CRON_INTERVAL_HOURS),
      })
      .eq('id', userAutomation.id);
  }

  private async sendScheduledReviewRequests(userAutomation: UserAutomation): Promise<void> {
    const { data: requests } = await supabaseAdmin
      .from('scheduled_review_requests')
      .select('*')
      .eq('user_automation_id', userAutomation.id)
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString());

    if (!requests || requests.length === 0) return;

    for (const request of requests) {
      try {
        await this.sendOneReviewRequest(userAutomation, request);

        await supabaseAdmin
          .from('scheduled_review_requests')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', request.id);

        await this.log(
          userAutomation.id,
          'success',
          `Review request sent to ${request.customer_email} for order ${request.order_name}`
        );
      } catch (err: any) {
        await supabaseAdmin
          .from('scheduled_review_requests')
          .update({ status: 'failed', error: err.message })
          .eq('id', request.id);

        await this.log(
          userAutomation.id,
          'error',
          `Failed to send review request for order ${request.order_name}: ${err.message}`,
          { requestId: request.id }
        );
      }
    }
  }

  private async sendOneReviewRequest(
    userAutomation: UserAutomation,
    request: any
  ): Promise<void> {
    const { sendEmail } = await import('@/lib/email');

    const snap: RequestConfig = request.config || {};
    const customerName: string = snap.customer_name || '';
    const storeName: string = snap.store_name || storeNameFromUrl(userAutomation.shopify_store_url);
    const storeUrl: string = snap.store_url || normalizeShop(userAutomation.shopify_store_url);
    const lineItems: LineItemSnapshot[] = snap.line_items || [];
    const platform: string = snap.review_platform || 'shopify';

    // Enrich line items with product handles if missing (API fallback)
    const enrichedItems = await this.enrichLineItems(userAutomation, lineItems, storeUrl);

    // Build the review CTA URL
    const reviewUrl = buildReviewUrl(platform, snap, enrichedItems, storeUrl);

    // Build subject
    const firstProduct = enrichedItems[0]?.title || 'your order';
    const subject = snap.subject_template
      ? this.renderTemplate(snap.subject_template, {
          product_name: firstProduct,
          order_name: request.order_name,
          customer_name: customerName || 'there',
          store_name: storeName,
        })
      : `How are you enjoying ${firstProduct}?`;

    const html = buildReviewEmail({
      customerName: customerName || 'there',
      storeName,
      orderName: request.order_name,
      lineItems: enrichedItems,
      reviewUrl,
      platform,
    });

    await sendEmail({
      to: request.customer_email,
      subject,
      html,
      text: stripHtml(html),
      ...(snap.from_name ? {} : {}), // from address handled by sendEmail defaults
    });
  }

  /**
   * Attempt to fill in missing product handles via Shopify API.
   * Falls back gracefully if the API call fails or product is deleted.
   */
  private async enrichLineItems(
    userAutomation: UserAutomation,
    items: LineItemSnapshot[],
    storeUrl: string
  ): Promise<LineItemSnapshot[]> {
    if (items.length === 0) return items;

    // Only call the API if any item is missing a handle
    const needsEnrichment = items.some((i) => !i.product_handle && i.product_id);
    if (!needsEnrichment) return items;

    try {
      const shopify = await this.getShopifyClient(userAutomation);
      return await Promise.all(
        items.map(async (item) => {
          if (item.product_handle || !item.product_id) return item;
          try {
            const product = await shopify.getProduct(item.product_id);
            return {
              ...item,
              product_handle: product.handle,
              title: item.title || product.title,
              image_url: item.image_url || product.images?.[0]?.src || '',
            };
          } catch {
            return item; // product may be deleted; proceed with what we have
          }
        })
      );
    } catch {
      return items;
    }
  }
}

// ─── Review URL Builder ───────────────────────────────────────────────────────

function buildReviewUrl(
  platform: string,
  snap: RequestConfig,
  items: LineItemSnapshot[],
  storeUrl: string
): string {
  const firstHandle = items[0]?.product_handle || '';
  const productUrl = firstHandle ? `https://${storeUrl}/products/${firstHandle}` : `https://${storeUrl}`;

  switch (platform) {
    case 'google':
      if (snap.google_place_id) {
        return `https://search.google.com/local/writereview?placeid=${snap.google_place_id}`;
      }
      return `https://www.google.com/search?q=${encodeURIComponent(snap.store_name || storeUrl)}+reviews`;

    case 'trustpilot':
      if (snap.trustpilot_domain) {
        return `https://www.trustpilot.com/evaluate/${snap.trustpilot_domain}`;
      }
      return `https://www.trustpilot.com/evaluate/${storeUrl.replace('www.', '')}`;

    case 'judge_me':
      return `https://${storeUrl}/a/review_requests/new`;

    case 'custom':
      if (snap.review_url) {
        return snap.review_url
          .replace('{{product_url}}', productUrl)
          .replace('{{product_handle}}', firstHandle)
          .replace('{{store_url}}', `https://${storeUrl}`);
      }
      return productUrl;

    case 'shopify':
    default:
      return `${productUrl}#reviews`;
  }
}

// ─── Email Template ───────────────────────────────────────────────────────────

function buildReviewEmail(data: {
  customerName: string;
  storeName: string;
  orderName: string;
  lineItems: LineItemSnapshot[];
  reviewUrl: string;
  platform: string;
}): string {
  const { customerName, storeName, orderName, lineItems, reviewUrl, platform } = data;

  const productRows = lineItems.map((item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:middle;">
        ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:12px;">` : ''}
        <span style="color:#333;font-size:15px;vertical-align:middle;">${item.title}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:14px;text-align:right;vertical-align:middle;">
        ${item.quantity > 1 ? `x${item.quantity}` : ''}
      </td>
    </tr>
  `).join('');

  const platformLabel: Record<string, string> = {
    google: 'Leave a Google Review',
    trustpilot: 'Review Us on Trustpilot',
    judge_me: 'Leave a Review',
    shopify: 'Leave a Review',
    custom: 'Leave a Review',
  };
  const ctaLabel = platformLabel[platform] || 'Leave a Review';

  return emailWrapper(storeName, `
    <h2 style="margin:0 0 8px;font-size:22px;color:#111;">
      How are you enjoying your order, ${customerName}?
    </h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
      We hope you're loving what you received! Your feedback means the world to us and helps other shoppers too.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:0 0 28px;">
      <tbody>${productRows}</tbody>
    </table>

    <div style="text-align:center;margin:0 0 28px;">
      <a href="${reviewUrl}"
         style="display:inline-block;padding:14px 36px;background:#0066cc;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
        ${ctaLabel}
      </a>
    </div>

    <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:0 0 8px;">
      <p style="margin:0;color:#555;font-size:14px;line-height:1.6;">
        ⭐ Reviews take less than 2 minutes and help us keep improving.<br>
        We genuinely read every single one.
      </p>
    </div>
  `);
}

function emailWrapper(storeName: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#0066cc;padding:24px 32px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">${storeName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;color:#aaa;font-size:12px;text-align:center;">
              You received this because you placed an order with ${storeName}.<br>
              Powered by <a href="https://velocityapps.dev" style="color:#0066cc;text-decoration:none;">VelocityApps</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItemSnapshot {
  product_id: string;
  variant_id: string;
  title: string;
  quantity: number;
  price: string;
  image_url: string;
  product_handle: string;
}

interface RequestConfig {
  review_platform?: string;
  review_url?: string;
  google_place_id?: string;
  trustpilot_domain?: string;
  subject_template?: string;
  from_name?: string;
  customer_name?: string;
  line_items?: LineItemSnapshot[];
  store_name?: string;
  store_url?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function normalizeShop(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function storeNameFromUrl(url: string): string {
  return normalizeShop(url).replace('.myshopify.com', '').replace(/-/g, ' ');
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

import { registerAutomation } from '../base';
registerAutomation(ReviewRequestAutomator);
