-- Reprice Low Stock Alerts from $42/mo to $19/mo
UPDATE automations SET price_monthly = 19.00 WHERE slug = 'low-stock-alerts';
