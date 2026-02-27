-- Add email and Slack config to Low Stock Alerts so users can set where to receive alerts
UPDATE automations
SET config_schema = config_schema || '{
  "email_addresses": {
    "type": "textarea",
    "label": "Email addresses to alert (comma-separated)",
    "default": "",
    "required": false
  },
  "slack_webhook_url": {
    "type": "text",
    "label": "Slack Webhook URL (if using Slack)",
    "default": "",
    "required": false
  }
}'::jsonb
WHERE slug = 'low-stock-alerts';
