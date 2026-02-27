-- Add Pinterest Access Token to Pinterest Stock Sync config schema
-- Users can set their token in the automation config instead of .env
UPDATE automations
SET config_schema = config_schema || '{
  "pinterest_access_token": {
    "type": "password",
    "label": "Pinterest Access Token",
    "required": false
  }
}'::jsonb
WHERE slug = 'pinterest-stock-sync';
