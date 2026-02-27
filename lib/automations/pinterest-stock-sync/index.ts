/**
 * Pinterest Stock Sync Automation
 * Auto-syncs out-of-stock products to Pinterest boards
 */

import { BaseAutomation, UserAutomation, ShopifyWebhookPayload } from '../base';
import { ShopifyClient, ShopifyProduct } from '@/lib/shopify/client';
import { createPinterestPin, updatePinterestPin } from './pinterest';
import { supabaseAdmin } from '@/lib/supabase-server';

export class PinterestStockSync extends BaseAutomation {
  name = 'Pinterest Stock Sync';
  slug = 'pinterest-stock-sync';

  /**
   * Install automation - register webhook for products/update
   */
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

    // Register webhooks: products/update and inventory_levels/update (quantity changes in admin trigger the latter)
    const webhookProduct = await shopify.createWebhook('products/update', webhookAddress);
    const webhookInventory = await shopify.createWebhook('inventory_levels/update', webhookAddress);
    await this.registerWebhook(userAutomationId, 'products/update', webhookProduct.id);
    await this.registerWebhook(userAutomationId, 'inventory_levels/update', webhookInventory.id);
    await this.log(userAutomationId, 'success', 'Automation installed - webhooks registered');
  }

  /**
   * Uninstall automation - remove webhooks
   */
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

  /**
   * Handle Shopify webhook events (products/update and inventory_levels/update)
   */
  async handleWebhook(
    topic: string,
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    if (topic === 'products/update') {
      await this.handleProductUpdate(payload, userAutomation);
      return;
    }
    if (topic === 'inventory_levels/update') {
      await this.handleInventoryUpdate(payload, userAutomation);
      return;
    }
  }

  private async handleProductUpdate(
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    try {
      const productId = payload.id?.toString() || payload.id;
      if (!productId) {
        await this.log(userAutomation.id, 'warning', 'Product ID not found in webhook payload', { payload });
        return;
      }
      const shopify = await this.getShopifyClient(userAutomation);
      const product = await shopify.getProduct(productId);
      await this.maybePinIfOutOfStock(product, userAutomation);
    } catch (error: any) {
      await this.log(userAutomation.id, 'error', `Product update webhook failed: ${error.message}`, { error: error.toString(), payload });
      await this.updateStatus(userAutomation.id, 'error', error.message);
    }
  }

  private async handleInventoryUpdate(
    payload: ShopifyWebhookPayload & { inventory_item_id?: string; available?: number | null },
    userAutomation: UserAutomation
  ): Promise<void> {
    try {
      const available = payload.available ?? (payload as any).available;
      if (available != null && available !== 0) return;
      const inventoryItemId = payload.inventory_item_id ?? (payload as any).inventory_item_id;
      if (!inventoryItemId) {
        await this.log(userAutomation.id, 'warning', 'inventory_item_id not found in webhook payload', { payload });
        return;
      }
      const shopify = await this.getShopifyClient(userAutomation);
      const productId = await shopify.getProductIdByInventoryItemId(inventoryItemId);
      if (!productId) {
        await this.log(userAutomation.id, 'warning', 'Could not resolve product from inventory_item_id', { inventoryItemId });
        return;
      }
      const product = await shopify.getProduct(productId);
      await this.maybePinIfOutOfStock(product, userAutomation);
    } catch (error: any) {
      await this.log(userAutomation.id, 'error', `Inventory update webhook failed: ${error.message}`, { error: error.toString(), payload });
      await this.updateStatus(userAutomation.id, 'error', error.message);
    }
  }

  private async maybePinIfOutOfStock(
    product: ShopifyProduct,
    userAutomation: UserAutomation
  ): Promise<void> {
    try {
      const isOutOfStock = product.variants.every((v) => v.inventory_quantity === 0);
      const config = userAutomation.config || {};
      const boardName = config.board_name || 'Out of Stock';
      const pinTemplate = config.pin_template || '{{product_title}} - Currently out of stock! Join our waitlist.';

      if (isOutOfStock) {
        const productUrl = `${userAutomation.shopify_store_url}/products/${product.handle}?waitlist=true`;
        const imageUrl = product.images?.[0]?.src || '';
        if (!imageUrl) {
          await this.log(userAutomation.id, 'warning', `Product ${product.title} has no image, skipping pin creation`);
          return;
        }
        const description = this.renderTemplate(pinTemplate, {
          product_title: product.title,
          product_handle: product.handle,
          product_price: product.variants[0]?.price || 'N/A',
        });
        const pinterestToken = (config.pinterest_access_token || '').trim() || undefined;
        await createPinterestPin(
          {
            board: boardName,
            title: product.title,
            description,
            image_url: imageUrl,
            link: productUrl,
          },
          pinterestToken
        );
        await this.log(userAutomation.id, 'success', `Pinned ${product.title} to Pinterest board "${boardName}"`);
      } else {
        await this.log(userAutomation.id, 'info', `${product.title} is back in stock`);
      }
      await this.updateLastRun(userAutomation.id);
    } catch (error: any) {
      await this.log(userAutomation.id, 'error', `Failed to process: ${error.message}`, { error: error.toString() });
      await this.updateStatus(userAutomation.id, 'error', error.message);
    }
  }
}

// Register the automation
import { registerAutomation } from '../base';
registerAutomation(PinterestStockSync);



