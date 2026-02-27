# Abandoned Cart Recovery

## Overview

Automatically sends a 3-email sequence to customers who abandon their cart, with personalized offers and timing optimization. Recovers lost sales and increases conversion rates.

**Category:** Marketing  
**Price:** £29/month  
**Icon:** 🛒  
**User Count:** 0 (new automation)

---

## User Story

**As a Shopify merchant**, when a customer abandons their cart, I want to automatically send them a series of recovery emails so I can:
- Recover lost sales (industry average: 5-10% recovery rate)
- Increase revenue (abandoned carts = 70% of potential sales)
- Save time (no manual email sending)
- Improve customer experience (remind them of items they wanted)

**Acceptance Criteria:**
- Customer abandons cart → First email sent after 1 hour
- Second email sent after 24 hours (with discount)
- Third email sent after 72 hours (final offer)
- Conversion tracked → See recovery rate in dashboard
- Customer completes purchase → Stop email sequence

---

## Configuration Options

### Email Sequence
- **Email 1 Timing** (number input + dropdown)
  - Default: 1 hour after abandonment
  - Options: "Minutes", "Hours", "Days"
  - Range: 15 minutes - 24 hours
  - Template: "You left items in your cart"

- **Email 2 Timing** (number input + dropdown)
  - Default: 24 hours after abandonment
  - Options: "Hours", "Days"
  - Range: 1 hour - 7 days
  - Template: "Still interested? Here's 10% off"
  - Include discount: Yes (default)

- **Email 3 Timing** (number input + dropdown)
  - Default: 72 hours after abandonment
  - Options: "Hours", "Days"
  - Range: 1 hour - 14 days
  - Template: "Last chance! 15% off expires soon"
  - Include discount: Yes (default)
  - Urgency: Countdown timer (optional)

### Discount Configuration
- **Email 2 Discount** (number input + dropdown)
  - Default: 10% off
  - Options: "Percentage" (default), "Fixed amount"
  - Range: 5-50% or £1-£100
  - Code format: Auto-generated or custom

- **Email 3 Discount** (number input + dropdown)
  - Default: 15% off
  - Options: "Percentage" (default), "Fixed amount"
  - Range: 10-50% or £5-£200
  - Code format: Auto-generated or custom
  - Expiry: 7 days (default, configurable)

### Email Templates
- **Email 1 Template** (rich text editor)
  - Default: Friendly reminder
  - Variables: `{{customer_name}}`, `{{cart_items}}`, `{{cart_total}}`
  - Personalization: Product recommendations

- **Email 2 Template** (rich text editor)
  - Default: Discount offer
  - Variables: Same as Email 1 + `{{discount_code}}`
  - Personalization: Show savings amount

- **Email 3 Template** (rich text editor)
  - Default: Final offer with urgency
  - Variables: Same as Email 2 + `{{expiry_date}}`
  - Personalization: Countdown timer, limited stock

### Filtering Options
- **Minimum Cart Value** (number input)
  - Default: £0 (all carts)
  - Use case: Only recover carts >£50
  - Validation: Must be >= 0

- **Exclude Products** (multi-select)
  - Options: Select products to exclude
  - Use case: Don't recover carts with sale items
  - Default: None

- **Exclude Customers** (tags)
  - Options: Exclude customers with specific tags
  - Use case: Don't spam VIP customers
  - Default: None

### AI Optimization
- **Optimize Send Times** (checkbox)
  - Default: Yes (checked)
  - Uses AI to find best send time per customer
  - Improves open rates by 15-25%

- **Personalize Content** (checkbox)
  - Default: Yes (checked)
  - Uses AI to personalize email content
  - Improves conversion rates by 20-30%

---

## Technical Implementation

### Architecture

```
┌─────────────────┐
│ Cart Abandoned  │
│ (No Checkout)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Schedule Email 1│
│ (1 hour delay)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send Email 1    │
│ (Reminder)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Schedule Email 2│
│ (24 hour delay) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send Email 2    │
│ (10% discount)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Schedule Email 3│
│ (72 hour delay) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send Email 3    │
│ (15% discount)  │
└─────────────────┘
```

### Triggers

**Primary Trigger:**
- Shopify webhook: `checkouts/create` (cart created)
- Condition: Checkout not completed within 1 hour
- Detection: Monitor checkout status, mark as abandoned if not completed

**Alternative Triggers:**
- Scheduled check: Every hour (check for abandoned carts)
- Manual trigger: Merchant can manually send recovery emails

### Actions

