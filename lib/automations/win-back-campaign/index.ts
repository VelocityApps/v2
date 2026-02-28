/**
 * Win-Back Campaign
 * Identifies customers who haven't purchased in X days and sends them
 * a personalised discount email to bring them back.
 *
 * No webhooks – cron-only automation (runs daily).
 *
 * Cron (runScheduled, every 24 hours):
 *   – Fetch customers whose last order date is older than inactive_days
 *   – Skip customers emailed within the last 90 days (cooldown)
 *   – Create a Shopify discount code for each eligible customer
 *   – Send win-back email
 *   – Record send in win_back_emails table
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const COOLDOWN_DAYS = 90; // Don't re-contact the same customer within this period
const DISCOUNT_EXPIRY_DAYS = 30; // Discount code valid for 30 days
const CRON_INTERVAL_HOURS = 24; // Run once per day

export class WinBackCampaign extends BaseAutomation {
  name = 'Win-Back Campaign';
  slug = 'win-back-campaign';

  // ─── Install / Uninstall ────────────────────────────────────────────────────

  async install(userAutomationId: string): Promise<void> {
    // No webhooks needed – this is a cron-only automation
    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: hoursFromNow(CRON_INTERVAL_HOURS) })
      .eq('id', userAutomationId);

    await this.log(userAutomationId, 'success', 'Installed – cron scheduled (daily, no webhooks required)');
  }

  async uninstall(userAutomationId: string): Promise<void> {
    // Nothing to clean up on Shopify – no webhooks were registered
    await this.log(userAutomationId, 'info', 'Uninstalled – no webhooks to remove');
  }

  // ─── Webhook Handler ─────────────────────────────────────────────────────────

  // Win-Back Campaign does not use webhooks; this is a no-op.
  async handleWebhook(
    _topic: string,
    _payload: ShopifyWebhookPayload,
    _userAutomation: UserAutomation
  ): Promise<void> {
    // No-op
  }

  // ─── Scheduled Processing (Cron) ─────────────────────────────────────────────

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    await this.runWinBackCampaign(userAutomation);

    await supabaseAdmin
      .from('user_automations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: hoursFromNow(CRON_INTERVAL_HOURS),
      })
      .eq('id', userAutomation.id);
  }

  private async runWinBackCampaign(userAutomation: UserAutomation): Promise<void> {
    const config = userAutomation.config || {};
    const inactiveDays: number = config.inactive_days ?? 90;
    const discountPercentage: number = config.discount_percentage ?? 20;

    const cutoffDate = new Date(Date.now() - inactiveDays * 86_400_000);
    const cutoffIso = cutoffDate.toISOString();

    await this.log(
      userAutomation.id,
      'info',
      `Win-back run started – cutoff: ${cutoffDate.toLocaleDateString()}, discount: ${discountPercentage}%`
    );

    let customers: any[];
    try {
      customers = await this.fetchInactiveCustomers(userAutomation, cutoffIso);
    } catch (err: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to fetch inactive customers from Shopify: ${err.message}`
      );
      return;
    }

    if (!customers || customers.length === 0) {
      await this.log(userAutomation.id, 'info', 'No inactive customers found for this run');
      return;
    }

    await this.log(
      userAutomation.id,
      'info',
      `Found ${customers.length} potentially inactive customer(s) to process`
    );

    let sentCount = 0;
    let skippedCount = 0;

    for (const customer of customers) {
      const email: string | undefined = customer.email;
      if (!email) {
        skippedCount++;
        continue;
      }

      // Cooldown check – skip if we already sent within COOLDOWN_DAYS
      const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString();
      const { data: recentSend } = await supabaseAdmin
        .from('win_back_emails')
        .select('id')
        .eq('user_automation_id', userAutomation.id)
        .eq('customer_email', email)
        .gte('sent_at', cooldownCutoff)
        .maybeSingle();

      if (recentSend) {
        skippedCount++;
        continue;
      }

      const firstName: string = customer.first_name || customer.email.split('@')[0] || 'there';

      // Attempt to create a Shopify discount code
      let discountCode: string | null = null;
      try {
        discountCode = await this.createWinBackDiscount(userAutomation, discountPercentage);
      } catch (err: any) {
        await this.log(
          userAutomation.id,
          'warning',
          `Could not create discount code for ${email}: ${err.message} – sending email without code`,
          { email }
        );
      }

      // Send the win-back email
      try {
        await this.sendWinBackEmail(
          userAutomation,
          { email, firstName },
          discountCode,
          discountPercentage
        );
      } catch (err: any) {
        await this.log(
          userAutomation.id,
          'error',
          `Failed to send win-back email to ${email}: ${err.message}`,
          { email }
        );
        continue;
      }

      // Upsert into win_back_emails (update sent_at if a prior record exists beyond the cooldown window)
      await supabaseAdmin
        .from('win_back_emails')
        .upsert(
          {
            user_automation_id: userAutomation.id,
            customer_email: email,
            sent_at: new Date().toISOString(),
          },
          { onConflict: 'user_automation_id,customer_email' }
        );

      await this.log(
        userAutomation.id,
        'success',
        `Win-back email sent to ${email}`,
        { email, discountCode }
      );

      sentCount++;
    }

    await this.log(
      userAutomation.id,
      'success',
      `Win-back run complete – sent: ${sentCount}, skipped: ${skippedCount}`,
      { sentCount, skippedCount }
    );
  }

  // ─── Shopify Helpers ──────────────────────────────────────────────────────────

  /**
   * Fetch customers whose last order date is on or before cutoffDate.
   * Uses the Shopify REST API directly since ShopifyClient doesn't expose
   * a getCustomers() method with last_order_date_max filtering.
   */
  private async fetchInactiveCustomers(
    userAutomation: UserAutomation,
    cutoffDate: string
  ): Promise<any[]> {
    const { decryptToken } = await import('@/lib/shopify/oauth');
    const token = await decryptToken(userAutomation.shopify_access_token_encrypted!);
    const shop = normalizeShop(userAutomation.shopify_store_url);
    const url =
      `https://${shop}/admin/api/2024-01/customers.json` +
      `?last_order_date_max=${encodeURIComponent(cutoffDate)}` +
      `&state=enabled` +
      `&limit=250`;

    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Shopify customers API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.customers || [];
  }

  /**
   * Create a Shopify price rule + discount code for the win-back offer.
   * Returns the discount code string.
   */
  private async createWinBackDiscount(
    userAutomation: UserAutomation,
    discountPercent: number
  ): Promise<string> {
    const code = `WINBACK${discountPercent}${randomSuffix()}`;
    const shopify = await this.getShopifyClient(userAutomation);
    const expiresAt = new Date(Date.now() + DISCOUNT_EXPIRY_DAYS * 86_400_000);

    // usage_limit=1, once_per_customer=true to prevent abuse
    const priceRuleId = await shopify.createPriceRule(code, discountPercent, 1, expiresAt);
    await shopify.createDiscountCode(priceRuleId, code);

    return code;
  }

  // ─── Email Sending ────────────────────────────────────────────────────────────

  private async sendWinBackEmail(
    userAutomation: UserAutomation,
    customer: { email: string; firstName: string },
    discountCode: string | null,
    discountPercentage: number
  ): Promise<void> {
    const { sendEmail } = await import('@/lib/email');

    const storeName = storeNameFromUrl(userAutomation.shopify_store_url);
    const storeUrl = `https://${normalizeShop(userAutomation.shopify_store_url)}`;
    const { email, firstName } = customer;
    const pct = discountPercentage;

    const subject = `We miss you, ${firstName}! Here's ${pct}% off to come back`;
    const html = this.buildWinBackEmail(firstName, storeName, storeUrl, discountCode, pct);

    await sendEmail({
      to: email,
      subject,
      html,
      text: stripHtml(html),
    });
  }

  // ─── Email Template ───────────────────────────────────────────────────────────

  private buildWinBackEmail(
    firstName: string,
    storeName: string,
    storeUrl: string,
    discountCode: string | null,
    pct: number
  ): string {
    const ctaUrl = discountCode ? `${storeUrl}?discount=${discountCode}` : storeUrl;

    const discountBadge = discountCode
      ? `
        <div style="background:#fff8e6;border:2px dashed #f59e0b;border-radius:8px;padding:16px 20px;text-align:center;margin:0 0 28px;">
          <p style="margin:0 0 6px;font-size:13px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your exclusive discount</p>
          <p style="margin:0 0 4px;font-size:30px;font-weight:700;letter-spacing:4px;color:#b45309;">${discountCode}</p>
          <p style="margin:0;font-size:13px;color:#92400e;">${pct}% off your next order – valid for ${DISCOUNT_EXPIRY_DAYS} days</p>
        </div>
      `
      : `
        <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
          Use the button below to visit our store and enjoy <strong>${pct}% off</strong> your next purchase.
        </p>
      `;

    return emailWrapper(storeName, `
      <h2 style="margin:0 0 8px;font-size:22px;color:#111;">
        It's been a while, ${firstName}!
      </h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
        We've missed you at ${storeName}. As a thank you for being a valued customer, we'd love to welcome you back with an exclusive offer just for you.
      </p>

      ${discountBadge}

      ${buildCTA(ctaUrl, 'Claim Your Discount', '#0066cc')}

      <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:24px 0 8px;">
        <p style="margin:0;color:#555;font-size:14px;line-height:1.6;">
          New arrivals, bestsellers, and more are waiting for you. Don't let this offer pass you by!
        </p>
      </div>
    `, storeName, 'previous customer');
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

function buildCTA(url: string, label: string, color: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">${label}</a>
    </div>
  `;
}

function emailWrapper(
  storeName: string,
  content: string,
  _footerStore?: string,
  footerReason: string = 'a previous customer'
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
              You received this because you're ${footerReason} of ${storeName}.<br>
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
registerAutomation(WinBackCampaign);
