-- =====================================================
-- SCHEDULED TASKS TABLES
-- For storing scheduled automation tasks (review requests, abandoned carts, etc.)
-- =====================================================

-- Scheduled Review Requests
CREATE TABLE IF NOT EXISTS scheduled_review_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_automation_id UUID NOT NULL REFERENCES user_automations(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  order_name TEXT,
  customer_email TEXT NOT NULL,
  product_ids TEXT[],
  send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS scheduled_review_requests_user_automation_id_idx ON scheduled_review_requests(user_automation_id);
CREATE INDEX IF NOT EXISTS scheduled_review_requests_status_idx ON scheduled_review_requests(status);
CREATE INDEX IF NOT EXISTS scheduled_review_requests_send_at_idx ON scheduled_review_requests(send_at);

-- Abandoned Carts
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_automation_id UUID NOT NULL REFERENCES user_automations(id) ON DELETE CASCADE,
  checkout_id TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  cart_data JSONB, -- Store cart items, totals, etc.
  abandoned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'abandoned' CHECK (status IN ('abandoned', 'recovered', 'expired')),
  recovered_at TIMESTAMP WITH TIME ZONE,
  email_1_sent_at TIMESTAMP WITH TIME ZONE,
  email_2_sent_at TIMESTAMP WITH TIME ZONE,
  email_3_sent_at TIMESTAMP WITH TIME ZONE,
  discount_code_2 TEXT,
  discount_code_3 TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS abandoned_carts_user_automation_id_idx ON abandoned_carts(user_automation_id);
CREATE INDEX IF NOT EXISTS abandoned_carts_status_idx ON abandoned_carts(status);
CREATE INDEX IF NOT EXISTS abandoned_carts_checkout_id_idx ON abandoned_carts(checkout_id);
CREATE INDEX IF NOT EXISTS abandoned_carts_abandoned_at_idx ON abandoned_carts(abandoned_at);

-- Enable Row Level Security
ALTER TABLE scheduled_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own scheduled review requests" ON scheduled_review_requests;
CREATE POLICY "Users can view their own scheduled review requests"
  ON scheduled_review_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_automations
      WHERE user_automations.id = scheduled_review_requests.user_automation_id
      AND user_automations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage scheduled review requests" ON scheduled_review_requests;
CREATE POLICY "System can manage scheduled review requests"
  ON scheduled_review_requests FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own abandoned carts" ON abandoned_carts;
CREATE POLICY "Users can view their own abandoned carts"
  ON abandoned_carts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_automations
      WHERE user_automations.id = abandoned_carts.user_automation_id
      AND user_automations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage abandoned carts" ON abandoned_carts;
CREATE POLICY "System can manage abandoned carts"
  ON abandoned_carts FOR ALL
  USING (true)
  WITH CHECK (true);
