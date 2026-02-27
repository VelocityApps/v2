-- =====================================================
-- ADD MORE AUTOMATIONS TO MARKETPLACE
-- Expands the marketplace with 15 additional automations
-- =====================================================

INSERT INTO automations (name, slug, description, long_description, category, price_monthly, icon, features, config_schema) VALUES

-- MARKETING AUTOMATIONS
('Welcome Email Series', 'welcome-email-series', 'Send automated welcome emails to new customers', 'Automatically send a 3-email welcome series to new customers after their first purchase. Build relationships and encourage repeat purchases with personalized content.', 'marketing', 19.00, '👋',
 '["3-email welcome sequence", "Personalized content", "Product recommendations", "Discount codes"]'::jsonb,
 '{"email_sequence": {"type": "json", "label": "Email Timing (days)", "default": [0, 3, 7], "required": true}, "include_discount": {"type": "checkbox", "label": "Include Discount Code", "default": true, "required": false}}'::jsonb),

('Birthday Discount Automator', 'birthday-discount-automator', 'Send birthday discounts to customers', 'Automatically send personalized birthday discount codes to customers. Increase customer loyalty and repeat purchases with special birthday offers.', 'marketing', 19.00, '🎂',
 '["Automatic birthday detection", "Personalized discount codes", "Customizable discount amount", "Email templates"]'::jsonb,
 '{"discount_percentage": {"type": "number", "label": "Discount Percentage", "default": 15, "required": true}, "days_before_birthday": {"type": "number", "label": "Send Days Before Birthday", "default": 3, "required": true}}'::jsonb),

('Post-Purchase Upsell', 'post-purchase-upsell', 'Automatically suggest related products after purchase', 'Show customers related products and accessories after they complete a purchase. Increase average order value with smart product recommendations.', 'marketing', 24.00, '🛍️',
 '["Smart product recommendations", "Related items suggestions", "Accessories matching", "Timing customization"]'::jsonb,
 '{"delay_hours": {"type": "number", "label": "Send After (hours)", "default": 24, "required": true}, "max_products": {"type": "number", "label": "Max Products to Show", "default": 4, "required": true}}'::jsonb),

('Win-Back Campaign', 'win-back-campaign', 'Re-engage inactive customers with special offers', 'Automatically identify and re-engage customers who haven''t purchased in a while. Win them back with personalized offers and product recommendations.', 'marketing', 29.00, '🎯',
 '["Inactive customer detection", "Personalized win-back offers", "Product recommendations", "Multi-email sequence"]'::jsonb,
 '{"inactive_days": {"type": "number", "label": "Days Since Last Purchase", "default": 90, "required": true}, "discount_percentage": {"type": "number", "label": "Win-Back Discount %", "default": 20, "required": true}}'::jsonb),

('Social Media Auto-Post', 'social-media-auto-post', 'Auto-post new products to social media', 'Automatically post new products to your social media accounts (Instagram, Facebook, Twitter) when they''re added to your store.', 'marketing', 24.00, '📱',
 '["Multi-platform posting", "Auto-generated captions", "Image optimization", "Hashtag suggestions"]'::jsonb,
 '{"platforms": {"type": "multiselect", "label": "Social Platforms", "options": ["instagram", "facebook", "twitter"], "default": ["instagram"], "required": true}, "include_hashtags": {"type": "checkbox", "label": "Auto-add Hashtags", "default": true, "required": false}}'::jsonb),

-- INVENTORY AUTOMATIONS
('Auto-Restock Alerts', 'auto-restock-alerts', 'Get notified when products need restocking', 'Automatically track inventory levels and send alerts when products need to be reordered from suppliers. Never run out of stock again.', 'inventory', 24.00, '📦',
 '["Supplier notifications", "Reorder point tracking", "Email/Slack alerts", "Purchase order suggestions"]'::jsonb,
 '{"reorder_point": {"type": "number", "label": "Reorder Point", "default": 20, "required": true}, "supplier_email": {"type": "email", "label": "Supplier Email", "default": "", "required": false}}'::jsonb),

