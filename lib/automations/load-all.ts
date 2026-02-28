/**
 * Load all automation modules into the registry.
 *
 * Each automation file calls registerAutomation() as a side effect when imported.
 * This file must be imported at the top of every API route that calls getAutomation(),
 * otherwise the registry is empty and automations will not run.
 *
 * Routes that need this: webhook handler, cron runner, install handler.
 */

import '@/lib/automations/abandoned-cart-recovery';
import '@/lib/automations/auto-restock-alerts';
import '@/lib/automations/auto-seo-optimization';
import '@/lib/automations/auto-tag-products';
import '@/lib/automations/best-sellers-collection';
import '@/lib/automations/customer-ltv-tracker';
import '@/lib/automations/customer-segmentation';
import '@/lib/automations/low-stock-alerts';
import '@/lib/automations/order-status-auto-updates';
import '@/lib/automations/pinterest-stock-sync';
import '@/lib/automations/post-purchase-upsell';
import '@/lib/automations/review-request-automator';
import '@/lib/automations/sales-report-automator';
import '@/lib/automations/welcome-email-series';
import '@/lib/automations/win-back-campaign';
