-- Networking events table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS bg_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  organizer TEXT,
  event_date DATE,
  location TEXT,
  url TEXT,
  description TEXT,
  source TEXT,
  event_type TEXT DEFAULT 'networking',
  added_to_plan BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE bg_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON bg_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON bg_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON bg_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON bg_events FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bg_events_user_id ON bg_events(user_id);
CREATE INDEX IF NOT EXISTS idx_bg_events_date ON bg_events(event_date);
