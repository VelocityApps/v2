/**
 * Order Status Auto-Updates
 * Notifies customers when their order is fulfilled and can auto-fulfill paid orders.
 *
 * Webhooks used:
 *   orders/fulfilled  – send fulfillment notification email to customer
 *   orders/updated    – auto-fulfill orders that are paid but unfulfilled (if enabled)
 *
 * Config:
 *   notify_customers  – checkbox; send fulfillment email on orders/fulfilled (default true)
 *   auto_fulfill      – checkbox; auto-fulfill paid + unfulfilled orders (default false)
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export class OrderStatusAutoUpdates extends BaseAutomation {
  name = 'Order Status Auto-Updates';
  slug = 'order-status-auto-updates';

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

    for (const topic of ['orders/fulfilled', 'orders/updated'] as const) {
      const webhook = await shopify.createWebhook(topic, address);
      await this.registerWebhook(userAutomationId, topic, webhook.id);
    }

    await this.log(userAutomationId, 'success', 'Installed – orders/fulfilled and orders/updated webhooks registered');
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
    } else if (topic === 'orders/updated') {
      await this.handleOrderUpdated(payload, userAutomation);
    }
  }

  private async handleOrderFulfilled(
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    const config = userAutomation.config || {};
    const notifyCustomers: boolean = config.notify_customers !== false; // default true

    if (!notifyCustomers) {
      await this.log(userAutomation.id, 'info', `Order ${payload.name} fulfilled – notify_customers disabled, skipping email`);
      return;
    }

    const customerEmail: string | undefined = payload.email || payload.customer?.email;
    if (!customerEmail) {
      await this.log(userAutomation.id, 'warning', `Order ${payload.name} has no customer email – skipping notification`);
      return;
    }

    const orderId = String(payload.id);

    // Idempotency: skip if we already sent a fulfillment email for this order in last 24h
    const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('automation_logs')
      .select('id')
      .eq('user_automation_id', userAutomation.id)
      .eq('metadata->>event', 'fulfilled')
      .eq('metadata->>order_id', orderId)
      .gte('created_at', windowStart)
      .maybeSingle();

    if (existing) {
      await this.log(userAutomation.id, 'info', `Fulfillment email for order ${payload.name} already sent within 24h – skipping`);
      return;
    }

    const customerName: string =
      payload.customer?.first_name ||
      payload.billing_address?.first_name ||
      payload.shipping_address?.first_name ||
      'there';

    const orderName: string = payload.name || `#${orderId}`;
    const storeName = storeNameFromUrl(userAutomation.shopify_store_url);
    const storeUrl = normalizeShop(userAutomation.shopify_store_url);

    // Extract tracking info from fulfillments
    const fulfillment = payload.fulfillments?.[0];
    const trackingUrl: string | null =
      fulfillment?.tracking_url ||
      fulfillment?.tracking_urls?.[0] ||
      null;
    const trackingNumber: string | null =
      fulfillment?.tracking_number || null;
    const trackingCompany: string | null =
      fulfillment?.tracking_company || null;

    const { sendEmail } = await import('@/lib/email');

    const subject = `Your order ${orderName} has been fulfilled!`;
    const html = buildFulfillmentEmail({
      customerName,
      storeName,
      storeUrl,
      orderName,
      trackingUrl,
      trackingNumber,
      trackingCompany,
    });

    await sendEmail({
      to: customerEmail,
      subject,
      html,
      text: stripHtml(html),
    });

    await this.log(
      userAutomation.id,
      'success',
      `Fulfillment notification sent to ${customerEmail} for order ${orderName}`,
      { event: 'fulfilled', order_id: orderId, order_name: orderName }
    );

    await this.updateLastRun(userAutomation.id);
  }

  private async handleOrderUpdated(
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    const config = userAutomation.config || {};
    const autoFulfill: boolean = config.auto_fulfill === true; // default false

    if (!autoFulfill) return;

    const financialStatus: string = payload.financial_status || '';
    const fulfillmentStatus: string | null = payload.fulfillment_status || null;

    // Only auto-fulfill paid orders that have no fulfillment yet
    if (financialStatus !== 'paid') return;
    if (fulfillmentStatus && fulfillmentStatus !== 'unfulfilled') return;

    const orderId = String(payload.id);
    const orderName: string = payload.name || `#${orderId}`;

    // Idempotency: skip if already auto-fulfilled this order in last 24h
    const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('automation_logs')
      .select('id')
      .eq('user_automation_id', userAutomation.id)
      .eq('metadata->>event', 'auto_fulfill')
      .eq('metadata->>order_id', orderId)
      .gte('created_at', windowStart)
      .maybeSingle();

    if (existing) return;

    try {
      // Collect line items to fulfill
      const lineItems = (payload.line_items || []).map((item: any) => ({
        id: item.id,
        quantity: item.fulfillable_quantity ?? item.quantity,
      })).filter((item: any) => item.quantity > 0);

      if (lineItems.length === 0) {
        await this.log(userAutomation.id, 'info', `Order ${orderName} – no fulfillable line items, skipping auto-fulfill`);
        return;
      }

      await this.shopifyFetch(userAutomation, `/orders/${orderId}/fulfillments.json`, {
        method: 'POST',
        body: JSON.stringify({
          fulfillment: {
            notify_customer: false, // we handle notification via notify_customers config
            line_items_by_fulfillment_order: [],
          },
        }),
      });

      await this.log(
        userAutomation.id,
        'success',
        `Auto-fulfilled order ${orderName}`,
        { event: 'auto_fulfill', order_id: orderId, order_name: orderName }
      );

      await this.updateLastRun(userAutomation.id);
    } catch (err: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to auto-fulfill order ${orderName}: ${err.message}`,
        { event: 'auto_fulfill', order_id: orderId }
      );
    }
  }

  // ─── Shopify Fetch Helper ─────────────────────────────────────────────────────

  private async shopifyFetch(userAutomation: UserAutomation, path: string, options?: RequestInit): Promise<any> {
    const { decryptToken } = await import('@/lib/shopify/oauth');
    const token = await decryptToken(userAutomation.shopify_access_token_encrypted!);
    const shop = userAutomation.shopify_store_url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const res = await fetch(`https://${shop}/admin/api/2024-01${path}`, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`Shopify API ${res.status}: ${await res.text()}`);
    return res.json();
  }
}

// ─── Email Template ───────────────────────────────────────────────────────────

function buildFulfillmentEmail(data: {
  customerName: string;
  storeName: string;
  storeUrl: string;
  orderName: string;
  trackingUrl: string | null;
  trackingNumber: string | null;
  trackingCompany: string | null;
}): string {
  const { customerName, storeName, storeUrl, orderName, trackingUrl, trackingNumber, trackingCompany } = data;

  const trackingSection = trackingNumber ? `
    <div style="background:#f0f7ff;border-radius:8px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:1px;">Tracking Details</p>
      ${trackingCompany ? `<p style="margin:0 0 4px;color:#333;font-size:14px;"><strong>Carrier:</strong> ${trackingCompany}</p>` : ''}
      <p style="margin:0;color:#333;font-size:14px;"><strong>Tracking #:</strong> ${trackingNumber}</p>
    </div>
  ` : '';

  const ctaLabel = trackingUrl ? 'Track Your Order' : 'View Order Status';
  const ctaUrl = trackingUrl || `https://${storeUrl}`;

  return emailWrapper(storeName, `
    <h2 style="margin:0 0 12px;font-size:24px;color:#111;">
      Great news, ${customerName}! Your order is on its way.
    </h2>
    <p style="margin:0 0 20px;color:#444;line-height:1.7;font-size:15px;">
      We're pleased to let you know that your order <strong>${orderName}</strong> has been fulfilled and is heading your way.
      ${trackingNumber
        ? 'You can use the tracking information below to follow your shipment.'
        : 'Estimated delivery times may vary depending on your location.'
      }
    </p>

    ${trackingSection}

    ${buildCTA(ctaUrl, ctaLabel, '#0066cc')}

    <p style="margin:8px 0 0;color:#777;font-size:13px;line-height:1.6;">
      If you have any questions about your order, feel free to reply to this email — we're happy to help.
    </p>
  `);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeShop(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function storeNameFromUrl(url: string): string {
  return normalizeShop(url).replace('.myshopify.com', '').replace(/-/g, ' ');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function buildCTA(url: string, label: string, color: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">${label}</a>
    </div>
  `;
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

import { registerAutomation } from '../base';
registerAutomation(OrderStatusAutoUpdates);
