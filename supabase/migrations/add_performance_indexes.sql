-- Performance indexes
-- Fixes: webhook handler fetching all automations, cron query, health score lookups

-- Webhook handler: filter by shop + status in DB (avoids full table scan)
CREATE INDEX IF NOT EXISTS idx_user_automations_store_status
  ON user_automations (shopify_store_url, status);

-- Cron runner: next_run_at lookup (partial index — only rows with a scheduled time)
CREATE INDEX IF NOT EXISTS idx_user_automations_next_run
  ON user_automations (next_run_at)
  WHERE next_run_at IS NOT NULL;

-- Automation logs: most queries filter by user_automation_id and sort by created_at
CREATE INDEX IF NOT EXISTS idx_automation_logs_ua_created
  ON automation_logs (user_automation_id, created_at DESC);

-- Health score cache lookups and batch IN queries
CREATE INDEX IF NOT EXISTS idx_description_health_scores_user_product
  ON description_health_scores (user_id, product_id);

-- Description generations: history queries filter by user + product
CREATE INDEX IF NOT EXISTS idx_description_generations_user_product
  ON description_generations (user_id, product_id, created_at DESC);

-- User automations by user (dashboard, description writer access checks)
CREATE INDEX IF NOT EXISTS idx_user_automations_user_status
  ON user_automations (user_id, status);

-- Shopify webhooks: looked up by user_automation_id + topic in webhook handler
CREATE INDEX IF NOT EXISTS idx_shopify_webhooks_ua_topic
  ON shopify_webhooks (user_automation_id, topic);
