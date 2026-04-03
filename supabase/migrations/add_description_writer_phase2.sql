-- AI Description Writer Phase 2 — A/B Testing, Review Mining, Health Scoring,
-- Seasonal Scheduling, Market Localisation, Brand Voice

-- ── A/B Tests ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_tests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id        TEXT        NOT NULL,
  variant_a         TEXT        NOT NULL,
  variant_b         TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'running',   -- running | complete
  winner            TEXT,                                      -- a | b | null
  variant_a_views   INTEGER     NOT NULL DEFAULT 0,
  variant_b_views   INTEGER     NOT NULL DEFAULT 0,
  current_variant   TEXT        NOT NULL DEFAULT 'a',          -- which is currently live
  visit_threshold   INTEGER     NOT NULL DEFAULT 200,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Product Review Insights (cache) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_review_insights (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id        TEXT        NOT NULL,
  extracted_phrases JSONB       NOT NULL DEFAULT '{}',
  last_fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- ── Description Health Scores ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS description_health_scores (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id        TEXT        NOT NULL,
  product_title     TEXT,
  overall_score     INTEGER     NOT NULL DEFAULT 0,
  readability_score INTEGER     NOT NULL DEFAULT 0,
  length_score      INTEGER     NOT NULL DEFAULT 0,
  seo_score         INTEGER     NOT NULL DEFAULT 0,
  cta_score         INTEGER     NOT NULL DEFAULT 0,
  benefit_score     INTEGER     NOT NULL DEFAULT 0,
  word_count        INTEGER     NOT NULL DEFAULT 0,
  scanned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- ── Seasonal Schedules ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasonal_schedules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id   TEXT        NOT NULL,
  event_name      TEXT        NOT NULL,
  event_date      TIMESTAMPTZ NOT NULL,
  run_date        TIMESTAMPTZ NOT NULL,
  restore_date    TIMESTAMPTZ NOT NULL,
  tone            TEXT        NOT NULL DEFAULT 'premium',
  status          TEXT        NOT NULL DEFAULT 'scheduled', -- scheduled | running | complete | restored
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Market Descriptions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_descriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  TEXT,
  market      TEXT        NOT NULL,
  language    TEXT        NOT NULL DEFAULT 'en',
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id, market)
);

-- ── Brand Voice Profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_voice_profiles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tone                JSONB       NOT NULL DEFAULT '[]',
  sentence_structure  TEXT        NOT NULL DEFAULT 'mixed',
  vocabulary_level    TEXT        NOT NULL DEFAULT 'mixed',
  personality_traits  JSONB       NOT NULL DEFAULT '[]',
  phrases_to_use      JSONB       NOT NULL DEFAULT '[]',
  phrases_to_avoid    JSONB       NOT NULL DEFAULT '[]',
  example_sentences   JSONB       NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE ab_tests                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_review_insights    ENABLE ROW LEVEL SECURITY;
ALTER TABLE description_health_scores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_schedules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_descriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voice_profiles       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ab_tests_user"      ON ab_tests               FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pri_user"           ON product_review_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dhs_user"           ON description_health_scores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ss_user"            ON seasonal_schedules       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "md_user"            ON market_descriptions       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bvp_user"           ON brand_voice_profiles      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ab_tests_user_product_idx        ON ab_tests(user_id, product_id);
CREATE INDEX IF NOT EXISTS ab_tests_status_idx              ON ab_tests(status) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS dhs_user_score_idx               ON description_health_scores(user_id, overall_score);
CREATE INDEX IF NOT EXISTS seasonal_run_date_idx            ON seasonal_schedules(run_date)     WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS seasonal_restore_date_idx        ON seasonal_schedules(restore_date) WHERE status = 'complete';
CREATE INDEX IF NOT EXISTS market_desc_user_product_idx     ON market_descriptions(user_id, product_id);
