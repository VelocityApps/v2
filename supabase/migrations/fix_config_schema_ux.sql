-- Fix config_schema UX: replace raw JSON arrays with number-list type,
-- add descriptions and placeholders for all complex fields.

-- Abandoned Cart Recovery: hours-based number list
UPDATE automations
SET config_schema = '{
  "email_sequence": {
    "type": "number-list",
    "label": "Send emails after (hours)",
    "description": "How many hours after cart abandonment to send each recovery email. Enter as comma-separated numbers.",
    "placeholder": "1, 24, 72",
    "default": [1, 24, 72],
    "required": true
  }
}'::jsonb
WHERE slug = 'abandoned-cart-recovery';

-- Welcome Email Series: days-based number list + configurable discount
UPDATE automations
SET config_schema = '{
  "email_sequence": {
    "type": "number-list",
    "label": "Send emails on days",
    "description": "Days after first purchase to send each welcome email. Enter as comma-separated numbers.",
    "placeholder": "0, 3, 7",
    "default": [0, 3, 7],
    "required": true
  },
  "include_discount": {
    "type": "checkbox",
    "label": "Include a discount code in the final email",
    "default": true,
    "required": false
  },
  "discount_percent": {
    "type": "number",
    "label": "Discount amount (%)",
    "description": "Percentage off the customer gets in the final email (e.g. 10 = 10% off).",
    "placeholder": "10",
    "default": 10,
    "required": false
  }
}'::jsonb
WHERE slug = 'welcome-email-series';

-- Auto-Tag Products: complex JSON with description and placeholder
UPDATE automations
SET config_schema = '{
  "tag_rules": {
    "type": "json",
    "label": "Tag Rules",
    "description": "Rules that automatically add tags to your products. Each rule has a condition and the tags to apply.",
    "placeholder": "[\n  {\"condition\": \"price < 50\", \"tags\": [\"budget\"]},\n  {\"condition\": \"price > 100\", \"tags\": [\"premium\"]}\n]",
    "default": [{"condition": "price < 50", "tags": ["budget"]}],
    "required": true
  }
}'::jsonb
WHERE slug = 'auto-tag-products';

-- Customer Segmentation: complex JSON with description and placeholder
UPDATE automations
SET config_schema = '{
  "segmentation_rules": {
    "type": "json",
    "label": "Segmentation Rules",
    "description": "Rules that group your customers into segments based on their lifetime value (ltv) or order count.",
    "placeholder": "[\n  {\"name\": \"VIP\", \"condition\": \"ltv > 1000\"},\n  {\"name\": \"Regular\", \"condition\": \"ltv > 100\"}\n]",
    "default": [{"name": "VIP", "condition": "ltv > 1000"}],
    "required": true
  },
  "auto_update": {
    "type": "checkbox",
    "label": "Automatically update segments daily",
    "default": true,
    "required": false
  }
}'::jsonb
WHERE slug = 'customer-segmentation';
