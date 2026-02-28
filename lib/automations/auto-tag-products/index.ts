/**
 * Auto-Tag Products
 * Automatically applies tags to products based on configurable rules.
 * Rules are evaluated whenever a product is created or updated.
 *
 * Webhooks: products/create, products/update
 * Cron: none
 *
 * Config:
 *   tag_rules  JSON array of rule objects:
 *     [{ "condition": "price < 50", "tags": ["budget"] }, ...]
 *
 *   Supported fields:   price, inventory, stock, vendor, product_type, type, title
 *   Supported operators: >, <, >=, <=, ==, !=, contains
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

// ─── Rule Types ───────────────────────────────────────────────────────────────

interface TagRule {
  condition: string;
  tags: string[];
}

// ─── Condition Evaluator ──────────────────────────────────────────────────────

function evaluateCondition(condition: string, product: any): boolean {
  // Derive numeric fields from product data
  const price = parseFloat(product.variants?.[0]?.price || product.price || '0');
  const inventory = (product.variants || []).reduce(
    (sum: number, v: any) => sum + (Number(v.inventory_quantity) || 0),
    0
  );
  const vendor = (product.vendor || '').toLowerCase();
  const productType = (product.product_type || '').toLowerCase();
  const title = (product.title || '').toLowerCase();

  // Operators ordered longest-first so multi-char ops (>=, <=, !=, ==) are matched before < / >
  const ops = ['>=', '<=', '!=', '==', '>', '<', 'contains'] as const;

  for (const op of ops) {
    const idx = condition.indexOf(op);
    if (idx === -1) continue;

    const field = condition.slice(0, idx).trim().toLowerCase();
    const rawValue = condition.slice(idx + op.length).trim().replace(/['"]/g, '');

    let leftVal: any;
    if (field === 'price') leftVal = price;
    else if (field === 'inventory' || field === 'stock') leftVal = inventory;
    else if (field === 'vendor') leftVal = vendor;
    else if (field === 'product_type' || field === 'type') leftVal = productType;
    else if (field === 'title') leftVal = title;
    else return false; // unknown field

    if (op === 'contains') return String(leftVal).includes(rawValue.toLowerCase());

    const numVal = parseFloat(rawValue);
    if (!isNaN(numVal)) {
      if (op === '>') return leftVal > numVal;
      if (op === '<') return leftVal < numVal;
      if (op === '>=') return leftVal >= numVal;
      if (op === '<=') return leftVal <= numVal;
      if (op === '==') return leftVal == numVal;
      if (op === '!=') return leftVal != numVal;
    } else {
      // String comparison
      if (op === '==') return String(leftVal) === rawValue.toLowerCase();
      if (op === '!=') return String(leftVal) !== rawValue.toLowerCase();
    }
  }

  return false; // no operator matched
}

// ─── Automation Class ─────────────────────────────────────────────────────────

export class AutoTagProducts extends BaseAutomation {
  name = 'Auto-Tag Products';
  slug = 'auto-tag-products';

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

    const topics = ['products/create', 'products/update'] as const;
    for (const topic of topics) {
      const webhook = await shopify.createWebhook(topic, address);
      await this.registerWebhook(userAutomationId, topic, webhook.id);
    }

    await this.log(
      userAutomationId,
      'success',
      'Installed – products/create and products/update webhooks registered'
    );
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
    if (topic !== 'products/create' && topic !== 'products/update') return;

    const config = userAutomation.config || {};

    // Parse tag rules from config; fall back to sensible default
    let rules: TagRule[] = [];
    try {
      const raw = config.tag_rules;
      if (typeof raw === 'string') {
        rules = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        rules = raw;
      }
    } catch {
      rules = [];
    }

    if (rules.length === 0) {
      // No rules configured – nothing to do
      return;
    }

    const product = payload;
    const productId = String(product.id || '');

    if (!productId) {
      await this.log(userAutomation.id, 'warning', 'Product ID missing from webhook payload');
      return;
    }

    try {
      // Parse existing tags (Shopify sends tags as a comma-separated string)
      const rawTags: string = typeof product.tags === 'string'
        ? product.tags
        : Array.isArray(product.tags)
          ? (product.tags as string[]).join(',')
          : '';

      const currentTags = new Set<string>(
        rawTags.split(',').map((t: string) => t.trim()).filter(Boolean)
      );

      // Evaluate each rule and collect matching tags
      for (const rule of rules) {
        if (!rule.condition || !Array.isArray(rule.tags)) continue;
        try {
          if (evaluateCondition(rule.condition.trim(), product)) {
            for (const tag of rule.tags) {
              const trimmed = tag.trim();
              if (trimmed) currentTags.add(trimmed);
            }
          }
        } catch (ruleErr: any) {
          // A bad rule expression should not crash the whole handler
          this.log(
            userAutomation.id,
            'warning',
            `Could not evaluate rule "${rule.condition}": ${ruleErr.message}`
          ).catch(() => {});
        }
      }

      const newTagsString = Array.from(currentTags).join(', ');
      const originalTagsString = Array.from(
        new Set(rawTags.split(',').map((t: string) => t.trim()).filter(Boolean))
      ).sort().join(', ');
      const newTagsSorted = Array.from(currentTags).sort().join(', ');

      // Only call Shopify API if tags actually changed
      if (newTagsSorted === originalTagsString) {
        await this.log(
          userAutomation.id,
          'info',
          `Product "${product.title}" (${productId}) – no tag changes needed`,
          { productId }
        );
        return;
      }

      const shopify = await this.getShopifyClient(userAutomation);
      await shopify.updateProduct(productId, { tags: newTagsString } as any);

      // Compute added tags for logging
      const originalSet = new Set(rawTags.split(',').map((t: string) => t.trim()).filter(Boolean));
      const addedTags = Array.from(currentTags).filter((t) => !originalSet.has(t));

      await this.log(
        userAutomation.id,
        'success',
        `Tagged "${product.title}" (${productId}): added [${addedTags.join(', ')}]`,
        { productId, addedTags, totalTags: currentTags.size }
      );

      await this.updateLastRun(userAutomation.id);
    } catch (error: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to auto-tag product ${productId}: ${error.message}`,
        { error: error.toString(), productId }
      );
      await this.updateStatus(userAutomation.id, 'error', error.message);
    }
  }
}

import { registerAutomation } from '../base';
registerAutomation(AutoTagProducts);
