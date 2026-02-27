-- Full config_schema for Low Stock Alerts: threshold, notification_method, email, Slack, frequency
UPDATE automations
SET config_schema = '{
  "threshold": {
    "type": "number",
    "label": "Alert threshold (alert when stock ≤ this)",
    "default": 10,
    "required": true
  },
  "notification_method": {
    "type": "select",
    "label": "Notify via",
    "options": ["email", "slack"],
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
    "label": "Slack Webhook URL (if using Slack)",
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
