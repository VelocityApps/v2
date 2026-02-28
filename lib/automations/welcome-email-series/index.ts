/**
 * Welcome Email Series
 * Sends a 3-email onboarding sequence to first-time buyers.
 *
 * Webhook used:
 *   orders/create  – capture first orders and queue the email sequence
 *
 * Cron (runScheduled, every hour):
 *   – sends emails whose day-offset has elapsed since order date
 *   – email 1 at day 0 (immediate), email 2 at day 3, email 3 at day 7
 *   – optional Shopify discount code in email 3 (config.include_discount)
 *
 * Config:
 *   email_sequence    – JSON array of day offsets, e.g. [0, 3, 7]
 *   include_discount  – checkbox; if true a discount code is included in email 3
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

const CRON_INTERVAL_HOURS = 1;
const SERIES_EXPIRY_DAYS = 30; // stop trying to send emails older than 30 days
const DISCOUNT_PERCENT = 10;

export class WelcomeEmailSeries extends BaseAutomation {
  name = 'Welcome Email Series';
  slug = 'welcome-email-series';

  // ─── Install / Uninstall ────────────────────────────────────────────────────

  async install(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (!userAutomation) throw new Error('User automation not found');

    const shopify = await this.getShopifyClient(userAutomation as UserAutomation);
    const webhook = await shopify.createWebhook('orders/create', WEBHOOK_ADDRESS());
    await this.registerWebhook(userAutomationId, 'orders/create', webhook.id);

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
            // Already gone; continue
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
    const customerEmail: string | undefined = payload.email || payload.customer?.email;
    if (!customerEmail) return;

    // Only send welcome sequence to first-time buyers
    const ordersCount: number = payload.customer?.orders_count ?? 1;
    if (ordersCount > 1) return;

    const orderId = String(payload.id);

    // Idempotency: skip if already tracked for this order
    const { data: existing } = await supabaseAdmin
      .from('welcome_email_series')
      .select('id')
      .eq('user_automation_id', userAutomation.id)
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) return;

    const storeName = storeNameFromUrl(userAutomation.shopify_store_url);
    const customerName: string =
      payload.customer?.first_name ||
      payload.billing_address?.first_name ||
      payload.shipping_address?.first_name ||
      '';

    const lineItems: any[] = (payload.line_items || []).map((item: any) => ({
      title: item.title || item.name || 'Product',
      quantity: item.quantity || 1,
      price: item.price || '0.00',
      image_url: item.image?.src || '',
    }));

    await supabaseAdmin.from('welcome_email_series').insert({
      user_automation_id: userAutomation.id,
      order_id: orderId,
      order_name: payload.name || `#${orderId}`,
      customer_email: customerEmail,
      customer_name: customerName,
      order_data: {
        line_items: lineItems,
        total_price: payload.total_price || '0.00',
        currency: payload.currency || 'USD',
        store_name: storeName,
        store_url: normalizeShop(userAutomation.shopify_store_url),
      },
      ordered_at: payload.created_at || new Date().toISOString(),
    });

    await this.log(
      userAutomation.id,
      'success',
      `Welcome series queued for first-time buyer ${customerEmail} (order ${payload.name})`,
      { orderId }
    );
  }

  // ─── Scheduled Processing (Cron) ─────────────────────────────────────────────

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    await this.processScheduledEmails(userAutomation);

    await supabaseAdmin
      .from('user_automations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: hoursFromNow(CRON_INTERVAL_HOURS),
      })
      .eq('id', userAutomation.id);
  }

  private async processScheduledEmails(userAutomation: UserAutomation): Promise<void> {
    const config = userAutomation.config || {};
    const emailSequence: number[] = parseSequence(config.email_sequence);
    const includeDiscount: boolean = config.include_discount !== false; // default true

    const cutoff = new Date(Date.now() - SERIES_EXPIRY_DAYS * 86_400_000).toISOString();

    // Only fetch series where at least one email remains unsent
    const { data: series } = await supabaseAdmin
      .from('welcome_email_series')
      .select('*')
      .eq('user_automation_id', userAutomation.id)
      .gte('ordered_at', cutoff)
      .or('email_1_sent_at.is.null,email_2_sent_at.is.null,email_3_sent_at.is.null');

    if (!series || series.length === 0) return;

    const now = Date.now();

    for (const row of series) {
      const daysSince = (now - new Date(row.ordered_at).getTime()) / 86_400_000;

      try {
        const [day1, day2, day3] = [
          emailSequence[0] ?? 0,
          emailSequence[1] ?? 3,
          emailSequence[2] ?? 7,
        ];

        if (!row.email_1_sent_at && daysSince >= day1) {
          await this.sendSeriesEmail(userAutomation, row, 1, null);
          await supabaseAdmin
            .from('welcome_email_series')
            .update({ email_1_sent_at: new Date().toISOString() })
            .eq('id', row.id);
        }

        if (!row.email_2_sent_at && daysSince >= day2) {
          await this.sendSeriesEmail(userAutomation, row, 2, null);
          await supabaseAdmin
            .from('welcome_email_series')
            .update({ email_2_sent_at: new Date().toISOString() })
            .eq('id', row.id);
        }

        if (!row.email_3_sent_at && daysSince >= day3) {
          let discountCode: string | null = null;
          if (includeDiscount) {
            discountCode = await this.createDiscountCode(userAutomation, row.order_id);
          }
          await this.sendSeriesEmail(userAutomation, row, 3, discountCode);
          await supabaseAdmin
            .from('welcome_email_series')
            .update({
              email_3_sent_at: new Date().toISOString(),
              ...(discountCode ? { discount_code: discountCode } : {}),
            })
            .eq('id', row.id);
        }
      } catch (err: any) {
        await this.log(
          userAutomation.id,
          'error',
          `Failed to process welcome series for ${row.customer_email}: ${err.message}`,
          { seriesId: row.id }
        );
      }
    }
  }

  // ─── Email Sending ────────────────────────────────────────────────────────────

  private async sendSeriesEmail(
    userAutomation: UserAutomation,
    row: any,
    emailNumber: 1 | 2 | 3,
    discountCode: string | null
  ): Promise<void> {
    const { sendEmail } = await import('@/lib/email');

    const data = row.order_data || {};
    const storeName: string = data.store_name || storeNameFromUrl(userAutomation.shopify_store_url);
    const storeUrl: string = data.store_url || normalizeShop(userAutomation.shopify_store_url);
    const customerName: string = row.customer_name || 'there';
    const lineItems: any[] = data.line_items || [];
    const currency: string = data.currency || 'USD';

    let subject: string;
    let html: string;

    if (emailNumber === 1) {
      subject = `Welcome to ${storeName}, ${customerName !== 'there' ? customerName : 'friend'}! 🎉`;
      html = this.buildEmail1(customerName, storeName, storeUrl, lineItems, currency);
    } else if (emailNumber === 2) {
      subject = `Getting the most from your ${storeName} order`;
      html = this.buildEmail2(customerName, storeName, storeUrl, lineItems);
    } else {
      subject = discountCode
        ? `A little something for you, ${customerName !== 'there' ? customerName : 'friend'} – ${DISCOUNT_PERCENT}% off your next order`
        : `Come back and shop with us again, ${customerName !== 'there' ? customerName : 'friend'}!`;
      html = this.buildEmail3(customerName, storeName, storeUrl, discountCode);
    }

    await sendEmail({
      to: row.customer_email,
      subject,
      html,
      text: stripHtml(html),
    });

    await this.log(
      userAutomation.id,
      'success',
      `Welcome series email ${emailNumber} sent to ${row.customer_email}`,
      { seriesId: row.id, discountCode }
    );
  }

  // ─── Shopify Discount Code ────────────────────────────────────────────────────

  private async createDiscountCode(
    userAutomation: UserAutomation,
    orderId: string
  ): Promise<string | null> {
    const code = `WELCOME${DISCOUNT_PERCENT}${randomSuffix()}`;
    try {
      const shopify = await this.getShopifyClient(userAutomation);
      const expiresAt = new Date(Date.now() + 30 * 86_400_000); // 30 days
      const priceRuleId = await shopify.createPriceRule(code, DISCOUNT_PERCENT, 1, expiresAt);
      await shopify.createDiscountCode(priceRuleId, code);
      return code;
    } catch (err: any) {
      await this.log(
        userAutomation.id,
        'warning',
        `Could not create Shopify discount for order ${orderId}: ${err.message} – sending email without code`,
        { code }
      );
      return null;
    }
  }

  // ─── Email Templates ──────────────────────────────────────────────────────────

  private buildEmail1(
    name: string,
    store: string,
    storeUrl: string,
    items: any[],
    currency: string
  ): string {
    const shopUrl = `https://${storeUrl}`;
    return emailWrapper(store, `
      <h2 style="margin:0 0 12px;font-size:24px;color:#111;">Welcome to ${store}, ${name}! 🎉</h2>
      <p style="margin:0 0 20px;color:#444;line-height:1.7;font-size:15px;">
        Thank you so much for your first order — we're thrilled to have you as a customer.
        Your order is being processed and we'll keep you updated every step of the way.
      </p>

      ${items.length > 0 ? `
      <div style="background:#f8f9fa;border-radius:8px;padding:20px 24px;margin:0 0 24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1px;">Your Order</p>
        ${items.map((item: any) => `
          <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #eee;">
            <div style="color:#333;font-size:14px;flex:1;">${item.title}${item.quantity > 1 ? ` <span style="color:#888;">×${item.quantity}</span>` : ''}</div>
            <div style="color:#555;font-size:14px;">${formatPrice(item.price, currency)}</div>
          </div>
        `).join('')}
      </div>` : ''}

      ${buildCTA(shopUrl, `Explore More at ${store}`, '#0066cc')}

      <p style="margin:8px 0 0;color:#777;font-size:13px;line-height:1.6;">
        Questions about your order? Just reply to this email — we're happy to help.
      </p>
    `);
  }

  private buildEmail2(
    name: string,
    store: string,
    storeUrl: string,
    items: any[]
  ): string {
    const shopUrl = `https://${storeUrl}`;
    const firstProduct = items[0]?.title || 'your new purchase';
    return emailWrapper(store, `
      <h2 style="margin:0 0 12px;font-size:22px;color:#111;">Getting the most from ${firstProduct}</h2>
      <p style="margin:0 0 20px;color:#444;line-height:1.7;font-size:15px;">
        Hi ${name}, we hope your order from ${store} has arrived and you're loving it!
        We wanted to share a few tips and ideas to get the most out of your purchase.
      </p>

      <div style="background:#fff8e6;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
          💡 <strong>Pro tip:</strong> If you ever have questions about your product, our support team responds within 24 hours. Just reply to any email or visit our store.
        </p>
      </div>

      ${buildCTA(shopUrl, 'Shop Our Best Sellers', '#0066cc')}

      <p style="margin:24px 0 0;color:#777;font-size:13px;line-height:1.6;">
        We'd love to hear how you're getting on — feel free to reply with any feedback or questions.
      </p>
    `);
  }

  private buildEmail3(
    name: string,
    store: string,
    storeUrl: string,
    discountCode: string | null
  ): string {
    const shopUrl = `https://${storeUrl}`;
    const ctaUrl = discountCode ? `${shopUrl}?discount=${discountCode}` : shopUrl;

    return emailWrapper(store, `
      <h2 style="margin:0 0 12px;font-size:22px;color:#111;">We miss you already, ${name}!</h2>
      <p style="margin:0 0 20px;color:#444;line-height:1.7;font-size:15px;">
        It's been a week since your first order with ${store}. We hope you're enjoying your purchase!
        ${discountCode
          ? `As a thank-you for being a new customer, here's a special offer just for you:`
          : `We'd love to have you back — there's always something new in store.`
        }
      </p>

      ${discountCode ? `
      <div style="background:#fff8e6;border:2px dashed #f59e0b;border-radius:8px;padding:20px 24px;text-align:center;margin:0 0 28px;">
        <p style="margin:0 0 6px;font-size:28px;font-weight:700;letter-spacing:3px;color:#b45309;">${discountCode}</p>
        <p style="margin:0;font-size:13px;color:#92400e;">${DISCOUNT_PERCENT}% off your next order — valid for 30 days</p>
      </div>` : ''}

      ${buildCTA(ctaUrl, discountCode ? `Shop Now & Save ${DISCOUNT_PERCENT}%` : 'Visit the Store', '#0066cc')}

      <p style="margin:24px 0 0;color:#777;font-size:13px;line-height:1.6;">
        Thanks again for choosing ${store}. We can't wait to serve you again! 🙏
      </p>
    `);
  }
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

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
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

/**
 * Parse email_sequence from config — handles JSON string, array, or invalid input.
 * Falls back to [0, 3, 7].
 */
function parseSequence(raw: unknown): number[] {
  const fallback = [0, 3, 7];
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length >= 1) {
      return parsed.map(Number).filter((n) => !isNaN(n));
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
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
              You're receiving this because you placed an order with ${storeName}.<br>
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
registerAutomation(WelcomeEmailSeries);
