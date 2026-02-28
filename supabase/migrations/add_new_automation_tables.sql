-- Tables for new automations: Post-Purchase Upsell and Win-Back Campaign
-- (other new automations are stateless or use automation_logs for deduplication)

-- Post-Purchase Upsell: tracks scheduled upsell emails per order
CREATE TABLE IF NOT EXISTS post_purchase_upsells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_automation_id UUID NOT NULL REFERENCES user_automations(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  order_name TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  product_ids TEXT[],                -- product IDs from original order
  upsell_products JSONB,             -- snapshot of recommended products
  send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS post_purchase_upsells_ua_order_idx
  ON post_purchase_upsells(user_automation_id, order_id);
CREATE INDEX IF NOT EXISTS post_purchase_upsells_status_send_at_idx
  ON post_purchase_upsells(status, send_at);

ALTER TABLE post_purchase_upsells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own post purchase upsells" ON post_purchase_upsells;
CREATE POLICY "Users can view their own post purchase upsells"
  ON post_purchase_upsells FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_automations
      WHERE user_automations.id = post_purchase_upsells.user_automation_id
        AND user_automations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage post purchase upsells" ON post_purchase_upsells;
CREATE POLICY "System can manage post purchase upsells"
  ON post_purchase_upsells FOR ALL
  USING (true)
  WITH CHECK (true);

-- Win-Back Campaign: tracks sent emails per customer (cooldown enforcement)
CREATE TABLE IF NOT EXISTS win_back_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_automation_id UUID NOT NULL REFERENCES user_automations(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS win_back_emails_ua_email_idx
  ON win_back_emails(user_automation_id, customer_email);

ALTER TABLE win_back_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own win back emails" ON win_back_emails;
CREATE POLICY "Users can view their own win back emails"
  ON win_back_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_automations
      WHERE user_automations.id = win_back_emails.user_automation_id
        AND user_automations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage win back emails" ON win_back_emails;
CREATE POLICY "System can manage win back emails"
  ON win_back_emails FOR ALL
  USING (true)
  WITH CHECK (true);
