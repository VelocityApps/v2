-- Update automation prices from GBP to USD
-- Conversion applied at ~1.25 rate, rounded to clean price points

UPDATE automations SET price_monthly = 36.00 WHERE slug = 'abandoned-cart-recovery';
UPDATE automations SET price_monthly = 24.00 WHERE slug = 'review-request-automator';
UPDATE automations SET price_monthly = 42.00 WHERE slug = 'low-stock-alerts';
UPDATE automations SET price_monthly = 19.00 WHERE slug = 'best-sellers-collection';
UPDATE automations SET price_monthly = 30.00 WHERE slug = 'welcome-email-series';
UPDATE automations SET price_monthly = 36.00 WHERE slug = 'pinterest-stock-sync';

-- Other automations (not yet live)
UPDATE automations SET price_monthly = 24.00 WHERE slug = 'birthday-discount-automator';
UPDATE automations SET price_monthly = 36.00 WHERE slug = 'post-purchase-upsell';
UPDATE automations SET price_monthly = 36.00 WHERE slug = 'win-back-campaign';
UPDATE automations SET price_monthly = 42.00 WHERE slug = 'social-media-auto-post';
UPDATE automations SET price_monthly = 36.00 WHERE slug = 'auto-restock-alerts';
UPDATE automations SET price_monthly = 62.00 WHERE slug = 'inventory-sync-channels';
UPDATE automations SET price_monthly = 42.00 WHERE slug = 'bulk-price-updates';
UPDATE automations SET price_monthly = 42.00 WHERE slug = 'auto-seo-optimization';
UPDATE automations SET price_monthly = 36.00 WHERE slug = 'google-shopping-feed-sync';
UPDATE automations SET price_monthly = 12.00 WHERE slug = 'sitemap-auto-update';
UPDATE automations SET price_monthly = 30.00 WHERE slug = 'sales-report-automator';
UPDATE automations SET price_monthly = 49.00 WHERE slug = 'customer-ltv-tracker';
UPDATE automations SET price_monthly = 62.00 WHERE slug = 'competitor-price-monitoring';
UPDATE automations SET price_monthly = 19.00 WHERE slug = 'auto-tag-products';
UPDATE automations SET price_monthly = 30.00 WHERE slug = 'order-status-auto-updates';
UPDATE automations SET price_monthly = 30.00 WHERE slug = 'product-image-optimizer';
UPDATE automations SET price_monthly = 42.00 WHERE slug = 'customer-segmentation';
