-- =====================================================
-- FIX SIGNUP TRIGGER - Run this if signup is failing
-- =====================================================

-- 1. Drop and recreate the function with proper security
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, subscription_status, credits_remaining, credits_reset_date)
  VALUES (
    NEW.id,
    'free',
    10.0,
    TIMEZONE('utc', NOW()) + INTERVAL '1 month'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate the trigger
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- 3. Fix the RLS policy to allow trigger inserts
DROP POLICY IF EXISTS "System can insert profiles" ON user_profiles;
CREATE POLICY "System can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE id = user_id));

-- 4. Verify the trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'create_profile_on_signup';

-- 5. Test: Check if function exists
SELECT 
  routine_name, 
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'create_user_profile';

