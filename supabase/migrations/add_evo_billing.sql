-- Add Evo subscription columns to user_profiles.
-- Mirrors the existing description_writer_charge_id / has_description_writer pattern.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS has_evo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS evo_charge_id TEXT;

CREATE INDEX IF NOT EXISTS user_profiles_evo_charge_id_idx
  ON user_profiles(evo_charge_id)
  WHERE evo_charge_id IS NOT NULL;
