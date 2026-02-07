-- =============================================================
-- BIDRAGSGUIDEN — Supabase Setup (Public Schema)
-- =============================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Uses bg_ prefix so your tables don't conflict with anything
-- else in the same project.
-- =============================================================

-- Sessions: anonymous browser sessions
CREATE TABLE IF NOT EXISTS bg_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Searches: each completed quiz + AI results
CREATE TABLE IF NOT EXISTS bg_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bg_sessions(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  result JSONB,
  refine_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback: user marks grants as eligible or not
CREATE TABLE IF NOT EXISTS bg_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES bg_searches(id) ON DELETE CASCADE,
  benefit_index INT NOT NULL,
  benefit_name TEXT NOT NULL,
  eligible TEXT NOT NULL CHECK (eligible IN ('yes', 'no')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(search_id, benefit_index)
);

-- Email signups: users who want reminders / notifications
CREATE TABLE IF NOT EXISTS bg_email_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bg_sessions(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bg_searches_session ON bg_searches(session_id);
CREATE INDEX IF NOT EXISTS idx_bg_searches_created ON bg_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bg_feedback_search ON bg_feedback(search_id);
CREATE INDEX IF NOT EXISTS idx_bg_email_signups_email ON bg_email_signups(email);

-- Row Level Security
ALTER TABLE bg_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_email_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies (anonymous access — session UUID is the auth)
CREATE POLICY "anon_sessions_insert" ON bg_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_sessions_select" ON bg_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_sessions_update" ON bg_sessions FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_searches_insert" ON bg_searches FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_searches_select" ON bg_searches FOR SELECT TO anon USING (true);
CREATE POLICY "anon_searches_update" ON bg_searches FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_feedback_insert" ON bg_feedback FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_feedback_select" ON bg_feedback FOR SELECT TO anon USING (true);
CREATE POLICY "anon_feedback_update" ON bg_feedback FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_feedback_delete" ON bg_feedback FOR DELETE TO anon USING (true);

CREATE POLICY "anon_email_signups_insert" ON bg_email_signups FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_email_signups_select" ON bg_email_signups FOR SELECT TO anon USING (true);
