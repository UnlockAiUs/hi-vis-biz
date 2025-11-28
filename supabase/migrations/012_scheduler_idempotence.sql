-- Migration: 012_scheduler_idempotence.sql
-- Description: Add database-level uniqueness constraint for scheduler idempotence
-- Fixes: BUG-004 - Prevents duplicate sessions when scheduler runs multiple times
-- Created: 2025-11-27

-- Add a scheduled_date column to store just the date portion
-- This is cleaner than using expression indexes with timezone-dependent casts
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Populate existing rows (using UTC timezone for consistency)
UPDATE sessions 
SET scheduled_date = (scheduled_for AT TIME ZONE 'UTC')::date
WHERE scheduled_date IS NULL;

-- Create a trigger function to auto-populate scheduled_date on insert/update
CREATE OR REPLACE FUNCTION set_session_scheduled_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.scheduled_date := (NEW.scheduled_for AT TIME ZONE 'UTC')::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for insert and update
DROP TRIGGER IF EXISTS trigger_set_session_scheduled_date ON sessions;
CREATE TRIGGER trigger_set_session_scheduled_date
  BEFORE INSERT OR UPDATE OF scheduled_for ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_session_scheduled_date();

-- Now create the unique index on the date column (no expression needed)
-- This ensures only one pending session per user per agent per calendar day
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_user_agent_date_unique 
ON sessions (user_id, agent_code, scheduled_date)
WHERE completed_at IS NULL;

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_sessions_user_agent_date_unique IS 
'Ensures idempotent session creation - only one pending session per user per agent per calendar day. Completed sessions are excluded to allow historical data.';

-- Also add an index for faster pending session lookups used by the scheduler
CREATE INDEX IF NOT EXISTS idx_sessions_pending_lookup
ON sessions (user_id, agent_code, scheduled_for)
WHERE completed_at IS NULL AND started_at IS NULL;

COMMENT ON INDEX idx_sessions_pending_lookup IS 
'Optimizes scheduler queries for finding pending (not started, not completed) sessions.';

-- Add comment on the new column
COMMENT ON COLUMN sessions.scheduled_date IS 
'Date portion of scheduled_for (UTC), auto-populated by trigger. Used for idempotence constraint.';
