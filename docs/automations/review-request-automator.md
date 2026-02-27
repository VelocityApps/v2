# Review Request Automator

## Overview

Automatically sends personalized review request emails to customers after purchase, with AI-optimized subject lines and timing. Tracks conversion rates and integrates with review platforms.

**Category:** Marketing  
**Price:** £19/month  
**Icon:** ⭐  
**User Count:** 0 (new automation)

---

## User Story

**As a Shopify merchant**, after a customer makes a purchase, I want to automatically send them a personalized review request email so I can:
- Increase review collection rate (target: 8% vs industry 2-3%)
- Get more 5-star reviews (improve average rating)
- Save time (no manual email sending)
- Improve SEO (more reviews = better rankings)

**Acceptance Criteria:**
- Customer makes purchase → Review request sent within 3-7 days
- Email subject line is AI-optimized (personalized per customer)
- Email includes product-specific review link
- Conversion tracked → See review rate in dashboard
- Integrates with Judge.me, Yotpo, Stamped.io

---

## Configuration Options

### Required Configuration
- **Review Platform** (dropdown)
  - Options: "Judge.me", "Yotpo", "Stamped.io", "Okendo", "Custom URL"
  - If custom: Requires review URL template input
  - Auto-configures integration if platform supported

### Timing Configuration
- **Send Delay** (number input + dropdown)
  - Default: 3 days
  - Options: "Days after delivery" (default), "Days after purchase"
  - Range: 1-30 days
  - Validation: Must be positive integer

