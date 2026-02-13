-- Add persistent user preferences/exclusions to bg_profiles
-- Run this in Supabase SQL Editor
--
-- This stores things like "Vi vill inte expandera utomlands"
-- so future searches never suggest export grants again.

ALTER TABLE bg_profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '[]'::jsonb;

-- Example data structure:
-- [
--   { "reason": "Vi vill inte expandera utomlands", "category": "export", "grant_name": "Exportintroduktionsstöd", "added_at": "2024-..." },
--   { "reason": "Vi har inga anställda", "category": "personal", "grant_name": "Lönebidrag", "added_at": "2024-..." }
-- ]
