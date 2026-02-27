/**
 * Shopify Admin API Client
 * Handles all Shopify API interactions
 */

import { decryptToken } from './oauth';

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  variants: Array<{
    id: string;
    inventory_quantity: number;
    price: string;
  }>;
  images: Array<{
    id: string;
    src: string;
    alt: string;
  }>;
  status: string;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  total_price: string;
  line_items: Array<{
    product_id: string;
    variant_id?: string;
    title?: string;
    quantity: number;
    price?: string;
  }>;
  created_at: string;
  fulfillment_status: string;
  financial_status?: string;
  cancelled_at?: string | null;
  customer?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface ShopifyWebhook {
  id: string;
  topic: string;
  address: string;
  format: string;
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  product_ids: string[];
}

export class ShopifyClient {
  private shop: string;
  private accessToken: string;
  private apiVersion: string = '2024-01';

  constructor(shop: string, accessToken: string) {
    this.shop = shop.replace(/\.myshopify\.com$/, '') + '.myshopify.com';
    this.accessToken = accessToken;
  }

  /**
   * Create a Shopify client from encrypted token
   */
  static async fromEncryptedToken(
    shop: string,
    encryptedToken: string
  ): Promise<ShopifyClient> {
    const token = await decryptToken(encryptedToken);
    return new ShopifyClient(shop, token);
  }

  /**
   * Make authenticated request to Shopify API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `https://${this.shop}/admin/api/${this.apiVersion}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Get all products
   */
  async getProducts(limit: number = 250): Promise<ShopifyProduct[]> {
    const response = await this.request<{ products: ShopifyProduct[] }>(
      `/products.json?limit=${limit}`
    );
    return response.products;
  }

