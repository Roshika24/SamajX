-- Phase 4 routing refinement: platform-defined expertise requirements.
-- Additive only; existing reports, routes and university data are preserved.
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS required_skills TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_problems_required_skills
  ON problems USING GIN (required_skills);
