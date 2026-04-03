-- AI Description Writer add-on tables and billing columns

-- ── Generations (one row per Claude call) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS description_generations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  TEXT,                         -- Shopify product ID (optional, for history tracking)
  input_data  JSONB       NOT NULL DEFAULT '{}',
  output      TEXT        NOT NULL,
  tone        TEXT        NOT NULL,
  language    TEXT        NOT NULL DEFAULT 'en',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── History (keeps last N outputs per generation, for revert) ─────────────────
CREATE TABLE IF NOT EXISTS description_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID        NOT NULL REFERENCES description_generations(id) ON DELETE CASCADE,
  output        TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Per-user settings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS description_writer_settings (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_tone              TEXT        NOT NULL DEFAULT 'premium',
  default_language          TEXT        NOT NULL DEFAULT 'en',
  auto_trigger_enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
  brand_voice_instructions  TEXT,
  auto_trigger_webhook_id   TEXT,       -- Shopify webhook ID to allow deregistration
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Billing columns on user_profiles ──────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS has_description_writer          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS description_writer_charge_id    TEXT,
  ADD COLUMN IF NOT EXISTS description_writer_shopify_store TEXT;

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE description_generations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE description_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE description_writer_settings ENABLE ROW LEVEL SECURITY;

-- description_generations: users own their rows
CREATE POLICY "dg_select" ON description_generations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dg_insert" ON description_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dg_delete" ON description_generations
  FOR DELETE USING (auth.uid() = user_id);

-- description_history: accessible via parent generation
CREATE POLICY "dh_select" ON description_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM description_generations WHERE id = generation_id AND user_id = auth.uid())
  );
CREATE POLICY "dh_insert" ON description_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM description_generations WHERE id = generation_id AND user_id = auth.uid())
  );

-- description_writer_settings
CREATE POLICY "dws_all" ON description_writer_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS description_generations_user_id_idx
  ON description_generations(user_id);
CREATE INDEX IF NOT EXISTS description_generations_user_product_idx
  ON description_generations(user_id, product_id, created_at DESC)
  WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS description_history_generation_id_idx
  ON description_history(generation_id);
CREATE INDEX IF NOT EXISTS user_profiles_description_writer_charge_idx
  ON user_profiles(description_writer_charge_id)
  WHERE description_writer_charge_id IS NOT NULL;
