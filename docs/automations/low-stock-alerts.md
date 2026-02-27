# Low Stock Alerts

## Overview

Automatically monitors inventory levels and sends alerts (Slack, Email, SMS) when products fall below threshold. Prevents stockouts and helps merchants reorder in time.

**Category:** Inventory  
**Price:** £24/month  
**Icon:** 📦  
**User Count:** 0 (new automation)

---

## User Story

**As a Shopify merchant**, when a product's inventory falls below my threshold, I want to receive an immediate alert so I can:
- Reorder products before they sell out
- Prevent lost sales from stockouts
- Maintain optimal inventory levels
- Save time (no manual inventory checking)

**Acceptance Criteria:**
- Product inventory < threshold → Alert sent within 5 minutes
- Alert sent to configured channels (Slack, Email, SMS)
- Alert includes product details, current stock, reorder link
- Multiple products low stock → Batch alert (one notification)
- Alert frequency configurable (immediate, daily digest)

---

## Configuration Options

### Alert Thresholds
- **Global Threshold** (number input)
  - Default: 10 units
  - Range: 1-1000
  - Applies to all products unless overridden

- **Per-Product Thresholds** (table)
  - Product selector: Search/select products
  - Custom threshold: Override global threshold
  - Use case: High-value products need higher threshold

- **Threshold Type** (radio buttons)
  - Options: "Units" (default), "Percentage of average sales"
  - If percentage: Calculate from 30-day average sales
  - Example: "Alert when <20% of average daily sales remaining"

### Alert Channels
- **Email** (checkbox + email input)
  - Default: Store owner email
  - Multiple emails: Comma-separated list
  - Email template: Customizable

- **Slack** (checkbox + webhook URL input)
  - Requires Slack webhook URL
  - Channel selector: #inventory, #alerts, etc.
  - Format: Rich message with product details

- **SMS** (checkbox + phone number input)
  - Requires phone number
  - Provider: Twilio (configurable)
  - Format: Short message with product name and stock level

### Alert Frequency
- **Immediate** (radio button, default)
  - Alert sent as soon as threshold reached
  - Use case: Critical products, high-value items

- **Daily Digest** (radio button)
  - All low stock products in one email
  - Sent at configured time (default: 9 AM)
  - Use case: Non-critical products, reduce noise

- **Weekly Summary** (radio button)
  - Weekly report of all low stock products
  - Sent on Monday at 9 AM
  - Use case: Long-tail products

### Alert Content
- **Include Product Image** (checkbox)
  - Default: Yes (checked)
  - Shows product image in alert

- **Include Reorder Link** (checkbox)
  - Default: Yes (checked)
  - Link to supplier/product page

- **Include Sales Velocity** (checkbox)
  - Default: Yes (checked)
  - Shows: "Selling 5 units/day, will sell out in 2 days"

---

## Technical Implementation

### Architecture

```
┌─────────────────┐
│ Inventory Update│
│ (Shopify Event) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Threshold │
│ stock < limit?  │
└────────┬────────┘
         │ Yes
         ▼
┌─────────────────┐
│ Calculate       │
│ Sales Velocity  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send Alert      │
│ (Slack/Email)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Log Execution   │
└─────────────────┘
```

### Triggers

**Primary Trigger:**
- Shopify webhook: `inventory_levels/update`
- Condition: `available` < threshold
- Frequency: Real-time (within 5 minutes)

**Secondary Triggers:**
- Scheduled check: Every hour (catch missed webhooks)
- Manual trigger: Merchant can check inventory from dashboard

### Actions

**Step 1: Check Inventory**
```typescript
// Shopify GraphQL query
query GetInventoryLevel($inventoryItemId: ID!) {
  inventoryItem(id: $inventoryItemId) {
    id
    inventoryLevels(first: 10) {
      edges {
        node {
          available
          location {
            id
            name
          }
        }
      }
    }
  }
}
```

