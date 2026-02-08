-- =============================================================
-- BIDRAGSGUIDEN — Användarkonton, sparade bidrag & checklistor
-- =============================================================
-- Kör detta i Supabase SQL Editor.
-- Kräver att Supabase Auth är aktiverat (Authentication → Providers → Google).
-- =============================================================

-- 1. Användarprofiler (kopplade till Supabase Auth)
CREATE TABLE IF NOT EXISTS bg_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  gdpr_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bg_profiles ENABLE ROW LEVEL SECURITY;

-- Användare kan bara se och ändra sin egen profil
CREATE POLICY "users_read_own_profile" ON bg_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON bg_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own_profile" ON bg_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Sparade bidrag (användarens "samling")
CREATE TABLE IF NOT EXISTS bg_saved_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES bg_profiles(id) ON DELETE CASCADE,
  grant_name TEXT NOT NULL,
  grant_agency TEXT,
  grant_data JSONB NOT NULL, -- hela bidragsobjektet från AI
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'applying', 'applied', 'granted', 'rejected', 'archived')),
  notes TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bg_saved_grants_user ON bg_saved_grants(user_id);
ALTER TABLE bg_saved_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_grants" ON bg_saved_grants
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_grants" ON bg_saved_grants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_grants" ON bg_saved_grants
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_grants" ON bg_saved_grants
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Checklistor per sparat bidrag
CREATE TABLE IF NOT EXISTS bg_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_grant_id UUID NOT NULL REFERENCES bg_saved_grants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES bg_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bg_checklist_grant ON bg_checklist_items(saved_grant_id);
ALTER TABLE bg_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_checklist" ON bg_checklist_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_checklist" ON bg_checklist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_checklist" ON bg_checklist_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_checklist" ON bg_checklist_items
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Funktion: skapa profil automatiskt vid registrering
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO bg_profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: kör funktionen när en ny användare skapas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Funktion: radera all användardata (GDPR)
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Checklistor raderas automatiskt via CASCADE från saved_grants
  DELETE FROM bg_saved_grants WHERE user_id = target_user_id;
  DELETE FROM bg_email_signups WHERE session_id IN (
    SELECT id FROM bg_sessions WHERE id IN (
      SELECT session_id FROM bg_searches WHERE session_id IN (
        SELECT id FROM bg_sessions
      )
    )
  );
  DELETE FROM bg_profiles WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
