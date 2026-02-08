-- =============================================================
-- BIDRAGSGUIDEN — Användningsgränser (freemium-modell)
-- =============================================================
-- Kör detta i Supabase SQL Editor.
-- Spårar daglig användning per session/användare.
-- =============================================================

-- 1. Tabell för att spåra API-användning
CREATE TABLE IF NOT EXISTS bg_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  user_id UUID REFERENCES bg_profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bg_usage_session_date ON bg_usage(session_id, used_at);
CREATE INDEX IF NOT EXISTS idx_bg_usage_user_date ON bg_usage(user_id, used_at);
CREATE INDEX IF NOT EXISTS idx_bg_usage_ip_date ON bg_usage(ip_address, used_at);

-- Ingen RLS — denna tabell skrivs till från API-rutter (server-side)
-- Om du vill ha RLS kan du lägga till det senare

-- 2. Funktion: räkna dagens användning för en session
CREATE OR REPLACE FUNCTION get_daily_usage_by_session(p_session_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM bg_usage
  WHERE session_id = p_session_id
    AND used_at >= CURRENT_DATE;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Funktion: räkna dagens användning för en inloggad användare
CREATE OR REPLACE FUNCTION get_daily_usage_by_user(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM bg_usage
  WHERE user_id = p_user_id
    AND used_at >= CURRENT_DATE;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Funktion: räkna dagens användning per IP (fallback)
CREATE OR REPLACE FUNCTION get_daily_usage_by_ip(p_ip TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM bg_usage
  WHERE ip_address = p_ip
    AND used_at >= CURRENT_DATE;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Rensa gammal usage-data (äldre än 90 dagar) — kör som cron eller manuellt
CREATE OR REPLACE FUNCTION cleanup_old_usage()
RETURNS VOID AS $$
  DELETE FROM bg_usage WHERE used_at < now() - INTERVAL '90 days';
$$ LANGUAGE sql SECURITY DEFINER;
