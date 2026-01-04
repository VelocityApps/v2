/**
 * Review Request Automator
 * Auto-sends review requests after delivery
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { ShopifyClient } from '@/lib/shopify/client';
import { supabaseAdmin } from '@/lib/supabase-server';

export class ReviewRequestAutomator extends BaseAutomation {
  name = 'Review Request Automator';
  slug = 'review-request-automator';

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

    // Register webhook for orders/fulfilled
    const webhook = await shopify.createWebhook('orders/fulfilled', webhookAddress);
    
    await this.registerWebhook(userAutomationId, 'orders/fulfilled', webhook.id);
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
    if (topic !== 'orders/fulfilled') {
      return;
    }

    // TODO: Implement review request logic
    // 1. Get order details
    // 2. Wait for configured days_after_delivery
    // 3. Send email with review request
    // 4. Track opens/clicks

    await this.log(
      userAutomation.id,
      'info',
      'Review request automation triggered (skeleton implementation)'
    );
  }
}

import { registerAutomation } from '../base';
registerAutomation(ReviewRequestAutomator);