**Step 1: Detect Abandoned Cart**
```typescript
// Monitor checkout creation
async function handleCheckoutCreate(checkout: any) {
  // Schedule check for abandonment
  await scheduleAbandonmentCheck(checkout.id, 3600); // 1 hour
}

// Check if abandoned
async function checkAbandonment(checkoutId: string) {
  const checkout = await shopify.getCheckout(checkoutId);
  
  if (checkout.completed_at) {
    return; // Checkout completed, not abandoned
  }

  // Mark as abandoned
  await markCartAbandoned(checkout);
  await scheduleRecoveryEmails(checkout);
}
```

**Step 2: Schedule Email Sequence**
```typescript
// Schedule all 3 emails
async function scheduleRecoveryEmails(checkout: any) {
  const config = await getConfig(userAutomationId);
  
  // Email 1: 1 hour
  await scheduleEmail({
    checkoutId: checkout.id,
    emailNumber: 1,
    sendAt: addHours(checkout.created_at, config.email1Delay || 1),
    template: config.email1Template,
  });

  // Email 2: 24 hours
  await scheduleEmail({
    checkoutId: checkout.id,
    emailNumber: 2,
    sendAt: addHours(checkout.created_at, config.email2Delay || 24),
    template: config.email2Template,
    discountCode: await generateDiscountCode(10), // 10% off
  });

  // Email 3: 72 hours
  await scheduleEmail({
    checkoutId: checkout.id,
    emailNumber: 3,
    sendAt: addHours(checkout.created_at, config.email3Delay || 72),
    template: config.email3Template,
    discountCode: await generateDiscountCode(15), // 15% off
    expiryDate: addDays(new Date(), 7), // Expires in 7 days
  });
}
```

**Step 3: Send Email**
```typescript
async function sendRecoveryEmail(job: EmailJob) {
  const { checkoutId, emailNumber, template, discountCode } = job;
  
  // Fetch checkout data
  const checkout = await shopify.getCheckout(checkoutId);
  const customer = checkout.customer;
  
  // Check if checkout already completed
  if (checkout.completed_at) {
    await cancelRemainingEmails(checkoutId);
    return; // Don't send, checkout completed
  }

  // Generate email content
  const subject = this.generateSubject(emailNumber, customer, checkout);
  const body = this.renderTemplate(template, {
    customer,
    checkout,
    cartItems: checkout.line_items,
    cartTotal: checkout.total_price,
    discountCode,
  });

  // Send email
  await resend.emails.send({
    from: `${store.name} <cart@${store.domain}>`,
    to: customer.email,
    subject,
    html: body,
    tags: ['abandoned-cart', `email-${emailNumber}`, `checkout-${checkoutId}`],
  });

  // Track conversion
  await trackAutomationConversion(
    userAutomationId,
    'recovery_email_sent',
    { checkoutId, emailNumber }
  );
}
```

**Step 4: Track Conversion**
```typescript
// When customer completes checkout
async function handleCheckoutComplete(checkoutId: string) {
  // Check if this was a recovered cart
  const abandonedCart = await getAbandonedCart(checkoutId);
  
  if (abandonedCart) {
    // Track conversion
    await trackAutomationConversion(
      userAutomationId,
      'cart_recovered',
      {
        checkoutId,
        recoveryEmail: abandonedCart.lastEmailSent, // Which email converted
        discountUsed: checkout.discount_codes?.[0]?.code,
      }
    );

    // Cancel remaining emails
    await cancelRemainingEmails(checkoutId);
  }
}
```

### APIs Used

**Shopify Admin API:**
- GraphQL: `checkout` query (fetch checkout data)
- GraphQL: `checkoutLineItemsAdd` mutation (restore cart)
- REST: `GET /admin/api/2024-01/checkouts/{id}.json` (checkout details)
- Webhooks: `checkouts/create`, `checkouts/update`

**Resend API:**
- `POST /emails` (send transactional email)
- Rate limit: 100 emails/second
- Templates: Support for email templates

**AI API (OpenAI/Anthropic):**
- `POST /v1/chat/completions` (optimize send times)
- `POST /v1/chat/completions` (personalize content)
- Rate limit: Varies by provider

### Error Handling

**Checkout Already Completed:**
```typescript
if (checkout.completed_at) {
  await cancelRemainingEmails(checkoutId);
  await logInfo('Checkout completed, cancelled recovery emails');
  return; // Don't send
}
```

**Customer Email Invalid:**
```typescript
if (!isValidEmail(customer.email)) {
  await logWarning('Invalid customer email, skipping recovery email');
  return; // Don't send
}
```

