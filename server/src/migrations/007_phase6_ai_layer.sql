-- Migration 007: Phase 6 AI Layer
-- Tables and columns for AI-assisted domain classification and difficulty prediction.

-- AI processing jobs table for reliable, asynchronous, retry-safe execution
CREATE TABLE IF NOT EXISTS ai_jobs (
  id           SERIAL PRIMARY KEY,
  problem_id   INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  job_type     VARCHAR(50) NOT NULL, -- 'domain_classification' or 'difficulty_prediction'
  status       VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'done', 'failed'
  attempts     INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT uq_ai_jobs_problem_type UNIQUE (problem_id, job_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_attempts
  ON ai_jobs(status, attempts) WHERE status IN ('pending', 'failed');

-- Add columns to problems table to track AI suggestions and human review decisions independently
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS ai_domain_explanation TEXT,
  ADD COLUMN IF NOT EXISTS ai_domain_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'suggested', 'accepted', 'overridden', 'failed'
  ADD COLUMN IF NOT EXISTS ai_domain_reviewed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS ai_domain_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_domain_review_action VARCHAR(20), -- 'accepted', 'overridden'
  ADD COLUMN IF NOT EXISTS ai_difficulty_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'suggested', 'accepted', 'overridden', 'failed'
  ADD COLUMN IF NOT EXISTS ai_difficulty_reviewed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS ai_difficulty_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_difficulty_review_action VARCHAR(20); -- 'accepted', 'overridden'

CREATE INDEX IF NOT EXISTS idx_problems_ai_domain_status ON problems(ai_domain_status);
CREATE INDEX IF NOT EXISTS idx_problems_ai_difficulty_status ON problems(ai_difficulty_status);
