-- Add last_alerted_at to evo_alerts for spam-prevention cooldown.
--
-- The sync engine checks this before sending a low-stock email:
--   - If stock just crossed the threshold (was above, now at/below) → always send
--   - If stock was already below threshold AND last_alerted_at < 24h ago → skip
--
-- This prevents a flood of emails when stock bounces around the threshold
-- (e.g. multiple webhook deliveries on the same day for the same SKU).

ALTER TABLE evo_alerts
  ADD COLUMN IF NOT EXISTS last_alerted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS evo_alerts_last_alerted_at_idx
  ON evo_alerts(user_id, last_alerted_at)
  WHERE last_alerted_at IS NOT NULL;