- **Send Time** (time picker)
  - Default: 10:00 AM (customer's timezone)
  - Options: "Customer timezone" (default), "Store timezone"
  - Best practice: 10 AM - 2 PM (highest open rates)

### Email Configuration
- **Subject Line Template** (text input)
  - Default: `How was your {{product_name}}?`
  - Available variables: `{{customer_name}}`, `{{product_name}}`, `{{order_number}}`, `{{order_date}}`
  - AI optimization: Checkbox "Use AI to optimize subject lines"
  - Preview: Shows AI-optimized version

- **Email Template** (rich text editor)
  - Default template included (professional, friendly)
  - Variables: Same as subject line
  - Customization: Colors, fonts, logo
  - Preview: Shows rendered email

- **Include Discount** (checkbox)
  - Default: Yes (checked)
  - If checked: Include 10% discount code for review
  - Discount code: Auto-generated or custom

### Filtering Options
- **Exclude Products** (multi-select)
  - Options: Select products to exclude
  - Use case: Don't request reviews for low-value items
  - Default: None

- **Minimum Order Value** (number input)
  - Default: £0 (all orders)
  - Use case: Only request reviews for orders >£50
  - Validation: Must be >= 0

- **Exclude Customers** (tags)
  - Options: Exclude customers with specific tags
  - Use case: Don't spam VIP customers
  - Default: None

### AI Optimization
- **Optimize Subject Lines** (checkbox)
  - Default: Yes (checked)
  - Uses AI to personalize subject lines
  - Improves open rates by 20-30%

- **Optimize Send Time** (checkbox)
  - Default: Yes (checked)
  - Uses AI to find best send time per customer
  - Improves open rates by 15-25%

---

## Technical Implementation

### Architecture

```
┌─────────────────┐
│ Order Fulfilled │
│ (Shopify Event) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Delay     │
│ (3-7 days)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Optimize   │
│ Subject/Time  │
└──────┬────────┘
       │
       ▼
┌─────────────────┐
│ Send Email      │
│ (Resend API)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Track Conversion │
│ (Review Link)   │
└─────────────────┘
```

### Triggers

**Primary Trigger:**
- Shopify webhook: `orders/fulfilled`
- Condition: Order status = 'fulfilled'
- Delay: 3-7 days after fulfillment (configurable)

**Alternative Triggers:**
- Shopify webhook: `orders/create` (if no fulfillment webhook)
- Scheduled check: Daily (catch missed webhooks)
- Manual trigger: Merchant can manually send from dashboard

### Actions

**Step 1: Validate Order**
```typescript
// Check if order should receive review request
- Order status = 'fulfilled' (or 'paid' if no fulfillment)
- Order value >= minimum order value (if configured)
- Product not in exclude list (if configured)
- Customer not excluded (if configured)
- Review not already requested (check tag 'review-requested')
- Order not older than 30 days (don't request old orders)
```

**Step 2: Calculate Send Time**
```typescript
// Calculate when to send email
const fulfillmentDate = order.fulfilled_at;
const sendDelay = config.sendDelay || 3; // days
const sendDate = addDays(fulfillmentDate, sendDelay);

// AI optimization (if enabled)
if (config.optimizeSendTime) {
  const optimalTime = await aiOptimizeSendTime(customer, sendDate);
  sendDate = optimalTime;
}

// Schedule email
await scheduleEmail(order.id, sendDate);
```

**Step 3: Generate Email Content**
```typescript
// Fetch order data
const order = await shopify.getOrder(orderId);
const customer = await shopify.getCustomer(order.customer_id);
const products = order.line_items;

// Generate subject line
let subject = config.subjectTemplate;
if (config.optimizeSubjectLines) {
  subject = await aiOptimizeSubjectLine(subject, customer, products[0]);
} else {
  subject = renderTemplate(subject, { customer, product: products[0] });
}

// Generate email body
const emailBody = renderEmailTemplate(config.emailTemplate, {
  customer,
  order,
  products,
  reviewLink: generateReviewLink(order, products[0]),
  discountCode: config.includeDiscount ? await generateDiscountCode() : null,
});
```

**Step 4: Send Email**
```typescript
// Send via Resend API
await resend.emails.send({
  from: `${store.name} <reviews@${store.domain}>`,
  to: customer.email,
  subject,
  html: emailBody,
  tags: ['review-request', `order-${order.id}`],
});

// Tag order to prevent duplicate requests
await shopify.addOrderTag(order.id, 'review-requested');
```

**Step 5: Track Conversion**
```typescript
// Create tracking link
const reviewLink = generateReviewLink(order, product, {
  utm_source: 'email',
  utm_medium: 'review-request',
  utm_campaign: 'automated',
});

// Track when customer clicks link
await trackReviewLinkClick(reviewLink, order.id);

// Track when customer submits review
await trackReviewSubmission(order.id, product.id);
```

### APIs Used

**Shopify Admin API:**
- GraphQL: `order` query (fetch order data)
- GraphQL: `customer` query (fetch customer data)
- REST: `GET /admin/api/2024-01/orders/{id}.json` (order details)
- Webhooks: `orders/fulfilled`, `orders/create`

**Resend API:**
- `POST /emails` (send transactional email)
- Rate limit: 100 emails/second
- Templates: Support for email templates

**Review Platform APIs:**
- Judge.me: `POST /api/v1/reviews/request` (send review request)
- Yotpo: `POST /apps/{app_key}/reviews` (create review request)
- Stamped.io: `POST /api/v2/reviews/request` (send review request)
- Custom: Use review URL template

**AI API (OpenAI/Anthropic):**
- `POST /v1/chat/completions` (optimize subject lines)
- `POST /v1/chat/completions` (optimize send time)
- Rate limit: Varies by provider

### Error Handling

**Email Send Failure:**
```typescript
try {
  await resend.emails.send(emailData);
} catch (error: any) {
  if (error.status === 429) {
    // Rate limit - queue for retry
    await queueForLater({ orderId, retryAfter: 3600 });
    return;
  }
  
  // Other errors - log and alert
  await logError('Failed to send review request email', {
    orderId,
    customerEmail: customer.email,
    error: error.message,
  });
  
  throw error; // Will be retried
}
```

**Review Platform API Failure:**
```typescript
try {
  await reviewPlatform.sendRequest(order, product);
} catch (error: any) {
  // Fallback to custom review link
  const customLink = generateCustomReviewLink(order, product);
  await sendEmailWithCustomLink(customLink);
  await logWarning('Review platform API failed, used custom link');
}
```

**AI Optimization Failure:**
```typescript
try {
  subject = await aiOptimizeSubjectLine(template, customer, product);
} catch (error: any) {
  // Fallback to template rendering
  subject = renderTemplate(template, { customer, product });
  await logWarning('AI optimization failed, used template');
}
```

**Customer Email Invalid:**
```typescript
if (!isValidEmail(customer.email)) {
  await logWarning('Invalid customer email, skipping review request', {
    orderId,
    customerEmail: customer.email,
  });
  return; // Don't send
}
```

---

## User Flow

### Initial Setup
1. Merchant activates automation
2. Connects Shopify store (OAuth)
3. Connects review platform (if supported)
4. Configures automation:
   - Review platform: "Judge.me" (or other)
   - Send delay: 3 days (default)
   - Email template: Uses default template
   - AI optimization: Enabled (default)
5. Clicks "Activate Automation"
6. Automation starts monitoring orders

### Ongoing Operation
1. Customer makes purchase
2. Order is fulfilled (shipped/delivered)
3. Shopify sends webhook: `orders/fulfilled`
4. Automation receives webhook
5. Automation schedules email (3 days later)
6. After delay:
   - AI optimizes subject line and send time
   - Email sent to customer
   - Order tagged 'review-requested'
7. Customer clicks review link
8. Customer submits review
9. Conversion tracked in dashboard

### Conversion Tracking
1. Customer clicks review link (tracked via UTM parameters)
2. Customer submits review (tracked via webhook from review platform)
3. Conversion logged: `review_requested → review_submitted`
4. Conversion rate calculated: `reviews_submitted / emails_sent`
5. Displayed in dashboard: "8.3% conversion rate"

---

## Success Metrics

### Tracked Metrics
- **Review Request Rate** (emails sent per month)
  - Target: 100% of fulfilled orders (after delay)
  - Display: Dashboard widget

- **Email Open Rate** (emails opened / emails sent)
  - Target: >30% (industry average: 20-25%)
  - Display: Dashboard widget, email report

- **Review Submission Rate** (reviews submitted / emails sent)
  - Target: 8% (industry average: 2-3%)
  - Display: Dashboard widget, conversion rate

- **Average Rating** (average star rating of reviews)
  - Target: >4.5 stars
  - Display: Dashboard widget, trend chart

- **Time to Review** (days from email to review)
  - Target: <7 days (most reviews submitted within week)
  - Display: Analytics dashboard

### Reporting
- **Daily:** Email summary (requests sent, reviews received)
- **Weekly:** Performance report (conversion rate, average rating)
- **Monthly:** Full report (ROI, recommendations, top products)

---

## Edge Cases

### Order Has Multiple Products
**Scenario:** Order contains 3 products  
**Handling:** Send one email with all products, or separate emails per product (configurable)
```typescript
if (config.sendPerProduct) {
  // Send separate email for each product
  for (const product of order.line_items) {
    await sendReviewRequest(order, product);
  }
} else {
  // Send one email with all products
  await sendReviewRequest(order, order.line_items);
}
```

### Customer Already Left Review
**Scenario:** Customer left review before email sent  
**Handling:** Check if review exists, skip if found
```typescript
const existingReview = await reviewPlatform.getReview(order.id, product.id);
if (existingReview) {
  await logInfo('Customer already left review, skipping request');
  return;
}
```

### Customer Unsubscribed
**Scenario:** Customer unsubscribed from emails  
**Handling:** Check unsubscribe list, skip if unsubscribed
```typescript
if (await isUnsubscribed(customer.email)) {
  await logInfo('Customer unsubscribed, skipping review request');
  return;
}
```

### Order Refunded
**Scenario:** Order refunded after review request sent  
**Handling:** Don't send if refunded, cancel if already scheduled
```typescript
if (order.financial_status === 'refunded') {
  await cancelScheduledEmail(order.id);
  return;
}
```

### Product Discontinued
**Scenario:** Product discontinued, review link broken  
**Handling:** Use store review link instead of product-specific
```typescript
if (product.status === 'archived') {
  reviewLink = generateStoreReviewLink(order); // Not product-specific
}
```

### AI Service Down
**Scenario:** AI API unavailable  
**Handling:** Fallback to template rendering
```typescript
try {
  subject = await aiOptimizeSubjectLine(template, customer, product);
} catch (error) {
  subject = renderTemplate(template, { customer, product }); // Fallback
}
```

### Email Bounced
**Scenario:** Customer email address invalid  
**Handling:** Log bounce, don't retry
```typescript
if (emailBounced) {
  await logError('Email bounced', { customerEmail, orderId });
  await markEmailInvalid(customer.email);
  return; // Don't retry
}
```

---

## Testing Checklist

### Functional Tests
- [ ] Order fulfilled → Review request sent after delay
- [ ] Email subject line is personalized
- [ ] Email includes correct review link
- [ ] Review link works (opens review form)
- [ ] Conversion tracked when review submitted
- [ ] Multiple products → Handles correctly
- [ ] Customer already reviewed → Skips request
- [ ] Customer unsubscribed → Skips request

### AI Optimization Tests
- [ ] AI optimizes subject line (personalized)
- [ ] AI optimizes send time (per customer)
- [ ] AI failure → Falls back to template
- [ ] AI improves open rates (A/B test)

### Integration Tests
- [ ] Judge.me integration works
- [ ] Yotpo integration works
- [ ] Stamped.io integration works
- [ ] Custom review link works
- [ ] Email platform (Resend) works

### Performance Tests
- [ ] Handles 100+ orders/day
- [ ] Email send time <5s
- [ ] AI optimization <10s
- [ ] No duplicate emails sent
- [ ] Database queries <100ms

### User Experience Tests
- [ ] Configuration UI is intuitive
- [ ] Email template preview works
- [ ] Dashboard shows accurate metrics
- [ ] Error messages are clear
- [ ] Mobile dashboard works

---

## Code Example

### Full Implementation

```typescript
// lib/automations/review-request-automator/index.ts
import { BaseAutomation } from '../base';
import { Resend } from 'resend';
import { aiOptimizeSubjectLine, aiOptimizeSendTime } from '@/lib/ai';
import { generateReviewLink } from '@/lib/review-platforms';

export class ReviewRequestAutomator extends BaseAutomation {
  name = 'Review Request Automator';
  slug = 'review-request-automator';

  async handleWebhook(
    topic: string,
    payload: any,
    userAutomation: UserAutomation
  ): Promise<void> {
    if (topic !== 'orders/fulfilled' && topic !== 'orders/create') {
      return;
    }

    const order = payload;
    const config = await this.getConfig(userAutomation.id);

    // Validate order
    if (!await this.shouldSendReviewRequest(order, config)) {
      return;
    }

    // Calculate send time
    const sendTime = await this.calculateSendTime(order, config);

    // Schedule email
    await this.scheduleReviewRequest(order, userAutomation, config, sendTime);
  }

  private async shouldSendReviewRequest(order: any, config: any): Promise<boolean> {
    // Check order status
    if (order.financial_status !== 'paid') {
      return false;
    }

    // Check minimum order value
    if (config.minOrderValue && order.total_price < config.minOrderValue) {
      return false;
    }

    // Check if already requested
    if (order.tags?.includes('review-requested')) {
      return false;
    }

    // Check excluded products
    if (config.excludeProducts?.length > 0) {
      const hasExcludedProduct = order.line_items.some((item: any) =>
        config.excludeProducts.includes(item.product_id)
      );
      if (hasExcludedProduct) {
        return false;
      }
    }

    // Check customer email
    if (!order.customer?.email || !isValidEmail(order.customer.email)) {
      return false;
    }

    // Check if customer unsubscribed
    if (await isUnsubscribed(order.customer.email)) {
      return false;
    }

    return true;
  }

  private async calculateSendTime(order: any, config: any): Promise<Date> {
    const fulfillmentDate = new Date(order.fulfilled_at || order.created_at);
    const sendDelay = config.sendDelay || 3; // days
    let sendDate = addDays(fulfillmentDate, sendDelay);

    // AI optimization
    if (config.optimizeSendTime) {
      try {
        sendDate = await aiOptimizeSendTime(order.customer, sendDate);
      } catch (error) {
        // Fallback to default time
        sendDate.setHours(10, 0, 0, 0); // 10 AM
      }
    } else {
      // Use configured send time
      const [hours, minutes] = (config.sendTime || '10:00').split(':');
      sendDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    return sendDate;
  }

  private async scheduleReviewRequest(
    order: any,
    userAutomation: UserAutomation,
    config: any,
    sendTime: Date
  ): Promise<void> {
    // Schedule email job
    await queueEmailJob({
      userAutomationId: userAutomation.id,
      orderId: order.id,
      sendTime,
      config,
    });
  }

  async executeScheduledReviewRequest(job: EmailJob): Promise<void> {
    const { orderId, userAutomationId, config } = job;
    
    try {
      // Fetch order data
      const shopify = await this.getShopifyClient(userAutomation);
      const order = await shopify.getOrder(orderId);
      const customer = order.customer;
      const product = order.line_items[0]; // First product

      // Generate subject line
      let subject = config.subjectTemplate || DEFAULT_SUBJECT;
      if (config.optimizeSubjectLines) {
        try {
          subject = await aiOptimizeSubjectLine(subject, customer, product);
        } catch (error) {
          subject = this.renderTemplate(subject, { customer, product });
        }
      } else {
        subject = this.renderTemplate(subject, { customer, product });
      }

      // Generate email body
      const reviewLink = await generateReviewLink(
        order,
        product,
        config.reviewPlatform
      );
      const discountCode = config.includeDiscount
        ? await this.generateDiscountCode(userAutomation)
        : null;

      const emailBody = this.renderEmailTemplate(config.emailTemplate, {
        customer,
        order,
        product,
        reviewLink,
        discountCode,
      });

      // Send email
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${userAutomation.shopify_store_name} <reviews@velocityapps.com>`,
        to: customer.email,
        subject,
        html: emailBody,
        tags: ['review-request', `order-${order.id}`],
      });

      // Tag order
      await shopify.addOrderTag(order.id, 'review-requested');

      // Track conversion
      await trackAutomationConversion(
        userAutomationId,
        'review_request_sent',
        { orderId, productId: product.id }
      );

      // Log success
      await this.log(
        userAutomationId,
        'success',
        `Review request sent for order #${order.order_number}`,
        { orderId, customerEmail: customer.email }
      );
    } catch (error: any) {
      await this.log(
        userAutomationId,
        'error',
        `Failed to send review request: ${error.message}`,
        { orderId, error: error.stack }
      );
      throw error; // Will be retried
    }
  }

  private renderTemplate(template: string, data: any): string {
    return template
      .replace(/\{\{customer_name\}\}/g, data.customer.first_name || 'there')
      .replace(/\{\{product_name\}\}/g, data.product.title)
      .replace(/\{\{order_number\}\}/g, data.order.order_number)
      .replace(/\{\{order_date\}\}/g, formatDate(data.order.created_at));
  }

  private async generateDiscountCode(userAutomation: UserAutomation): Promise<string> {
    // Generate unique discount code
    const code = `REVIEW${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    // Create discount in Shopify
    const shopify = await this.getShopifyClient(userAutomation);
    await shopify.createDiscountCode({
      code,
      value: 10, // 10% off
      type: 'percentage',
      usage_limit: 1, // One-time use
    });

    return code;
  }
}
```

### AI Optimization Functions

```typescript
// lib/ai/review-optimization.ts
export async function aiOptimizeSubjectLine(
  template: string,
  customer: any,
  product: any
): Promise<string> {
  const prompt = `Optimize this email subject line for a review request:
  
Template: ${template}
Customer: ${customer.first_name} ${customer.last_name}
Product: ${product.title}
Order Value: $${product.price}

Generate a personalized, engaging subject line that will increase open rates. 
Keep it under 50 characters. Use the customer's name if appropriate.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are an expert email marketer.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 50,
  });

  return response.choices[0].message.content || template;
}

