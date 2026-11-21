
-- Allow reports without GPS coordinates.
ALTER TABLE reports
ALTER COLUMN lat DROP NOT NULL,
ALTER COLUMN lng DROP NOT NULL;

-- Allow canonical problems without GPS coordinates.
ALTER TABLE problems
ALTER COLUMN lat DROP NOT NULL,
ALTER COLUMN lng DROP NOT NULL;
