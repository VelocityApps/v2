-- Add 'share' event type to monitoring_events
ALTER TABLE monitoring_events 
  DROP CONSTRAINT IF EXISTS monitoring_events_event_type_check;

ALTER TABLE monitoring_events
  ADD CONSTRAINT monitoring_events_event_type_check 
  CHECK (event_type IN ('signup', 'generation', 'upgrade', 'error', 'churn', 'github_export', 'railway_deploy', 'vercel_deploy', 'share'));