('Inventory Sync Across Channels', 'inventory-sync-channels', 'Sync inventory across multiple sales channels', 'Automatically sync inventory levels across Shopify, Amazon, eBay, and other sales channels. Keep all channels in sync automatically.', 'inventory', 34.00, '🔄',
 '["Multi-channel sync", "Real-time updates", "Conflict resolution", "Channel mapping"]'::jsonb,
 '{"channels": {"type": "multiselect", "label": "Sales Channels", "options": ["amazon", "ebay", "etsy"], "default": [], "required": true}, "sync_direction": {"type": "select", "label": "Sync Direction", "options": ["shopify_to_channels", "channels_to_shopify", "bidirectional"], "default": "shopify_to_channels", "required": true}}'::jsonb),

('Bulk Price Updates', 'bulk-price-updates', 'Automatically update prices based on rules', 'Set up rules to automatically update product prices based on cost changes, competitor pricing, or seasonal adjustments.', 'inventory', 29.00, '💰',
 '["Rule-based pricing", "Competitor monitoring", "Cost-based pricing", "Scheduled updates"]'::jsonb,
 '{"pricing_rule": {"type": "select", "label": "Pricing Rule", "options": ["cost_plus_margin", "competitor_match", "seasonal_adjustment"], "default": "cost_plus_margin", "required": true}, "margin_percentage": {"type": "number", "label": "Margin %", "default": 30, "required": false}}'::jsonb),

-- SEO AUTOMATIONS
('Auto SEO Optimization', 'auto-seo-optimization', 'Automatically optimize product SEO', 'Automatically generate and optimize SEO titles, descriptions, and meta tags for all products. Improve search rankings without manual work.', 'seo', 24.00, '🔍',
 '["Auto-generated meta tags", "Keyword optimization", "Image alt text", "Schema markup"]'::jsonb,
 '{"optimize_titles": {"type": "checkbox", "label": "Optimize Titles", "default": true, "required": false}, "optimize_descriptions": {"type": "checkbox", "label": "Optimize Descriptions", "default": true, "required": false}}'::jsonb),

('Google Shopping Feed Sync', 'google-shopping-feed-sync', 'Auto-sync products to Google Shopping', 'Automatically sync your product catalog to Google Shopping. Keep your feed updated in real-time as products change.', 'seo', 29.00, '🛒',
 '["Real-time feed updates", "Product data mapping", "Image optimization", "Compliance checking"]'::jsonb,
 '{"update_frequency": {"type": "select", "label": "Update Frequency", "options": ["realtime", "hourly", "daily"], "default": "hourly", "required": true}, "include_variants": {"type": "checkbox", "label": "Include Variants", "default": true, "required": false}}'::jsonb),

('Sitemap Auto-Update', 'sitemap-auto-update', 'Automatically update XML sitemap', 'Automatically regenerate and submit your XML sitemap to search engines whenever products are added or updated.', 'seo', 19.00, '🗺️',
 '["Auto-regeneration", "Search engine submission", "Priority settings", "Change frequency"]'::jsonb,
 '{"update_frequency": {"type": "select", "label": "Update Frequency", "options": ["realtime", "daily"], "default": "realtime", "required": true}, "submit_to_google": {"type": "checkbox", "label": "Submit to Google", "default": true, "required": false}}'::jsonb),

-- ANALYTICS AUTOMATIONS
('Sales Report Automator', 'sales-report-automator', 'Automated daily/weekly sales reports', 'Get automated sales reports delivered to your email or Slack. Track revenue, top products, and key metrics without logging in.', 'analytics', 19.00, '📊',
 '["Daily/weekly reports", "Email or Slack delivery", "Revenue tracking", "Top products"]'::jsonb,
 '{"report_frequency": {"type": "select", "label": "Report Frequency", "options": ["daily", "weekly", "monthly"], "default": "weekly", "required": true}, "delivery_method": {"type": "select", "label": "Delivery Method", "options": ["email", "slack"], "default": "email", "required": true}}'::jsonb),

