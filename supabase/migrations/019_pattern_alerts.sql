-- Migration: 019_pattern_alerts.sql
-- Purpose: Phase 6 - Pattern Alerts & Manager Coaching Layer
-- Creates pattern_alerts table for tracking organizational health issues

-- Pattern Alerts Table
-- Stores alerts triggered by health metric thresholds and patterns
CREATE TABLE IF NOT EXISTS pattern_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Alert classification
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'low_participation',
    'high_friction',
    'sentiment_drop',
    'workload_spike',
    'burnout_risk',
    'focus_drift',
    'process_variance'
  )),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  
  -- Alert content
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  -- details schema: {
  --   metrics_snapshot: { participation_rate, friction_index, sentiment_score, etc. },
  --   threshold_breached: { metric_name, threshold_value, actual_value },
  --   affected_workflows: [workflow_id, ...],
  --   affected_users_count: number,
  --   time_period: { start, end },
  --   trend_direction: 'improving' | 'worsening' | 'stable'
  -- }
  
  -- Resolution tracking
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_note TEXT,
  
  -- Coaching suggestions (populated by AI)
  coaching_suggestions JSONB DEFAULT '[]'
  -- coaching_suggestions schema: [
  --   { action: string, reason: string, effort: 'low' | 'medium' | 'high', priority: number }
  -- ]
);

-- Indexes for efficient querying
CREATE INDEX idx_pattern_alerts_org_status ON pattern_alerts(org_id, status);
CREATE INDEX idx_pattern_alerts_department ON pattern_alerts(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_pattern_alerts_type_severity ON pattern_alerts(alert_type, severity);
CREATE INDEX idx_pattern_alerts_created ON pattern_alerts(created_at DESC);

-- Unique constraint to prevent duplicate alerts for same issue in same time window
CREATE UNIQUE INDEX idx_pattern_alerts_unique_per_day ON pattern_alerts(
  org_id,
  COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::UUID),
  alert_type,
  alert_date
) WHERE status = 'open';

-- Auto-update updated_at
CREATE TRIGGER update_pattern_alerts_updated_at
  BEFORE UPDATE ON pattern_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE pattern_alerts ENABLE ROW LEVEL SECURITY;

-- Admins and owners can view alerts for their org
CREATE POLICY "Admins can view org alerts"
  ON pattern_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = pattern_alerts.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Admins and owners can update alerts (acknowledge, resolve)
CREATE POLICY "Admins can update org alerts"
  ON pattern_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = pattern_alerts.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Service role can insert alerts (from scheduler/cron)
CREATE POLICY "Service can insert alerts"
  ON pattern_alerts FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, UPDATE ON pattern_alerts TO authenticated;
GRANT ALL ON pattern_alerts TO service_role;

-- Add comment for documentation
COMMENT ON TABLE pattern_alerts IS 'Stores pattern-based alerts triggered by health metric thresholds. Part of Phase 6 Manager Coaching Layer.';
