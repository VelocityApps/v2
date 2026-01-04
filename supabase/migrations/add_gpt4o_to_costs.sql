-- =====================================================
-- ADD GPT-4o TO COSTS TABLE
-- Run this if you need to update existing database
-- =====================================================

-- Drop the old constraint
ALTER TABLE costs DROP CONSTRAINT IF EXISTS costs_model_used_check;

-- Add new constraint with gpt-4o
ALTER TABLE costs ADD CONSTRAINT costs_model_used_check 
  CHECK (model_used IN ('haiku', 'sonnet', 'opus', 'gpt-4o'));

-- Verify the change
SELECT 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'costs_model_used_check';

