-- =====================================================
-- EVO: MULTI-PLATFORM INVENTORY & ORDER MANAGEMENT
-- Phase 1 — Master schema for all Evo tables
--
-- Scoping: every table is owned by user_id (UUID FK to
-- auth.users). This maps 1-to-1 with the merchant account
-- used throughout the existing Velocity Apps schema.
--
-- Token storage: all platform credentials are AES-256-GCM
-- encrypted before INSERT and stored in *_encrypted columns.
-- Plaintext credentials MUST NEVER be stored.
--
-- Idempotency: evo_inventory_events carries source_event_id
-- (the platform's own webhook/event ID). A partial unique
-- index prevents duplicate event processing.
--
-- RLS pattern matches existing tables:
--   - Users: granular SELECT / INSERT / UPDATE / DELETE
--   - System (service-role webhook handlers): ALL / true
--   - evo_inventory_events is append-only — no UPDATE or
--     DELETE for any role via RLS.
-- =====================================================


-- =====================================================
-- HELPER: ensure update_updated_at_column() exists
-- (already defined in earlier migrations; CREATE OR REPLACE
-- is safe to re-run)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- 1. EVO_PLATFORMS
-- One row per connected platform per merchant.
-- platform_account_id is the canonical identifier for the
-- account on that platform (mystore.myshopify.com for
-- Shopify, Seller Central ID for Amazon, etc.).
-- shopify_charge_id tracks the Evo billing subscription
-- created via app/api/shopify/billing/ (AppSubscriptionCreate).
-- =====================================================
CREATE TABLE IF NOT EXISTS evo_platforms (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform               TEXT NOT NULL CHECK (platform IN ('shopify', 'amazon', 'etsy', 'ebay')),
  platform_account_id    TEXT NOT NULL,          -- e.g. mystore.myshopify.com, AXXXXXXXXXXXXX
  credentials_encrypted  TEXT NOT NULL,          -- AES-256-GCM JSON blob; NEVER plaintext
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'paused', 'error', 'disconnected')),
  last_synced_at         TIMESTAMP WITH TIME ZONE,
  error_message          TEXT,
  shopify_charge_id      TEXT,                   -- Evo tier AppSubscription charge ID
  metadata               JSONB DEFAULT '{}'::jsonb,  -- platform-specific extras (region, marketplace, etc.)
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at             TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  -- One connection per platform account per user
  UNIQUE(user_id, platform, platform_account_id)
);

CREATE INDEX IF NOT EXISTS evo_platforms_user_id_idx       ON evo_platforms(user_id);
CREATE INDEX IF NOT EXISTS evo_platforms_platform_idx      ON evo_platforms(platform);
CREATE INDEX IF NOT EXISTS evo_platforms_status_idx        ON evo_platforms(status);
CREATE INDEX IF NOT EXISTS evo_platforms_charge_id_idx     ON evo_platforms(shopify_charge_id)
  WHERE shopify_charge_id IS NOT NULL;

ALTER TABLE evo_platforms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own evo platforms" ON evo_platforms;
CREATE POLICY "Users can view their own evo platforms"
  ON evo_platforms FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own evo platforms" ON evo_platforms;
CREATE POLICY "Users can insert their own evo platforms"
  ON evo_platforms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own evo platforms" ON evo_platforms;
CREATE POLICY "Users can update their own evo platforms"
  ON evo_platforms FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own evo platforms" ON evo_platforms;
CREATE POLICY "Users can delete their own evo platforms"
  ON evo_platforms FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage evo platforms" ON evo_platforms;
CREATE POLICY "System can manage evo platforms"
  ON evo_platforms FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_evo_platforms_updated_at ON evo_platforms;
CREATE TRIGGER update_evo_platforms_updated_at
  BEFORE UPDATE ON evo_platforms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 2. EVO_PRODUCTS