('Customer Lifetime Value Tracker', 'customer-ltv-tracker', 'Track and segment customers by lifetime value', 'Automatically calculate and track customer lifetime value. Segment customers and create targeted campaigns based on their value.', 'analytics', 24.00, '💎',
 '["LTV calculation", "Customer segmentation", "High-value alerts", "Retention tracking"]'::jsonb,
 '{"calculation_method": {"type": "select", "label": "Calculation Method", "options": ["simple", "rfm"], "default": "simple", "required": true}, "segment_threshold": {"type": "number", "label": "High-Value Threshold (£)", "default": 500, "required": true}}'::jsonb),

('Competitor Price Monitoring', 'competitor-price-monitoring', 'Monitor competitor prices automatically', 'Automatically monitor competitor prices and get alerts when they change. Stay competitive with real-time price intelligence.', 'analytics', 34.00, '👁️',
 '["Competitor tracking", "Price change alerts", "Price comparison", "Market analysis"]'::jsonb,
 '{"competitor_urls": {"type": "textarea", "label": "Competitor URLs (one per line)", "default": "", "required": true}, "check_frequency": {"type": "select", "label": "Check Frequency", "options": ["daily", "weekly"], "default": "daily", "required": true}}'::jsonb),

-- AUTOMATION CATEGORY
('Auto-Tag Products', 'auto-tag-products', 'Automatically tag products based on rules', 'Automatically apply tags to products based on rules like price, category, vendor, or inventory level. Organize your catalog effortlessly.', 'automation', 19.00, '🏷️',
 '["Rule-based tagging", "Bulk tagging", "Auto-updates", "Tag management"]'::jsonb,
 '{"tag_rules": {"type": "json", "label": "Tag Rules", "default": [{"condition": "price < 50", "tags": ["budget"]}], "required": true}}'::jsonb),

('Order Status Auto-Updates', 'order-status-auto-updates', 'Automatically update order statuses', 'Automatically update order statuses based on shipping events, delivery confirmations, or time-based rules. Keep customers informed automatically.', 'automation', 24.00, '📦',
 '["Shipping integration", "Status automation", "Customer notifications", "Custom rules"]'::jsonb,
 '{"auto_fulfill": {"type": "checkbox", "label": "Auto-Fulfill Orders", "default": false, "required": false}, "notify_customers": {"type": "checkbox", "label": "Notify Customers", "default": true, "required": false}}'::jsonb),

('Product Image Optimizer', 'product-image-optimizer', 'Automatically optimize product images', 'Automatically compress, resize, and optimize product images. Improve page load speed and SEO without manual work.', 'automation', 19.00, '🖼️',
 '["Auto-compression", "Format conversion", "Alt text generation", "CDN optimization"]'::jsonb,
 '{"max_file_size": {"type": "number", "label": "Max File Size (KB)", "default": 200, "required": true}, "format": {"type": "select", "label": "Output Format", "options": ["webp", "jpg", "png"], "default": "webp", "required": true}}'::jsonb),

('Customer Segmentation', 'customer-segmentation', 'Automatically segment customers', 'Automatically segment customers based on purchase behavior, demographics, or engagement. Create targeted campaigns for each segment.', 'automation', 29.00, '👥',
 '["Behavioral segmentation", "Demographic segmentation", "RFM analysis", "Dynamic segments"]'::jsonb,
 '{"segmentation_rules": {"type": "json", "label": "Segmentation Rules", "default": [{"name": "VIP", "condition": "ltv > 1000"}], "required": true}, "auto_update": {"type": "checkbox", "label": "Auto-Update Segments", "default": true, "required": false}}'::jsonb)

ON CONFLICT (slug) DO NOTHING;

-- Update the count in the description
-- The marketplace now has 20 automations total (5 original + 15 new)

