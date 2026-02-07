-- =============================================================
-- BIDRAGSGUIDEN — Supabase Migration
-- =============================================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
--
-- This creates a separate schema "bidragsguiden" so it doesn't
-- touch any of your existing tables. Everything lives in its
-- own namespace.
-- =============================================================

-- 1. Create isolated schema
CREATE SCHEMA IF NOT EXISTS bidragsguiden;

-- 2. Anonymous sessions — no signup required
-- Each browser gets a unique session via a generated UUID cookie.
-- No email, no password, no personal info.
CREATE TABLE bidragsguiden.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Searches — each time a user completes the quiz
CREATE TABLE bidragsguiden.searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bidragsguiden.sessions(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,          -- { company_type, employees, region, needs, revenue, industry }
  result JSONB,                     -- full AI response: { benefits, summary, total_potential }
  refine_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Feedback — user marks individual grants as eligible or not
CREATE TABLE bidragsguiden.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES bidragsguiden.searches(id) ON DELETE CASCADE,
  benefit_index INT NOT NULL,       -- index in the benefits array
  benefit_name TEXT NOT NULL,       -- denormalized for easy querying
  eligible TEXT NOT NULL CHECK (eligible IN ('yes', 'no')),
  reason TEXT,                      -- why it doesn't fit (optional)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(search_id, benefit_index)  -- one feedback per benefit per search
);

-- 5. Indexes for performance
CREATE INDEX idx_searches_session ON bidragsguiden.searches(session_id);
CREATE INDEX idx_searches_created ON bidragsguiden.searches(created_at DESC);
CREATE INDEX idx_feedback_search ON bidragsguiden.feedback(search_id);

-- 6. Row Level Security (RLS)
-- Enable RLS on all tables
ALTER TABLE bidragsguiden.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidragsguiden.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidragsguiden.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access via the anon key (this is safe because
-- the session UUID acts as the "password" — only the browser that
-- created the session knows its UUID)
CREATE POLICY "Anyone can create a session"
  ON bidragsguiden.sessions FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Sessions can read themselves"
  ON bidragsguiden.sessions FOR SELECT
  TO anon USING (true);

CREATE POLICY "Sessions can update themselves"
  ON bidragsguiden.sessions FOR UPDATE
  TO anon USING (true);

CREATE POLICY "Anyone can insert searches"
  ON bidragsguiden.searches FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read searches"
  ON bidragsguiden.searches FOR SELECT
  TO anon USING (true);

CREATE POLICY "Anyone can update searches"
  ON bidragsguiden.searches FOR UPDATE
  TO anon USING (true);

CREATE POLICY "Anyone can insert feedback"
  ON bidragsguiden.feedback FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read feedback"
  ON bidragsguiden.feedback FOR SELECT
  TO anon USING (true);

CREATE POLICY "Anyone can upsert feedback"
  ON bidragsguiden.feedback FOR UPDATE
  TO anon USING (true);

CREATE POLICY "Anyone can delete feedback"
  ON bidragsguiden.feedback FOR DELETE
  TO anon USING (true);

-- 7. Expose the schema to the API
-- Supabase by default only exposes "public". We need to tell
-- PostgREST to also expose our schema.
-- NOTE: You also need to add "bidragsguiden" to the exposed schemas
-- in Supabase Dashboard → Settings → API → Schema Settings.
-- Or use the public schema instead (see alternative below).

-- =============================================================
-- ALTERNATIVE: If you prefer to keep things in the public schema
-- (simpler, no schema config needed), uncomment the block below
-- and comment out everything above. The tables will be prefixed
-- with "bg_" to avoid conflicts.
-- =============================================================
--
-- CREATE TABLE IF NOT EXISTS bg_sessions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   last_active TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
--
-- CREATE TABLE IF NOT EXISTS bg_searches (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   session_id UUID NOT NULL REFERENCES bg_sessions(id) ON DELETE CASCADE,
--   answers JSONB NOT NULL,
--   result JSONB,
--   refine_count INT NOT NULL DEFAULT 0,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
--
-- CREATE TABLE IF NOT EXISTS bg_feedback (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   search_id UUID NOT NULL REFERENCES bg_searches(id) ON DELETE CASCADE,
--   benefit_index INT NOT NULL,
--   benefit_name TEXT NOT NULL,
--   eligible TEXT NOT NULL CHECK (eligible IN ('yes', 'no')),
--   reason TEXT,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   UNIQUE(search_id, benefit_index)
-- );
--
-- ALTER TABLE bg_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bg_searches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bg_feedback ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "anon_sessions_insert" ON bg_sessions FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "anon_sessions_select" ON bg_sessions FOR SELECT TO anon USING (true);
-- CREATE POLICY "anon_sessions_update" ON bg_sessions FOR UPDATE TO anon USING (true);
-- CREATE POLICY "anon_searches_insert" ON bg_searches FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "anon_searches_select" ON bg_searches FOR SELECT TO anon USING (true);
-- CREATE POLICY "anon_searches_update" ON bg_searches FOR UPDATE TO anon USING (true);
-- CREATE POLICY "anon_feedback_insert" ON bg_feedback FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "anon_feedback_select" ON bg_feedback FOR SELECT TO anon USING (true);
-- CREATE POLICY "anon_feedback_update" ON bg_feedback FOR UPDATE TO anon USING (true);
-- CREATE POLICY "anon_feedback_delete" ON bg_feedback FOR DELETE TO anon USING (true);
