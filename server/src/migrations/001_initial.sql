-- SamajX — Full Database Schema
-- Migration: 001_initial.sql
-- Run via the migration runner script.

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- for gen_random_uuid()

-- =============================================================================
-- CUSTOM TYPES (ENUMS)
-- =============================================================================
CREATE TYPE user_role AS ENUM (
  'citizen', 'university_admin', 'leader', 'company', 'platform_admin'
);

CREATE TYPE leader_status AS ENUM (
  'pending', 'approved', 'rejected', 'suspended'
);

CREATE TYPE team_level AS ENUM (
  'beginner', 'intermediate', 'advanced'
);

CREATE TYPE evidence_type AS ENUM (
  'platform_project', 'project', 'faculty_lab', 'hackathon',
  'certification', 'internship', 'faculty_endorsement'
);

CREATE TYPE problem_status AS ENUM (
  'reported', 'open_for_applications', 'window_closed',
  'pending_approval', 'claimed', 'in_progress',
  'completed', 'reopened', 'unrouted',
  'resolved_duplicate', 'rejected_spam'
);

CREATE TYPE difficulty AS ENUM ('small', 'medium', 'hard');

CREATE TYPE solution_type AS ENUM (
  'survey', 'design_proposal', 'prototype_software',
  'research_report', 'awareness_drive', 'pilot'
);

CREATE TYPE application_status AS ENUM (
  'submitted', 'ranked', 'selected', 'not_selected',
  'withdrawn', 'approved', 'rejected'
);

CREATE TYPE project_status AS ENUM (
  'pending_approval', 'active', 'submitted_for_review',
  'completed', 'reopened'
);

CREATE TYPE sponsorship_type AS ENUM (
  'funding', 'mentorship', 'tools', 'internship'
);

CREATE TYPE sponsorship_status AS ENUM (
  'pledged', 'confirmed', 'fulfilled', 'cancelled'
);

CREATE TYPE report_status AS ENUM (
  'active', 'merged', 'split', 'deleted'
);

CREATE TYPE flag_status AS ENUM (
  'pending', 'reviewed', 'dismissed'
);

CREATE TYPE ai_status AS ENUM (
  'pending', 'done', 'failed'
);