**Discount Code Generation Failed:**
```typescript
try {
  discountCode = await generateDiscountCode(10);
} catch (error) {
  // Continue without discount
  discountCode = null;
  await logWarning('Failed to generate discount code, sending without discount');
}
```

**Email Send Failure:**
```typescript
try {
  await resend.emails.send(emailData);
} catch (error: any) {
  if (error.status === 429) {
    // Rate limit - queue for retry
    await queueForLater({ emailJob, retryAfter: 3600 });
    return;
  }
  
  // Log error, but don't fail automation
  await logError('Failed to send recovery email', { error: error.message });
}
```

---

## User Flow

### Initial Setup
1. Merchant activates automation
2. Connects Shopify store (OAuth)
3. Configures email sequence:
   - Email 1: 1 hour (default)
   - Email 2: 24 hours, 10% discount (default)
   - Email 3: 72 hours, 15% discount (default)
4. Customizes email templates (optional)
5. Clicks "Activate Automation"
6. Automation starts monitoring checkouts

### Ongoing Operation
1. Customer adds items to cart
2. Customer leaves without completing checkout
3. Shopify creates checkout (webhook: `checkouts/create`)
4. Automation detects abandonment (1 hour after creation)
5. Automation schedules email sequence:
   - Email 1: 1 hour (reminder)
   - Email 2: 24 hours (10% discount)
   - Email 3: 72 hours (15% discount)
6. Emails sent at scheduled times
7. Customer clicks email, returns to cart
8. Customer completes purchase
9. Conversion tracked: "Cart recovered via Email 2"

### Conversion Tracking
1. Customer clicks recovery email (tracked via UTM parameters)
2. Customer completes checkout (tracked via webhook)
3. Conversion logged: `recovery_email_sent → cart_recovered`
4. Recovery rate calculated: `carts_recovered / emails_sent`
5. Displayed in dashboard: "12.5% recovery rate"

---

## Success Metrics

### Tracked Metrics
- **Abandoned Carts Detected** (count per month)
  - Target: Track all abandoned carts
  - Display: Dashboard widget

- **Recovery Emails Sent** (count per month)
  - Target: 100% of abandoned carts receive emails
  - Display: Dashboard widget

- **Cart Recovery Rate** (carts recovered / emails sent)
  - Target: 12% (industry average: 5-10%)
  - Display: Dashboard widget, conversion rate

- **Revenue Recovered** (revenue from recovered carts)
  - Target: £1,000-£5,000/month for average store
  - Display: Dashboard widget, monthly report

- **Email Performance** (open rate, click rate)
  - Email 1: >30% open rate, >10% click rate
  - Email 2: >35% open rate, >15% click rate (discount)
  - Email 3: >40% open rate, >20% click rate (urgency)
  - Display: Analytics dashboard

### Reporting
- **Daily:** Email summary (carts abandoned, recovered, revenue)
- **Weekly:** Performance report (recovery rate, email performance)
- **Monthly:** Full report (ROI, recommendations, top products)

---

## Edge Cases

### Customer Completes Purchase Before Email
**Scenario:** Customer completes purchase 30 minutes after abandonment  
**Handling:** Cancel all scheduled emails
```typescript
if (checkout.completed_at) {
  await cancelRemainingEmails(checkoutId);
  return; // Don't send
}
```

### Multiple Abandonments
**Scenario:** Customer abandons cart 3 times in one week  
**Handling:** Only send sequence once per customer per week
```typescript
const recentAbandonment = await getRecentAbandonment(customer.id, 7); // 7 days
if (recentAbandonment) {
  await logInfo('Customer recently abandoned, skipping duplicate sequence');
  return;
}
```

### Cart Items Out of Stock
**Scenario:** Cart item goes out of stock before email sent  
**Handling:** Update email to show item unavailable, offer alternatives
```typescript
const availableItems = checkout.line_items.filter(item => item.available);
if (availableItems.length < checkout.line_items.length) {
  // Some items out of stock
  emailBody += '<p>Note: Some items in your cart are now out of stock. We\'ve updated your cart.</p>';
}
```

### Discount Code Already Used
**Scenario:** Customer uses discount code from Email 2, then receives Email 3  
**Handling:** Check if discount used, skip Email 3 if used
```typescript
const discountUsed = await checkDiscountCodeUsed(discountCode);
if (discountUsed && emailNumber === 3) {
  await logInfo('Discount already used, skipping Email 3');
  return; // Don't send
}
```

