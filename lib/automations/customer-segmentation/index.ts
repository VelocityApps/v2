/**
 * Customer Segmentation
 * Evaluates configurable rules daily and applies Shopify tags to segment customers.
 *
 * Cron (runScheduled, daily):
 *   – fetches all customers from Shopify
 *   – evaluates each segmentation rule against customer metrics (ltv, orders_count)
 *   – adds matching velocity-seg-* tags and removes stale ones
 *
 * Config:
 *   segmentation_rules  – JSON array of { name, condition } objects
 *                         condition format: "ltv > 1000", "orders_count >= 5"
 *   auto_update         – checkbox; whether to update tags on each run (default true)
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const SCHEDULE_HOURS = 24;
const SEG_TAG_PREFIX = 'velocity-seg-';

interface SegmentationRule {
  name: string;
  condition: string;
}

export class CustomerSegmentation extends BaseAutomation {
  name = 'Customer Segmentation';
  slug = 'customer-segmentation';

  // ─── Install / Uninstall ────────────────────────────────────────────────────

  async install(userAutomationId: string): Promise<void> {
    await supabaseAdmin
      .from('user_automations')
      .update({ next_run_at: hoursFromNow(SCHEDULE_HOURS) })
      .eq('id', userAutomationId);

    await this.log(userAutomationId, 'success', 'Installed – Customer Segmentation will run daily');
  }

  async uninstall(userAutomationId: string): Promise<void> {
    await this.log(userAutomationId, 'info', 'Uninstalled – Customer Segmentation removed');
  }

  // ─── Webhook Handler (not used) ───────────────────────────────────────────────

  async handleWebhook(
    _topic: string,
    _payload: ShopifyWebhookPayload,
    _userAutomation: UserAutomation
  ): Promise<void> {
    // No webhooks registered for this automation
  }

  // ─── Scheduled Processing (Cron, daily) ──────────────────────────────────────

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    const startedAt = Date.now();
    const config = userAutomation.config || {};
    const autoUpdate: boolean = config.auto_update !== false; // default true

    if (!autoUpdate) {
      await this.log(userAutomation.id, 'info', 'Customer Segmentation – auto_update disabled, skipping');
      await supabaseAdmin
        .from('user_automations')
        .update({ last_run_at: new Date().toISOString(), next_run_at: hoursFromNow(SCHEDULE_HOURS) })
        .eq('id', userAutomation.id);
      return;
    }

    const rules = parseRules(config.segmentation_rules);
    if (rules.length === 0) {
      await this.log(userAutomation.id, 'info', 'Customer Segmentation – no rules configured, skipping');
      await supabaseAdmin
        .from('user_automations')
        .update({ last_run_at: new Date().toISOString(), next_run_at: hoursFromNow(SCHEDULE_HOURS) })
        .eq('id', userAutomation.id);
      return;
    }

    await this.log(
      userAutomation.id,
      'info',
      `Customer Segmentation running – ${rules.length} rule(s): ${rules.map(r => r.name).join(', ')}`
    );

    // Build the full set of expected tag slugs from rules
    const allRuleTagSlugs = new Set(rules.map(r => SEG_TAG_PREFIX + slugify(r.name)));

    let allCustomers: any[] = [];
    try {
      allCustomers = await this.fetchAllCustomers(userAutomation);
    } catch (err: any) {
      await this.log(userAutomation.id, 'error', `Failed to fetch customers from Shopify: ${err.message}`);
      await supabaseAdmin
        .from('user_automations')
        .update({ last_run_at: new Date().toISOString(), next_run_at: hoursFromNow(SCHEDULE_HOURS) })
        .eq('id', userAutomation.id);
      return;
    }

    let processed = 0;
    let updated = 0;
    let errors = 0;

    for (const customer of allCustomers) {
      try {
        const metrics: Record<string, number> = {
          ltv: parseFloat(customer.total_spent || '0'),
          orders_count: Number(customer.orders_count || 0),
        };

        const currentTags: string[] = (customer.tags || '')
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);

        // Determine which velocity-seg-* tags should be applied after this run
        const matchingTagSlugs = new Set<string>();
        for (const rule of rules) {
          if (evalRule(rule.condition, metrics)) {
            matchingTagSlugs.add(SEG_TAG_PREFIX + slugify(rule.name));
          }
        }

        // Build new tag list:
        // - Keep all non-velocity-seg-* tags unchanged
        // - Keep only matching velocity-seg-* tags
        // - Add newly matching velocity-seg-* tags
        const nonSegTags = currentTags.filter(t => !t.startsWith(SEG_TAG_PREFIX));
        const newTags = [...nonSegTags, ...matchingTagSlugs];

        // Check if tags actually changed to avoid unnecessary API calls
        const oldSegTags = currentTags.filter(t => t.startsWith(SEG_TAG_PREFIX)).sort();
        const newSegTags = [...matchingTagSlugs].sort();

        const tagsChanged =
          oldSegTags.length !== newSegTags.length ||
          oldSegTags.some((t, i) => t !== newSegTags[i]);

        if (tagsChanged) {
          await this.shopifyFetch(userAutomation, `/customers/${customer.id}.json`, {
            method: 'PUT',
            body: JSON.stringify({ customer: { id: customer.id, tags: newTags.join(', ') } }),
          });
          updated++;
        }

        processed++;
      } catch (err: any) {
        errors++;
        console.error(`[CustomerSegmentation] Failed to process customer ${customer.id}: ${err.message}`);
      }
    }

    const elapsedMs = Date.now() - startedAt;

    await this.log(
      userAutomation.id,
      'success',
      `Customer Segmentation complete – ${processed} customers processed, ${updated} tag updates applied, ${errors} errors`,
      {
        customers_total: allCustomers.length,
        processed,
        updated,
        errors,
        rules: rules.map(r => r.name),
        execution_time_ms: elapsedMs,
      }
    );

    await supabaseAdmin
      .from('user_automations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: hoursFromNow(SCHEDULE_HOURS),
      })
      .eq('id', userAutomation.id);
  }

  // ─── Private: Fetch All Customers ─────────────────────────────────────────────

  /**
   * Fetches all customers with pagination following Shopify's Link header.
   */
  private async fetchAllCustomers(userAutomation: UserAutomation): Promise<any[]> {
    const { decryptToken } = await import('@/lib/shopify/oauth');
    const token = await decryptToken(userAutomation.shopify_access_token_encrypted!);
    const shop = userAutomation.shopify_store_url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

    const fields = 'id,email,first_name,total_spent,orders_count,tags';
    let url: string | null = `https://${shop}/admin/api/2024-01/customers.json?limit=250&fields=${fields}`;
    const allCustomers: any[] = [];

    while (url) {
      const res = await fetch(url, {
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

      // Follow Link header for cursor-based pagination
      const linkHeader = res.headers.get('Link') || '';
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
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

// ─── Rule Evaluator ───────────────────────────────────────────────────────────

/**
 * Evaluate a simple condition string like "ltv > 1000" or "orders_count >= 5"
 * against a metrics object.
 * Supported operators: >=, <=, !=, ==, >, <
 * Supported fields: any key in metrics (ltv, orders_count)
 */
function evalRule(condition: string, metrics: Record<string, number>): boolean {
  // Ordered longest-first so ">=" is tested before ">"
  const ops = ['>=', '<=', '!=', '==', '>', '<'];
  for (const op of ops) {
    const parts = condition.split(op);
    if (parts.length !== 2) continue;
    const field = parts[0].trim();
    const val = parseFloat(parts[1].trim());
    if (isNaN(val)) continue;
    const left = metrics[field] ?? 0;
    if (op === '>') return left > val;
    if (op === '<') return left < val;
    if (op === '>=') return left >= val;
    if (op === '<=') return left <= val;
    if (op === '==') return left === val;
    if (op === '!=') return left !== val;
  }
  return false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Parse segmentation_rules from config.
 * Accepts a JSON string, a parsed array, or falls back to an empty array.
 */
function parseRules(raw: unknown): SegmentationRule[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (r: any) => r && typeof r.name === 'string' && typeof r.condition === 'string'
      );
    }
  } catch {
    // ignore JSON parse errors
  }
  return [];
}

import { registerAutomation } from '../base';
registerAutomation(CustomerSegmentation);
