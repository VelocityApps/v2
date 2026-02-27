-- =====================================================
-- ADD MONITORING EVENT TYPES
-- Adds support_ticket and automation_execution event types
-- =====================================================

-- Update monitoring_events to allow new event types
ALTER TABLE monitoring_events 
  DROP CONSTRAINT IF EXISTS monitoring_events_event_type_check;

ALTER TABLE monitoring_events
  ADD CONSTRAINT monitoring_events_event_type_check 
  CHECK (event_type IN (
    'signup',
    'generation',
    'upgrade',
    'error',
    'churn',
    'github_export',
    'railway_deploy',
    'vercel_deploy',
    'share',
    'support_ticket',
    'automation_execution',
    'automation_conversion'
  ));