  /**
   * GraphQL request (for queries that need it, e.g. inventory item → product)
   */
  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const url = `https://${this.shop}/admin/api/${this.apiVersion}/graphql.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify GraphQL error: ${response.status} ${error}`);
    }
    const json = await response.json();
    if (json.errors?.length) throw new Error(json.errors[0].message || 'GraphQL error');
    return json.data as T;
  }

  /**
   * Get product ID from inventory_item_id (e.g. from inventory_levels/update webhook).
   * Returns null if not found.
   */
  async getProductIdByInventoryItemId(inventoryItemId: string | number): Promise<string | null> {
    const gid = `gid://shopify/InventoryItem/${inventoryItemId}`;
    const data = await this.graphql<{
      inventoryItem?: { variant?: { product?: { id: string } } };
    }>(`
      query getProductFromInventoryItem($id: ID!) {
        inventoryItem(id: $id) {
          variant { product { id } }
        }
      }
    `, { id: gid });
    const productId = data?.inventoryItem?.variant?.product?.id;
    if (!productId) return null;
    return productId.replace('gid://shopify/Product/', '');
  }

  /**
   * Get single product by ID
   */
  async getProduct(id: string): Promise<ShopifyProduct> {
    const response = await this.request<{ product: ShopifyProduct }>(
      `/products/${id}.json`
    );
    return response.product;
  }

  /**
   * Get product by handle
   */
  async getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
    const response = await this.request<{ products: ShopifyProduct[] }>(
      `/products.json?handle=${handle}`
    );
    return response.products[0] || null;
  }

  /**
   * Update product
   */
  async updateProduct(id: string, data: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    const response = await this.request<{ product: ShopifyProduct }>(
      `/products/${id}.json`,
      {
        method: 'PUT',
        body: JSON.stringify({ product: data }),
      }
    );
    return response.product;
  }

  /**
   * Get orders
   * @param createdAtMin ISO-8601 string – only return orders created after this date
   */
  async getOrders(limit: number = 250, status?: string, createdAtMin?: string): Promise<ShopifyOrder[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (status) params.set('status', status);
    if (createdAtMin) params.set('created_at_min', createdAtMin);
    const response = await this.request<{ orders: ShopifyOrder[] }>(`/orders.json?${params}`);
    return response.orders;
  }

  /**
   * Get single order by ID
   */
  async getOrder(id: string): Promise<ShopifyOrder> {
    const response = await this.request<{ order: ShopifyOrder }>(
      `/orders/${id}.json`
    );
    return response.order;
  }

  /**
   * Get inventory levels for a product
   */
  async getInventoryLevels(locationIds: string[], inventoryItemIds: string[]) {
    const response = await this.request<{ inventory_levels: any[] }>(
      `/inventory_levels.json?location_ids=${locationIds.join(',')}&inventory_item_ids=${inventoryItemIds.join(',')}`
    );
    return response.inventory_levels;
  }

  /**
   * Create webhook
   */
  async createWebhook(topic: string, address: string, format: string = 'json'): Promise<ShopifyWebhook> {
    const response = await this.request<{ webhook: ShopifyWebhook }>(
      `/webhooks.json`,
      {
        method: 'POST',
        body: JSON.stringify({
          webhook: {
            topic,
            address,
            format,
          },
        }),
      }
    );
    return response.webhook;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`/webhooks/${webhookId}.json`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all webhooks
   */
  async getWebhooks(): Promise<ShopifyWebhook[]> {
    const response = await this.request<{ webhooks: ShopifyWebhook[] }>(
      `/webhooks.json`
    );
    return response.webhooks;
  }

  /**
   * Create or update collection
   */
  async createCollection(title: string, handle?: string): Promise<ShopifyCollection> {
    const response = await this.request<{ custom_collection: ShopifyCollection }>(
      `/custom_collections.json`,
      {
        method: 'POST',
        body: JSON.stringify({
          custom_collection: {
            title,
            handle: handle || title.toLowerCase().replace(/\s+/g, '-'),
          },
        }),
      }
    );
    return response.custom_collection;
  }

  /**
   * Add products to collection
   */
  async addProductsToCollection(collectionId: string, productIds: string[]): Promise<void> {
    for (const productId of productIds) {
      await this.request(`/collects.json`, {
        method: 'POST',
        body: JSON.stringify({
          collect: {
            collection_id: collectionId,
            product_id: productId,
          },
        }),
      });
    }
  }

  /**
   * Remove all products from collection
   */
  async clearCollection(collectionId: string): Promise<void> {
    const collects = await this.request<{ collects: Array<{ id: string }> }>(
      `/collects.json?collection_id=${collectionId}`
    );
    
    for (const collect of collects.collects) {
      await this.request(`/collects/${collect.id}.json`, {
        method: 'DELETE',
      });
    }
  }

  /**
   * Get collection by handle
   */
  async getCollectionByHandle(handle: string): Promise<ShopifyCollection | null> {
    const response = await this.request<{ custom_collections: ShopifyCollection[] }>(
      `/custom_collections.json?handle=${handle}`
    );
    return response.custom_collections[0] || null;
  }

  /**
   * Get products in a collection
   */
  async getCollectionProducts(collectionId: string): Promise<Array<{ id: string }>> {
    const collects = await this.request<{ collects: Array<{ product_id: string }> }>(
      `/collects.json?collection_id=${collectionId}`
    );
    return collects.collects.map(c => ({ id: c.product_id }));
  }

  /**
   * Create a percentage-off price rule
   * Returns the price rule ID to use when creating discount codes
   */
  async createPriceRule(
    title: string,
    discountPercent: number,
    usageLimit: number,
    expiresAt: Date
  ): Promise<string> {
    const response = await this.request<{ price_rule: { id: string } }>(
      '/price_rules.json',
      {
        method: 'POST',
        body: JSON.stringify({
          price_rule: {
            title,
            target_type: 'line_item',
            target_selection: 'all',
            allocation_method: 'across',
            value_type: 'percentage',
            value: `-${discountPercent}.0`,
            customer_selection: 'all',
            starts_at: new Date().toISOString(),
            ends_at: expiresAt.toISOString(),
            usage_limit: usageLimit,
            once_per_customer: true,
          },
        }),
      }
    );
    return String(response.price_rule.id);
  }

  /**
   * Create a discount code under an existing price rule
   * Returns the discount code string
   */
  async createDiscountCode(priceRuleId: string, code: string): Promise<string> {
    const response = await this.request<{ discount_code: { code: string } }>(
      `/price_rules/${priceRuleId}/discount_codes.json`,
      {
        method: 'POST',
        body: JSON.stringify({ discount_code: { code } }),
      }
    );
    return response.discount_code.code;
  }

  /**
   * Delete a price rule (and all its discount codes) by ID
   */
  async deletePriceRule(priceRuleId: string): Promise<void> {
    await this.request(`/price_rules/${priceRuleId}.json`, { method: 'DELETE' });
  }
}



