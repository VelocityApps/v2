-- Canonical user_automations status constraint.
-- Replaces all prior versions to include every valid status value:
--   active           — subscription confirmed and running
--   paused           — subscription exists but automation is paused
--   trial            — within 7-day free trial period
--   requires_payment — non-trial install awaiting Stripe checkout completion
--   cancelled        — subscription voluntarily cancelled (kept for billing history)
--   error            — automation encountered a fatal error
--   uninstalled      — soft-deleted; row kept to prevent trial re-use

ALTER TABLE user_automations DROP CONSTRAINT IF EXISTS user_automations_status_check;
ALTER TABLE user_automations ADD CONSTRAINT user_automations_status_check
  CHECK (status IN ('active', 'paused', 'trial', 'requires_payment', 'cancelled', 'error', 'uninstalled'));
