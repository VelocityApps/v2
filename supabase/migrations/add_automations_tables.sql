-- =====================================================
-- AUTOMATIONS MARKETPLACE TABLES
-- Adds tables for Shopify automation marketplace
-- =====================================================

-- =====================================================
-- 1. AUTOMATIONS TABLE
-- Catalog of all available automations
-- =====================================================
CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  long_description TEXT,
  category TEXT CHECK (category IN ('inventory', 'marketing', 'seo', 'analytics', 'automation')),
  price_monthly DECIMAL(10,2) NOT NULL,
  icon TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  config_schema JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  user_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for automations
CREATE INDEX IF NOT EXISTS automations_slug_idx ON automations(slug);
CREATE INDEX IF NOT EXISTS automations_category_idx ON automations(category);
CREATE INDEX IF NOT EXISTS automations_active_idx ON automations(active);

-- Enable Row Level Security for automations
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automations (public read, admin write)
DROP POLICY IF EXISTS "Public can view active automations" ON automations;
CREATE POLICY "Public can view active automations"
  ON automations FOR SELECT
  USING (active = true);

-- =====================================================
-- 2. USER_AUTOMATIONS TABLE
-- User's installed automations
-- =====================================================
CREATE TABLE IF NOT EXISTS user_automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  shopify_store_url TEXT NOT NULL,
  shopify_access_token_encrypted TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  UNIQUE(user_id, automation_id, shopify_store_url)
);

-- Indexes for user_automations
CREATE INDEX IF NOT EXISTS user_automations_user_id_idx ON user_automations(user_id);
CREATE INDEX IF NOT EXISTS user_automations_automation_id_idx ON user_automations(automation_id);
CREATE INDEX IF NOT EXISTS user_automations_status_idx ON user_automations(status);
CREATE INDEX IF NOT EXISTS user_automations_next_run_at_idx ON user_automations(next_run_at);

-- Enable Row Level Security for user_automations
ALTER TABLE user_automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_automations
DROP POLICY IF EXISTS "Users can view their own automations" ON user_automations;
CREATE POLICY "Users can view their own automations"
  ON user_automations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own automations" ON user_automations;
CREATE POLICY "Users can insert their own automations"
  ON user_automations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own automations" ON user_automations;
CREATE POLICY "Users can update their own automations"
  ON user_automations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own automations" ON user_automations;
CREATE POLICY "Users can delete their own automations"
  ON user_automations FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. AUTOMATION_LOGS TABLE
-- Execution logs for debugging
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_automation_id UUID NOT NULL REFERENCES user_automations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('success', 'error', 'warning', 'info')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for automation_logs
CREATE INDEX IF NOT EXISTS automation_logs_user_automation_id_idx ON automation_logs(user_automation_id);
CREATE INDEX IF NOT EXISTS automation_logs_event_type_idx ON automation_logs(event_type);
CREATE INDEX IF NOT EXISTS automation_logs_created_at_idx ON automation_logs(created_at DESC);

-- Enable Row Level Security for automation_logs
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_logs
DROP POLICY IF EXISTS "Users can view logs for their automations" ON automation_logs;
CREATE POLICY "Users can view logs for their automations"
  ON automation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_automations
      WHERE user_automations.id = automation_logs.user_automation_id
      AND user_automations.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. SHOPIFY_WEBHOOKS TABLE
-- Shopify webhook registrations
-- =====================================================
CREATE TABLE IF NOT EXISTS shopify_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_automation_id UUID NOT NULL REFERENCES user_automations(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  webhook_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  UNIQUE(user_automation_id, topic)
);

-- Indexes for shopify_webhooks
CREATE INDEX IF NOT EXISTS shopify_webhooks_user_automation_id_idx ON shopify_webhooks(user_automation_id);
CREATE INDEX IF NOT EXISTS shopify_webhooks_webhook_id_idx ON shopify_webhooks(webhook_id);

-- Enable Row Level Security for shopify_webhooks
ALTER TABLE shopify_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopify_webhooks
DROP POLICY IF EXISTS "Users can view webhooks for their automations" ON shopify_webhooks;
CREATE POLICY "Users can view webhooks for their automations"
  ON shopify_webhooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_automations
      WHERE user_automations.id = shopify_webhooks.user_automation_id
      AND user_automations.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. UPDATE TRIGGERS
