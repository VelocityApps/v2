-- =====================================================
-- 1. PRICING UPDATES (market research)
-- =====================================================

UPDATE automations SET price_monthly = 29.00 WHERE slug = 'pinterest-stock-sync';
UPDATE automations SET price_monthly = 34.00 WHERE slug = 'low-stock-alerts';
UPDATE automations SET price_monthly = 15.00 WHERE slug = 'best-sellers-collection';
UPDATE automations SET price_monthly = 29.00 WHERE slug = 'abandoned-cart-recovery';
UPDATE automations SET price_monthly = 19.00 WHERE slug = 'review-request-automator';

UPDATE automations SET price_monthly = 24.00 WHERE slug = 'welcome-email-series';
UPDATE automations SET price_monthly = 19.00 WHERE slug = 'birthday-discount-automator';
UPDATE automations SET price_monthly = 29.00 WHERE slug = 'post-purchase-upsell';
UPDATE automations SET price_monthly = 29.00 WHERE slug = 'win-back-campaign';
UPDATE automations SET price_monthly = 34.00 WHERE slug = 'social-media-auto-post';

UPDATE automations SET price_monthly = 29.00 WHERE slug = 'auto-restock-alerts';
UPDATE automations SET price_monthly = 49.00 WHERE slug = 'inventory-sync-channels';
UPDATE automations SET price_monthly = 34.00 WHERE slug = 'bulk-price-updates';

UPDATE automations SET price_monthly = 34.00 WHERE slug = 'auto-seo-optimization';
UPDATE automations SET price_monthly = 29.00 WHERE slug = 'google-shopping-feed-sync';
UPDATE automations SET price_monthly = 9.00 WHERE slug = 'sitemap-auto-update';

UPDATE automations SET price_monthly = 24.00 WHERE slug = 'sales-report-automator';
UPDATE automations SET price_monthly = 39.00 WHERE slug = 'customer-ltv-tracker';
UPDATE automations SET price_monthly = 49.00 WHERE slug = 'competitor-price-monitoring';

UPDATE automations SET price_monthly = 15.00 WHERE slug = 'auto-tag-products';
UPDATE automations SET price_monthly = 24.00 WHERE slug = 'order-status-auto-updates';
UPDATE automations SET price_monthly = 24.00 WHERE slug = 'product-image-optimizer';
UPDATE automations SET price_monthly = 34.00 WHERE slug = 'customer-segmentation';

-- =====================================================
-- 2. FREE TRIAL: add columns to user_automations
-- =====================================================

ALTER TABLE user_automations
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Allow status 'trial' (drop existing check and re-add)
ALTER TABLE user_automations DROP CONSTRAINT IF EXISTS user_automations_status_check;
ALTER TABLE user_automations ADD CONSTRAINT user_automations_status_check
  CHECK (status IN ('active', 'paused', 'error', 'trial'));

-- Index for trial expiry cron
CREATE INDEX IF NOT EXISTS user_automations_trial_ends_at_idx
  ON user_automations(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

COMMENT ON COLUMN user_automations.trial_started_at IS 'When the 7-day free trial started';
COMMENT ON COLUMN user_automations.trial_ends_at IS 'When the trial ends; after this, convert to paid or pause';
