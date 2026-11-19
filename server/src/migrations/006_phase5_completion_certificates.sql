-- Phase 5 reduced scope: project execution and completion certificates.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS completion_approved_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS completion_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_feedback TEXT;
CREATE INDEX IF NOT EXISTS idx_projects_completion_review
  ON projects(status, updated_at) WHERE status='submitted_for_review';

CREATE UNIQUE INDEX IF NOT EXISTS uq_certificates_project_member ON certificates(project_id,member_id);