**Step 2: Calculate Sales Velocity**
```typescript
// Calculate average daily sales (last 30 days)
const salesData = await getProductSales(productId, 30);
const averageDailySales = salesData.totalSales / 30;
const daysUntilStockout = currentStock / averageDailySales;

// Include in alert
alertData.daysUntilStockout = daysUntilStockout;
alertData.salesVelocity = averageDailySales;
```

**Step 3: Send Alert**
```typescript
// Send to configured channels
if (config.alertChannels.email) {
  await sendEmailAlert({
    to: config.emailAddresses,
    subject: `Low Stock Alert: ${product.title}`,
    body: generateEmailBody(product, currentStock, daysUntilStockout),
  });
}

if (config.alertChannels.slack) {
  await sendSlackAlert({
    webhookUrl: config.slackWebhookUrl,
    channel: config.slackChannel,
    message: generateSlackMessage(product, currentStock, daysUntilStockout),
  });
}

if (config.alertChannels.sms) {
  await sendSMSAlert({
    to: config.phoneNumber,
    message: `Low stock: ${product.title} (${currentStock} left)`,
  });
}
```

**Step 4: Prevent Duplicate Alerts**
```typescript
// Check if alert already sent today
const alertKey = `low-stock-alert:${product.id}:${new Date().toDateString()}`;
const alreadyAlerted = await Cache.get(alertKey);

if (alreadyAlerted && config.frequency === 'daily-digest') {
  return; // Don't send duplicate
}

// Mark as alerted
await Cache.set(alertKey, true, 86400); // 24 hours
```

### APIs Used

**Shopify Admin API:**
- GraphQL: `inventoryItem` query (check inventory levels)
- GraphQL: `product` query (fetch product details)
- REST: `GET /admin/api/2024-01/products/{id}/inventory.json` (inventory data)
- Webhooks: `inventory_levels/update`

**Slack API:**
- Webhook: `POST {webhook_url}` (send message)
- Rate limit: None (webhook-based)
- Format: Rich message with blocks

**Email (Resend):**
- `POST /emails` (send transactional email)
- Rate limit: 100 emails/second
- Templates: Support for email templates

**SMS (Twilio):**
- `POST /Messages.json` (send SMS)
- Rate limit: Varies by account
- Cost: ~$0.01 per SMS

### Error Handling

**Slack Webhook Invalid:**
```typescript
try {
  await sendSlackAlert(alertData);
} catch (error: any) {
  if (error.status === 404) {
    // Webhook invalid - disable Slack alerts
    await updateConfig(userAutomationId, {
      alertChannels: { ...config.alertChannels, slack: false },
    });
    await sendEmailAlert({
      to: config.emailAddresses,
      subject: 'Slack webhook invalid - alerts disabled',
      body: 'Please update your Slack webhook URL in settings.',
    });
  }
}
```

**Email Send Failure:**
```typescript
try {
  await sendEmailAlert(alertData);
} catch (error: any) {
  if (error.status === 429) {
    // Rate limit - queue for retry
    await queueForLater({ alertData, retryAfter: 3600 });
    return;
  }
  
  // Log error, but don't fail automation
  await logError('Failed to send email alert', { error: error.message });
}
```

**Inventory Data Unavailable:**
```typescript
try {
  const inventory = await shopify.getInventoryLevel(productId);
} catch (error: any) {
  if (error.status === 404) {
    // Product deleted - skip
    await logWarning('Product deleted, skipping inventory check');
    return;
  }
  
  // Retry with exponential backoff
  await retryWithBackoff(() => shopify.getInventoryLevel(productId));
}
```

---

## User Flow

### Initial Setup
1. Merchant activates automation
2. Connects Shopify store (OAuth)
3. Configures thresholds:
   - Global threshold: 10 units (default)
   - Per-product overrides: Optional
