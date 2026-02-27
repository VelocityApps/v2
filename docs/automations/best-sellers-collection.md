# Best Sellers Auto-Collection

## Overview

Automatically creates and updates a "Best Sellers" collection based on sales data. Updates daily/weekly to keep collection current. Improves discoverability and increases sales of popular products.

**Category:** SEO & Discovery  
**Price:** £24/month  
**Icon:** 🔥  
**User Count:** 0 (new automation)

---

## User Story

**As a Shopify merchant**, I want my "Best Sellers" collection to automatically update based on sales data so I can:
- Show customers what's popular (social proof)
- Improve SEO (best sellers rank higher)
- Increase sales (popular products sell more)
- Save time (no manual collection updates)

**Acceptance Criteria:**
- Collection created automatically (if doesn't exist)
- Products added/removed based on sales data
- Updates daily/weekly (configurable)
- Shows top N products (configurable, default: 20)
- Tracks performance (views, clicks, sales from collection)

---

## Configuration Options

### Collection Settings
- **Collection Name** (text input)
  - Default: "Best Sellers"
  - Validation: 1-100 characters
  - Auto-creates collection if doesn't exist

- **Collection Description** (textarea)
  - Default: "Our most popular products, updated automatically"
  - Optional: Can be left empty
  - SEO: Helps with search rankings

- **Number of Products** (number input)
  - Default: 20 products
  - Range: 5-100 products
  - Validation: Must be positive integer

### Update Frequency
- **Update Schedule** (dropdown)
  - Options: "Daily" (default), "Weekly", "Monthly"
  - Daily: Updates at midnight (store timezone)
  - Weekly: Updates on Monday at midnight
  - Monthly: Updates on 1st of month at midnight

### Sales Period
- **Sales Data Period** (dropdown)
  - Options: "Last 7 days" (default), "Last 30 days", "Last 90 days", "All time"
  - Use case: Recent sales vs. all-time best sellers
  - Default: Last 30 days (balances recency and stability)

### Ranking Criteria
- **Sort By** (radio buttons)
  - Options: "Units sold" (default), "Revenue", "Orders"
  - Units sold: Most popular products
  - Revenue: Highest revenue products
  - Orders: Most ordered products

### Filtering Options
- **Exclude Products** (multi-select)
  - Options: Select products to exclude
  - Use case: Don't include sale items, discontinued products
  - Default: None

- **Minimum Sales** (number input)
  - Default: 0 (all products)
  - Use case: Only include products with >10 sales
  - Validation: Must be >= 0

- **Product Status** (checkboxes)
  - Options: "Active only" (default), "Include drafts", "Include archived"
  - Default: Active products only

### Display Options
- **Collection Image** (file upload)
  - Optional: Custom collection image
  - Default: Auto-generated from products
  - Size: 1200x600px recommended

- **Collection Handle** (text input)
  - Default: "best-sellers" (auto-generated from name)
  - SEO: Custom handle for better URLs
  - Validation: Lowercase, alphanumeric, hyphens only

---

## Technical Implementation

### Architecture

```
┌─────────────────┐
│ Scheduled Job   │
│ (Daily/Weekly)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fetch Sales Data│
│ (Last 30 days)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calculate       │
│ Rankings        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Get/Create      │
│ Collection      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Products │
│ (Add/Remove)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Log Execution   │
└─────────────────┘
```

### Triggers

**Primary Trigger:**
- Scheduled job: Daily/Weekly/Monthly (Vercel Cron)
- Time: Midnight (store timezone)
- Frequency: Configurable (daily, weekly, monthly)

**Alternative Triggers:**
- Manual trigger: Merchant can manually update from dashboard
- Webhook trigger: After large sale (optional, configurable)

### Actions

**Step 1: Fetch Sales Data**
```typescript
// Shopify GraphQL query
query GetSalesData($period: String!) {
  orders(first: 250, query: $period) {
    edges {
      node {
        lineItems(first: 100) {
          edges {
            node {
              product {
                id
                title
              }
              quantity
              originalUnitPrice {
                amount
              }
            }
          }
        }
      }
    }
  }
}

// Aggregate sales data
const salesData = new Map<string, {
  productId: string;
  unitsSold: number;
  revenue: number;
  orders: number;
}>();

for (const order of orders) {
  for (const item of order.lineItems) {
    const productId = item.product.id;
    const existing = salesData.get(productId) || {
      productId,
      unitsSold: 0,
      revenue: 0,
      orders: 0,
    };
    
    existing.unitsSold += item.quantity;
    existing.revenue += item.originalUnitPrice.amount * item.quantity;
    existing.orders += 1;
    
    salesData.set(productId, existing);
  }
}
```

**Step 2: Calculate Rankings**
```typescript
// Sort by configured criteria
const sortedProducts = Array.from(salesData.values())
  .filter(product => {
    // Apply filters
    if (config.minSales && product.unitsSold < config.minSales) {
      return false;
    }
    if (config.excludeProducts?.includes(product.productId)) {
      return false;
    }
    return true;
  })
  .sort((a, b) => {
    // Sort by configured criteria
    switch (config.sortBy) {
      case 'units_sold':
        return b.unitsSold - a.unitsSold;
      case 'revenue':
        return b.revenue - a.revenue;
      case 'orders':
        return b.orders - a.orders;
      default:
        return b.unitsSold - a.unitsSold;
    }
  })
  .slice(0, config.numberOfProducts || 20); // Top N products
```

**Step 3: Get or Create Collection**
```typescript
// Try to find existing collection
let collection = await shopify.getCollectionByHandle(config.collectionHandle);

if (!collection) {
  // Create new collection
  collection = await shopify.createCollection({
    title: config.collectionName || 'Best Sellers',
    description: config.collectionDescription || '',
    handle: config.collectionHandle || 'best-sellers',
    image: config.collectionImage || null,
  });
  
  await logInfo('Created new Best Sellers collection');
}
```

**Step 4: Update Collection Products**
```typescript
// Get current products in collection
const currentProducts = await shopify.getCollectionProducts(collection.id);
const currentProductIds = new Set(currentProducts.map(p => p.id));

// Get new product IDs
const newProductIds = new Set(sortedProducts.map(p => p.productId));

// Products to add
const productsToAdd = sortedProducts
  .filter(p => !currentProductIds.has(p.productId))
  .map(p => p.productId);

// Products to remove
const productsToRemove = currentProducts
  .filter(p => !newProductIds.has(p.id))
  .map(p => p.id);

// Update collection
if (productsToAdd.length > 0) {
  await shopify.addProductsToCollection(collection.id, productsToAdd);
  await logInfo(`Added ${productsToAdd.length} products to collection`);
}

if (productsToRemove.length > 0) {
  await shopify.removeProductsFromCollection(collection.id, productsToRemove);
  await logInfo(`Removed ${productsToRemove.length} products from collection`);
}

// Reorder products (best sellers first)
await shopify.reorderCollectionProducts(collection.id, sortedProducts.map(p => p.productId));
```

**Step 5: Log Execution**
```typescript
await logExecution({
  userAutomationId,
  status: 'success',
  message: `Updated Best Sellers collection: ${productsToAdd.length} added, ${productsToRemove.length} removed`,
  metadata: {
    collectionId: collection.id,
    productsAdded: productsToAdd.length,
    productsRemoved: productsToRemove.length,
    totalProducts: sortedProducts.length,
  },
});
```

### APIs Used

**Shopify Admin API:**
- GraphQL: `orders` query (fetch sales data)
- GraphQL: `collection` query (fetch collection)
- GraphQL: `collectionCreate` mutation (create collection)
- GraphQL: `collectionUpdate` mutation (update collection)
- REST: `PUT /admin/api/2024-01/collections/{id}.json` (update collection)
- REST: `POST /admin/api/2024-01/collections/{id}/products.json` (add products)
- REST: `DELETE /admin/api/2024-01/collections/{id}/products.json` (remove products)

**Rate Limits:**
- Shopify: 2 requests/second per store
- Strategy: Batch operations, queue if needed

### Error Handling

**Collection Already Exists:**
```typescript
try {
  collection = await shopify.createCollection(collectionData);
} catch (error: any) {
  if (error.message.includes('already exists')) {
    // Find existing collection
    collection = await shopify.getCollectionByHandle(collectionData.handle);
  } else {
    throw error;
  }
}
```

**Product No Longer Exists:**
```typescript
// When removing products, check if product exists
for (const productId of productsToRemove) {
  try {
    await shopify.getProduct(productId);
    await shopify.removeProductFromCollection(collection.id, productId);
  } catch (error: any) {
    if (error.status === 404) {
      // Product deleted - skip
      await logWarning(`Product ${productId} no longer exists, skipping removal`);
    }
  }
}
```

**Insufficient Sales Data:**
```typescript
if (salesData.size < config.numberOfProducts) {
  // Not enough products with sales
  await logWarning(`Only ${salesData.size} products have sales, collection will have fewer products`);
  // Use all available products
}
```

**Collection Update Fails:**
```typescript
try {
  await shopify.updateCollection(collection.id, updateData);
} catch (error: any) {
  // Retry with exponential backoff
  await retryWithBackoff(() => shopify.updateCollection(collection.id, updateData), {
    maxAttempts: 3,
  });
}
```

---

## User Flow

### Initial Setup
1. Merchant activates automation
2. Connects Shopify store (OAuth)
3. Configures automation:
   - Collection name: "Best Sellers" (default)
   - Number of products: 20 (default)
   - Update frequency: Daily (default)
   - Sales period: Last 30 days (default)
4. Clicks "Activate Automation"
5. Automation creates collection (if doesn't exist)
6. Automation runs first update immediately
7. Collection populated with top 20 products

### Ongoing Operation
1. Scheduled job runs (daily at midnight)
2. Automation fetches sales data (last 30 days)
3. Automation calculates rankings (by units sold/revenue/orders)
4. Automation gets collection
5. Automation updates products:
   - Adds new best sellers
   - Removes products that dropped out
   - Reorders products (best first)
6. Collection updated on storefront
7. Execution logged in dashboard

### Manual Update
1. Merchant clicks "Update Now" in dashboard
2. Automation runs immediately (same process as scheduled)
3. Collection updated
4. Merchant sees confirmation: "Collection updated with 20 products"

---

## Success Metrics

### Tracked Metrics
- **Collection Views** (views per month)
  - Target: 1,000-5,000 views/month for average store
  - Display: Dashboard widget

- **Collection Conversion Rate** (sales from collection / views)
  - Target: >5% (industry average: 3-5%)
  - Display: Dashboard widget, conversion rate

- **Products Updated** (products added/removed per update)
  - Target: 2-5 products change per update (stability)
  - Display: Dashboard widget, update history

- **Sales from Collection** (revenue from collection)
  - Target: 10-20% of total revenue
  - Display: Dashboard widget, monthly report

### Reporting
- **Daily:** Email summary (collection updated, products changed)
- **Weekly:** Performance report (views, conversion rate, sales)
- **Monthly:** Full report (ROI, top products, recommendations)

---

## Edge Cases

### No Sales Data
**Scenario:** Store has no sales in last 30 days  
**Handling:** Use all-time sales data, or show message
```typescript
if (salesData.size === 0) {
  // No sales data - use all-time or show message
  if (config.fallbackToAllTime) {
    salesData = await getSalesData('all-time');
  } else {
    await logWarning('No sales data available, collection not updated');
    return;
  }
}
```

### Tied Rankings
**Scenario:** Multiple products have same sales count  
**Handling:** Sort by secondary criteria (revenue, then product ID)
```typescript
.sort((a, b) => {
  // Primary sort
  if (b.unitsSold !== a.unitsSold) {
    return b.unitsSold - a.unitsSold;
  }
  // Secondary sort (revenue)
  if (b.revenue !== a.revenue) {
    return b.revenue - a.revenue;
  }
  // Tertiary sort (product ID for consistency)
  return a.productId.localeCompare(b.productId);
})
```

### Product Deleted
**Scenario:** Best seller product is deleted  
**Handling:** Remove from collection, log warning
```typescript
for (const productId of productsToAdd) {
  try {
    await shopify.getProduct(productId);
    await shopify.addProductToCollection(collection.id, productId);
  } catch (error: any) {
    if (error.status === 404) {
      // Product deleted - skip
      await logWarning(`Product ${productId} deleted, skipping`);
    }
  }
}
```

### Collection Deleted
**Scenario:** Merchant deletes collection manually  
**Handling:** Recreate collection on next update
```typescript
try {
  collection = await shopify.getCollection(collectionId);
} catch (error: any) {
  if (error.status === 404) {
    // Collection deleted - recreate
    collection = await shopify.createCollection(collectionData);
    await logInfo('Collection deleted, recreated automatically');
  }
}
```

### Insufficient Products
**Scenario:** Only 5 products have sales, but config wants 20  
**Handling:** Use all available products, log warning
```typescript
if (sortedProducts.length < config.numberOfProducts) {
  await logWarning(
    `Only ${sortedProducts.length} products available, collection will have fewer products`
  );
  // Use all available products
}
```

---

## Testing Checklist

### Functional Tests
- [ ] Collection created automatically (if doesn't exist)
- [ ] Products added based on sales data
- [ ] Products removed when sales drop
- [ ] Products reordered (best sellers first)
- [ ] Updates on schedule (daily/weekly/monthly)
- [ ] Manual update works (merchant can trigger)

### Ranking Tests
- [ ] Sorts by units sold (default)
- [ ] Sorts by revenue (if configured)
- [ ] Sorts by orders (if configured)
- [ ] Handles tied rankings (secondary sort)
- [ ] Respects minimum sales threshold
- [ ] Excludes configured products

### Edge Case Tests
- [ ] No sales data → Handles gracefully
- [ ] Product deleted → Removes from collection
- [ ] Collection deleted → Recreates automatically
- [ ] Insufficient products → Uses all available
- [ ] Tied rankings → Secondary sort works

### Performance Tests
- [ ] Handles 1000+ products
- [ ] Update time <30s
- [ ] Database queries <100ms
- [ ] No duplicate products in collection

---

## Code Example

### Full Implementation

```typescript
// lib/automations/best-sellers-collection/index.ts
import { BaseAutomation } from '../base';
import { aggregateSalesData, calculateRankings } from '@/lib/analytics';

export class BestSellersCollection extends BaseAutomation {
  name = 'Best Sellers Auto-Collection';
  slug = 'best-sellers-collection';

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    const config = await this.getConfig(userAutomation.id);
    const shopify = await this.getShopifyClient(userAutomation);

    try {
      // Step 1: Fetch sales data
      const salesData = await this.fetchSalesData(shopify, config);

      if (salesData.size === 0) {
        await this.log(
          userAutomation.id,
          'warning',
          'No sales data available, collection not updated'
        );
        return;
      }

      // Step 2: Calculate rankings
      const rankedProducts = this.calculateRankings(salesData, config);

      // Step 3: Get or create collection
      const collection = await this.getOrCreateCollection(shopify, config);

      // Step 4: Update collection products
      await this.updateCollectionProducts(shopify, collection, rankedProducts, config);

      // Step 5: Log execution
      await this.log(
        userAutomation.id,
        'success',
        `Updated Best Sellers collection with ${rankedProducts.length} products`,
        {
          collectionId: collection.id,
          productsCount: rankedProducts.length,
        }
      );
    } catch (error: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to update Best Sellers collection: ${error.message}`,
        { error: error.stack }
      );
      throw error; // Will be retried
    }
  }

  private async fetchSalesData(shopify: ShopifyClient, config: any): Promise<Map<string, any>> {
    // Determine date range
    const period = config.salesPeriod || 'last_30_days';
    const startDate = this.getStartDate(period);

    // Fetch orders
    const orders = await shopify.getOrders({
      created_at_min: startDate,
      limit: 250, // Shopify limit
    });

    // Aggregate sales data
    const salesData = new Map<string, {
      productId: string;
      unitsSold: number;
      revenue: number;
      orders: number;
    }>();

    for (const order of orders) {
      for (const item of order.line_items) {
        const productId = item.product_id;
        const existing = salesData.get(productId) || {
          productId,
          unitsSold: 0,
          revenue: 0,
          orders: 0,
        };

        existing.unitsSold += item.quantity;
        existing.revenue += parseFloat(item.price) * item.quantity;
        existing.orders += 1;

        salesData.set(productId, existing);
      }
    }

    return salesData;
  }

  private calculateRankings(salesData: Map<string, any>, config: any): any[] {
    // Convert to array and filter
    let products = Array.from(salesData.values())
      .filter(product => {
        // Apply minimum sales filter
        if (config.minSales && product.unitsSold < config.minSales) {
          return false;
        }

        // Apply exclude products filter
        if (config.excludeProducts?.includes(product.productId)) {
          return false;
        }

        return true;
      });

    // Sort by configured criteria
    const sortBy = config.sortBy || 'units_sold';
    products.sort((a, b) => {
      switch (sortBy) {
        case 'units_sold':
          if (b.unitsSold !== a.unitsSold) {
            return b.unitsSold - a.unitsSold;
          }
          break;
        case 'revenue':
          if (b.revenue !== a.revenue) {
            return b.revenue - a.revenue;
          }
          break;
        case 'orders':
          if (b.orders !== a.orders) {
            return b.orders - a.orders;
          }
          break;
      }

      // Secondary sort (revenue)
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }

      // Tertiary sort (product ID for consistency)
      return a.productId.localeCompare(b.productId);
    });

    // Return top N products
    const numberOfProducts = config.numberOfProducts || 20;
    return products.slice(0, numberOfProducts);
  }

  private async getOrCreateCollection(
    shopify: ShopifyClient,
    config: any
  ): Promise<any> {
    const collectionName = config.collectionName || 'Best Sellers';
    const collectionHandle = config.collectionHandle || 'best-sellers';

    // Try to find existing collection
    try {
      const collection = await shopify.getCollectionByHandle(collectionHandle);
      return collection;
    } catch (error: any) {
      if (error.status === 404) {
        // Collection doesn't exist - create it
        const collection = await shopify.createCollection({
          title: collectionName,
          description: config.collectionDescription || 'Our most popular products, updated automatically',
          handle: collectionHandle,
          image: config.collectionImage || null,
        });

        await this.log(
          userAutomation.id,
          'info',
          `Created new Best Sellers collection: ${collectionName}`
        );

        return collection;
      }

      throw error;
    }
  }

  private async updateCollectionProducts(
    shopify: ShopifyClient,
    collection: any,
    rankedProducts: any[],
    config: any
  ): Promise<void> {
    // Get current products in collection
    const currentProducts = await shopify.getCollectionProducts(collection.id);
    const currentProductIds = new Set(currentProducts.map(p => p.id));

    // Get new product IDs
    const newProductIds = new Set(rankedProducts.map(p => p.productId));

    // Products to add
    const productsToAdd = rankedProducts
      .filter(p => !currentProductIds.has(p.productId))
      .map(p => p.productId);

    // Products to remove
    const productsToRemove = currentProducts
      .filter(p => !newProductIds.has(p.id))
      .map(p => p.id);

    // Add new products
    if (productsToAdd.length > 0) {
      for (const productId of productsToAdd) {
        try {
          // Verify product exists
          await shopify.getProduct(productId);
          await shopify.addProductToCollection(collection.id, productId);
        } catch (error: any) {
          if (error.status === 404) {
            await this.log(
              userAutomation.id,
              'warning',
              `Product ${productId} no longer exists, skipping`
            );
          } else {
            throw error;
          }
        }
      }
    }

    // Remove old products
    if (productsToRemove.length > 0) {
      for (const productId of productsToRemove) {
        try {
          await shopify.removeProductFromCollection(collection.id, productId);
        } catch (error: any) {
          // Log but don't fail
          await this.log(
            userAutomation.id,
            'warning',
            `Failed to remove product ${productId} from collection: ${error.message}`
          );
        }
      }
    }

    // Reorder products (best sellers first)
    const productIds = rankedProducts.map(p => p.productId);
    await shopify.reorderCollectionProducts(collection.id, productIds);
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    
    switch (period) {
      case 'last_7_days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last_30_days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'last_90_days':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'all_time':
        return new Date(0); // Beginning of time
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}
```

---

## Configuration UI Example

```tsx
// components/automations/BestSellersCollectionConfig.tsx
export function BestSellersCollectionConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label>Collection Name</label>
        <input
          type="text"
          value={config.collectionName || 'Best Sellers'}
          onChange={(e) => onChange({ ...config, collectionName: e.target.value })}
          placeholder="Best Sellers"
        />
        <p className="text-sm text-gray-500">
          Collection will be created automatically if it doesn't exist
        </p>
      </div>

      <div>
        <label>Number of Products</label>
        <input
          type="number"
          value={config.numberOfProducts || 20}
          onChange={(e) => onChange({ ...config, numberOfProducts: parseInt(e.target.value) })}
          min="5"
          max="100"
        />
        <p className="text-sm text-gray-500">
          Top products to include in collection (5-100)
        </p>
      </div>

      <div>
        <label>Update Frequency</label>
        <select
          value={config.updateFrequency || 'daily'}
          onChange={(e) => onChange({ ...config, updateFrequency: e.target.value })}
        >
          <option value="daily">Daily (updates at midnight)</option>
          <option value="weekly">Weekly (updates Monday at midnight)</option>
          <option value="monthly">Monthly (updates 1st of month at midnight)</option>
        </select>
      </div>

      <div>
        <label>Sales Data Period</label>
        <select
          value={config.salesPeriod || 'last_30_days'}
          onChange={(e) => onChange({ ...config, salesPeriod: e.target.value })}
        >
          <option value="last_7_days">Last 7 days (most recent)</option>
          <option value="last_30_days">Last 30 days (balanced)</option>
          <option value="last_90_days">Last 90 days (stable)</option>
          <option value="all_time">All time (classic best sellers)</option>
        </select>
      </div>

      <div>
        <label>Sort By</label>
        <div className="space-y-2">
          <label>
            <input
              type="radio"
              name="sortBy"
              value="units_sold"
              checked={config.sortBy === 'units_sold' || !config.sortBy}
              onChange={(e) => onChange({ ...config, sortBy: e.target.value })}
            />
            Units Sold (most popular)
          </label>
          <label>
            <input
              type="radio"
              name="sortBy"
              value="revenue"
              checked={config.sortBy === 'revenue'}
              onChange={(e) => onChange({ ...config, sortBy: e.target.value })}
            />
            Revenue (highest value)
          </label>
          <label>
            <input
              type="radio"
              name="sortBy"
              value="orders"
              checked={config.sortBy === 'orders'}
              onChange={(e) => onChange({ ...config, sortBy: e.target.value })}
            />
            Orders (most ordered)
          </label>
        </div>
      </div>

      <div>
        <label>Minimum Sales</label>
        <input
          type="number"
          value={config.minSales || 0}
          onChange={(e) => onChange({ ...config, minSales: parseInt(e.target.value) })}
          min="0"
        />
        <p className="text-sm text-gray-500">
          Only include products with at least this many sales (0 = all products)
        </p>
      </div>
    </div>
  );
}
```

---

## API Rate Limits & Quotas

### Shopify
- **Rate Limit:** 2 requests/second per store
- **Burst:** 40 requests
- **Strategy:** Batch operations, queue if needed

### Handling Strategy
```typescript
// Process collection updates in batches
async function updateCollectionProducts(collectionId: string, productIds: string[]) {
  // Shopify allows adding multiple products at once
  const batchSize = 10; // Add 10 products per request
  
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    await shopify.addProductsToCollection(collectionId, batch);
    
    // Small delay to respect rate limits
    await sleep(500); // 500ms between batches
  }
}
```

---

## Monitoring & Alerts

### Key Metrics
- **Update Success Rate:** >95% (alert if <90%)
- **Collection Update Time:** <30s (alert if >60s)
- **Products Changed:** 2-5 products per update (alert if >10)

### Alert Conditions
- Collection update fails 3 times in a row
- Update time >60s
- >10 products change in one update (unusual)

---

**Last Updated:** 2026-01-06  
**Status:** 🚧 In Development  
**Next Review:** After initial implementation

