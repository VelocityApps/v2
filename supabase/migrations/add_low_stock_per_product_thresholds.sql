-- Add product_thresholds to Low Stock Alerts config schema
-- Format: { "PRODUCT_ID": threshold_number, ... }
-- e.g. { "123456789": 5, "987654321": 20 }
-- Falls back to global threshold if a product has no specific entry.

UPDATE automations
SET config_schema = '{
  "threshold": {
    "type": "number",
    "label": "Default alert threshold",
    "description": "Alert when any product stock falls to or below this level. Applied to all products unless overridden below.",
    "default": 10,
    "required": true
  },
  "product_thresholds": {
    "type": "json",
    "label": "Per-product thresholds (optional)",
    "description": "Override the default threshold for specific products. Use your Shopify product IDs as keys.",
    "default": {},
    "placeholder": "{\n  \"123456789\": 5,\n  \"987654321\": 20\n}"
  },
  "notification_method": {
    "type": "select",
    "label": "Notify via",
    "options": ["email", "slack", "both"],
    "default": "email",
    "required": true
  },
  "email_addresses": {
    "type": "textarea",
    "label": "Email addresses (comma-separated)",
    "default": "",
    "required": false
  },
  "slack_webhook_url": {
    "type": "text",
    "label": "Slack Webhook URL",
    "default": "",
    "required": false
  },
  "frequency": {
    "type": "select",
    "label": "Alert frequency",
    "options": ["immediate", "daily-digest"],
    "default": "immediate",
    "required": true
  }
}'::jsonb
WHERE slug = 'low-stock-alerts';
