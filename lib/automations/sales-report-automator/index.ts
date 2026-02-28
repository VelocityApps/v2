/**
 * Sales Report Automator
 * Generates and delivers periodic sales reports (daily / weekly / monthly)
 * via email or Slack. Cron-only — no webhooks.
 *
 * Config:
 *   report_frequency   "daily" | "weekly" | "monthly"  (default "weekly")
 *   delivery_method    "email" | "slack"               (default "email")
 *   email_addresses    comma-separated recipients       (fallback: SUPPORT_ALERT_EMAILS)
 *   slack_webhook_url  Slack incoming-webhook URL       (optional)
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

// ─── Next-run Scheduling ──────────────────────────────────────────────────────

function nextRunAt(frequency: string): string {
  const now = new Date();
  if (frequency === 'daily') {
    // Next midnight UTC
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return next.toISOString();
  } else if (frequency === 'weekly') {
    // Next Monday midnight UTC
    const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
    return next.toISOString();
  } else {
    // monthly – first day of next month midnight UTC
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return next.toISOString();
  }
}

// ─── Email Template Helpers ───────────────────────────────────────────────────

function emailWrapper(storeName: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;max-width:620px;width:100%;">
        <tr>
          <td style="background:#111827;padding:24px 32px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">${storeName}</p>
            <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Sales Report</p>
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
              Powered by <a href="https://velocityapps.dev" style="color:#0066cc;text-decoration:none;">VelocityApps</a> Sales Report Automator
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function storeNameFromUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '').replace('.myshopify.com', '').replace(/-/g, ' ');
}

function adminOrdersUrl(storeUrl: string): string {
  const host = storeUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return `https://${host}/admin/orders`;
}

// ─── Automation Class ─────────────────────────────────────────────────────────

export class SalesReportAutomator extends BaseAutomation {
  name = 'Sales Report Automator';
  slug = 'sales-report-automator';

  // ─── Install / Uninstall ──────────────────────────────────────────────────

  async install(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (!userAutomation) throw new Error('User automation not found');

    const config = (userAutomation as UserAutomation).config || {};
    const frequency = config.report_frequency || 'weekly';

    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: nextRunAt(frequency) })
      .eq('id', userAutomationId);

    await this.log(
      userAutomationId,
      'success',
      `Installed – first ${frequency} report scheduled for ${nextRunAt(frequency)}`
    );
  }

  async uninstall(userAutomationId: string): Promise<void> {
    // No webhooks to clean up
    await this.log(userAutomationId, 'info', 'Uninstalled');
  }

  // No webhooks – required by BaseAutomation but unused
  async handleWebhook(_topic: string, _payload: ShopifyWebhookPayload, _ua: UserAutomation): Promise<void> {
    return;
  }

  // ─── Scheduled Run ────────────────────────────────────────────────────────

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    const config = userAutomation.config || {};
    const frequency: string = config.report_frequency || 'weekly';
    const deliveryMethod: string = config.delivery_method || 'email';
    const startTime = Date.now();

    try {
      // Determine reporting period
      const now = new Date();
      let periodStart: Date;
      let periodLabel: string;

      if (frequency === 'daily') {
        // Yesterday
        periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        periodLabel = periodStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
      } else if (frequency === 'weekly') {
        periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 7 Days';
      } else {
        periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 30 Days';
      }

      const periodEnd = now;

      // Fetch orders from Shopify
      const orders = await this.fetchOrdersForPeriod(
        userAutomation,
        periodStart.toISOString(),
        periodEnd.toISOString()
      );

      // Calculate metrics
      const orderCount = orders.length;
      const totalRevenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total_price || '0'), 0);
      const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      // Aggregate top products from line items
      const productMap = new Map<string, { title: string; quantity: number; revenue: number }>();
      for (const order of orders) {
        for (const item of (order.line_items || [])) {
          const key = String(item.product_id || item.title || 'Unknown');
          const qty = item.quantity || 0;
          const rev = parseFloat(item.price || '0') * qty;
          const existing = productMap.get(key);
          if (existing) {
            existing.quantity += qty;
            existing.revenue += rev;
          } else {
            productMap.set(key, { title: item.title || 'Unknown Product', quantity: qty, revenue: rev });
          }
        }
      }
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const storeName = storeNameFromUrl(userAutomation.shopify_store_url);
      const metrics = { totalRevenue, orderCount, avgOrderValue, topProducts, periodLabel, storeName };

      // Dispatch via chosen delivery method
      if (deliveryMethod === 'slack') {
        await this.sendSlackReport(config, metrics, userAutomation.shopify_store_url);
      } else {
        await this.sendEmailReport(config, metrics, userAutomation.shopify_store_url);
      }

      await this.log(
        userAutomation.id,
        'success',
        `${frequency} sales report delivered via ${deliveryMethod} – ${orderCount} orders, ${formatCurrency(totalRevenue)} revenue`,
        { orderCount, totalRevenue, avgOrderValue, periodLabel, execution_time_ms: Date.now() - startTime }
      );
    } catch (error: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to generate sales report: ${error.message}`,
        { error: error.toString() }
      );
      await this.updateStatus(userAutomation.id, 'error', error.message);
      throw error;
    }

    // Schedule next run
    const nextRun = nextRunAt(userAutomation.config?.report_frequency || 'weekly');
    await supabaseAdmin
      .from('user_automations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRun,
      })
      .eq('id', userAutomation.id);
  }

  // ─── Shopify Orders Fetch ─────────────────────────────────────────────────

  private async fetchOrdersForPeriod(
    userAutomation: UserAutomation,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const { decryptToken } = await import('@/lib/shopify/oauth');
    const token = await decryptToken(userAutomation.shopify_access_token_encrypted!);
    const shop = userAutomation.shopify_store_url
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');
    const params = new URLSearchParams({
      status: 'any',
      financial_status: 'paid',
      created_at_min: startDate,
      created_at_max: endDate,
      limit: '250',
    });
    const res = await fetch(`https://${shop}/admin/api/2024-01/orders.json?${params}`, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Shopify orders API: ${res.status}`);
    const data = await res.json();
    return data.orders || [];
  }

  // ─── Email Report ─────────────────────────────────────────────────────────

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

  private async sendEmailReport(
    config: Record<string, any>,
    metrics: {
      totalRevenue: number;
      orderCount: number;
      avgOrderValue: number;
      topProducts: { title: string; quantity: number; revenue: number }[];
      periodLabel: string;
      storeName: string;
    },
    storeUrl: string
  ): Promise<void> {
    const { sendEmail } = await import('@/lib/email');
    const to = this.emailList(config);
    if (to.length === 0) return;

    const ordersUrl = adminOrdersUrl(storeUrl);

    const productRows = metrics.topProducts.length > 0
      ? metrics.topProducts.map((p) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#333;font-size:14px;">${p.title}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;text-align:right;">${p.quantity} units</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;text-align:right;">${formatCurrency(p.revenue)}</td>
          </tr>`).join('')
      : `<tr><td colspan="3" style="padding:16px 12px;color:#888;font-size:14px;text-align:center;">No product data available</td></tr>`;

    const html = emailWrapper(metrics.storeName, `
      <h2 style="margin:0 0 8px;font-size:22px;color:#111;">Sales Report</h2>
      <p style="margin:0 0 28px;color:#666;font-size:14px;">${metrics.periodLabel}</p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 32px;">
        <tr>
          <td style="width:25%;padding:0 8px 0 0;">
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;">
              <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111;">${formatCurrency(metrics.totalRevenue)}</p>
              <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Revenue</p>
            </div>
          </td>
          <td style="width:25%;padding:0 8px;">
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;">
              <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111;">${metrics.orderCount}</p>
              <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Orders</p>
            </div>
          </td>
          <td style="width:25%;padding:0 8px;">
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;">
              <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111;">${formatCurrency(metrics.avgOrderValue)}</p>
              <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Avg Order</p>
            </div>
          </td>
          <td style="width:25%;padding:0 0 0 8px;">
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111;line-height:1.4;">${metrics.periodLabel}</p>
              <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Period</p>
            </div>
          </td>
        </tr>
      </table>

      <h3 style="margin:0 0 12px;font-size:16px;color:#111;font-weight:600;">Top Products</h3>
      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;margin:0 0 24px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">Product</th>
            <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;font-weight:600;">Units Sold</th>
            <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;font-weight:600;">Revenue</th>
          </tr>
        </thead>
        <tbody>${productRows}</tbody>
      </table>

      ${buildCTA(ordersUrl, 'View All Orders in Shopify', '#111827')}
    `);

    const textLines = metrics.topProducts.map((p) => `  ${p.title}: ${p.quantity} units (${formatCurrency(p.revenue)})`).join('\n');
    const text = `Sales Report – ${metrics.periodLabel}\n\nRevenue: ${formatCurrency(metrics.totalRevenue)}\nOrders: ${metrics.orderCount}\nAvg Order: ${formatCurrency(metrics.avgOrderValue)}\n\nTop Products:\n${textLines || '  No data'}\n\nView orders: ${ordersUrl}`;

    await sendEmail({
      to,
      subject: `${metrics.storeName} Sales Report – ${metrics.periodLabel}`,
      html,
      text,
    });
  }

  // ─── Slack Report ─────────────────────────────────────────────────────────

  private async sendSlackReport(
    config: Record<string, any>,
    metrics: {
      totalRevenue: number;
      orderCount: number;
      avgOrderValue: number;
      topProducts: { title: string; quantity: number; revenue: number }[];
      periodLabel: string;
      storeName: string;
    },
    storeUrl: string
  ): Promise<void> {
    const slackUrl = (config.slack_webhook_url || '').trim();
    if (!slackUrl) return;

    const ordersUrl = adminOrdersUrl(storeUrl);

    const productLines = metrics.topProducts.length > 0
      ? metrics.topProducts.map((p, i) => `${i + 1}. *${p.title}* – ${p.quantity} units (${formatCurrency(p.revenue)})`).join('\n')
      : '_No product data available_';

    await fetch(slackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Sales Report: ${metrics.storeName} – ${metrics.periodLabel}`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `Sales Report – ${metrics.periodLabel}` },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*${metrics.storeName}*` },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Revenue:*\n${formatCurrency(metrics.totalRevenue)}` },
              { type: 'mrkdwn', text: `*Orders:*\n${metrics.orderCount}` },
              { type: 'mrkdwn', text: `*Avg Order Value:*\n${formatCurrency(metrics.avgOrderValue)}` },
              { type: 'mrkdwn', text: `*Period:*\n${metrics.periodLabel}` },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Top Products:*\n${productLines}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Orders in Shopify' },
                url: ordersUrl,
              },
            ],
          },
        ],
      }),
    });
  }
}

import { registerAutomation } from '../base';
registerAutomation(SalesReportAutomator);
