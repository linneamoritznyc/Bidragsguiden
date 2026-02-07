-- =============================================================
-- BIDRAGSGUIDEN — Add email signups table
-- =============================================================
-- Run this if you already ran setup.sql before this table existed.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- =============================================================

CREATE TABLE IF NOT EXISTS bg_email_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bg_sessions(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bg_email_signups_email ON bg_email_signups(email);

ALTER TABLE bg_email_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_email_signups_insert" ON bg_email_signups FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_email_signups_select" ON bg_email_signups FOR SELECT TO anon USING (true);
