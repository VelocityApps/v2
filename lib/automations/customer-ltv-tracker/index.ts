/**
 * Customer Lifetime Value Tracker
 * Calculates customer LTV weekly and tags high-value customers in Shopify.
 *
 * Cron (runScheduled, weekly):
 *   – fetches all customers from Shopify
 *   – calculates LTV from total_spent
 *   – adds or removes the "velocity-high-value" tag based on segment_threshold
 *
 * Config:
 *   calculation_method  – select ('simple' | 'rfm'); both currently use total_spent
 *   segment_threshold   – number; LTV threshold in store currency to be "high value" (default 500)
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const HIGH_VALUE_TAG = 'velocity-high-value';
const SCHEDULE_DAYS = 7;

export class CustomerLtvTracker extends BaseAutomation {
  name = 'Customer Lifetime Value Tracker';
  slug = 'customer-ltv-tracker';

  // ─── Install / Uninstall ────────────────────────────────────────────────────

  async install(userAutomationId: string): Promise<void> {
    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: daysFromNow(SCHEDULE_DAYS) })
      .eq('id', userAutomationId);

    await this.log(userAutomationId, 'success', `Installed – LTV tracker will run weekly. First run in ${SCHEDULE_DAYS} days.`);
  }

  async uninstall(userAutomationId: string): Promise<void> {
    await this.log(userAutomationId, 'info', 'Uninstalled – Customer LTV Tracker removed');
  }

  // ─── Webhook Handler (not used) ───────────────────────────────────────────────

  async handleWebhook(
    _topic: string,
    _payload: ShopifyWebhookPayload,
    _userAutomation: UserAutomation
  ): Promise<void> {
    // No webhooks registered for this automation
  }

  // ─── Scheduled Processing (Cron, weekly) ─────────────────────────────────────

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    const startedAt = Date.now();
    const config = userAutomation.config || {};
    const segmentThreshold: number = Number(config.segment_threshold ?? 500);

    await this.log(userAutomation.id, 'info', `LTV Tracker running – threshold: £${segmentThreshold}`);

    let allCustomers: any[] = [];
    try {
      allCustomers = await this.fetchAllCustomers(userAutomation);
    } catch (err: any) {
      await this.log(userAutomation.id, 'error', `Failed to fetch customers from Shopify: ${err.message}`);
      await supabaseAdmin
        .from('user_automations')
        .update({ last_run_at: new Date().toISOString(), next_run_at: daysFromNow(SCHEDULE_DAYS) })
        .eq('id', userAutomation.id);
      return;
    }

    let tagged = 0;
    let untagged = 0;
    let errors = 0;

    for (const customer of allCustomers) {
      try {
        const ltv = parseFloat(customer.total_spent || '0');
        const isHighValue = ltv >= segmentThreshold;

        const currentTags: string[] = (customer.tags || '')
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);

        const hasTag = currentTags.includes(HIGH_VALUE_TAG);

        if (isHighValue && !hasTag) {
          // Add high-value tag
          const newTags = [...currentTags, HIGH_VALUE_TAG].join(', ');
          await this.shopifyFetch(userAutomation, `/customers/${customer.id}.json`, {
            method: 'PUT',
            body: JSON.stringify({ customer: { id: customer.id, tags: newTags } }),
          });
          tagged++;
        } else if (!isHighValue && hasTag) {
          // Remove high-value tag
          const newTags = currentTags.filter((t: string) => t !== HIGH_VALUE_TAG).join(', ');
          await this.shopifyFetch(userAutomation, `/customers/${customer.id}.json`, {
            method: 'PUT',
            body: JSON.stringify({ customer: { id: customer.id, tags: newTags } }),
          });
          untagged++;
        }
      } catch (err: any) {
        errors++;
        console.error(`[CustomerLtvTracker] Failed to update customer ${customer.id}: ${err.message}`);
      }
    }

    const elapsedMs = Date.now() - startedAt;

    await this.log(
      userAutomation.id,
      'success',
      `LTV Tracker complete – ${allCustomers.length} customers processed, ${tagged} tagged as high-value, ${untagged} untagged, ${errors} errors`,
      {
        customers_total: allCustomers.length,
        tagged,
        untagged,
        errors,
        threshold: segmentThreshold,
        execution_time_ms: elapsedMs,
      }
    );

    await supabaseAdmin
      .from('user_automations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: daysFromNow(SCHEDULE_DAYS),
      })
      .eq('id', userAutomation.id);
  }

  // ─── Private: Fetch All Customers ─────────────────────────────────────────────

  /**
   * Fetches up to 250 customers per page, following cursor-based pagination
   * via Shopify's Link header until all customers are retrieved.
   */
  private async fetchAllCustomers(userAutomation: UserAutomation): Promise<any[]> {
    const { decryptToken } = await import('@/lib/shopify/oauth');
    const token = await decryptToken(userAutomation.shopify_access_token_encrypted!);
    const shop = userAutomation.shopify_store_url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

    const fields = 'id,email,first_name,last_name,total_spent,orders_count,tags';
    let url: string | null = `https://${shop}/admin/api/2024-01/customers.json?limit=250&fields=${fields}`;
    const allCustomers: any[] = [];

    while (url) {
      const res: Response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Shopify API ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const batch: any[] = data.customers || [];
      allCustomers.push(...batch);

      // Follow Link header for pagination
      const linkHeader: string = res.headers.get('Link') || '';
      const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1] : null;
    }

    return allCustomers;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

import { registerAutomation } from '../base';
registerAutomation(CustomerLtvTracker);
