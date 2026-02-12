-- =============================================================
-- BIDRAGSGUIDEN — Security Hardening
-- =============================================================
-- Run this in Supabase SQL Editor.
-- Fixes: bg_usage RLS, email signup policies, GDPR delete
-- =============================================================

-- 1. bg_usage: Enable RLS and deny ALL client access
--    This table is only written to by API routes (server-side).
--    No client should ever read or write directly.
ALTER TABLE bg_usage ENABLE ROW LEVEL SECURITY;

-- Deny all access for anon and authenticated users
-- (Service role key bypasses RLS, which is correct for server-side writes)
CREATE POLICY "deny_all_anon" ON bg_usage FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON bg_usage FOR ALL TO authenticated USING (false);

-- 2. bg_email_signups: Remove the SELECT policy
--    Users should be able to INSERT (sign up) but NOT read other signups.
DROP POLICY IF EXISTS "anon_email_signups_select" ON bg_email_signups;

-- 3. Update delete_user_data to also delete email signups
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Checklistor raderas automatiskt via CASCADE från saved_grants
  DELETE FROM bg_saved_grants WHERE user_id = target_user_id;
  DELETE FROM bg_user_searches WHERE user_id = target_user_id;
  DELETE FROM bg_usage WHERE user_id = target_user_id;

  -- Delete email signups matching the user's email
  DELETE FROM bg_email_signups WHERE email IN (
    SELECT email FROM bg_profiles WHERE id = target_user_id
  );

  -- Delete profile last (other tables may reference it)
  DELETE FROM bg_profiles WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
