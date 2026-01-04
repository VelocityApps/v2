/**
 * Best Sellers Auto-Collection
 * Auto-creates and updates "Trending" collection
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { ShopifyClient } from '@/lib/shopify/client';
import { supabaseAdmin } from '@/lib/supabase-server';

export class BestSellersCollection extends BaseAutomation {
  name = 'Best Sellers Auto-Collection';
  slug = 'best-sellers-collection';

  async install(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (!userAutomation) {
      throw new Error('User automation not found');
    }

    // Schedule first run
    await supabaseAdmin
      .from('user_automations')
      .update({
        next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      })
      .eq('id', userAutomationId);

    await this.log(userAutomationId, 'success', 'Automation installed - scheduled for first run');
  }

  async uninstall(userAutomationId: string): Promise<void> {
    await this.log(userAutomationId, 'info', 'Automation uninstalled');
  }

  async handleWebhook(
    topic: string,
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    // This automation runs on a schedule, not webhooks
    return;
  }

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    const config = userAutomation.config || {};
    const collectionSize = config.collection_size || 20;
    const updateFrequency = config.update_frequency || 'weekly';

    try {
      const shopify = await this.getShopifyClient(userAutomation);

      // TODO: Implement best sellers collection logic
      // 1. Get all products with sales data
      // 2. Sort by sales (or other criteria)
      // 3. Get top N products
      // 4. Create or update "Trending" collection
      // 5. Add products to collection

      await this.log(
        userAutomation.id,
        'info',
        `Best sellers collection update triggered (skeleton implementation) - would update ${collectionSize} products`
      );

      // Schedule next run
      const nextRun = updateFrequency === 'daily' 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await supabaseAdmin
        .from('user_automations')
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun.toISOString(),
        })
        .eq('id', userAutomation.id);
    } catch (error: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to update best sellers collection: ${error.message}`
      );
      throw error;
    }
  }
}

import { registerAutomation } from '../base';
registerAutomation(BestSellersCollection);