### Customer Unsubscribed
**Scenario:** Customer unsubscribes from emails  
**Handling:** Check unsubscribe list, skip if unsubscribed
```typescript
if (await isUnsubscribed(customer.email)) {
  await logInfo('Customer unsubscribed, skipping recovery email');
  return; // Don't send
}
```

---

## Testing Checklist

### Functional Tests
- [ ] Cart abandoned → Email 1 sent after 1 hour
- [ ] Email 2 sent after 24 hours with discount
- [ ] Email 3 sent after 72 hours with larger discount
- [ ] Customer completes purchase → Remaining emails cancelled
- [ ] Email includes cart items and total
- [ ] Discount codes work (apply correctly)
- [ ] Recovery tracked when customer completes purchase

### Email Sequence Tests
- [ ] All 3 emails sent in correct order
- [ ] Timing is correct (1h, 24h, 72h)
- [ ] Discount codes are unique per customer
- [ ] Email content is personalized
- [ ] Cart restore link works (restores cart)

### Edge Case Tests
- [ ] Customer completes purchase before email → Emails cancelled
- [ ] Multiple abandonments → Only one sequence per week
- [ ] Cart items out of stock → Email updated
- [ ] Discount already used → Email 3 skipped
- [ ] Customer unsubscribed → Emails skipped

### Performance Tests
- [ ] Handles 100+ abandoned carts/day
- [ ] Email send time <5s
- [ ] No duplicate emails sent
- [ ] Database queries <100ms

---

## Code Example

### Full Implementation

