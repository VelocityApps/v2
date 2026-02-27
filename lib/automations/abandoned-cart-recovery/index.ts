/**
 * Abandoned Cart Recovery
 * 3-email sequence with real Shopify discount codes
 *
 * Webhooks used:
 *   checkouts/create  – capture new checkout as abandoned
 *   checkouts/update  – detect completion (completed_at set)
 *   orders/create     – mark cart recovered when order is placed
 *
 * Cron (runScheduled, every hour):
 *   – send email 1 after email_1_delay_hours  (default 1 h)
 *   – send email 2 after email_2_delay_hours  (default 24 h) with discount
 *   – send email 3 after email_3_delay_hours  (default 72 h) with larger discount
 *   – expire carts older than 7 days
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

const CART_EXPIRY_DAYS = 7;
const CRON_INTERVAL_HOURS = 1;

export class AbandonedCartRecovery extends BaseAutomation {
  name = 'Abandoned Cart Recovery';
  slug = 'abandoned-cart-recovery';

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

    const topics = ['checkouts/create', 'checkouts/update', 'orders/create'] as const;
    for (const topic of topics) {
      const webhook = await shopify.createWebhook(topic, address);
      await this.registerWebhook(userAutomationId, topic, webhook.id);
    }

    // Schedule first cron run in 1 hour
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
    if (topic === 'checkouts/create') {
      await this.handleCheckoutCreated(payload, userAutomation);
    } else if (topic === 'checkouts/update') {
      await this.handleCheckoutUpdated(payload, userAutomation);
    } else if (topic === 'orders/create') {
      await this.handleOrderCreated(payload, userAutomation);
    }
  }

  private async handleCheckoutCreated(
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    const checkoutToken = payload.token || String(payload.id);
    const customerEmail = payload.email || payload.customer?.email;

    // No email = nothing to send
    if (!customerEmail) return;

    // Skip if already tracked (idempotency)
    const { data: existing } = await supabaseAdmin
      .from('abandoned_carts')
      .select('id')
      .eq('user_automation_id', userAutomation.id)
      .eq('checkout_id', checkoutToken)
      .maybeSingle();

    if (existing) return;

    const storeName = storeNameFromUrl(userAutomation.shopify_store_url);
    const lineItems: any[] = payload.line_items || [];
    const totalPrice: string = payload.total_price || payload.totalPrice || '0.00';
    const currency: string = payload.currency || 'USD';
    const restoreUrl: string =
      payload.abandoned_checkout_url ||
      `https://${normalizeShop(userAutomation.shopify_store_url)}/checkouts/${checkoutToken}`;

    await supabaseAdmin.from('abandoned_carts').insert({
      user_automation_id: userAutomation.id,
      checkout_id: checkoutToken,
      customer_email: customerEmail,
      customer_name: payload.customer?.first_name || payload.billing_address?.first_name || null,
      cart_data: { line_items: lineItems, total_price: totalPrice, currency, restore_url: restoreUrl, store_name: storeName },
      abandoned_at: new Date().toISOString(),
      status: 'abandoned',
    });

    await this.log(
      userAutomation.id,
      'success',
      `Checkout captured for ${customerEmail} – recovery emails queued`,
      { checkoutToken }
    );
  }

  private async handleCheckoutUpdated(
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    // Only act when checkout is completed
    if (!payload.completed_at) return;

    const checkoutToken = payload.token || String(payload.id);

    const { data: cart } = await supabaseAdmin
      .from('abandoned_carts')
      .select('id, status')
      .eq('user_automation_id', userAutomation.id)
      .eq('checkout_id', checkoutToken)
      .maybeSingle();

    if (!cart || cart.status !== 'abandoned') return;

    await supabaseAdmin
      .from('abandoned_carts')
      .update({ status: 'recovered', recovered_at: new Date().toISOString() })
      .eq('id', cart.id);

    await this.log(userAutomation.id, 'info', `Cart ${checkoutToken} recovered (checkout completed)`);
  }

  private async handleOrderCreated(
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    const customerEmail = payload.email || payload.customer?.email;
    if (!customerEmail) return;

    // Mark any open abandoned carts for this email as recovered
    const { data: carts } = await supabaseAdmin
      .from('abandoned_carts')
      .select('id')
      .eq('user_automation_id', userAutomation.id)
      .eq('customer_email', customerEmail)
      .eq('status', 'abandoned');

    if (!carts || carts.length === 0) return;

    const cartIds = carts.map((c: any) => c.id);
    await supabaseAdmin
      .from('abandoned_carts')
      .update({ status: 'recovered', recovered_at: new Date().toISOString() })
      .in('id', cartIds);

    await this.log(
      userAutomation.id,
      'info',
      `${cartIds.length} cart(s) marked recovered (order placed by ${customerEmail})`
    );
  }

  // ─── Scheduled Processing (Cron) ─────────────────────────────────────────────

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    await this.processScheduledEmails(userAutomation);

    // Schedule next run
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
    const email1DelayHours: number = config.email_1_delay_hours ?? 1;
    const email2DelayHours: number = config.email_2_delay_hours ?? 24;
    const email3DelayHours: number = config.email_3_delay_hours ?? 72;
    const email2Discount: number = config.email_2_discount_percent ?? 10;
    const email3Discount: number = config.email_3_discount_percent ?? 15;

    const expiryDate = new Date(Date.now() - CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const { data: carts } = await supabaseAdmin
      .from('abandoned_carts')
      .select('*')
      .eq('user_automation_id', userAutomation.id)
      .eq('status', 'abandoned')
      .gte('abandoned_at', expiryDate.toISOString())
      .order('abandoned_at', { ascending: true });

    if (!carts || carts.length === 0) return;

    const now = Date.now();

    for (const cart of carts) {
      const hoursSince = (now - new Date(cart.abandoned_at).getTime()) / 3_600_000;

      try {
        // Email 1 – gentle reminder, no discount
        if (!cart.email_1_sent_at && hoursSince >= email1DelayHours) {
          await this.sendRecoveryEmail(userAutomation, cart, 1, null);
          await supabaseAdmin
            .from('abandoned_carts')
            .update({ email_1_sent_at: new Date().toISOString() })
            .eq('id', cart.id);
        }

        // Email 2 – small discount
        if (!cart.email_2_sent_at && hoursSince >= email2DelayHours) {
          const code = await this.createShopifyDiscount(userAutomation, email2Discount, cart.checkout_id, 'E2');
          await this.sendRecoveryEmail(userAutomation, cart, 2, code);
          await supabaseAdmin
            .from('abandoned_carts')
            .update({ email_2_sent_at: new Date().toISOString(), discount_code_2: code })
            .eq('id', cart.id);
        }

        // Email 3 – larger discount, last chance
        if (!cart.email_3_sent_at && hoursSince >= email3DelayHours) {
          const code = await this.createShopifyDiscount(userAutomation, email3Discount, cart.checkout_id, 'E3');
          await this.sendRecoveryEmail(userAutomation, cart, 3, code);
          await supabaseAdmin
            .from('abandoned_carts')
            .update({ email_3_sent_at: new Date().toISOString(), discount_code_3: code })
            .eq('id', cart.id);
        }
      } catch (err: any) {
        await this.log(
          userAutomation.id,
          'error',
          `Failed to process cart ${cart.id}: ${err.message}`
        );
      }
    }

    // Expire carts older than CART_EXPIRY_DAYS that still have all 3 emails sent (or are very old)
    await supabaseAdmin
      .from('abandoned_carts')
      .update({ status: 'expired' })
      .eq('user_automation_id', userAutomation.id)
      .eq('status', 'abandoned')
      .lt('abandoned_at', expiryDate.toISOString());
  }

  // ─── Email Sending ────────────────────────────────────────────────────────────

  private async sendRecoveryEmail(
    userAutomation: UserAutomation,
    cart: any,
    emailNumber: 1 | 2 | 3,
    discountCode: string | null
  ): Promise<void> {
    const { sendEmail } = await import('@/lib/email');

    const cartData = cart.cart_data || {};
    const lineItems: any[] = cartData.line_items || [];
    const totalPrice: string = cartData.total_price || '0.00';
    const currency: string = cartData.currency || 'USD';
    const restoreUrl: string = cartData.restore_url ||
      `https://${normalizeShop(userAutomation.shopify_store_url)}/cart`;
    const storeName: string = cartData.store_name || storeNameFromUrl(userAutomation.shopify_store_url);
    const customerName: string = cart.customer_name || 'there';

    const config = userAutomation.config || {};
    const fromName: string = config.from_name || storeName;
    const replyTo: string = config.reply_to || '';

    let subject: string;
    let html: string;

    if (emailNumber === 1) {
      subject = `${customerName !== 'there' ? `${cart.customer_name}, you` : 'You'} left something behind at ${storeName}`;
      html = this.buildEmail1(customerName, storeName, lineItems, totalPrice, currency, restoreUrl);
    } else if (emailNumber === 2) {
      const pct = config.email_2_discount_percent ?? 10;
      subject = `Still thinking about it? Here's ${pct}% off – ${storeName}`;
      html = this.buildEmail2(customerName, storeName, lineItems, totalPrice, currency, restoreUrl, discountCode, pct);
    } else {
      const pct = config.email_3_discount_percent ?? 15;
      subject = `Last chance: ${pct}% off your cart at ${storeName}`;
      html = this.buildEmail3(customerName, storeName, lineItems, totalPrice, currency, restoreUrl, discountCode, pct);
    }

    const emailOptions: any = {
      to: cart.customer_email,
      subject,
      html,
      text: stripHtml(html),
    };
    if (replyTo) emailOptions.from = `${fromName} <${replyTo}>`;

    await sendEmail(emailOptions);

    await this.log(
      userAutomation.id,
      'success',
      `Recovery email ${emailNumber} sent to ${cart.customer_email}`,
      { cartId: cart.id, discountCode }
    );
  }

  // ─── Shopify Discount Code Creation ──────────────────────────────────────────

  private async createShopifyDiscount(
    userAutomation: UserAutomation,
    discountPercent: number,
    checkoutId: string,
    suffix: string
  ): Promise<string> {
    const code = `SAVE${discountPercent}${suffix}${randomSuffix()}`;

    try {
      const shopify = await this.getShopifyClient(userAutomation);
      const expiresAt = new Date(Date.now() + CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const priceRuleId = await shopify.createPriceRule(code, discountPercent, 1, expiresAt);
      await shopify.createDiscountCode(priceRuleId, code);
      return code;
    } catch (err: any) {
      await this.log(
        userAutomation.id,
        'warning',
        `Could not create Shopify discount code for cart ${checkoutId}: ${err.message} – using placeholder code`,
        { discountPercent }
      );
      return code; // Return placeholder; merchant may need to create manually
    }
  }

  // ─── Email Templates ──────────────────────────────────────────────────────────

  private buildEmail1(
    name: string, store: string, items: any[], total: string, currency: string, restoreUrl: string
  ): string {
    return emailWrapper(store, `
      <h2 style="margin:0 0 16px;font-size:22px;color:#111;">Hey ${name}, you left something behind!</h2>
      <p style="margin:0 0 20px;color:#444;line-height:1.6;">
        You were so close! The items below are still waiting in your cart.
      </p>
      ${buildCartTable(items, total, currency)}
      ${buildCTA(restoreUrl, 'Complete Your Purchase', '#0066cc')}
      <p style="margin:24px 0 0;color:#888;font-size:13px;">
        This link will take you straight back to your cart.
      </p>
    `);
  }

  private buildEmail2(
    name: string, store: string, items: any[], total: string, currency: string,
    restoreUrl: string, code: string | null, pct: number
  ): string {
    return emailWrapper(store, `
      <h2 style="margin:0 0 16px;font-size:22px;color:#111;">Still thinking about it, ${name}?</h2>
      <p style="margin:0 0 20px;color:#444;line-height:1.6;">
        We'd love to help you check out. Use the code below to save <strong>${pct}% on your order</strong>.
      </p>
      ${code ? buildDiscountBadge(code, `${pct}% off – apply at checkout`) : ''}
      ${buildCartTable(items, total, currency)}
      ${buildCTA(`${restoreUrl}${code ? `?discount=${code}` : ''}`, `Claim ${pct}% Off Now`, '#0066cc')}
    `);
  }

  private buildEmail3(
    name: string, store: string, items: any[], total: string, currency: string,
    restoreUrl: string, code: string | null, pct: number
  ): string {
    return emailWrapper(store, `
      <h2 style="margin:0 0 16px;font-size:22px;color:#cc3300;">Last chance, ${name}!</h2>
      <p style="margin:0 0 20px;color:#444;line-height:1.6;">
        Your <strong>${pct}% discount</strong> is about to expire. Don't miss out on these items.
      </p>
      ${code ? buildDiscountBadge(code, `${pct}% off – expires in 7 days`) : ''}
      ${buildCartTable(items, total, currency)}
      ${buildCTA(`${restoreUrl}${code ? `?discount=${code}` : ''}`, `Save ${pct}% – Complete Order`, '#cc3300')}
      <p style="margin:24px 0 0;color:#888;font-size:13px;">
        If you're no longer interested, simply ignore this email.
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

function buildCartTable(items: any[], total: string, currency: string): string {
  if (!items.length) return '';
  const rows = items.map((item: any) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#333;">${item.title || item.name || 'Item'}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#333;text-align:right;">
        ${item.quantity ? `x${item.quantity}  ` : ''}${formatPrice(item.price, currency)}
      </td>
    </tr>
  `).join('');
  return `
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#fafafa;border-radius:8px;overflow:hidden;">
      <tbody>
        ${rows}
        <tr>
          <td style="padding:10px 0 4px;font-weight:bold;color:#111;">Total</td>
          <td style="padding:10px 0 4px;font-weight:bold;color:#111;text-align:right;">${formatPrice(total, currency)}</td>
        </tr>
      </tbody>
    </table>
  `;
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

function buildDiscountBadge(code: string, caption: string): string {
  return `
    <div style="background:#fff8e6;border:2px dashed #f59e0b;border-radius:8px;padding:16px 20px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 4px;font-size:26px;font-weight:700;letter-spacing:3px;color:#b45309;">${code}</p>
      <p style="margin:0;font-size:13px;color:#92400e;">${caption}</p>
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
              You're receiving this because you started a checkout at ${storeName}.<br>
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
registerAutomation(AbandonedCartRecovery);
