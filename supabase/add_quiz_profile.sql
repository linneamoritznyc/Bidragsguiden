-- =============================================================
-- BIDRAGSGUIDEN — Spara quiz-svar i användarprofil
-- =============================================================
-- Kör detta i Supabase SQL Editor.
-- =============================================================

-- Lägg till quiz_answers kolumn i bg_profiles
ALTER TABLE bg_profiles
  ADD COLUMN IF NOT EXISTS quiz_answers JSONB;

-- Lägg till senaste sökningen i bg_profiles
ALTER TABLE bg_profiles
  ADD COLUMN IF NOT EXISTS last_search_at TIMESTAMPTZ;

-- Skapa tabell för att koppla sökningar till inloggade användare
CREATE TABLE IF NOT EXISTS bg_user_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES bg_profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  result JSONB,
  kommun TEXT,
  refine_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bg_user_searches_user ON bg_user_searches(user_id);
ALTER TABLE bg_user_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_searches" ON bg_user_searches
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_searches" ON bg_user_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_searches" ON bg_user_searches
  FOR DELETE USING (auth.uid() = user_id);