```typescript
// lib/automations/abandoned-cart-recovery/index.ts
import { BaseAutomation } from '../base';
import { Resend } from 'resend';
import { generateDiscountCode } from '@/lib/shopify/discounts';
import { aiOptimizeSendTime, aiPersonalizeContent } from '@/lib/ai';

export class AbandonedCartRecovery extends BaseAutomation {
  name = 'Abandoned Cart Recovery';
  slug = 'abandoned-cart-recovery';

  async handleWebhook(
    topic: string,
    payload: any,
    userAutomation: UserAutomation
  ): Promise<void> {
    if (topic !== 'checkouts/create') {
      return;
    }

    const checkout = payload;
    const config = await this.getConfig(userAutomation.id);

    // Validate checkout
    if (!await this.shouldRecoverCart(checkout, config)) {
      return;
    }

    // Schedule abandonment check (1 hour)
    await scheduleAbandonmentCheck(checkout.id, 3600);
  }

  async checkAbandonment(checkoutId: string, userAutomation: UserAutomation): Promise<void> {
    const shopify = await this.getShopifyClient(userAutomation);
    const checkout = await shopify.getCheckout(checkoutId);

    // Check if already completed
    if (checkout.completed_at) {
      return; // Not abandoned
    }

    // Mark as abandoned
    await markCartAbandoned(checkout);
    
    // Schedule recovery emails
    await this.scheduleRecoveryEmails(checkout, userAutomation);
  }

  private async scheduleRecoveryEmails(
    checkout: any,
    userAutomation: UserAutomation
  ): Promise<void> {
    const config = await this.getConfig(userAutomation.id);

    // Email 1: 1 hour
    await queueEmailJob({
      userAutomationId: userAutomation.id,
      checkoutId: checkout.id,
      emailNumber: 1,
      sendAt: addHours(checkout.created_at, config.email1Delay || 1),
      template: config.email1Template || DEFAULT_EMAIL1_TEMPLATE,
    });

    // Email 2: 24 hours with discount
    const discountCode2 = await generateDiscountCode(userAutomation, 10); // 10% off
    await queueEmailJob({
      userAutomationId: userAutomation.id,
      checkoutId: checkout.id,
      emailNumber: 2,
      sendAt: addHours(checkout.created_at, config.email2Delay || 24),
      template: config.email2Template || DEFAULT_EMAIL2_TEMPLATE,
      discountCode: discountCode2,
    });

    // Email 3: 72 hours with larger discount
    const discountCode3 = await generateDiscountCode(userAutomation, 15); // 15% off
    await queueEmailJob({
      userAutomationId: userAutomation.id,
      checkoutId: checkout.id,
      emailNumber: 3,
      sendAt: addHours(checkout.created_at, config.email3Delay || 72),
      template: config.email3Template || DEFAULT_EMAIL3_TEMPLATE,
      discountCode: discountCode3,
      expiryDate: addDays(new Date(), 7), // Expires in 7 days
    });
  }

  async sendRecoveryEmail(job: EmailJob): Promise<void> {
    const { checkoutId, emailNumber, template, discountCode, expiryDate } = job;
    
    try {
      const shopify = await this.getShopifyClient(userAutomation);
      const checkout = await shopify.getCheckout(checkoutId);

      // Check if checkout already completed
      if (checkout.completed_at) {
        await cancelRemainingEmails(checkoutId);
        await logInfo('Checkout completed, cancelled recovery emails');
        return;
      }

      const customer = checkout.customer;
      const config = await this.getConfig(userAutomation.id);

      // Generate subject line
      const subject = this.generateSubject(emailNumber, customer, checkout);

      // Generate email body
      const cartRestoreLink = this.generateCartRestoreLink(checkout);
      const emailBody = this.renderTemplate(template, {
        customer,
        checkout,
        cartItems: checkout.line_items,
        cartTotal: checkout.total_price,
        discountCode,
        expiryDate,
        cartRestoreLink,
      });

      // AI personalization (if enabled)
      let personalizedBody = emailBody;
      if (config.personalizeContent) {
        try {
          personalizedBody = await aiPersonalizeContent(emailBody, customer, checkout);
        } catch (error) {
          // Fallback to template
          personalizedBody = emailBody;
        }
      }

      // Send email
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${userAutomation.shopify_store_name} <cart@velocityapps.com>`,
        to: customer.email,
        subject,
        html: personalizedBody,
        tags: ['abandoned-cart', `email-${emailNumber}`, `checkout-${checkoutId}`],
      });

      // Track conversion
      await trackAutomationConversion(
        userAutomation.id,
        'recovery_email_sent',
        { checkoutId, emailNumber }
      );

      // Log success
      await this.log(
        userAutomation.id,
        'success',
        `Recovery email ${emailNumber} sent for checkout ${checkoutId}`,
        { checkoutId, emailNumber, customerEmail: customer.email }
      );
    } catch (error: any) {
      await this.log(
        userAutomation.id,
        'error',
        `Failed to send recovery email ${emailNumber}: ${error.message}`,
        { checkoutId, emailNumber, error: error.stack }
      );
      throw error; // Will be retried
    }
  }

  private generateSubject(emailNumber: number, customer: any, checkout: any): string {
    const templates = {
      1: `You left items in your cart, ${customer.first_name || 'there'}!`,
      2: `Still interested? Here's 10% off your cart`,
      3: `Last chance! 15% off expires soon`,
    };

    return templates[emailNumber] || templates[1];
  }

  private generateCartRestoreLink(checkout: any): string {
    // Generate restore link that adds items back to cart
    const token = checkout.token;
    return `${checkout.shop.domain}/cart/${token}`;
  }

  private renderTemplate(template: string, data: any): string {
    return template
      .replace(/\{\{customer_name\}\}/g, data.customer.first_name || 'there')
      .replace(/\{\{cart_items\}\}/g, this.formatCartItems(data.cartItems))
      .replace(/\{\{cart_total\}\}/g, formatPrice(data.cartTotal))
      .replace(/\{\{discount_code\}\}/g, data.discountCode || '')
      .replace(/\{\{expiry_date\}\}/g, data.expiryDate ? formatDate(data.expiryDate) : '')
      .replace(/\{\{cart_restore_link\}\}/g, data.cartRestoreLink);
  }

  private formatCartItems(items: any[]): string {
    return items.map(item => `
      <div>
        <img src="${item.image}" alt="${item.title}" />
        <h3>${item.title}</h3>
        <p>${formatPrice(item.price)} x ${item.quantity}</p>
      </div>
    `).join('');
  }

  private async shouldRecoverCart(checkout: any, config: any): Promise<boolean> {
    // Check minimum cart value
    if (config.minCartValue && checkout.total_price < config.minCartValue) {
      return false;
    }

    // Check excluded products
    if (config.excludeProducts?.length > 0) {
      const hasExcludedProduct = checkout.line_items.some((item: any) =>
        config.excludeProducts.includes(item.product_id)
      );
      if (hasExcludedProduct) {
        return false;
      }
    }

    // Check customer email
    if (!checkout.customer?.email || !isValidEmail(checkout.customer.email)) {
      return false;
    }

    // Check if customer unsubscribed
    if (await isUnsubscribed(checkout.customer.email)) {
      return false;
    }

    return true;
  }
}
```

---

**Last Updated:** 2026-01-06  
**Status:** 🚧 In Development  
**Next Review:** After initial implementation

