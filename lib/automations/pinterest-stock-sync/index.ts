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

    // Register webhook for products/update
    const webhook = await shopify.createWebhook('products/update', webhookAddress);
    
    await this.registerWebhook(userAutomationId, 'products/update', webhook.id);
    await this.log(userAutomationId, 'success', 'Automation installed - webhook registered');
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
   * Handle Shopify webhook events
   */
  async handleWebhook(
    topic: string,
    payload: ShopifyWebhookPayload,
    userAutomation: UserAutomation
  ): Promise<void> {
    if (topic !== 'products/update') {
      return;
    }

    try {
      const shopify = await this.getShopifyClient(userAutomation);
      const productId = payload.id?.toString() || payload.id;

      if (!productId) {
        await this.log(
          userAutomation.id,
          'warning',
          'Product ID not found in webhook payload',
          { payload }
        );
        return;
      }

      // Get full product details
      const product = await shopify.getProduct(productId);
      
      // Check if product is out of stock
      const isOutOfStock = product.variants.every(
        (v) => v.inventory_quantity === 0
      );

      const config = userAutomation.config || {};
      const boardName = config.board_name || 'Out of Stock';
      const pinTemplate = config.pin_template || '{{product_title}} - Currently out of stock! Join our waitlist.';

      if (isOutOfStock) {
        // Product is out of stock - create pin
        const productUrl = `${userAutomation.shopify_store_url}/products/${product.handle}?waitlist=true`;
        const imageUrl = product.images?.[0]?.src || '';

        if (!imageUrl) {
          await this.log(
            userAutomation.id,
            'warning',
            `Product ${product.title} has no image, skipping pin creation`
          );
          return;
        }

        const description = this.renderTemplate(pinTemplate, {
          product_title: product.title,
          product_handle: product.handle,
          product_price: product.variants[0]?.price || 'N/A',
        });

        await createPinterestPin({
          board: boardName,
          title: product.title,
          description,
          image_url: imageUrl,
          link: productUrl,
        });

        await this.log(
          userAutomation.id,
          'success',
          `Pinned ${product.title} to Pinterest board "${boardName}"`
        );
      } else {
        // Product is back in stock - update or remove pin
        // Note: We'd need to track pin IDs to update them
        // For now, we'll just log that it's back in stock
        await this.log(
          userAutomation.id,
          'info',
          `${product.title} is back in stock`
        );
      }

      await this.updateLastRun(userAutomation.id);
    } catch (error: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to process product update: ${error.message}`,
        { error: error.toString(), payload }
      );
      await this.updateStatus(userAutomation.id, 'error', error.message);
    }
  }
}

// Register the automation
import { registerAutomation } from '../base';
registerAutomation(PinterestStockSync);

