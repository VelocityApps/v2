-- Hide unbuilt automations from the marketplace
-- Only the 6 fully implemented automations should be visible

-- First disable all
UPDATE automations SET active = false;

-- Then enable only the 6 that are built and functional
UPDATE automations SET active = true WHERE slug IN (
  'abandoned-cart-recovery',
  'review-request-automator',
  'low-stock-alerts',
  'best-sellers-collection',
  'welcome-email-series',
  'pinterest-stock-sync'
);
