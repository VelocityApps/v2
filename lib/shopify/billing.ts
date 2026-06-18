/**
 * Returns true if an AppSubscription charge should be created as a test charge.
 *
 * test: true is required in two cases:
 *   1. Non-production environments (local dev, staging, CI)
 *   2. Shopify partner / development stores — they have no payment method on
 *      file, so real charges cannot be approved. Test charges skip that requirement.
 *      plan.partnerDevelopment covers: partner_test, Developer Preview,
 *      staff_business, Plus partner sandbox, and any future variants.
 */
export function isTestCharge(
  plan: { partnerDevelopment: boolean } | null | undefined,
): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (process.env.SHOPIFY_BILLING_TEST === 'true') return true;
  // partnerDevelopment is the official Shopify flag for all dev/partner store types
  return plan?.partnerDevelopment === true;
}
