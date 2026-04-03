-- Shopify Billing API fields for per-automation charges.
-- shopify_charge_id stores the numeric ID of the AppSubscription
-- (extracted from the GID returned by appSubscriptionCreate).
-- stripe_subscription_id is kept for account-level plans and legacy records.

ALTER TABLE user_automations
  ADD COLUMN IF NOT EXISTS shopify_charge_id TEXT;

CREATE INDEX IF NOT EXISTS user_automations_shopify_charge_id_idx
  ON user_automations(shopify_charge_id)
  WHERE shopify_charge_id IS NOT NULL;
