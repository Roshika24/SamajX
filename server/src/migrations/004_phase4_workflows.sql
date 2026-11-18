
-- Phase 4: classification, applications, mentor consent, cross-university review
-- Additive migration only. Existing application/project rows are preserved.

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS classified_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS mentor_invitation_status VARCHAR(20) NOT NULL DEFAULT 'not_sent'
    CHECK (mentor_invitation_status IN ('not_sent','pending','approved','declined','expired')),
  ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS mentor_invitations (
  id BIGSERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  mentor_name VARCHAR(255) NOT NULL,
  mentor_email VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  decision VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending','approved','declined','expired')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mentor_invites_expiry
  ON mentor_invitations(expires_at) WHERE decision = 'pending';

CREATE TABLE IF NOT EXISTS application_university_reviews (
  id BIGSERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  university_id INTEGER NOT NULL REFERENCES universities(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id, university_id)
);
CREATE INDEX IF NOT EXISTS idx_app_uni_reviews_university
  ON application_university_reviews(university_id, status);

-- A project can be created only once for an application and only one project
-- can claim a canonical problem. This is the final database-level duplicate guard.
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_application
  ON projects(application_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_problem
  ON projects(problem_id);

-- Fast lookup for active-project cap enforcement.
CREATE INDEX IF NOT EXISTS idx_projects_active_team
  ON projects(team_id) WHERE status = 'active';

-- Ensure legacy mentor_approved values cannot be treated as proof of consent.
-- Existing applications are not auto-approved; they must complete the invitation flow.
UPDATE applications
SET mentor_approved = FALSE,
    mentor_invitation_status = 'not_sent'
WHERE mentor_approved = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM mentor_invitations mi
    WHERE mi.application_id = applications.id AND mi.decision = 'approved'
  );