4. Configures alert channels:
   - Email: Store owner email (default)
   - Slack: Optional webhook URL
   - SMS: Optional phone number
5. Clicks "Activate Automation"
6. Automation starts monitoring inventory

### Ongoing Operation
1. Product inventory updated (sale, restock, adjustment)
2. Shopify sends webhook: `inventory_levels/update`
3. Automation receives webhook
4. Automation checks if inventory < threshold
5. If low stock:
   - Calculates sales velocity
   - Generates alert content
   - Sends to configured channels
   - Logs execution
6. Merchant receives alert (email/Slack/SMS)
7. Merchant can click reorder link

### Daily Digest Mode
1. Multiple products go low stock throughout day
2. Automation collects all low stock products
3. At configured time (9 AM):
   - Generates digest email
   - Lists all low stock products
   - Includes summary statistics
4. Merchant receives one email with all products

---

## Success Metrics

### Tracked Metrics
- **Alerts Sent** (count per month)
  - Target: 10-50 alerts/month for average store
  - Display: Dashboard widget

- **Stockouts Prevented** (products restocked before selling out)
  - Target: >80% of alerts result in restock
  - Display: Dashboard widget, monthly report

- **Response Time** (time from alert to restock)
  - Target: <48 hours average
  - Display: Analytics dashboard