-- =============================================================================
-- TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL,
  display_name  VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  avatar_url    TEXT,
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active, suspended, banned
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ---------------------------------------------------------------------------
-- domains (reference/config table — seeded, admin can add more)
-- ---------------------------------------------------------------------------
CREATE TABLE domains (
  id               SERIAL PRIMARY KEY,
  slug             VARCHAR(50) NOT NULL UNIQUE,
  name             VARCHAR(100) NOT NULL,
  description      TEXT,
  merge_radius_m   INTEGER NOT NULL DEFAULT 500,   -- default merge radius in meters
  routing_radius_km INTEGER NOT NULL DEFAULT 25,    -- default initial routing radius in km
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- universities
-- ---------------------------------------------------------------------------
CREATE TABLE universities (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL UNIQUE REFERENCES users(id),
  name                  VARCHAR(255) NOT NULL,
  address               TEXT,
  city                  VARCHAR(100),
  state                 VARCHAR(100),
  country               VARCHAR(100) NOT NULL DEFAULT 'India',
  lat                   DOUBLE PRECISION NOT NULL,
  lng                   DOUBLE PRECISION NOT NULL,
  website               VARCHAR(500),
  logo_url              TEXT,
  promo_code            VARCHAR(20) UNIQUE,
  promo_code_expires_at TIMESTAMPTZ,
  promo_code_join_limit INTEGER NOT NULL DEFAULT 50,
  promo_code_join_count INTEGER NOT NULL DEFAULT 0,
  promo_code_active     BOOLEAN NOT NULL DEFAULT TRUE,
  verified              BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at           TIMESTAMPTZ,
  verified_by           INTEGER REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_universities_verified ON universities(verified);
-- earthdistance index for geo queries:
CREATE INDEX idx_universities_geo ON universities USING gist(ll_to_earth(lat, lng));

-- ---------------------------------------------------------------------------
-- departments (links a university to the domains it covers)
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
  id             SERIAL PRIMARY KEY,
  university_id  INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  domain_id      INTEGER NOT NULL REFERENCES domains(id),
  name           VARCHAR(255) NOT NULL,          -- e.g. "Dept of Civil Engineering"
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(university_id, domain_id)
);

CREATE INDEX idx_departments_university ON departments(university_id);
CREATE INDEX idx_departments_domain ON departments(domain_id);

-- ---------------------------------------------------------------------------
-- leaders
-- ---------------------------------------------------------------------------
CREATE TABLE leaders (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id),
  university_id  INTEGER NOT NULL REFERENCES universities(id),
  status         leader_status NOT NULL DEFAULT 'pending',
  approved_at    TIMESTAMPTZ,
  approved_by    INTEGER REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaders_university ON leaders(university_id);
CREATE INDEX idx_leaders_status ON leaders(status);

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
CREATE TABLE teams (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  leader_id      INTEGER NOT NULL UNIQUE REFERENCES leaders(id),
  university_id  INTEGER NOT NULL REFERENCES universities(id),
  level          team_level NOT NULL DEFAULT 'beginner',
  level_score    NUMERIC(5,2) NOT NULL DEFAULT 0.00,   -- avg verified member score
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_university ON teams(university_id);
CREATE INDEX idx_teams_level ON teams(level);

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------
CREATE TABLE team_members (
  id                 SERIAL PRIMARY KEY,
  team_id            INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  university_id      INTEGER NOT NULL REFERENCES universities(id),
  name               VARCHAR(255) NOT NULL,
  email              VARCHAR(255),
  enrollment_number  VARCHAR(50) NOT NULL,
  branch             VARCHAR(100) NOT NULL,        -- e.g. "Computer Science"
  year               INTEGER NOT NULL,             -- 1, 2, 3, 4, 5
  speciality         VARCHAR(255),                 -- e.g. "Machine Learning"
  interests          TEXT,                         -- free-text or comma-separated
  is_leader          BOOLEAN NOT NULL DEFAULT FALSE,
  credential_score   NUMERIC(5,2) NOT NULL DEFAULT 0.00,  -- sum of verified evidence points
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(university_id, enrollment_number)         -- one person, one team per university
);

CREATE INDEX idx_team_members_team ON team_members(team_id);

-- ---------------------------------------------------------------------------
-- member_evidence
-- ---------------------------------------------------------------------------
CREATE TABLE member_evidence (
  id            SERIAL PRIMARY KEY,
  member_id     INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  type          evidence_type NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  link          TEXT,                              -- URL for project, cert, etc.
  faculty_name  VARCHAR(255),                      -- for faculty_lab / faculty_endorsement
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by   INTEGER REFERENCES users(id),
  verified_at   TIMESTAMPTZ,
  points        INTEGER NOT NULL DEFAULT 0,        -- set based on config when verified
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_member ON member_evidence(member_id);
CREATE INDEX idx_evidence_verified ON member_evidence(verified);

-- ---------------------------------------------------------------------------
-- problems (the merged/canonical entity)
-- ---------------------------------------------------------------------------
CREATE TABLE problems (
  id                      SERIAL PRIMARY KEY,
  title                   VARCHAR(500) NOT NULL,
  description             TEXT NOT NULL,
  domain_id               INTEGER REFERENCES domains(id),
  category                VARCHAR(100),              -- original category from first report
  difficulty              difficulty,                -- NULL until admin sets it
  difficulty_set_by       INTEGER REFERENCES users(id),
  solution_types          solution_type[] DEFAULT '{}', -- allowed solution types
  needs_authority         BOOLEAN NOT NULL DEFAULT FALSE,
  status                  problem_status NOT NULL DEFAULT 'reported',
  lat                     DOUBLE PRECISION NOT NULL,
  lng                     DOUBLE PRECISION NOT NULL,
  report_count            INTEGER NOT NULL DEFAULT 1,
  upvote_count            INTEGER NOT NULL DEFAULT 0,
  priority_score          INTEGER NOT NULL DEFAULT 2, -- report_count*2 + upvote_count
  window_closes_at        TIMESTAMPTZ,               -- application window deadline
  review_deadline         TIMESTAMPTZ,               -- review phase deadline (after window)
  recurrence_of           INTEGER REFERENCES problems(id),
  difficulty_recheck_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ai_status               ai_status,
  ai_suggested_domain_id  INTEGER REFERENCES domains(id),
  ai_suggested_difficulty difficulty,
  ai_difficulty_reason    TEXT,
  ai_summary              TEXT,
  embedding               JSONB,                     -- for later: vector as JSON array
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_problems_status ON problems(status);
CREATE INDEX idx_problems_domain ON problems(domain_id);
CREATE INDEX idx_problems_geo ON problems USING gist(ll_to_earth(lat, lng));
CREATE INDEX idx_problems_window ON problems(window_closes_at)
  WHERE status = 'open_for_applications';
CREATE INDEX idx_problems_review ON problems(review_deadline)
  WHERE status = 'window_closed';
CREATE INDEX idx_problems_category ON problems(category);
CREATE INDEX idx_problems_recurrence ON problems(recurrence_of);

-- ---------------------------------------------------------------------------
-- problem_routes (which universities a problem is routed to)
-- ---------------------------------------------------------------------------
CREATE TABLE problem_routes (
  id             SERIAL PRIMARY KEY,
  problem_id     INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  university_id  INTEGER NOT NULL REFERENCES universities(id),
  distance_km    NUMERIC(8,2),                    -- distance from problem to university
  routed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(problem_id, university_id)
);

CREATE INDEX idx_routes_problem ON problem_routes(problem_id);
CREATE INDEX idx_routes_university ON problem_routes(university_id);

-- ---------------------------------------------------------------------------
-- reports (individual citizen submissions)
-- ---------------------------------------------------------------------------
CREATE TABLE reports (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  problem_id    INTEGER REFERENCES problems(id),  -- NULL until merged/linked
  title         VARCHAR(500) NOT NULL,
  description   TEXT NOT NULL,
  category      VARCHAR(100) NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  photos        JSONB DEFAULT '[]',               -- array of file paths
  anonymous     BOOLEAN NOT NULL DEFAULT FALSE,
  status        report_status NOT NULL DEFAULT 'active',
  merge_confidence NUMERIC(4,3),                  -- similarity score when merged
  ai_status     ai_status,
  embedding     JSONB,                            -- for later
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_problem ON reports(problem_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_geo ON reports USING gist(ll_to_earth(lat, lng));

-- ---------------------------------------------------------------------------
-- upvotes
-- ---------------------------------------------------------------------------
CREATE TABLE upvotes (
  id          SERIAL PRIMARY KEY,
  problem_id  INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(problem_id, user_id)
);

CREATE INDEX idx_upvotes_problem ON upvotes(problem_id);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
CREATE TABLE comments (
  id          SERIAL PRIMARY KEY,
  problem_id  INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_problem ON comments(problem_id);

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
CREATE TABLE applications (
  id                 SERIAL PRIMARY KEY,
  problem_id         INTEGER NOT NULL REFERENCES problems(id),
  team_id            INTEGER NOT NULL REFERENCES teams(id),
  approach           TEXT NOT NULL,
  timeline           TEXT NOT NULL,
  skills             TEXT NOT NULL,
  budget_resources   TEXT,
  solution_type      solution_type NOT NULL,
  mentor_member_id   INTEGER REFERENCES team_members(id),
  mentor_is_faculty  BOOLEAN NOT NULL DEFAULT FALSE,
  mentor_name        VARCHAR(255),                -- faculty name if not a member
  mentor_approved    BOOLEAN NOT NULL DEFAULT FALSE,
  status             application_status NOT NULL DEFAULT 'submitted',
  rank               INTEGER,                     -- rank after scoring (1 = best)
  score              NUMERIC(5,4),                -- 0.0000 to 1.0000
  score_breakdown    JSONB,                       -- { level, domain, proposal, weights }
  feedback           TEXT,                        -- improvement feedback for the team
  proposal_score     NUMERIC(3,1),                -- admin-rated 1.0 to 5.0
  proposal_rated_by  INTEGER REFERENCES users(id),
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(problem_id, team_id)                    -- one application per team per problem
);

CREATE INDEX idx_applications_problem ON applications(problem_id);
CREATE INDEX idx_applications_team ON applications(team_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
  id                 SERIAL PRIMARY KEY,
  problem_id         INTEGER NOT NULL REFERENCES problems(id),
  team_id            INTEGER NOT NULL REFERENCES teams(id),
  application_id     INTEGER NOT NULL REFERENCES applications(id),
  status             project_status NOT NULL DEFAULT 'pending_approval',
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  final_report       TEXT,
  final_proof_urls   JSONB DEFAULT '[]',          -- array of file paths / links
  demo_link          TEXT,
  citizen_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,
  citizen_confirmed_at TIMESTAMPTZ,
  last_milestone_at  TIMESTAMPTZ,                 -- tracked for stale detection
  stale_deadline     TIMESTAMPTZ,                 -- last_milestone_at + stale_days
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_problem ON projects(problem_id);
CREATE INDEX idx_projects_team ON projects(team_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_stale ON projects(stale_deadline)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
CREATE TABLE milestones (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  proof_urls  JSONB DEFAULT '[]',                -- array of file paths / links
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_project ON milestones(project_id);

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
CREATE TABLE companies (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  website      VARCHAR(500),
  logo_url     TEXT,
  industry     VARCHAR(100),
  verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at  TIMESTAMPTZ,
  verified_by  INTEGER REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_verified ON companies(verified);

-- ---------------------------------------------------------------------------
-- sponsorships
-- ---------------------------------------------------------------------------
CREATE TABLE sponsorships (
  id           SERIAL PRIMARY KEY,
  project_id   INTEGER NOT NULL REFERENCES projects(id),
  company_id   INTEGER NOT NULL REFERENCES companies(id),
  type         sponsorship_type NOT NULL,
  description  TEXT,
  amount       NUMERIC(12,2),                    -- for funding type; NULL for others
  status       sponsorship_status NOT NULL DEFAULT 'pledged',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sponsorships_project ON sponsorships(project_id);
CREATE INDEX idx_sponsorships_company ON sponsorships(company_id);
CREATE INDEX idx_sponsorships_status ON sponsorships(status);

-- ---------------------------------------------------------------------------
-- certificates
-- ---------------------------------------------------------------------------
CREATE TABLE certificates (
  id                 SERIAL PRIMARY KEY,
  project_id         INTEGER NOT NULL REFERENCES projects(id),
  member_id          INTEGER NOT NULL REFERENCES team_members(id),
  verification_code  VARCHAR(64) NOT NULL UNIQUE,   -- 32-byte hex = 64 chars
  pdf_path           TEXT,                          -- local file path
  university_name    VARCHAR(255) NOT NULL,
  team_name          VARCHAR(255) NOT NULL,
  member_name        VARCHAR(255) NOT NULL,
  problem_title      VARCHAR(500) NOT NULL,
  solution_type      solution_type,
  sponsor_name       VARCHAR(255),                  -- optional co-signature
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certificates_project ON certificates(project_id);
CREATE INDEX idx_certificates_member ON certificates(member_id);
CREATE INDEX idx_certificates_code ON certificates(verification_code);

-- ---------------------------------------------------------------------------
-- notifications (in-app, for users with accounts)
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,               -- e.g. 'leader_approved', 'team_selected'
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  link        TEXT,                               -- in-app link, e.g. '/problems/42'
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read)
  WHERE read = FALSE;

-- ---------------------------------------------------------------------------
-- audit_log (every admin action)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,             -- e.g. 'approve_leader', 'set_difficulty'
  entity_type  VARCHAR(50) NOT NULL,              -- e.g. 'leader', 'problem', 'application'
  entity_id    INTEGER NOT NULL,
  details      JSONB DEFAULT '{}',                -- extra context (old value, new value, etc.)
  ip_address   VARCHAR(45),                       -- IPv4 or IPv6
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ---------------------------------------------------------------------------
-- flags (report/flag content for moderation)
-- ---------------------------------------------------------------------------
CREATE TABLE flags (
  id           SERIAL PRIMARY KEY,
  reporter_id  INTEGER NOT NULL REFERENCES users(id),
  entity_type  VARCHAR(50) NOT NULL,              -- 'report', 'comment', 'problem'
  entity_id    INTEGER NOT NULL,
  reason       TEXT NOT NULL,
  status       flag_status NOT NULL DEFAULT 'pending',
  reviewed_by  INTEGER REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_flags_status ON flags(status);
CREATE INDEX idx_flags_entity ON flags(entity_type, entity_id);

-- =============================================================================
-- SEED DATA: Domains
-- =============================================================================
INSERT INTO domains (slug, name, description, merge_radius_m, routing_radius_km) VALUES
  ('civil',             'Civil Engineering',        'Infrastructure, buildings, structural issues',          300, 25),
  ('environmental',     'Environmental',            'Pollution, ecology, green spaces',                      500, 50),
  ('water_sanitation',  'Water & Sanitation',       'Water supply, drainage, sewage',                       1000, 50),
  ('waste',             'Waste Management',         'Garbage collection, recycling, dumping',                500, 25),
  ('roads_transport',   'Roads & Transport',        'Potholes, traffic, public transport',                  300, 25),
  ('health',            'Health',                   'Public health, sanitation, disease prevention',         500, 50),
  ('agriculture',       'Agriculture',              'Farming, irrigation, soil health',                     1000, 100),
  ('education',         'Education',                'Schools, literacy, skill development',                  500, 50),
  ('energy',            'Energy',                   'Power supply, renewable energy, streetlights',          500, 50),
  ('software_it',       'Software / IT',            'Digital infrastructure, apps, data systems',            500, 100),
  ('other',             'Other',                    'Problems that do not fit standard categories',          500, 50);

-- =============================================================================
-- TRIGGER: auto-update updated_at on modification
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated      BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_universities_updated BEFORE UPDATE ON universities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leaders_updated     BEFORE UPDATE ON leaders      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_teams_updated       BEFORE UPDATE ON teams        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_members_updated     BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_problems_updated    BEFORE UPDATE ON problems     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reports_updated     BEFORE UPDATE ON reports      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated    BEFORE UPDATE ON projects     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sponsorships_updated BEFORE UPDATE ON sponsorships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_companies_updated   BEFORE UPDATE ON companies    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_comments_updated    BEFORE UPDATE ON comments     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
