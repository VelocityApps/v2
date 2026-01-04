-- =====================================================
-- UPGRADE USER TO PRO
-- Run this in Supabase SQL Editor to upgrade your account
-- =====================================================

-- Option 1: Upgrade by email (replace 'your-email@example.com' with your actual email)
UPDATE user_profiles
SET 
  subscription_status = 'pro',
  credits_remaining = 500.0,
  credits_reset_date = TIMEZONE('utc', NOW()) + INTERVAL '1 month'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'petespicer@hotmail.co.uk'
);

-- Option 2: Upgrade by user_id (replace the UUID with your actual user_id)
-- You can find your user_id in Supabase Dashboard > Authentication > Users
-- UPDATE user_profiles
-- SET 
--   subscription_status = 'pro',
--   credits_remaining = 500.0,
--   credits_reset_date = TIMEZONE('utc', NOW()) + INTERVAL '1 month'
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- Verify the update worked
SELECT 
  u.email,
  up.subscription_status,
  up.credits_remaining,
  up.credits_reset_date
FROM user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE u.email = 'petespicer@hotmail.co.uk';

