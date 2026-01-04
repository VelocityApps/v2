/**
 * Abandoned Cart Recovery
 * AI-powered email sequences for cart recovery
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { ShopifyClient } from '@/lib/shopify/client';
import { supabaseAdmin } from '@/lib/supabase-server';

export class AbandonedCartRecovery extends BaseAutomation {
  name = 'Abandoned Cart Recovery';
  slug = 'abandoned-cart-recovery';

  async install(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (!userAutomation) {
      throw new Error('User automation not found');
    }

    const shopify = await this.getShopifyClient(userAutomation as UserAutomation);
    const webhookAddress = `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

    // Register webhook for carts/create
    const webhook = await shopify.createWebhook('carts/create', webhookAddress);
    
    await this.registerWebhook(userAutomationId, 'carts/create', webhook.id);
    await this.log(userAutomationId, 'success', 'Automation installed - webhook registered');
  }

  async uninstall(userAutomationId: string): Promise<void> {
    const webhooks = await this.getWebhooks(userAutomationId);

    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (userAutomation) {
      const shopify = await this.getShopifyClient(userAutomation as UserAutomation);

      for (const webhook of webhooks) {
        if (webhook.webhook_id) {
          try {
            await shopify.deleteWebhook(webhook.webhook_id);
          } catch (error) {
            console.error(`Failed to delete webhook ${webhook.webhook_id}:`, error);
          }
        }
        await this.unregisterWebhook(userAutomationId, webhook.topic);
      }
    }

    await this.log(userAutomationId, 'info', 'Automation uninstalled - webhooks removed');
  }

  async handleWebhook(
    topic: string,
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    if (topic !== 'carts/create') {
      return;
    }

    // TODO: Implement abandoned cart recovery logic
    // 1. Track cart creation
    // 2. Schedule emails based on sequence timing
    // 3. Send personalized emails
    // 4. Track conversions

    await this.log(
      userAutomation.id,
      'info',
      'Abandoned cart recovery automation triggered (skeleton implementation)'
    );
  }
}

import { registerAutomation } from '../base';
registerAutomation(AbandonedCartRecovery);

