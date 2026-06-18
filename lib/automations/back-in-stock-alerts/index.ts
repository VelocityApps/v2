/**
 * Back-in-Stock Alerts
 *
 * Customers sign up via POST /api/back-in-stock/subscribe.
 * When an inventory_levels/update webhook fires and stock goes from 0 → positive,
 * all waiting subscribers for that product are emailed and marked notified.
 *
 * Config:
 *   from_name   Sender display name (default: store name)
 *   reply_to    Optional reply-to address
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

export class BackInStockAlerts extends BaseAutomation {
  name = 'Back-in-Stock Alerts';
  slug = 'back-in-stock-alerts';

  // ─── Install / Uninstall ────────────────────────────────────────────────────

  async install(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (!userAutomation) throw new Error('User automation not found');

    const shopify = await this.getShopifyClient(userAutomation as UserAutomation);
    const webhook = await shopify.createWebhook('inventory_levels/update', WEBHOOK_ADDRESS());
    await this.registerWebhook(userAutomationId, 'inventory_levels/update', webhook.id);

    await this.log(userAutomationId, 'success', 'Installed – monitoring inventory for back-in-stock notifications');
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
          try { await shopify.deleteWebhook(wh.webhook_id); } catch { /* already gone */ }
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
    if (topic !== 'inventory_levels/update') return;

    const available: number = Number(payload.available) || 0;
    if (available <= 0) return; // Still out of stock — nothing to do

    const inventoryItemId = payload.inventory_item_id;
    if (!inventoryItemId) return;

    const shopify = await this.getShopifyClient(userAutomation);

    // Resolve product from inventory item
    const productId = await shopify.getProductIdByInventoryItemId(inventoryItemId);
    if (!productId) return;

    const product = await shopify.getProduct(productId);
    if (!product) return;

    // Find subscribers waiting for this product
    const { data: subscribers } = await supabaseAdmin
      .from('back_in_stock_subscribers')
      .select('*')
      .eq('user_automation_id', userAutomation.id)
      .eq('product_id', productId)
      .is('notified_at', null);

    if (!subscribers || subscribers.length === 0) return;

    const config = userAutomation.config || {};
    const storeName = storeNameFromUrl(userAutomation.shopify_store_url);
    const fromName: string = config.from_name || storeName;
    const replyTo: string = config.reply_to || '';
    const storeUrl = `https://${normalizeShop(userAutomation.shopify_store_url)}`;
    const productUrl = `${storeUrl}/products/${product.handle}`;
    const imageUrl: string = product.images?.[0]?.src || '';

    const { sendEmail } = await import('@/lib/email');

    for (const sub of subscribers) {
      try {
        const emailOptions: any = {
          to: sub.customer_email,
          subject: `${product.title} is back in stock at ${storeName}!`,
          html: buildEmail(storeName, product.title, productUrl, imageUrl, fromName),
          text: `Good news! ${product.title} is back in stock at ${storeName}. Shop now: ${productUrl}`,
        };
        if (replyTo) emailOptions.from = `${fromName} <${replyTo}>`;

        await sendEmail(emailOptions);

        await supabaseAdmin
          .from('back_in_stock_subscribers')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', sub.id);

        await this.log(
          userAutomation.id,
          'success',
          `Back-in-stock alert sent to ${sub.customer_email} for "${product.title}"`,
          { product_id: productId, subscriber_id: sub.id }
        );
      } catch (err: any) {
        await this.log(
          userAutomation.id,
          'error',
          `Failed to notify ${sub.customer_email} for "${product.title}": ${err.message}`
        );
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeShop(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function storeNameFromUrl(url: string): string {
  return normalizeShop(url).replace('.myshopify.com', '').replace(/-/g, ' ');
}

function buildEmail(
  storeName: string,
  productTitle: string,
  productUrl: string,
  imageUrl: string,
  fromName: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#0066cc;padding:24px 32px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">${fromName || storeName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            <h2 style="margin:0 0 12px;font-size:24px;color:#111;">Great news — it's back! 🎉</h2>
            <p style="margin:0 0 24px;color:#444;font-size:16px;line-height:1.6;">
              <strong>${productTitle}</strong> is back in stock at ${storeName}. Don't miss out — these sell fast!
            </p>
            ${imageUrl ? `<div style="text-align:center;margin:0 0 24px;"><img src="${imageUrl}" alt="${productTitle}" style="max-width:100%;border-radius:8px;max-height:300px;object-fit:cover;"></div>` : ''}
            <div style="text-align:center;margin:28px 0;">
              <a href="${productUrl}" style="display:inline-block;padding:14px 36px;background:#0066cc;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">Shop Now</a>
            </div>
            <p style="margin:24px 0 0;color:#888;font-size:13px;text-align:center;">
              You requested to be notified when this item came back in stock.<br>
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
registerAutomation(BackInStockAlerts);
