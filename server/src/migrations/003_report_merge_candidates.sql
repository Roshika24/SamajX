-- Phase 3: preserve medium-confidence duplicate suggestions until the citizen decides.
CREATE TABLE report_merge_candidates (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0.65 AND confidence <= 0.85),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_report_merge_candidates_status ON report_merge_candidates(status, created_at);
