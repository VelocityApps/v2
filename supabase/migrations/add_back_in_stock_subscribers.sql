-- Back-in-stock subscriber list.
-- Customers sign up via /api/back-in-stock/subscribe to be emailed
-- when a product's inventory returns above zero.

CREATE TABLE IF NOT EXISTS back_in_stock_subscribers (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_automation_id   UUID NOT NULL REFERENCES user_automations(id) ON DELETE CASCADE,
  product_id           TEXT NOT NULL,
  variant_id           TEXT,                     -- NULL = any variant
  customer_email       TEXT NOT NULL,
  notified_at          TIMESTAMPTZ,              -- NULL = not yet notified
  created_at           TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_back_in_stock_product
  ON back_in_stock_subscribers (user_automation_id, product_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_back_in_stock_unique
  ON back_in_stock_subscribers (user_automation_id, product_id, customer_email);
