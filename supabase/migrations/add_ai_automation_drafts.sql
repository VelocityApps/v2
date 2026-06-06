-- =====================================================
-- AI AUTOMATION DRAFTS TABLE
-- Stores Claude-parsed automation configs before the
-- merchant confirms and they're written to user_automations.
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_automation_drafts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain     TEXT NOT NULL,
  raw_prompt      TEXT NOT NULL,
  parsed_trigger  JSONB,
  parsed_action   JSONB,
  -- draft   = parsed but not yet confirmed by merchant
  -- active  = confirmed and written to user_automations
  -- error   = Claude could not produce a valid config
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'error')),
  claude_reasoning TEXT,
  created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_automation_drafts_user_id_idx
  ON ai_automation_drafts(user_id);

CREATE INDEX IF NOT EXISTS ai_automation_drafts_status_idx
  ON ai_automation_drafts(status);

ALTER TABLE ai_automation_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI drafts" ON ai_automation_drafts;
CREATE POLICY "Users can view their own AI drafts"
  ON ai_automation_drafts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own AI drafts" ON ai_automation_drafts;
CREATE POLICY "Users can insert their own AI drafts"
  ON ai_automation_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI drafts" ON ai_automation_drafts;
CREATE POLICY "Users can update their own AI drafts"
  ON ai_automation_drafts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
