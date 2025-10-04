-- Create table for student-reported issues/incidents
CREATE TABLE IF NOT EXISTS student_issues (
  issue_id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NULL REFERENCES students(student_id) ON DELETE SET NULL,
  user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_student_issues_created_at ON student_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_issues_status ON student_issues(status);
CREATE INDEX IF NOT EXISTS idx_student_issues_student ON student_issues(student_id);

-- Trigger to update updated_at on change
CREATE OR REPLACE FUNCTION set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_student_issues ON student_issues;
CREATE TRIGGER set_timestamp_student_issues
BEFORE UPDATE ON student_issues
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();
