/**
 * Low Stock Alerts
 * Sends alerts when inventory runs low
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { ShopifyClient } from '@/lib/shopify/client';
import { supabaseAdmin } from '@/lib/supabase-server';

export class LowStockAlerts extends BaseAutomation {
  name = 'Low Stock Alerts';
  slug = 'low-stock-alerts';

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

    // Register webhook for inventory_levels/update
    const webhook = await shopify.createWebhook('inventory_levels/update', webhookAddress);
    
    await this.registerWebhook(userAutomationId, 'inventory_levels/update', webhook.id);
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
    if (topic !== 'inventory_levels/update') {
      return;
    }

    // TODO: Implement low stock alert logic
    // 1. Check inventory level against threshold
    // 2. If below threshold, send alert (email/Slack)
    // 3. Track alerts sent

    await this.log(
      userAutomation.id,
      'info',
      'Low stock alert automation triggered (skeleton implementation)'
    );
  }
}

import { registerAutomation } from '../base';
registerAutomation(LowStockAlerts);