-- Master product catalogue. One row per logical product
-- owned by the merchant. Platform-specific listing IDs
-- live in evo_sku_mappings, not here.
-- =====================================================
CREATE TABLE IF NOT EXISTS evo_products (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  images      JSONB DEFAULT '[]'::jsonb,   -- [{url, alt, position}]
  tags        TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS evo_products_user_id_idx ON evo_products(user_id);

ALTER TABLE evo_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own evo products" ON evo_products;
CREATE POLICY "Users can view their own evo products"
  ON evo_products FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own evo products" ON evo_products;
CREATE POLICY "Users can insert their own evo products"
  ON evo_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own evo products" ON evo_products;
CREATE POLICY "Users can update their own evo products"
  ON evo_products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own evo products" ON evo_products;
CREATE POLICY "Users can delete their own evo products"
  ON evo_products FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage evo products" ON evo_products;
CREATE POLICY "System can manage evo products"
  ON evo_products FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_evo_products_updated_at ON evo_products;
CREATE TRIGGER update_evo_products_updated_at
  BEFORE UPDATE ON evo_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 3. EVO_SKU_MAPPINGS
-- Maps one master SKU to a single platform listing.
-- A product with 3 platforms = 3 rows (one per platform).
-- platform_listing_id  = Shopify variant GID, ASIN,
--                        Etsy listing ID, eBay item ID.
-- platform_variant_id  = secondary platform variant ref
--                        (Shopify variant ID, eBay SKU, etc.)
-- user_id is denormalised from evo_products to keep RLS
-- checks fast without a join.
-- =====================================================
CREATE TABLE IF NOT EXISTS evo_sku_mappings (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id           UUID NOT NULL REFERENCES evo_products(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_sku           TEXT NOT NULL,
  platform             TEXT NOT NULL CHECK (platform IN ('shopify', 'amazon', 'etsy', 'ebay')),
  platform_listing_id  TEXT NOT NULL,
  platform_variant_id  TEXT,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  -- One platform listing per master SKU per user
  UNIQUE(user_id, master_sku, platform)
);

CREATE INDEX IF NOT EXISTS evo_sku_mappings_user_id_idx       ON evo_sku_mappings(user_id);
CREATE INDEX IF NOT EXISTS evo_sku_mappings_product_id_idx    ON evo_sku_mappings(product_id);
CREATE INDEX IF NOT EXISTS evo_sku_mappings_master_sku_idx    ON evo_sku_mappings(user_id, master_sku);
CREATE INDEX IF NOT EXISTS evo_sku_mappings_platform_idx      ON evo_sku_mappings(platform);
CREATE INDEX IF NOT EXISTS evo_sku_mappings_listing_id_idx    ON evo_sku_mappings(platform, platform_listing_id);

ALTER TABLE evo_sku_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own evo sku mappings" ON evo_sku_mappings;
CREATE POLICY "Users can view their own evo sku mappings"
  ON evo_sku_mappings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own evo sku mappings" ON evo_sku_mappings;
CREATE POLICY "Users can insert their own evo sku mappings"
  ON evo_sku_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own evo sku mappings" ON evo_sku_mappings;
CREATE POLICY "Users can update their own evo sku mappings"
  ON evo_sku_mappings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own evo sku mappings" ON evo_sku_mappings;
CREATE POLICY "Users can delete their own evo sku mappings"
  ON evo_sku_mappings FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage evo sku mappings" ON evo_sku_mappings;
CREATE POLICY "System can manage evo sku mappings"
  ON evo_sku_mappings FOR ALL
  USING (true)
  WITH CHECK (true);


-- =====================================================
-- 4. EVO_INVENTORY_LEVELS
-- Current stock quantity for one SKU on one platform.
-- Exactly one row per evo_sku_mappings row (enforced by
-- the UNIQUE constraint on sku_mapping_id).
-- Written exclusively by webhook handlers and reconciliation
-- jobs — never directly by the user.
-- =====================================================
CREATE TABLE IF NOT EXISTS evo_inventory_levels (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku_mapping_id  UUID NOT NULL REFERENCES evo_sku_mappings(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 0,
  last_synced_at  TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  UNIQUE(sku_mapping_id)
);

CREATE INDEX IF NOT EXISTS evo_inventory_levels_user_id_idx ON evo_inventory_levels(user_id);
-- Partial index to quickly surface low-stock rows (threshold checked in app layer)
CREATE INDEX IF NOT EXISTS evo_inventory_levels_quantity_idx ON evo_inventory_levels(user_id, quantity);

ALTER TABLE evo_inventory_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own evo inventory levels" ON evo_inventory_levels;
CREATE POLICY "Users can view their own evo inventory levels"
  ON evo_inventory_levels FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage evo inventory levels" ON evo_inventory_levels;
CREATE POLICY "System can manage evo inventory levels"
  ON evo_inventory_levels FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_evo_inventory_levels_updated_at ON evo_inventory_levels;
CREATE TRIGGER update_evo_inventory_levels_updated_at
  BEFORE UPDATE ON evo_inventory_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 5. EVO_INVENTORY_EVENTS
-- Immutable audit log. Every stock change appends a row.
-- No UPDATE or DELETE — not even for the system role via
-- RLS (service role bypasses RLS but the intent is clear).
--
-- source_event_id: the platform's own webhook/event ID.
-- The partial unique index on (user_id, source_event_id)
-- where source_event_id IS NOT NULL enforces idempotency —
-- a duplicate webhook delivery hits a unique-key conflict
-- and can be safely ignored with ON CONFLICT DO NOTHING.
--
-- delta: signed integer.
--   Positive = stock added (restock, manual adjustment up).
--   Negative = stock removed (sale, manual adjustment down).
-- quantity_after: absolute quantity after this event.
-- =====================================================
CREATE TABLE IF NOT EXISTS evo_inventory_events (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku_mapping_id   UUID NOT NULL REFERENCES evo_sku_mappings(id) ON DELETE CASCADE,
  source_platform  TEXT NOT NULL CHECK (source_platform IN ('shopify', 'amazon', 'etsy', 'ebay', 'manual')),
  delta            INTEGER NOT NULL,
  quantity_after   INTEGER NOT NULL,
  trigger          TEXT NOT NULL CHECK (trigger IN ('webhook', 'order', 'manual_adjustment', 'reconciliation')),
  source_event_id  TEXT,         -- platform webhook/event ID; NULL for manual entries
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Core lookup indexes
CREATE INDEX IF NOT EXISTS evo_inventory_events_user_id_idx
  ON evo_inventory_events(user_id);
CREATE INDEX IF NOT EXISTS evo_inventory_events_sku_mapping_id_idx
  ON evo_inventory_events(sku_mapping_id, created_at DESC);
CREATE INDEX IF NOT EXISTS evo_inventory_events_created_at_idx
  ON evo_inventory_events(created_at DESC);

-- Idempotency index: prevents duplicate webhook processing
CREATE UNIQUE INDEX IF NOT EXISTS evo_inventory_events_idempotency_idx
  ON evo_inventory_events(user_id, source_event_id)
  WHERE source_event_id IS NOT NULL;

ALTER TABLE evo_inventory_events ENABLE ROW LEVEL SECURITY;

-- Users can read their audit log; they cannot write, update, or delete it
DROP POLICY IF EXISTS "Users can view their own evo inventory events" ON evo_inventory_events;
CREATE POLICY "Users can view their own evo inventory events"
  ON evo_inventory_events FOR SELECT
  USING (auth.uid() = user_id);

-- System (webhook handlers, cron jobs) may INSERT only — no UPDATE or DELETE
DROP POLICY IF EXISTS "System can insert evo inventory events" ON evo_inventory_events;
CREATE POLICY "System can insert evo inventory events"
  ON evo_inventory_events FOR INSERT
  WITH CHECK (true);


-- =====================================================
-- 6. EVO_ORDERS
-- Unified order queue across all platforms.
-- platform_order_id is the platform's own order identifier.
-- The UNIQUE constraint on (user_id, platform, platform_order_id)
-- makes upserts idempotent via ON CONFLICT DO UPDATE.
-- line_items is a JSONB array:
--   [{sku, title, quantity, unit_price, platform_line_id}]
-- =====================================================
CREATE TABLE IF NOT EXISTS evo_orders (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform            TEXT NOT NULL CHECK (platform IN ('shopify', 'amazon', 'etsy', 'ebay')),
  platform_order_id   TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  customer_email      TEXT,
  customer_name       TEXT,
  line_items          JSONB NOT NULL DEFAULT '[]'::jsonb,
  currency            TEXT DEFAULT 'USD',
  total_price         DECIMAL(10, 2),
  platform_created_at TIMESTAMP WITH TIME ZONE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  UNIQUE(user_id, platform, platform_order_id)
);

CREATE INDEX IF NOT EXISTS evo_orders_user_id_idx     ON evo_orders(user_id);
CREATE INDEX IF NOT EXISTS evo_orders_platform_idx    ON evo_orders(user_id, platform);
CREATE INDEX IF NOT EXISTS evo_orders_status_idx      ON evo_orders(user_id, status);
CREATE INDEX IF NOT EXISTS evo_orders_created_at_idx  ON evo_orders(created_at DESC);

ALTER TABLE evo_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own evo orders" ON evo_orders;
CREATE POLICY "Users can view their own evo orders"
  ON evo_orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage evo orders" ON evo_orders;
CREATE POLICY "System can manage evo orders"
  ON evo_orders FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_evo_orders_updated_at ON evo_orders;
CREATE TRIGGER update_evo_orders_updated_at
  BEFORE UPDATE ON evo_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 7. EVO_ALERTS
-- Per-SKU (or global) low stock thresholds with
-- notification preferences.
-- sku_mapping_id NULL = a global default threshold for the
-- merchant, applied to any SKU without a specific alert row.
-- notification_methods: ['email'] initially; extend later
-- for Slack etc.
-- email_recipients: additional addresses beyond the account
-- email. Empty array = send only to account email.
-- =====================================================
CREATE TABLE IF NOT EXISTS evo_alerts (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku_mapping_id        UUID REFERENCES evo_sku_mappings(id) ON DELETE CASCADE,
  master_sku            TEXT,                              -- denormalised for display / querying
  low_stock_threshold   INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  notification_methods  TEXT[] NOT NULL DEFAULT ARRAY['email'],
  email_recipients      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS evo_alerts_user_id_idx       ON evo_alerts(user_id);
CREATE INDEX IF NOT EXISTS evo_alerts_sku_mapping_idx   ON evo_alerts(sku_mapping_id)
  WHERE sku_mapping_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS evo_alerts_active_idx        ON evo_alerts(user_id, is_active);

ALTER TABLE evo_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own evo alerts" ON evo_alerts;
CREATE POLICY "Users can view their own evo alerts"
  ON evo_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own evo alerts" ON evo_alerts;
CREATE POLICY "Users can insert their own evo alerts"
  ON evo_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own evo alerts" ON evo_alerts;
CREATE POLICY "Users can update their own evo alerts"
  ON evo_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own evo alerts" ON evo_alerts;
CREATE POLICY "Users can delete their own evo alerts"
  ON evo_alerts FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage evo alerts" ON evo_alerts;
CREATE POLICY "System can manage evo alerts"
  ON evo_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_evo_alerts_updated_at ON evo_alerts;
CREATE TRIGGER update_evo_alerts_updated_at
  BEFORE UPDATE ON evo_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
