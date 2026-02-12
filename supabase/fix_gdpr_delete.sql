-- GDPR: Update delete_user_data to remove ALL user data
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Checklistor raderas automatiskt via CASCADE från saved_grants
  DELETE FROM bg_saved_grants WHERE user_id = target_user_id;
  DELETE FROM bg_user_searches WHERE user_id = target_user_id;
  DELETE FROM bg_usage WHERE user_id = target_user_id;
  DELETE FROM bg_profiles WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