export async function aiOptimizeSendTime(
  customer: any,
  defaultTime: Date
): Promise<Date> {
  // Analyze customer's past email open times
  const openHistory = await getCustomerEmailOpenHistory(customer.id);
  
  if (openHistory.length < 5) {
    return defaultTime; // Not enough data
  }

  // Find most common open hour
  const hourCounts = new Map<number, number>();
  for (const open of openHistory) {
    const hour = new Date(open.opened_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }

  const bestHour = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])[0][0];

  const optimizedTime = new Date(defaultTime);
  optimizedTime.setHours(bestHour, 0, 0, 0);

  return optimizedTime;
}
```

---

## Configuration UI Example

```tsx
// components/automations/ReviewRequestConfig.tsx
export function ReviewRequestConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label>Review Platform</label>
        <select
          value={config.reviewPlatform || 'judge-me'}
          onChange={(e) => onChange({ ...config, reviewPlatform: e.target.value })}
        >
          <option value="judge-me">Judge.me</option>
          <option value="yotpo">Yotpo</option>
          <option value="stamped">Stamped.io</option>
          <option value="okendo">Okendo</option>
          <option value="custom">Custom URL</option>
        </select>
      </div>

      <div>
        <label>Send Delay</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={config.sendDelay || 3}
            onChange={(e) => onChange({ ...config, sendDelay: parseInt(e.target.value) })}
            min="1"
            max="30"
            className="w-20"
          />
          <select
            value={config.delayType || 'days-after-delivery'}
            onChange={(e) => onChange({ ...config, delayType: e.target.value })}
          >
            <option value="days-after-delivery">Days after delivery</option>
            <option value="days-after-purchase">Days after purchase</option>
          </select>
        </div>
        <p className="text-sm text-gray-500">
          Industry best practice: 3-7 days after delivery
        </p>
      </div>

      <div>
        <label>AI Optimization</label>
        <div className="space-y-2">
          <label>
            <input
              type="checkbox"
              checked={config.optimizeSubjectLines !== false}
              onChange={(e) => onChange({ ...config, optimizeSubjectLines: e.target.checked })}
            />
            Optimize subject lines (improves open rates by 20-30%)
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.optimizeSendTime !== false}
              onChange={(e) => onChange({ ...config, optimizeSendTime: e.target.checked })}
            />
            Optimize send time (improves open rates by 15-25%)
          </label>
        </div>
      </div>

      <div>
        <label>Subject Line Template</label>
        <input
          type="text"
          value={config.subjectTemplate || DEFAULT_SUBJECT}
          onChange={(e) => onChange({ ...config, subjectTemplate: e.target.value })}
          placeholder="How was your {{product_name}}?"
        />
        <div className="mt-2">
          <p className="text-sm font-semibold">Available variables:</p>
          <ul className="text-sm text-gray-500 list-disc list-inside">
            <li>{'{{customer_name}}'} - Customer's first name</li>
            <li>{'{{product_name}}'} - Product name</li>
            <li>{'{{order_number}}'} - Order number</li>
            <li>{'{{order_date}}'} - Order date</li>
          </ul>
        </div>
        {config.optimizeSubjectLines && (
          <div className="mt-2 p-3 bg-blue-50 rounded">
            <p className="text-sm font-semibold">AI Preview:</p>
            <p className="text-sm">{aiPreviewSubject}</p>
          </div>
        )}
      </div>

      <div>
        <label>Include Discount Code</label>
        <label>
          <input
            type="checkbox"
            checked={config.includeDiscount !== false}
            onChange={(e) => onChange({ ...config, includeDiscount: e.target.checked })}
          />
          Include 10% discount code for leaving a review
        </label>
        <p className="text-sm text-gray-500">
          Increases review submission rate by 40-60%
        </p>
      </div>
    </div>
  );
}
```

---

## API Rate Limits & Quotas

### Resend (Email)
- **Rate Limit:** 100 emails/second
- **Daily Limit:** 50,000 emails/day (free tier)
- **Strategy:** Batch sends, queue if rate limit hit

### AI API (OpenAI/Anthropic)
- **Rate Limit:** Varies by provider
- **Cost:** ~$0.01 per optimization
- **Strategy:** Cache optimizations, batch requests

### Review Platforms
- **Rate Limit:** Varies by platform
- **Strategy:** Queue requests, respect rate limits

---

## Monitoring & Alerts

### Key Metrics
- **Email Send Success Rate:** >99% (alert if <95%)
- **Email Open Rate:** >30% (alert if <20%)
- **Review Submission Rate:** >8% (alert if <5%)
- **AI Optimization Success:** >95% (alert if <90%)

### Alert Conditions
- Email send failure rate >5% for 1 hour
- Review submission rate <5% for 1 week
- AI optimization failure rate >10% for 1 hour
- Queue depth >500 jobs

---

**Last Updated:** 2026-01-06  
**Status:** 🚧 In Development  
**Next Review:** After initial implementation

