-- =============================================================
-- BIDRAGSGUIDEN PRO — AI ansokningsutkast
-- =============================================================
-- Kor detta i Supabase SQL Editor.
-- Laggar till kolumner for att lagra AI-genererade ansokningsutkast.
-- =============================================================

-- Lagg till draft_data kolumn for AI-genererade utkast per bidrag
ALTER TABLE bg_saved_grants
  ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT '{}';

-- Lagg till match_score for att visa relevanspoang
ALTER TABLE bg_saved_grants
  ADD COLUMN IF NOT EXISTS match_score INT;

-- Uppdatera UPDATE policy for att inkludera nya kolumner (redan covered av existing policy)
-- Inga nya policies behövs — bg_saved_grants har redan full CRUD RLS
