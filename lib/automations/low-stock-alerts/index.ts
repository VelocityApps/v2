/**
 * Low Stock Alerts
 * Sends alerts when inventory falls below a configured threshold.
 *
 * Modes (config.frequency):
 *   "immediate"     – alert as soon as an inventory_levels/update webhook fires (default)
 *                     Respects a per-product cooldown (default 4 h) to avoid spam.
 *   "daily-digest"  – batch all low-stock products into one alert sent at 08:00 UTC
 *
 * Channels (config.notification_method):
 *   "email"  – send to config.email_addresses (comma-separated) or SUPPORT_ALERT_EMAILS
 *   "slack"  – send to config.slack_webhook_url
 *   "both"   – send to both email and Slack
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

function nextDailyRunAt(hourUtc: number): Date {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function adminProductUrl(storeUrl: string, productId: string): string {
  const host = storeUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return `https://${host}/admin/products/${productId}`;
}

export class LowStockAlerts extends BaseAutomation {
  name = 'Low Stock Alerts';
  slug = 'low-stock-alerts';

  // ─── Install / Uninstall ────────────────────────────────────────────────────

  async install(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (!userAutomation) throw new Error('User automation not found');

    const shopify = await this.getShopifyClient(userAutomation as UserAutomation);
    const webhookAddress = `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

    const webhook = await shopify.createWebhook('inventory_levels/update', webhookAddress);
    await this.registerWebhook(userAutomationId, 'inventory_levels/update', webhook.id);

    // Only set next_run_at for daily-digest mode (cron is not needed for immediate)
    const config = (userAutomation as UserAutomation).config || {};
    if ((config.frequency || 'immediate') === 'daily-digest') {
      await supabaseAdmin
        .from('user_automations')
        .update({ next_run_at: nextDailyRunAt(8).toISOString() })
        .eq('id', userAutomationId);
    }

    await this.log(userAutomationId, 'success', 'Installed – inventory webhook registered');
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

    const config = userAutomation.config || {};
    const frequency = config.frequency || 'immediate';

    // Daily-digest mode: suppress individual webhook alerts entirely.
    // The scheduled cron will compile and send a single digest.
    if (frequency === 'daily-digest') return;

    try {
      const shopify = await this.getShopifyClient(userAutomation);
      const threshold = Number(config.threshold) || 10;

      // Normalise payload (Shopify sometimes nests under inventory_level)
      const raw = (payload as any).inventory_level ?? payload;
      let inventoryItemId: string | null = String(raw.inventory_item_id ?? (payload as any).inventory_item_id ?? '');
      const locationId = String(raw.location_id ?? (payload as any).location_id ?? '');
      let available: number | null = raw.available ?? (payload as any).available ?? null;

      if (!inventoryItemId) {
        await this.log(userAutomation.id, 'warning', 'inventory_item_id missing from webhook payload');
        return;
      }

      // Fetch current level if not in payload
      if (available === null && locationId) {
        try {
          const levels = await shopify.getInventoryLevels([locationId], [inventoryItemId]);
          available = levels[0]?.available != null ? Number(levels[0].available) : null;
        } catch {
          // proceed with null
        }
      }

      const availableNum = available != null ? Number(available) : 0;

      // Nothing to do if still above threshold
      if (availableNum >= threshold) return;

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

      // Per-product cooldown: skip if we already alerted for this product recently
      const cooldownHours = Number(config.alert_cooldown_hours) || 4;
      const cooldownCutoff = new Date(Date.now() - cooldownHours * 3_600_000).toISOString();
      const { data: recentAlert } = await supabaseAdmin
        .from('automation_logs')
        .select('id')
        .eq('user_automation_id', userAutomation.id)
        .eq('event_type', 'success')
        .contains('metadata', { productId })
        .gte('created_at', cooldownCutoff)
        .limit(1);

      if (recentAlert && recentAlert.length > 0) return;

      await this.dispatchAlerts(config, {
        productTitle,
        productId,
        currentStock: availableNum,
        threshold,
        shopifyStoreUrl: userAutomation.shopify_store_url,
        userAutomationId: userAutomation.id,
      });

      await this.updateLastRun(userAutomation.id);
    } catch (error: any) {
      await this.log(userAutomation.id, 'error', `Failed to process low stock alert: ${error.message}`, { error: error.toString() });
      await this.updateStatus(userAutomation.id, 'error', error.message);
    }
  }

  // ─── Scheduled Processing – Daily Digest ─────────────────────────────────────

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    const config = userAutomation.config || {};
    if ((config.frequency || 'immediate') !== 'daily-digest') return;

    const threshold = Number(config.threshold) || 10;

    try {
      const shopify = await this.getShopifyClient(userAutomation);

      // Paginate through all products to find low-stock ones
      const lowStockItems: { productId: string; title: string; totalQty: number }[] = [];
      let page = 1;
      while (true) {
        const products = await shopify.getProducts(250);
        for (const product of products) {
          const totalQty = (product.variants || []).reduce(
            (sum: number, v: any) => sum + (Number(v.inventory_quantity) || 0), 0
          );
          if (totalQty < threshold) {
            lowStockItems.push({ productId: product.id, title: product.title, totalQty });
          }
        }
        if (products.length < 250) break;
        page++;
        // Safety cap at 10 pages (2 500 products) to avoid runaway loops
        if (page > 10) break;
      }

      if (lowStockItems.length === 0) {
        await this.log(userAutomation.id, 'info', 'Daily digest: no products below threshold');
      } else {
        await this.dispatchDigestAlerts(config, {
          items: lowStockItems,
          threshold,
          shopifyStoreUrl: userAutomation.shopify_store_url,
          userAutomationId: userAutomation.id,
        });
        await this.log(
          userAutomation.id,
          'success',
          `Daily digest: alerted for ${lowStockItems.length} low-stock product(s)`,
          { count: lowStockItems.length, threshold }
        );
        await this.updateLastRun(userAutomation.id);
      }
    } catch (error: any) {
      await this.log(userAutomation.id, 'error', `Daily digest failed: ${error.message}`);
      await this.updateStatus(userAutomation.id, 'error', error.message);
    }

    // Schedule next run for tomorrow 08:00 UTC
    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: nextDailyRunAt(8).toISOString() })
      .eq('id', userAutomation.id);
  }

  // ─── Alert Dispatch ───────────────────────────────────────────────────────────

  private channels(config: Record<string, any>): { email: boolean; slack: boolean } {
    const method = (config.notification_method || 'email').toLowerCase();
    return { email: method === 'email' || method === 'both', slack: method === 'slack' || method === 'both' };
  }

  private emailList(config: Record<string, any>): string[] {
    const fromConfig = (config.email_addresses || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    if (fromConfig.length) return fromConfig;
    return (process.env.SUPPORT_ALERT_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  }

  private async dispatchAlerts(
    config: Record<string, any>,
    data: { productTitle: string; productId: string; currentStock: number; threshold: number; shopifyStoreUrl: string; userAutomationId: string }
  ): Promise<void> {
    const ch = this.channels(config);
    const emails = this.emailList(config);
    const slackUrl = (config.slack_webhook_url || '').trim();

    if (!ch.email && !ch.slack) {
      await this.log(data.userAutomationId, 'warning',
        `Low stock for "${data.productTitle}" but no email or Slack configured`,
        { productId: data.productId, currentStock: data.currentStock, threshold: data.threshold });
      return;
    }

    const promises: Promise<void>[] = [];
    if (ch.email && emails.length > 0) promises.push(this.sendEmailAlert({ to: emails, ...data }));
    if (ch.slack && slackUrl) promises.push(this.sendSlackAlert({ webhookUrl: slackUrl, ...data }));

    await Promise.allSettled(promises);

    await this.log(
      data.userAutomationId,
      'success',
      `Low stock alert sent for "${data.productTitle}" (${data.currentStock} remaining, threshold ${data.threshold})`,
      { productId: data.productId, currentStock: data.currentStock, threshold: data.threshold }
    );
  }

  private async dispatchDigestAlerts(
    config: Record<string, any>,
    data: { items: { productId: string; title: string; totalQty: number }[]; threshold: number; shopifyStoreUrl: string; userAutomationId: string }
  ): Promise<void> {
    const ch = this.channels(config);
    const emails = this.emailList(config);
    const slackUrl = (config.slack_webhook_url || '').trim();

    if (!ch.email && !ch.slack) {
      await this.log(data.userAutomationId, 'warning', 'Daily digest: low-stock products but no email or Slack configured');
      return;
    }

    const promises: Promise<void>[] = [];
    if (ch.email && emails.length > 0) promises.push(this.sendDigestEmailAlert({ to: emails, ...data }));
    if (ch.slack && slackUrl) promises.push(this.sendDigestSlackAlert({ webhookUrl: slackUrl, ...data }));

    await Promise.allSettled(promises);
  }

  // ─── Email Alerts ─────────────────────────────────────────────────────────────

  private async sendEmailAlert(data: {
    to: string[];
    productTitle: string;
    productId: string;
    currentStock: number;
    threshold: number;
    shopifyStoreUrl: string;
  }): Promise<void> {
    const { sendEmail } = await import('@/lib/email');
    const adminUrl = adminProductUrl(data.shopifyStoreUrl, data.productId);
    const urgency = data.currentStock === 0 ? 'Out of Stock' : 'Low Stock';
    const color = data.currentStock === 0 ? '#cc0000' : '#e67e00';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:${color};padding:20px 28px;">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">⚠ ${urgency} Alert</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111;">${data.productTitle}</p>
          <p style="margin:0 0 24px;color:#666;font-size:14px;">Your Shopify store</p>

          <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;margin:0 0 24px;">
            <tr>
              <td style="padding:14px 16px;font-size:14px;color:#555;border-bottom:1px solid #eee;">Current stock</td>
              <td style="padding:14px 16px;font-size:18px;font-weight:700;color:${color};text-align:right;border-bottom:1px solid #eee;">${data.currentStock} units</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;font-size:14px;color:#555;">Alert threshold</td>
              <td style="padding:14px 16px;font-size:14px;color:#333;text-align:right;">${data.threshold} units</td>
            </tr>
          </table>

          <div style="text-align:center;">
            <a href="${adminUrl}" style="display:inline-block;padding:12px 28px;background:#0066cc;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">
              View Product in Shopify
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:14px 28px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#aaa;font-size:12px;text-align:center;">
            Sent by <a href="https://velocityapps.dev" style="color:#0066cc;text-decoration:none;">VelocityApps</a> Low Stock Alerts
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendEmail({
      to: data.to,
      subject: `${urgency}: ${data.productTitle} (${data.currentStock} left)`,
      html,
      text: `${urgency}: ${data.productTitle}\n\nCurrent stock: ${data.currentStock} units\nThreshold: ${data.threshold} units\n\nView product: ${adminUrl}`,
    });
  }

  private async sendDigestEmailAlert(data: {
    to: string[];
    items: { productId: string; title: string; totalQty: number }[];
    threshold: number;
    shopifyStoreUrl: string;
  }): Promise<void> {
    const { sendEmail } = await import('@/lib/email');

    const rows = data.items.map((item) => {
      const color = item.totalQty === 0 ? '#cc0000' : '#e67e00';
      const url = adminProductUrl(data.shopifyStoreUrl, item.productId);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#333;font-size:14px;">${item.title}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-weight:700;color:${color};font-size:14px;text-align:right;">${item.totalQty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">
            <a href="${url}" style="color:#0066cc;font-size:13px;text-decoration:none;">Restock →</a>
          </td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:#e67e00;padding:20px 28px;">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">📦 Daily Low Stock Digest</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 20px;color:#444;font-size:15px;">
            <strong>${data.items.length} product${data.items.length !== 1 ? 's' : ''}</strong> ${data.items.length !== 1 ? 'are' : 'is'} at or below your threshold of <strong>${data.threshold} units</strong>.
          </p>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#fafafa;">
                <th style="padding:10px 12px;text-align:left;font-size:13px;color:#888;font-weight:600;">Product</th>
                <th style="padding:10px 12px;text-align:right;font-size:13px;color:#888;font-weight:600;">Stock</th>
                <th style="padding:10px 12px;text-align:right;font-size:13px;color:#888;font-weight:600;"></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </td></tr>
        <tr><td style="padding:14px 28px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#aaa;font-size:12px;text-align:center;">
            Sent by <a href="https://velocityapps.dev" style="color:#0066cc;text-decoration:none;">VelocityApps</a> Low Stock Alerts
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const textLines = data.items.map((i) => `- ${i.title}: ${i.totalQty} units`).join('\n');
    await sendEmail({
      to: data.to,
      subject: `Low Stock Digest: ${data.items.length} product${data.items.length !== 1 ? 's' : ''} need restocking`,
      html,
      text: `Daily Low Stock Digest\n\n${data.items.length} product(s) below threshold (${data.threshold}):\n${textLines}`,
    });
  }

  // ─── Slack Alerts ─────────────────────────────────────────────────────────────

  private async sendSlackAlert(data: {
    webhookUrl: string;
    productTitle: string;
    productId: string;
    currentStock: number;
    threshold: number;
    shopifyStoreUrl: string;
  }): Promise<void> {
    const adminUrl = adminProductUrl(data.shopifyStoreUrl, data.productId);
    const urgency = data.currentStock === 0 ? '🔴 Out of Stock' : '🟡 Low Stock';

    await fetch(data.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${urgency}: ${data.productTitle}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `${urgency}: ${data.productTitle}` } },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Current Stock:*\n${data.currentStock} units` },
              { type: 'mrkdwn', text: `*Alert Threshold:*\n${data.threshold} units` },
            ],
          },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: 'View in Shopify' }, url: adminUrl },
            ],
          },
        ],
      }),
    });
  }

  private async sendDigestSlackAlert(data: {
    webhookUrl: string;
    items: { productId: string; title: string; totalQty: number }[];
    threshold: number;
    shopifyStoreUrl: string;
  }): Promise<void> {
    const lines = data.items.map(
      (item) => `• <${adminProductUrl(data.shopifyStoreUrl, item.productId)}|${item.title}>: *${item.totalQty} units*`
    );

    await fetch(data.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `📦 Daily Low Stock Digest: ${data.items.length} products need restocking`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '📦 Daily Low Stock Digest' } },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${data.items.length} product${data.items.length !== 1 ? 's' : ''}* at or below threshold (${data.threshold} units):\n\n${lines.join('\n')}`,
            },
          },
        ],
      }),
    });
  }
}

import { registerAutomation } from '../base';
registerAutomation(LowStockAlerts);
