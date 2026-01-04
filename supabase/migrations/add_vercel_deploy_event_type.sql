-- =====================================================
-- ADD VERCEL_DEPLOY EVENT TYPE
-- Run this if you need to update existing database
-- =====================================================

-- Drop the old constraint
ALTER TABLE monitoring_events DROP CONSTRAINT IF EXISTS monitoring_events_event_type_check;

-- Add new constraint with vercel_deploy
ALTER TABLE monitoring_events ADD CONSTRAINT monitoring_events_event_type_check 
  CHECK (event_type IN ('signup', 'generation', 'upgrade', 'error', 'churn', 'github_export', 'railway_deploy', 'vercel_deploy'));

-- Verify the change
SELECT 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'monitoring_events_event_type_check';

