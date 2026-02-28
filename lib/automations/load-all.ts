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
import '@/lib/automations/best-sellers-collection';
import '@/lib/automations/low-stock-alerts';
import '@/lib/automations/pinterest-stock-sync';
import '@/lib/automations/review-request-automator';
import '@/lib/automations/welcome-email-series';
