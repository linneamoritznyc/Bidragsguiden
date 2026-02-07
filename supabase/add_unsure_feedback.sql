-- =============================================================
-- BIDRAGSGUIDEN — Add 'unsure' option to feedback eligible column
-- =============================================================
-- Run this if you already ran setup.sql before the 'unsure' option existed.
-- Safe to run once. Drops the old constraint and adds a new one.
-- =============================================================

ALTER TABLE bg_feedback DROP CONSTRAINT IF EXISTS bg_feedback_eligible_check;
ALTER TABLE bg_feedback ADD CONSTRAINT bg_feedback_eligible_check CHECK (eligible IN ('yes', 'no', 'unsure'));
