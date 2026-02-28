-- Welcome Email Series tracking table
-- Stores one row per order; tracks which emails in the sequence have been sent.

CREATE TABLE IF NOT EXISTS welcome_email_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_automation_id UUID NOT NULL REFERENCES user_automations(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  order_name TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  order_data JSONB,               -- snapshot: line_items, total_price, currency, store_name
  ordered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  email_1_sent_at TIMESTAMP WITH TIME ZONE,
  email_2_sent_at TIMESTAMP WITH TIME ZONE,
  email_3_sent_at TIMESTAMP WITH TIME ZONE,
  discount_code TEXT,             -- Shopify code used in email 3 (if include_discount = true)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS welcome_email_series_ua_order_idx
  ON welcome_email_series(user_automation_id, order_id);

CREATE INDEX IF NOT EXISTS welcome_email_series_user_automation_id_idx
  ON welcome_email_series(user_automation_id);

CREATE INDEX IF NOT EXISTS welcome_email_series_ordered_at_idx
  ON welcome_email_series(ordered_at);

-- Row Level Security
ALTER TABLE welcome_email_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own welcome email series" ON welcome_email_series;
CREATE POLICY "Users can view their own welcome email series"
  ON welcome_email_series FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_automations
      WHERE user_automations.id = welcome_email_series.user_automation_id
        AND user_automations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage welcome email series" ON welcome_email_series;
CREATE POLICY "System can manage welcome email series"
  ON welcome_email_series FOR ALL
  USING (true)
  WITH CHECK (true);
