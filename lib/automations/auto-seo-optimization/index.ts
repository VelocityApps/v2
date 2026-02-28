/**
 * Auto SEO Optimization
 * Uses Claude AI to generate SEO-optimized titles and meta descriptions for products.
 *
 * Webhooks used:
 *   products/create  – generate SEO content for new products
 *   products/update  – re-generate SEO content when products change (with 24h idempotency)
 *
 * Config:
 *   optimize_titles        – checkbox; generate SEO title tag (default true)
 *   optimize_descriptions  – checkbox; generate SEO meta description (default true)
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AutoSeoOptimization extends BaseAutomation {
  name = 'Auto SEO Optimization';
  slug = 'auto-seo-optimization';

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

    for (const topic of ['products/create', 'products/update'] as const) {
      const webhook = await shopify.createWebhook(topic, address);
      await this.registerWebhook(userAutomationId, topic, webhook.id);
    }

    await this.log(userAutomationId, 'success', 'Installed – products/create and products/update webhooks registered');
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
            // Webhook may already be gone
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
    if (topic === 'products/create' || topic === 'products/update') {
      await this.handleProductChange(topic, payload, userAutomation);
    }
  }

  private async handleProductChange(
    topic: string,
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    const productId = String(payload.id);
    const productTitle: string = payload.title || '';

    if (!productTitle) {
      await this.log(userAutomation.id, 'warning', `Product ${productId} has no title – skipping SEO optimization`);
      return;
    }

    const config = userAutomation.config || {};
    const optimizeTitles: boolean = config.optimize_titles !== false; // default true
    const optimizeDescriptions: boolean = config.optimize_descriptions !== false; // default true

    if (!optimizeTitles && !optimizeDescriptions) {
      await this.log(userAutomation.id, 'info', `Product ${productTitle} – all SEO optimization options disabled`);
      return;
    }

    // Idempotency: skip if already optimized this product within the last 24h
    const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('automation_logs')
      .select('id')
      .eq('user_automation_id', userAutomation.id)
      .eq('metadata->>product_id', productId)
      .gte('created_at', windowStart)
      .maybeSingle();

    if (existing) {
      await this.log(
        userAutomation.id,
        'info',
        `Product "${productTitle}" already SEO-optimized within 24h – skipping`
      );
      return;
    }

    const updateData: Record<string, string> = {};

    try {
      if (optimizeTitles) {
        const seoTitle = await this.generateSEO(payload, 'title');
        updateData.metafields_global_title_tag = seoTitle;
        await this.log(
          userAutomation.id,
          'info',
          `Generated SEO title for "${productTitle}": "${seoTitle}"`,
          { product_id: productId }
        );
      }

      if (optimizeDescriptions) {
        const seoDescription = await this.generateSEO(payload, 'description');
        updateData.metafields_global_description_tag = seoDescription;
        await this.log(
          userAutomation.id,
          'info',
          `Generated SEO description for "${productTitle}"`,
          { product_id: productId }
        );
      }
    } catch (err: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to generate SEO content for product "${productTitle}": ${err.message}`,
        { product_id: productId }
      );
      return;
    }

    if (Object.keys(updateData).length === 0) return;

    try {
      const shopify = await this.getShopifyClient(userAutomation);
      await shopify.updateProduct(productId, updateData as any);

      await this.log(
        userAutomation.id,
        'success',
        `SEO optimization applied to product "${productTitle}" (${topic})`,
        {
          product_id: productId,
          optimized_title: optimizeTitles,
          optimized_description: optimizeDescriptions,
        }
      );

      await this.updateLastRun(userAutomation.id);
    } catch (err: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to update Shopify product "${productTitle}" with SEO data: ${err.message}`,
        { product_id: productId }
      );
    }
  }

  // ─── AI Generation ────────────────────────────────────────────────────────────

  private async generateSEO(product: any, type: 'title' | 'description'): Promise<string> {
    const client = new Anthropic();
    const productInfo = `Product: ${product.title}\nType: ${product.product_type || 'N/A'}\nTags: ${product.tags || 'N/A'}\nDescription snippet: ${(product.body_html || '').replace(/<[^>]*>/g, '').slice(0, 200)}`;

    if (type === 'title') {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Generate an SEO-optimized product page title (max 60 characters, no quotes) for:\n${productInfo}\n\nReturn ONLY the title text, nothing else.`,
        }],
      });
      return (msg.content[0] as any).text.trim().slice(0, 70);
    } else {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Generate an SEO meta description (max 155 characters, compelling, includes a call to action) for:\n${productInfo}\n\nReturn ONLY the description text, nothing else.`,
        }],
      });
      return (msg.content[0] as any).text.trim().slice(0, 160);
    }
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

import { registerAutomation } from '../base';
registerAutomation(AutoSeoOptimization);
