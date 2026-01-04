-- =====================================================
-- TEMPLATE MARKETPLACE TABLES
-- Users can submit/sell templates (platform takes 20-30% cut)
-- =====================================================

-- Update community_templates to support marketplace
ALTER TABLE community_templates 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS code_files JSONB DEFAULT '[]'::jsonb, -- Store multiple files
  ADD COLUMN IF NOT EXISTS preview_image_url TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived'));

-- Template purchases table
CREATE TABLE IF NOT EXISTS template_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES community_templates(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_paid DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL, -- 20-30% cut
  seller_revenue DECIMAL(10, 2) NOT NULL, -- Price minus platform fee
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for template_purchases
CREATE INDEX IF NOT EXISTS template_purchases_template_id_idx ON template_purchases(template_id);
CREATE INDEX IF NOT EXISTS template_purchases_buyer_id_idx ON template_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS template_purchases_seller_id_idx ON template_purchases(seller_id);

-- Template reviews/ratings table
CREATE TABLE IF NOT EXISTS template_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES community_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(template_id, user_id) -- One review per user per template
);

-- Indexes for template_reviews
CREATE INDEX IF NOT EXISTS template_reviews_template_id_idx ON template_reviews(template_id);
CREATE INDEX IF NOT EXISTS template_reviews_user_id_idx ON template_reviews(user_id);

-- Seller revenue tracking
CREATE TABLE IF NOT EXISTS seller_revenue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES template_purchases(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for seller_revenue
CREATE INDEX IF NOT EXISTS seller_revenue_seller_id_idx ON seller_revenue(seller_id);
CREATE INDEX IF NOT EXISTS seller_revenue_status_idx ON seller_revenue(status);

-- Enable Row Level Security
ALTER TABLE template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_revenue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_purchases
DROP POLICY IF EXISTS "Users can view their own purchases" ON template_purchases;
CREATE POLICY "Users can view their own purchases"
  ON template_purchases FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "System can insert purchases" ON template_purchases;
CREATE POLICY "System can insert purchases"
  ON template_purchases FOR INSERT
  WITH CHECK (true); -- System inserts via API

-- RLS Policies for template_reviews
DROP POLICY IF EXISTS "Users can view all reviews" ON template_reviews;
CREATE POLICY "Users can view all reviews"
  ON template_reviews FOR SELECT
  USING (true); -- Public reviews

DROP POLICY IF EXISTS "Users can create their own reviews" ON template_reviews;
CREATE POLICY "Users can create their own reviews"
  ON template_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON template_reviews;
CREATE POLICY "Users can update their own reviews"
  ON template_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for seller_revenue
DROP POLICY IF EXISTS "Users can view their own revenue" ON seller_revenue;
CREATE POLICY "Users can view their own revenue"
  ON seller_revenue FOR SELECT
  USING (auth.uid() = seller_id);

-- Update community_templates RLS to allow public viewing
DROP POLICY IF EXISTS "Users can view public templates" ON community_templates;
CREATE POLICY "Users can view public templates"
  ON community_templates FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Trigger to update template rating when review is added/updated
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_templates
  SET 
    rating_average = (
      SELECT COALESCE(AVG(rating), 0)
      FROM template_reviews
      WHERE template_id = NEW.template_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM template_reviews
      WHERE template_id = NEW.template_id
    )
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_template_rating_trigger ON template_reviews;
CREATE TRIGGER update_template_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON template_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating();

-- Trigger to update download count
CREATE OR REPLACE FUNCTION increment_template_downloads()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_templates
  SET download_count = download_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_downloads_trigger ON template_purchases;
CREATE TRIGGER increment_downloads_trigger
  AFTER INSERT ON template_purchases
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_downloads();

