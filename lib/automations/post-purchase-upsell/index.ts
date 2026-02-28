/**
 * Post-Purchase Upsell
 * Sends a product recommendation email after an order is placed.
 *
 * Webhooks used:
 *   orders/create  – capture new order and schedule upsell email
 *
 * Cron (runScheduled, every hour):
 *   – send pending upsell emails whose send_at <= now
 *   – fetch complementary products from Shopify, excluding purchased ones
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

const CRON_INTERVAL_HOURS = 1;

export class PostPurchaseUpsell extends BaseAutomation {
  name = 'Post-Purchase Upsell';
  slug = 'post-purchase-upsell';

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

    const webhook = await shopify.createWebhook('orders/create', address);
    await this.registerWebhook(userAutomationId, 'orders/create', webhook.id);

    // Schedule first cron run in 1 hour
    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: hoursFromNow(CRON_INTERVAL_HOURS) })
      .eq('id', userAutomationId);

    await this.log(userAutomationId, 'success', 'Installed – orders/create webhook registered, cron scheduled');
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
            // Webhook may already be gone; continue
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
    if (topic === 'orders/create') {
      await this.handleOrderCreated(payload, userAutomation);
    }
  }

  private async handleOrderCreated(
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    const orderId = String(payload.id);
    const customerEmail: string | undefined = payload.email || payload.customer?.email;

    if (!customerEmail) {
      await this.log(userAutomation.id, 'warning', `Order ${payload.name} has no email – skipping upsell`);
      return;
    }

    // Idempotency – skip if we already queued an upsell for this order
    const { data: existing } = await supabaseAdmin
      .from('post_purchase_upsells')
      .select('id')
      .eq('user_automation_id', userAutomation.id)
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) return;

    const config = userAutomation.config || {};
    const delayHours: number = config.delay_hours ?? 24;

    const orderCreatedAt = new Date(payload.created_at || new Date().toISOString());
    const sendAt = new Date(orderCreatedAt.getTime() + delayHours * 3_600_000);

    // Collect product IDs from line items
    const lineItems: any[] = payload.line_items || [];
    const productIds: string[] = lineItems
      .map((item: any) => String(item.product_id || ''))
      .filter(Boolean);

    const customerName: string =
      payload.customer?.first_name ||
      payload.billing_address?.first_name ||
      payload.shipping_address?.first_name ||
      '';

    await supabaseAdmin.from('post_purchase_upsells').insert({
      user_automation_id: userAutomation.id,
      order_id: orderId,
      order_name: payload.name || `#${orderId}`,
      customer_email: customerEmail,
      customer_name: customerName || null,
      product_ids: productIds,
      send_at: sendAt.toISOString(),
      status: 'pending',
    });

    // Nudge cron to run soon so we don't wait a full hour for early send_at values
    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: hoursFromNow(CRON_INTERVAL_HOURS) })
      .eq('id', userAutomation.id);

    await this.log(
      userAutomation.id,
      'success',
      `Upsell email queued for order ${payload.name || orderId} (${customerEmail}) – sends ${sendAt.toLocaleDateString()}`,
      { orderId, sendAt: sendAt.toISOString() }
    );
  }

  // ─── Scheduled Processing (Cron) ─────────────────────────────────────────────

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    await this.processUpsellEmails(userAutomation);

    await supabaseAdmin
      .from('user_automations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: hoursFromNow(CRON_INTERVAL_HOURS),
      })
      .eq('id', userAutomation.id);
  }

  private async processUpsellEmails(userAutomation: UserAutomation): Promise<void> {
    const { data: upsells } = await supabaseAdmin
      .from('post_purchase_upsells')
      .select('*')
      .eq('user_automation_id', userAutomation.id)
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString())
      .order('send_at', { ascending: true });

    if (!upsells || upsells.length === 0) return;

    const config = userAutomation.config || {};
    const maxProducts: number = config.max_products ?? 4;

    for (const upsell of upsells) {
      try {
        const recommendations = await this.fetchProductRecommendations(
          userAutomation,
          upsell.product_ids || [],
          maxProducts
        );

        await this.sendUpsellEmail(userAutomation, upsell, recommendations);

        await supabaseAdmin
          .from('post_purchase_upsells')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', upsell.id);

        await this.log(
          userAutomation.id,
          'success',
          `Upsell email sent to ${upsell.customer_email} for order ${upsell.order_name}`,
          { upsellId: upsell.id, productCount: recommendations.length }
        );
      } catch (err: any) {
        await supabaseAdmin
          .from('post_purchase_upsells')
          .update({ status: 'failed', error: err.message })
          .eq('id', upsell.id);

        await this.log(
          userAutomation.id,
          'error',
          `Failed to send upsell email for order ${upsell.order_name}: ${err.message}`,
          { upsellId: upsell.id }
        );
      }
    }
  }

  // ─── Product Recommendations ──────────────────────────────────────────────────

  /**
   * Fetch products from Shopify and return ones NOT in the original order.
   * Falls back to the first fetched products if no non-ordered products are found.
   */
  private async fetchProductRecommendations(
    userAutomation: UserAutomation,
    purchasedProductIds: string[],
    maxProducts: number
  ): Promise<UpsellProduct[]> {
    const shopify = await this.getShopifyClient(userAutomation);
    const storeUrl = normalizeShop(userAutomation.shopify_store_url);

    // Fetch a batch of products (8 gives us plenty to filter from)
    const allProducts = await shopify.getProducts(8);

    const purchasedSet = new Set(purchasedProductIds.map(String));

    // Prefer products not already purchased
    const otherProducts = allProducts.filter(
      (p) => !purchasedSet.has(String(p.id)) && p.status === 'active'
    );

    const source = otherProducts.length > 0 ? otherProducts : allProducts;

    return source.slice(0, maxProducts).map((p) => ({
      id: String(p.id),
      title: p.title,
      handle: p.handle,
      price: p.variants?.[0]?.price || '0.00',
      image_src: p.images?.[0]?.src || '',
      url: `https://${storeUrl}/products/${p.handle}`,
    }));
  }

  // ─── Email Sending ────────────────────────────────────────────────────────────

  private async sendUpsellEmail(
    userAutomation: UserAutomation,
    upsell: any,
    products: UpsellProduct[]
  ): Promise<void> {
    const { sendEmail } = await import('@/lib/email');

    const storeName = storeNameFromUrl(userAutomation.shopify_store_url);
    const storeUrl = `https://${normalizeShop(userAutomation.shopify_store_url)}`;
    const customerName: string = upsell.customer_name || 'there';

    const subject = `${customerName !== 'there' ? upsell.customer_name + ', you' : 'You'} might also love these from ${storeName}`;
    const html = this.buildUpsellEmail(customerName, storeName, storeUrl, products);

    await sendEmail({
      to: upsell.customer_email,
      subject,
      html,
      text: stripHtml(html),
    });
  }

  // ─── Email Template ───────────────────────────────────────────────────────────

  private buildUpsellEmail(
    customerName: string,
    storeName: string,
    storeUrl: string,
    products: UpsellProduct[]
  ): string {
    const productRows = products.length > 0
      ? products.map((p) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:middle;">
            ${p.image_src
              ? `<img src="${p.image_src}" alt="${escapeHtml(p.title)}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:12px;">`
              : ''}
            <a href="${p.url}" style="color:#111;text-decoration:none;font-size:15px;vertical-align:middle;font-weight:500;">${escapeHtml(p.title)}</a>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;text-align:right;vertical-align:middle;white-space:nowrap;">
            ${formatPrice(p.price, 'USD')}
          </td>
        </tr>
      `).join('')
      : `<tr><td colspan="2" style="padding:12px 0;color:#888;font-size:14px;">Visit our store to explore our full collection.</td></tr>`;

    return emailWrapper(storeName, `
      <h2 style="margin:0 0 8px;font-size:22px;color:#111;">
        Thanks for your order, ${customerName}!
      </h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
        We thought you might love these picks based on what you ordered. Hand-picked just for you.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 28px;">
        <tbody>${productRows}</tbody>
      </table>

      ${buildCTA(storeUrl, 'Shop Now', '#0066cc')}

      <p style="margin:16px 0 0;color:#888;font-size:13px;text-align:center;">
        Browse our full collection at any time.
      </p>
    `, storeName);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpsellProduct {
  id: string;
  title: string;
  handle: string;
  price: string;
  image_src: string;
  url: string;
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(price: string | number, currency: string): string {
  const amount = parseFloat(String(price));
  if (isNaN(amount)) return String(price);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function buildCTA(url: string, label: string, color: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">${label}</a>
    </div>
  `;
}

function emailWrapper(storeName: string, content: string, footerStore?: string): string {
  const footer = footerStore || storeName;
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
              You received this because you placed an order with ${footer}.<br>
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
registerAutomation(PostPurchaseUpsell);
