-- ============================================================================
-- Migration: 011_ai_logs.sql
-- Purpose: Create AI call logging table for debugging and monitoring
-- ============================================================================

-- AI Logs table
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    agent_name TEXT NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_type TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    -- Don't log full prompts/responses for privacy, just metadata
    input_tokens INTEGER,
    output_tokens INTEGER,
    model TEXT DEFAULT 'gpt-4o-mini'
);

-- Index for querying by org and agent
CREATE INDEX IF NOT EXISTS idx_ai_logs_org_agent ON ai_logs(org_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_success ON ai_logs(success);

-- RLS policies
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view AI logs for their org
CREATE POLICY "Admins can view their org AI logs"
    ON ai_logs FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Service role can insert logs (from API routes)
-- No insert policy needed since API routes use service role

COMMENT ON TABLE ai_logs IS 'Logs AI agent calls for debugging and monitoring';
COMMENT ON COLUMN ai_logs.agent_name IS 'Name of the AI agent (pulse, role_mapper, etc)';
COMMENT ON COLUMN ai_logs.error_type IS 'Type of error if failed (api_error, timeout, parse_error, etc)';
COMMENT ON COLUMN ai_logs.duration_ms IS 'Time taken for the API call in milliseconds';
