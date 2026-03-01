-- Per-automation Stripe Price ID (lazy-created on first subscription)
ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Per-installation Stripe Subscription ID
ALTER TABLE user_automations
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Extend status to include 'cancelled' (voluntary subscription cancellation)
ALTER TABLE user_automations DROP CONSTRAINT IF EXISTS user_automations_status_check;
ALTER TABLE user_automations ADD CONSTRAINT user_automations_status_check
  CHECK (status IN ('active', 'paused', 'error', 'trial', 'cancelled'));

-- Index for O(1) webhook lookup by subscription ID
CREATE INDEX IF NOT EXISTS user_automations_stripe_subscription_id_idx
  ON user_automations(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