-- =====================================================
-- Trigger to update updated_at for automations
DROP TRIGGER IF EXISTS update_automations_updated_at ON automations;
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for user_automations
DROP TRIGGER IF EXISTS update_user_automations_updated_at ON user_automations;
CREATE TRIGGER update_user_automations_updated_at
  BEFORE UPDATE ON user_automations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update automation user_count
CREATE OR REPLACE FUNCTION update_automation_user_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE automations
    SET user_count = user_count + 1
    WHERE id = NEW.automation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE automations
    SET user_count = GREATEST(0, user_count - 1)
    WHERE id = OLD.automation_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_automation_user_count_trigger ON user_automations;
CREATE TRIGGER update_automation_user_count_trigger
  AFTER INSERT OR DELETE ON user_automations
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_user_count();

-- =====================================================
-- 6. SEED INITIAL AUTOMATIONS
-- =====================================================
INSERT INTO automations (name, slug, description, long_description, category, price_monthly, icon, features, config_schema) VALUES
('Pinterest Stock Sync', 'pinterest-stock-sync', 'Auto-sync out-of-stock products to Pinterest boards', 'Automatically pin out-of-stock products to your Pinterest board with waitlist links. When products come back in stock, pins are updated automatically.', 'marketing', 19.00, '📌', 
 '["Auto-pin out-of-stock items", "Captures waitlist emails", "Updates when back in stock", "Customizable pin templates"]'::jsonb,
 '{"board_name": {"type": "text", "label": "Pinterest Board Name", "default": "Out of Stock", "required": true}, "pin_template": {"type": "textarea", "label": "Pin Description Template", "default": "{{product_title}} - Currently out of stock! Join our waitlist.", "required": false}}'::jsonb),

('Review Request Automator', 'review-request-automator', 'Auto-send review requests 7 days after delivery', 'Automatically send personalized review request emails to customers after their order is delivered. Increase review rates with AI-personalized subject lines.', 'marketing', 19.00, '⭐',
 '["Automated email sequences", "AI-personalized subject lines", "Track open & click rates", "Customizable timing"]'::jsonb,
 '{"days_after_delivery": {"type": "number", "label": "Days After Delivery", "default": 7, "required": true}, "email_template": {"type": "textarea", "label": "Email Template", "default": "Hi {{customer_name}}, we hope you love your purchase! Please leave a review.", "required": false}}'::jsonb),

('Low Stock Alerts', 'low-stock-alerts', 'Slack/Email alerts when inventory runs low', 'Get real-time notifications when your inventory drops below your threshold. Never run out of stock unexpectedly.', 'inventory', 29.00, '📊',
 '["Real-time inventory monitoring", "Slack or email notifications", "Per-product thresholds", "Daily digest option"]'::jsonb,
 '{"threshold": {"type": "number", "label": "Alert Threshold", "default": 10, "required": true}, "notification_method": {"type": "select", "label": "Notify Via", "options": ["email", "slack"], "default": "email", "required": true}}'::jsonb),

('Abandoned Cart Recovery', 'abandoned-cart-recovery', 'AI-powered email sequences for cart recovery', 'Automatically recover abandoned carts with a 3-email sequence. AI-personalized messages increase conversion rates.', 'marketing', 29.00, '💌',
 '["3-email sequence (1hr, 24hr, 72hr)", "AI-personalized messages", "Conversion tracking", "Customizable timing"]'::jsonb,
 '{"email_sequence": {"type": "json", "label": "Email Sequence Timing (hours)", "default": [1, 24, 72], "required": true}}'::jsonb),

('Best Sellers Auto-Collection', 'best-sellers-collection', 'Auto-create & update "Trending" collection', 'Automatically create and update a "Trending" or "Best Sellers" collection based on sales data. Keeps your store fresh with top-performing products.', 'automation', 19.00, '🔥',
 '["Weekly auto-updates", "Customizable criteria", "Configurable collection size", "Sales-based ranking"]'::jsonb,
 '{"collection_size": {"type": "number", "label": "Number of Products", "default": 20, "required": true}, "update_frequency": {"type": "select", "label": "Update Frequency", "options": ["daily", "weekly"], "default": "weekly", "required": true}}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