- **False Positives** (alerts for products that don't need restock)
  - Target: <10% false positive rate
  - Display: Feedback from merchants

### Reporting
- **Daily:** Email summary (alerts sent, products restocked)
- **Weekly:** Performance report (stockouts prevented, response time)
- **Monthly:** Full report (ROI, recommendations, top products)

---

## Edge Cases

### Multiple Locations
**Scenario:** Product in 3 locations, 2 are low stock  
**Handling:** Alert shows stock per location, total stock
```typescript
const locations = inventoryLevels.map(level => ({
  location: level.location.name,
  stock: level.available,
}));

alertData.locations = locations;
alertData.totalStock = locations.reduce((sum, l) => sum + l.stock, 0);
```

### Product Variants
**Scenario:** Product has 3 variants, 1 is low stock  
**Handling:** Alert shows which variant is low stock
```typescript
const lowStockVariants = product.variants.filter(
  v => v.inventory_quantity < threshold
);

if (lowStockVariants.length > 0) {
  alertData.variants = lowStockVariants.map(v => ({
    title: v.title,
    stock: v.inventory_quantity,
  }));
}
```

### Rapid Inventory Changes
**Scenario:** Product sells 5 units in 1 minute, triggers 5 alerts  
**Handling:** Debounce alerts (only send once per hour)
```typescript
const alertKey = `low-stock:${product.id}`;
const lastAlert = await Cache.get(alertKey);

if (lastAlert && Date.now() - lastAlert < 3600000) {
  return; // Alert sent in last hour, skip
}

await Cache.set(alertKey, Date.now(), 3600);
```

### Product Discontinued
**Scenario:** Product discontinued, inventory set to 0  
**Handling:** Don't alert for discontinued products
```typescript
if (product.status === 'archived' || product.tags.includes('discontinued')) {
  return; // Don't alert for discontinued products
}
```

### Supplier Out of Stock
**Scenario:** Merchant can't reorder (supplier out of stock)  
**Handling:** Merchant can snooze alerts for specific products
```typescript
if (product.tags.includes('snooze-low-stock-alerts')) {
  return; // Snoozed by merchant
}
```

---

## Testing Checklist

### Functional Tests
- [ ] Product inventory < threshold → Alert sent
- [ ] Alert includes product details (name, image, stock level)
- [ ] Alert includes sales velocity (days until stockout)
- [ ] Multiple products low stock → Batch alert (daily digest)
- [ ] Per-product thresholds work (override global)
- [ ] Multiple locations → Shows stock per location
- [ ] Product variants → Shows which variant is low stock

### Channel Tests
- [ ] Email alerts work (sends to configured emails)
- [ ] Slack alerts work (sends to configured channel)
- [ ] SMS alerts work (sends to configured phone)
- [ ] All channels work simultaneously
- [ ] Invalid webhook → Disables channel, sends email notification

### Frequency Tests
- [ ] Immediate alerts → Sent as soon as threshold reached
- [ ] Daily digest → All products in one email at 9 AM
- [ ] Weekly summary → All products in one email on Monday
- [ ] No duplicate alerts (debouncing works)

### Edge Case Tests
- [ ] Multiple locations → Handles correctly
- [ ] Product variants → Handles correctly
- [ ] Rapid inventory changes → Debouncing works
- [ ] Product discontinued → Doesn't alert
- [ ] Snoozed products → Doesn't alert

---

## Code Example

### Full Implementation

```typescript
// lib/automations/low-stock-alerts/index.ts
import { BaseAutomation } from '../base';
import { sendSlackMessage } from '@/lib/slack';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';
import { calculateSalesVelocity } from '@/lib/analytics';

export class LowStockAlerts extends BaseAutomation {
  name = 'Low Stock Alerts';
  slug = 'low-stock-alerts';

  async handleWebhook(
    topic: string,
    payload: any,
    userAutomation: UserAutomation
  ): Promise<void> {
    if (topic !== 'inventory_levels/update') {
      return;
    }

    const inventoryLevel = payload;
    const config = await this.getConfig(userAutomation.id);

    // Get product and check threshold
    const product = await this.getProduct(inventoryLevel.inventory_item_id);
    const threshold = this.getThreshold(product, config);
    const currentStock = inventoryLevel.available;

    if (currentStock >= threshold) {
      return; // Not low stock
    }

    // Check if already alerted today (for daily digest)
    if (config.frequency === 'daily-digest') {
      const alertKey = `low-stock:${product.id}:${new Date().toDateString()}`;
      if (await Cache.get(alertKey)) {
        return; // Already in digest queue
      }
    }

    // Calculate sales velocity
    const salesVelocity = await calculateSalesVelocity(product.id, 30);
    const daysUntilStockout = currentStock / salesVelocity.averageDailySales;

    // Generate alert
    await this.sendAlert(
      product,
      currentStock,
      threshold,
      daysUntilStockout,
      salesVelocity,
      userAutomation,
      config
    );
  }

  private async sendAlert(
    product: any,
    currentStock: number,
    threshold: number,
    daysUntilStockout: number,
    salesVelocity: any,
    userAutomation: UserAutomation,
    config: any
  ): Promise<void> {
    const alertData = {
      product: {
        id: product.id,
        title: product.title,
        image: product.image?.src,
        url: `${userAutomation.shopify_store_url}/admin/products/${product.id}`,
      },
      stock: {
        current: currentStock,
        threshold,
        daysUntilStockout,
      },
      salesVelocity: {
        averageDaily: salesVelocity.averageDailySales,
        trend: salesVelocity.trend, // 'increasing', 'decreasing', 'stable'
      },
    };

    // Send to configured channels
    const promises = [];

    if (config.alertChannels?.email) {
      promises.push(
        this.sendEmailAlert(alertData, config.emailAddresses, config)
      );
    }

    if (config.alertChannels?.slack && config.slackWebhookUrl) {
      promises.push(
        this.sendSlackAlert(alertData, config.slackWebhookUrl, config)
      );
    }

    if (config.alertChannels?.sms && config.phoneNumber) {
      promises.push(
        this.sendSMSAlert(alertData, config.phoneNumber)
      );
    }

    await Promise.allSettled(promises);

    // Log execution
    await this.log(
      userAutomation.id,
      'success',
      `Low stock alert sent for ${product.title} (${currentStock} units)`,
      { productId: product.id, currentStock, threshold }
    );

    // Mark as alerted (prevent duplicates)
    const alertKey = `low-stock:${product.id}:${new Date().toDateString()}`;
    await Cache.set(alertKey, true, 86400);
  }

  private async sendEmailAlert(
    alertData: any,
    emailAddresses: string[],
    config: any
  ): Promise<void> {
    const subject = `Low Stock Alert: ${alertData.product.title}`;
    const body = this.generateEmailBody(alertData, config);

    for (const email of emailAddresses) {
      await sendEmail({
        to: email,
        subject,
        html: body,
      });
    }
  }

  private async sendSlackAlert(
    alertData: any,
    webhookUrl: string,
    config: any
  ): Promise<void> {
    const message = {
      text: `Low Stock Alert: ${alertData.product.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Low Stock Alert',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alertData.product.title}*\nCurrent stock: ${alertData.stock.current} units\nThreshold: ${alertData.stock.threshold} units`,
          },
          accessory: alertData.product.image ? {
            type: 'image',
            image_url: alertData.product.image,
            alt_text: alertData.product.title,
          } : undefined,
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Days until stockout:*\n${alertData.stock.daysUntilStockout.toFixed(1)} days`,
            },
            {
              type: 'mrkdwn',
              text: `*Average daily sales:*\n${alertData.salesVelocity.averageDaily.toFixed(1)} units/day`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Product',
              },
              url: alertData.product.url,
            },
          ],
        },
      ],
    };

    await sendSlackMessage(webhookUrl, message);
  }

  private async sendSMSAlert(
    alertData: any,
    phoneNumber: string
  ): Promise<void> {
    const message = `Low stock: ${alertData.product.title} (${alertData.stock.current} left, will sell out in ${alertData.stock.daysUntilStockout.toFixed(0)} days)`;
    
    await sendSMS({
      to: phoneNumber,
      body: message,
    });
  }

  private generateEmailBody(alertData: any, config: any): string {
    return `
      <h1>Low Stock Alert</h1>
      <h2>${alertData.product.title}</h2>
      ${alertData.product.image ? `<img src="${alertData.product.image}" alt="${alertData.product.title}" />` : ''}
      <p><strong>Current Stock:</strong> ${alertData.stock.current} units</p>
      <p><strong>Threshold:</strong> ${alertData.stock.threshold} units</p>
      <p><strong>Days Until Stockout:</strong> ${alertData.stock.daysUntilStockout.toFixed(1)} days</p>
      <p><strong>Average Daily Sales:</strong> ${alertData.salesVelocity.averageDaily.toFixed(1)} units/day</p>
      ${config.includeReorderLink ? `<p><a href="${alertData.product.url}">Reorder Product</a></p>` : ''}
    `;
  }

  private getThreshold(product: any, config: any): number {
    // Check per-product threshold first
    if (config.perProductThresholds?.[product.id]) {
      return config.perProductThresholds[product.id];
    }

    // Use global threshold
    return config.globalThreshold || 10;
  }

  async runScheduled(userAutomation: UserAutomation): Promise<void> {
    // Daily digest mode - collect all low stock products
    const config = await this.getConfig(userAutomation.id);
    
    if (config.frequency !== 'daily-digest') {
      return; // Not in digest mode
    }

    // Get all low stock products
    const lowStockProducts = await this.getAllLowStockProducts(userAutomation, config);

    if (lowStockProducts.length === 0) {
      return; // No low stock products
    }

    // Send digest email
    await this.sendDigestEmail(lowStockProducts, userAutomation, config);
  }

  private async getAllLowStockProducts(
    userAutomation: UserAutomation,
    config: any
  ): Promise<any[]> {
    const shopify = await this.getShopifyClient(userAutomation);
    const products = await shopify.getAllProducts();
    
    const lowStockProducts = [];

    for (const product of products) {
      const inventory = await shopify.getInventoryLevel(product.id);
      const threshold = this.getThreshold(product, config);

      if (inventory.available < threshold) {
        lowStockProducts.push({
          product,
          inventory,
          threshold,
        });
      }
    }

    return lowStockProducts;
  }

  private async sendDigestEmail(
    lowStockProducts: any[],
    userAutomation: UserAutomation,
    config: any
  ): Promise<void> {
    const subject = `Daily Low Stock Digest: ${lowStockProducts.length} products`;
    const body = this.generateDigestEmailBody(lowStockProducts, config);

    for (const email of config.emailAddresses) {
      await sendEmail({
        to: email,
        subject,
        html: body,
      });
    }
  }

  private generateDigestEmailBody(lowStockProducts: any[], config: any): string {
    let html = '<h1>Daily Low Stock Digest</h1>';
    html += `<p>You have ${lowStockProducts.length} products with low stock:</p>`;
    html += '<ul>';

    for (const item of lowStockProducts) {
      html += `
        <li>
          <strong>${item.product.title}</strong><br>
          Current: ${item.inventory.available} units | Threshold: ${item.threshold} units
        </li>
      `;
    }

    html += '</ul>';
    return html;
  }
}
```

---

## Configuration UI Example

```tsx
// components/automations/LowStockAlertsConfig.tsx
export function LowStockAlertsConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label>Global Threshold</label>
        <input
          type="number"
          value={config.globalThreshold || 10}
          onChange={(e) => onChange({ ...config, globalThreshold: parseInt(e.target.value) })}
          min="1"
          max="1000"
        />
        <p className="text-sm text-gray-500">
          Alert when inventory falls below this number of units
        </p>
      </div>

      <div>
        <label>Alert Channels</label>
        <div className="space-y-2">
          <label>
            <input
              type="checkbox"
              checked={config.alertChannels?.email !== false}
              onChange={(e) => onChange({
                ...config,
                alertChannels: { ...config.alertChannels, email: e.target.checked },
              })}
            />
            Email
          </label>
          {config.alertChannels?.email && (
            <input
              type="email"
              value={config.emailAddresses?.join(', ') || ''}
              onChange={(e) => onChange({
                ...config,
                emailAddresses: e.target.value.split(',').map(s => s.trim()),
              })}
              placeholder="email1@example.com, email2@example.com"
            />
          )}

          <label>
            <input
              type="checkbox"
              checked={config.alertChannels?.slack || false}
              onChange={(e) => onChange({
                ...config,
                alertChannels: { ...config.alertChannels, slack: e.target.checked },
              })}
            />
            Slack
          </label>
          {config.alertChannels?.slack && (
            <input
              type="url"
              value={config.slackWebhookUrl || ''}
              onChange={(e) => onChange({ ...config, slackWebhookUrl: e.target.value })}
              placeholder="https://hooks.slack.com/services/..."
            />
          )}

          <label>
            <input
              type="checkbox"
              checked={config.alertChannels?.sms || false}
              onChange={(e) => onChange({
                ...config,
                alertChannels: { ...config.alertChannels, sms: e.target.checked },
              })}
            />
            SMS
          </label>
          {config.alertChannels?.sms && (
            <input
              type="tel"
              value={config.phoneNumber || ''}
              onChange={(e) => onChange({ ...config, phoneNumber: e.target.value })}
              placeholder="+1234567890"
            />
          )}
        </div>
      </div>

      <div>
        <label>Alert Frequency</label>
        <select
          value={config.frequency || 'immediate'}
          onChange={(e) => onChange({ ...config, frequency: e.target.value })}
        >
          <option value="immediate">Immediate (as soon as threshold reached)</option>
          <option value="daily-digest">Daily Digest (all products at 9 AM)</option>
          <option value="weekly-summary">Weekly Summary (Monday at 9 AM)</option>
        </select>
      </div>
    </div>
  );
}
```

---

**Last Updated:** 2026-01-06  
**Status:** 🚧 In Development  
**Next Review:** After initial implementation

