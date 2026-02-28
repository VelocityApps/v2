-- Fix Welcome Email Series config_schema: ensure plain ASCII labels and supported types (checkbox now supported in ConfigForm)
UPDATE automations
SET config_schema = jsonb_build_object(
  'email_sequence', jsonb_build_object(
    'type', 'json',
    'label', 'Email Timing (days)',
    'default', '[0, 3, 7]'::jsonb,
    'required', true
  ),
  'include_discount', jsonb_build_object(
    'type', 'checkbox',
    'label', 'Include Discount Code',
    'default', true,
    'required', false
  )
)
WHERE slug = 'welcome-email-series';
