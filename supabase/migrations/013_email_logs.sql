-- Migration: 013_email_logs.sql
-- Purpose: Email sending logs for idempotence and debugging
-- Phase: 10 - Outbound Engagement Channels

-- ============================================================================
-- EMAIL LOGS TABLE
-- ============================================================================
-- Tracks all outbound emails for:
-- 1. Idempotence (prevent duplicate reminder emails)
-- 2. Debugging failed sends
-- 3. Analytics on email engagement

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Who received it
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  
  -- What was sent
  email_type TEXT NOT NULL, -- 'checkin_reminder', 'status_update', 'support', etc.
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL, -- For reminder emails
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'bounced', 'complained'
  message_id TEXT, -- AWS SES MessageId for tracking
  error_code TEXT, -- Short error code if failed
  
  -- Idempotence key for reminder emails
  -- Format: "reminder:{user_id}:{session_id}:{date}" or "reminder:{user_id}:{date}"
  idempotency_key TEXT UNIQUE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by user and type
CREATE INDEX idx_email_logs_user_type ON email_logs(user_id, email_type);

-- Fast lookup by org
CREATE INDEX idx_email_logs_org ON email_logs(org_id);

-- Fast idempotency check
CREATE INDEX idx_email_logs_idempotency ON email_logs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Find recent sends for a session
CREATE INDEX idx_email_logs_session ON email_logs(session_id) WHERE session_id IS NOT NULL;

-- Find failed sends for retry/monitoring
CREATE INDEX idx_email_logs_status ON email_logs(status) WHERE status = 'failed';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/update email logs (server-side only)
-- No user-facing access to email logs
CREATE POLICY "Service role full access to email_logs"
  ON email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view their org's email logs (read-only)
CREATE POLICY "Org admins can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE email_logs IS 'Tracks all outbound emails for idempotence and debugging';
COMMENT ON COLUMN email_logs.idempotency_key IS 'Unique key to prevent duplicate emails. Format varies by email type.';
COMMENT ON COLUMN email_logs.message_id IS 'AWS SES MessageId for tracking delivery status';
COMMENT ON COLUMN email_logs.error_code IS 'Short error code if send failed (not full error message to avoid PII)';
