-- Phase 2: retain the leader's real academic identity before a team exists.
ALTER TABLE leaders
  ADD COLUMN IF NOT EXISTS enrollment_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(100),
  ADD COLUMN IF NOT EXISTS year INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaders_university_enrollment
  ON leaders (university_id, enrollment_number)
  WHERE enrollment_number IS NOT NULL;
