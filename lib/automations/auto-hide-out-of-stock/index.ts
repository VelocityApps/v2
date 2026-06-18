/**
 * Auto-Hide Out-of-Stock Products
 *
 * Webhook: inventory_levels/update
 *   – When all variants of a product reach 0, sets the product to "draft" (hidden).
 *   – When any variant comes back in stock, sets the product back to "active".
 *
 * Config:
 *   restore_on_restock   Re-publish the product when stock returns (default true)
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { supabaseAdmin } from '@/lib/supabase-server';

const WEBHOOK_ADDRESS = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/api/webhooks/shopify`;

export class AutoHideOutOfStock extends BaseAutomation {
  name = 'Auto-Hide Out-of-Stock Products';
  slug = 'auto-hide-out-of-stock';

  async install(userAutomationId: string): Promise<void> {
    const { data: userAutomation } = await supabaseAdmin
      .from('user_automations')
      .select('*')
      .eq('id', userAutomationId)
      .single();

    if (!userAutomation) throw new Error('User automation not found');

    const shopify = await this.getShopifyClient(userAutomation as UserAutomation);
    const webhook = await shopify.createWebhook('inventory_levels/update', WEBHOOK_ADDRESS());
    await this.registerWebhook(userAutomationId, 'inventory_levels/update', webhook.id);

    await this.log(userAutomationId, 'success', 'Installed – monitoring inventory levels');
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

  async handleWebhook(
    topic: string,
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    if (topic !== 'inventory_levels/update') return;

    const inventoryItemId = payload.inventory_item_id;
    if (!inventoryItemId) {
      await this.log(userAutomation.id, 'warning', 'inventory_item_id missing from webhook payload');
      return;
    }

    const shopify = await this.getShopifyClient(userAutomation);

    // Resolve product ID from inventory item
    const productId = await shopify.getProductIdByInventoryItemId(inventoryItemId);
    if (!productId) {
      // Not a tracked inventory item (e.g. gift cards) — skip silently
      return;
    }

    const product = await shopify.getProduct(productId);
    if (!product) return;

    // Skip products already in target state to avoid unnecessary API calls
    const allVariants = product.variants || [];
    const totalQty = allVariants.reduce(
      (sum: number, v: any) => sum + Math.max(0, Number(v.inventory_quantity) || 0),
      0
    );

    const config = userAutomation.config || {};
    const restoreOnRestock: boolean = config.restore_on_restock !== false;

    if (totalQty === 0 && product.status === 'active') {
      // All stock gone — hide product
      await shopify.updateProduct(productId, { status: 'draft' } as any);
      await this.log(
        userAutomation.id,
        'success',
        `Hidden "${product.title}" — all variants out of stock`,
        { product_id: productId }
      );
    } else if (totalQty > 0 && product.status === 'draft' && restoreOnRestock) {
      // Stock returned — re-publish
      await shopify.updateProduct(productId, { status: 'active' } as any);
      await this.log(
        userAutomation.id,
        'success',
        `Re-published "${product.title}" — back in stock (qty: ${totalQty})`,
        { product_id: productId, quantity: totalQty }
      );
    }
  }
}

import { registerAutomation } from '../base';
registerAutomation(AutoHideOutOfStock);
