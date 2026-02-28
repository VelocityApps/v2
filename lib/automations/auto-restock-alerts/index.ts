/**
 * Auto-Restock Alerts
 * Alerts store owners (and optionally a supplier) when a product's stock
 * falls to or below a configurable reorder point.
 *
 * Webhook: inventory_levels/update
 * Cron: none (immediate webhook-triggered alerts only)
 *
 * Config:
 *   reorder_point      Stock level that triggers an alert  (default 20)
 *   supplier_email     Supplier email for restock requests  (optional)
 *   email_addresses    Store owner emails, comma-separated  (fallback: SUPPORT_ALERT_EMAILS)
 *   slack_webhook_url  Slack incoming-webhook URL           (optional)
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

const COOLDOWN_HOURS = 24;

// ─── Email Template Helpers ───────────────────────────────────────────────────

function emailWrapper(storeName: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;max-width:580px;width:100%;">
        <tr>
          <td style="background:#b45309;padding:24px 32px;">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">Restock Alert – ${storeName}</p>
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
              Powered by <a href="https://velocityapps.dev" style="color:#0066cc;text-decoration:none;">VelocityApps</a> Auto-Restock Alerts
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildCTA(url: string, label: string, color: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">${label}</a>
    </div>
  `;
}

function adminProductUrl(storeUrl: string, productId: string): string {
  const host = storeUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return `https://${host}/admin/products/${productId}`;
}

function storeNameFromUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '').replace('.myshopify.com', '').replace(/-/g, ' ');
}

// ─── Automation Class ─────────────────────────────────────────────────────────

export class AutoRestockAlerts extends BaseAutomation {
  name = 'Auto-Restock Alerts';
  slug = 'auto-restock-alerts';

  // ─── Install / Uninstall ──────────────────────────────────────────────────

  async install(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (!userAutomation) throw new Error('User automation not found');

    const shopify = await this.getShopifyClient(userAutomation as UserAutomation);
    const address = WEBHOOK_ADDRESS();

    const webhook = await shopify.createWebhook('inventory_levels/update', address);
    await this.registerWebhook(userAutomationId, 'inventory_levels/update', webhook.id);

    await this.log(userAutomationId, 'success', 'Installed – inventory_levels/update webhook registered');
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

  // ─── Webhook Handler ──────────────────────────────────────────────────────

  async handleWebhook(
    topic: string,
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    if (topic !== 'inventory_levels/update') return;

    const config = userAutomation.config || {};
    const reorderPoint = Number(config.reorder_point) || 20;

    try {
      // Normalise payload (Shopify sometimes nests under inventory_level)
      const raw = (payload as any).inventory_level ?? payload;
      const inventoryItemId = String(raw.inventory_item_id ?? (payload as any).inventory_item_id ?? '');
      const locationId = String(raw.location_id ?? (payload as any).location_id ?? '');
      let available: number | null = raw.available ?? (payload as any).available ?? null;

      if (!inventoryItemId) {
        await this.log(userAutomation.id, 'warning', 'inventory_item_id missing from webhook payload');
        return;
      }

      const shopify = await this.getShopifyClient(userAutomation);

      // Fetch current level from Shopify if not included in payload
      if (available === null && locationId) {
        try {
          const levels = await shopify.getInventoryLevels([locationId], [inventoryItemId]);
          available = levels[0]?.available != null ? Number(levels[0].available) : null;
        } catch {
          // proceed with null → treat as 0
        }
      }

      const currentStock = available != null ? Number(available) : 0;

      // Nothing to do if stock is still above reorder point
      if (currentStock > reorderPoint) return;

      // Resolve product title and ID
      let productTitle = 'Product';
      let productId = inventoryItemId;

      try {
        const resolvedId = await shopify.getProductIdByInventoryItemId(inventoryItemId);
        if (resolvedId) {
          const product = await shopify.getProduct(resolvedId);
          productTitle = product.title;
          productId = resolvedId;
        }
      } catch { /* use defaults */ }

      // Per-product cooldown: skip if we already alerted for this product in the last 24 h
      const cooldownCutoff = new Date(Date.now() - COOLDOWN_HOURS * 3_600_000).toISOString();
      const { data: recentAlert } = await supabaseAdmin
        .from('automation_logs')
        .select('id')
        .eq('user_automation_id', userAutomation.id)
        .eq('event_type', 'success')
        .contains('metadata', { productId })
        .gte('created_at', cooldownCutoff)
        .limit(1);

      if (recentAlert && recentAlert.length > 0) return;

      const storeName = storeNameFromUrl(userAutomation.shopify_store_url);

      // Send all configured alerts concurrently
      const promises: Promise<void>[] = [];

      const supplierEmail = (config.supplier_email || '').trim();
      if (supplierEmail) {
        promises.push(
          this.sendSupplierEmail({ to: supplierEmail, productTitle, currentStock, reorderPoint, storeName })
        );
      }

      const ownerEmails = this.emailList(config);
      if (ownerEmails.length > 0) {
        promises.push(
          this.sendOwnerEmail({
            to: ownerEmails,
            productTitle,
            productId,
            currentStock,
            reorderPoint,
            storeName,
            shopifyStoreUrl: userAutomation.shopify_store_url,
          })
        );
      }

      const slackUrl = (config.slack_webhook_url || '').trim();
      if (slackUrl) {
        promises.push(
          this.sendSlackAlert({
            webhookUrl: slackUrl,
            productTitle,
            productId,
            currentStock,
            reorderPoint,
            shopifyStoreUrl: userAutomation.shopify_store_url,
          })
        );
      }

      await Promise.allSettled(promises);

      await this.log(
        userAutomation.id,
        'success',
        `Restock alert sent for "${productTitle}" (${currentStock} remaining, reorder point ${reorderPoint})`,
        { productId, currentStock, reorderPoint }
      );

      await this.updateLastRun(userAutomation.id);
    } catch (error: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to process restock alert: ${error.message}`,
        { error: error.toString() }
      );
      await this.updateStatus(userAutomation.id, 'error', error.message);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private emailList(config: Record<string, any>): string[] {
    const fromConfig = (config.email_addresses || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (fromConfig.length) return fromConfig;
    return (process.env.SUPPORT_ALERT_EMAILS || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  // ─── Supplier Email ───────────────────────────────────────────────────────

  private async sendSupplierEmail(data: {
    to: string;
    productTitle: string;
    currentStock: number;
    reorderPoint: number;
    storeName: string;
  }): Promise<void> {
    const { sendEmail } = await import('@/lib/email');

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#1e40af;padding:22px 28px;">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">Restock Request from ${data.storeName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">Dear Supplier,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
              We are writing to request a restock of the following product. Our inventory has fallen to the minimum reorder threshold.
            </p>

            <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;margin:0 0 24px;">
              <tr>
                <td style="padding:14px 16px;font-size:14px;color:#555;border-bottom:1px solid #e2e8f0;font-weight:600;">Product</td>
                <td style="padding:14px 16px;font-size:15px;color:#111;border-bottom:1px solid #e2e8f0;font-weight:700;">${data.productTitle}</td>
              </tr>
              <tr>
                <td style="padding:14px 16px;font-size:14px;color:#555;border-bottom:1px solid #e2e8f0;">Current Stock</td>
                <td style="padding:14px 16px;font-size:15px;color:#b45309;font-weight:700;border-bottom:1px solid #e2e8f0;">${data.currentStock} units</td>
              </tr>
              <tr>
                <td style="padding:14px 16px;font-size:14px;color:#555;">Reorder Point</td>
                <td style="padding:14px 16px;font-size:14px;color:#333;">${data.reorderPoint} units</td>
              </tr>
            </table>

            <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
              Please arrange for replenishment at your earliest convenience. If you have any questions, please reply to this email.
            </p>
            <p style="margin:20px 0 0;font-size:14px;color:#555;">
              Thank you,<br><strong>${data.storeName}</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;color:#aaa;font-size:12px;text-align:center;">
              Sent by <a href="https://velocityapps.dev" style="color:#0066cc;text-decoration:none;">VelocityApps</a> Auto-Restock Alerts
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendEmail({
      to: [data.to],
      subject: `Restock Request: ${data.productTitle}`,
      html,
      text: `Restock Request from ${data.storeName}\n\nProduct: ${data.productTitle}\nCurrent Stock: ${data.currentStock} units\nReorder Point: ${data.reorderPoint} units\n\nPlease arrange for replenishment at your earliest convenience.`,
    });
  }

  // ─── Store Owner Email ────────────────────────────────────────────────────

  private async sendOwnerEmail(data: {
    to: string[];
    productTitle: string;
    productId: string;
    currentStock: number;
    reorderPoint: number;
    storeName: string;
    shopifyStoreUrl: string;
  }): Promise<void> {
    const { sendEmail } = await import('@/lib/email');
    const adminUrl = adminProductUrl(data.shopifyStoreUrl, data.productId);
    const urgency = data.currentStock === 0 ? 'Out of Stock' : 'Restock Needed';
    const headerColor = data.currentStock === 0 ? '#cc0000' : '#b45309';

    const html = emailWrapper(data.storeName, `
      <h2 style="margin:0 0 6px;font-size:21px;color:#111;">${urgency}: ${data.productTitle}</h2>
      <p style="margin:0 0 24px;color:#666;font-size:14px;">
        Stock has dropped to or below your reorder point.
      </p>

      <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;margin:0 0 24px;">
        <tr>
          <td style="padding:14px 16px;font-size:14px;color:#555;border-bottom:1px solid #eee;">Current stock</td>
          <td style="padding:14px 16px;font-size:20px;font-weight:700;color:${headerColor};text-align:right;border-bottom:1px solid #eee;">${data.currentStock} units</td>
        </tr>
        <tr>
          <td style="padding:14px 16px;font-size:14px;color:#555;">Reorder point</td>
          <td style="padding:14px 16px;font-size:14px;color:#333;text-align:right;">${data.reorderPoint} units</td>
        </tr>
      </table>

      ${buildCTA(adminUrl, 'View Product in Shopify', '#0066cc')}

      <p style="margin:0;color:#888;font-size:13px;">
        A restock request has been sent to your supplier (if configured). Further alerts are suppressed for this product for the next ${COOLDOWN_HOURS} hours.
      </p>
    `);

    await sendEmail({
      to: data.to,
      subject: `Restock Needed: ${data.productTitle} (${data.currentStock} remaining)`,
      html,
      text: `Restock Needed: ${data.productTitle}\n\nCurrent stock: ${data.currentStock} units\nReorder point: ${data.reorderPoint} units\n\nView product: ${adminUrl}`,
    });
  }

  // ─── Slack Alert ──────────────────────────────────────────────────────────

  private async sendSlackAlert(data: {
    webhookUrl: string;
    productTitle: string;
    productId: string;
    currentStock: number;
    reorderPoint: number;
    shopifyStoreUrl: string;
  }): Promise<void> {
    const adminUrl = adminProductUrl(data.shopifyStoreUrl, data.productId);
    const urgency = data.currentStock === 0 ? '🔴 Out of Stock' : '🟡 Restock Needed';

    await fetch(data.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${urgency}: ${data.productTitle}`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${urgency}: ${data.productTitle}` },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Current Stock:*\n${data.currentStock} units` },
              { type: 'mrkdwn', text: `*Reorder Point:*\n${data.reorderPoint} units` },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View in Shopify' },
                url: adminUrl,
              },
            ],
          },
        ],
      }),
    });
  }
}

import { registerAutomation } from '../base';
registerAutomation(AutoRestockAlerts);
