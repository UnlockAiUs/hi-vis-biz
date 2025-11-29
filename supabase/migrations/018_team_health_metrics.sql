-- Migration: 018_team_health_metrics.sql
-- Phase 5: Analytics Backbone & Team Health Metrics
-- Creates tables for team health scorecard, topic summaries, and metric computation

-- =============================================================================
-- 1. team_health_metrics - Stores computed health metrics per department/period
-- =============================================================================
CREATE TABLE IF NOT EXISTS team_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  
  -- Time window for the metrics
  time_window_start TIMESTAMPTZ NOT NULL,
  time_window_end TIMESTAMPTZ NOT NULL,
  
  -- Core metrics (0-100 scale where applicable)
  participation_rate DECIMAL(5,2), -- Percentage of active members who completed check-ins
  friction_index DECIMAL(5,2),     -- 0-100, higher = more friction reported
  sentiment_score DECIMAL(5,2),    -- 0-100, higher = more positive
  focus_score DECIMAL(5,2),        -- 0-100, higher = better focus/alignment
  workload_score DECIMAL(5,2),     -- 0-100, higher = heavier workload
  burnout_risk_score DECIMAL(5,2), -- 0-100, higher = more risk
  
  -- Aggregated risk level
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Raw counts for transparency
  total_members INT NOT NULL DEFAULT 0,
  active_members INT NOT NULL DEFAULT 0,
  total_sessions INT NOT NULL DEFAULT 0,
  completed_sessions INT NOT NULL DEFAULT 0,
  
  -- Variant tracking
  canonical_dots INT NOT NULL DEFAULT 0,
  allowed_variant_dots INT NOT NULL DEFAULT 0,
  friction_variant_dots INT NOT NULL DEFAULT 0,
  
  -- Computation metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computation_version INT NOT NULL DEFAULT 1, -- For algorithm versioning
  inputs JSONB, -- Snapshot of detailed inputs used
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Idempotence: one metric row per org/department/time_window
  CONSTRAINT unique_health_metric UNIQUE (org_id, department_id, time_window_start, time_window_end)
);

-- Indexes for common queries
CREATE INDEX idx_team_health_org ON team_health_metrics(org_id);
CREATE INDEX idx_team_health_dept ON team_health_metrics(department_id);
CREATE INDEX idx_team_health_time ON team_health_metrics(time_window_start, time_window_end);
CREATE INDEX idx_team_health_risk ON team_health_metrics(org_id, risk_level);
CREATE INDEX idx_team_health_computed ON team_health_metrics(computed_at DESC);

-- =============================================================================
-- 2. topic_summaries - Stores recurring themes/topics by period
-- =============================================================================
CREATE TABLE IF NOT EXISTS topic_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  
  -- Time window
  time_window_start TIMESTAMPTZ NOT NULL,
  time_window_end TIMESTAMPTZ NOT NULL,
  
  -- Topic details
  topic_key TEXT NOT NULL, -- e.g., "communication_issues", "tool_friction"
  topic_label TEXT NOT NULL, -- Human-readable label
  topic_category TEXT, -- e.g., "workflow", "sentiment", "tools"
  
  -- Metrics
  mention_count INT NOT NULL DEFAULT 0,
  unique_users INT NOT NULL DEFAULT 0,
  sentiment_trend TEXT CHECK (sentiment_trend IN ('improving', 'stable', 'declining')),
  
  -- AI-generated summary
  summary_text TEXT,
  
  -- Source tracking
  source_dot_ids UUID[], -- Array of answer IDs that contributed
  
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Idempotence
  CONSTRAINT unique_topic_summary UNIQUE (org_id, department_id, time_window_start, time_window_end, topic_key)
);

-- Indexes
CREATE INDEX idx_topic_summaries_org ON topic_summaries(org_id);
CREATE INDEX idx_topic_summaries_dept ON topic_summaries(department_id);
CREATE INDEX idx_topic_summaries_time ON topic_summaries(time_window_start, time_window_end);
CREATE INDEX idx_topic_summaries_category ON topic_summaries(topic_category);

-- =============================================================================
-- 3. RLS Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE team_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_summaries ENABLE ROW LEVEL SECURITY;

-- team_health_metrics policies
CREATE POLICY "Admins can view org health metrics"
  ON team_health_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = team_health_metrics.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "System can insert health metrics"
  ON team_health_metrics FOR INSERT
  WITH CHECK (true); -- Service role only

CREATE POLICY "System can update health metrics"
  ON team_health_metrics FOR UPDATE
  USING (true); -- Service role only

-- topic_summaries policies
CREATE POLICY "Admins can view topic summaries"
  ON topic_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = topic_summaries.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "System can insert topic summaries"
  ON topic_summaries FOR INSERT
  WITH CHECK (true); -- Service role only

-- =============================================================================
-- 4. Health metric computation helper functions
-- =============================================================================

-- Function to calculate participation rate for a department in a time window
CREATE OR REPLACE FUNCTION calculate_participation_rate(
  p_org_id UUID,
  p_department_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
  v_active_members INT;
  v_members_with_sessions INT;
BEGIN
  -- Count active members in department
  SELECT COUNT(*) INTO v_active_members
  FROM organization_members
  WHERE org_id = p_org_id
    AND (p_department_id IS NULL OR department_id = p_department_id)
    AND status = 'active';
  
  IF v_active_members = 0 THEN
    RETURN 0;
  END IF;
  
  -- Count members who completed at least one session
  SELECT COUNT(DISTINCT s.user_id) INTO v_members_with_sessions
  FROM sessions s
  JOIN organization_members om ON om.user_id = s.user_id AND om.org_id = p_org_id
  WHERE s.completed_at IS NOT NULL
    AND s.completed_at >= p_start
    AND s.completed_at < p_end
    AND (p_department_id IS NULL OR om.department_id = p_department_id);
  
  RETURN ROUND((v_members_with_sessions::DECIMAL / v_active_members) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate average sentiment from pulse check-ins
CREATE OR REPLACE FUNCTION calculate_sentiment_score(
  p_org_id UUID,
  p_department_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
  v_avg_rating DECIMAL;
BEGIN
  SELECT AVG((a.extracted_data->>'rating')::DECIMAL) INTO v_avg_rating
  FROM answers a
  JOIN sessions s ON s.id = a.session_id
  JOIN organization_members om ON om.user_id = s.user_id AND om.org_id = p_org_id
  WHERE s.agent_code = 'pulse'
    AND s.completed_at >= p_start
    AND s.completed_at < p_end
    AND (p_department_id IS NULL OR om.department_id = p_department_id)
    AND a.extracted_data->>'rating' IS NOT NULL;
  
  -- Convert 1-5 scale to 0-100
  IF v_avg_rating IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND(((v_avg_rating - 1) / 4) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate workload score from pulse check-ins
CREATE OR REPLACE FUNCTION calculate_workload_score(
  p_org_id UUID,
  p_department_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
  v_avg_workload DECIMAL;
BEGIN
  SELECT AVG((a.extracted_data->>'workload_rating')::DECIMAL) INTO v_avg_workload
  FROM answers a
  JOIN sessions s ON s.id = a.session_id
  JOIN organization_members om ON om.user_id = s.user_id AND om.org_id = p_org_id
  WHERE s.agent_code = 'pulse'
    AND s.completed_at >= p_start
    AND s.completed_at < p_end
    AND (p_department_id IS NULL OR om.department_id = p_department_id)
    AND a.extracted_data->>'workload_rating' IS NOT NULL;
  
  -- Convert 1-5 scale to 0-100
  IF v_avg_workload IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND(((v_avg_workload - 1) / 4) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate burnout risk score
CREATE OR REPLACE FUNCTION calculate_burnout_risk_score(
  p_org_id UUID,
  p_department_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
  v_high_count INT;
  v_medium_count INT;
  v_total_count INT;
  v_risk_score DECIMAL;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE a.extracted_data->>'burnout_risk' = 'high'),
    COUNT(*) FILTER (WHERE a.extracted_data->>'burnout_risk' = 'medium'),
    COUNT(*)
  INTO v_high_count, v_medium_count, v_total_count
  FROM answers a
  JOIN sessions s ON s.id = a.session_id
  JOIN organization_members om ON om.user_id = s.user_id AND om.org_id = p_org_id
  WHERE s.agent_code = 'pulse'
    AND s.completed_at >= p_start
    AND s.completed_at < p_end
    AND (p_department_id IS NULL OR om.department_id = p_department_id)
    AND a.extracted_data->>'burnout_risk' IS NOT NULL;
  
  IF v_total_count = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Weighted score: high=100, medium=50, low=0
  v_risk_score := ((v_high_count * 100.0) + (v_medium_count * 50.0)) / v_total_count;
  
  RETURN ROUND(v_risk_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. Grant permissions
-- =============================================================================
GRANT SELECT ON team_health_metrics TO authenticated;
GRANT SELECT ON topic_summaries TO authenticated;
GRANT ALL ON team_health_metrics TO service_role;
GRANT ALL ON topic_summaries TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION calculate_participation_rate TO service_role;
GRANT EXECUTE ON FUNCTION calculate_sentiment_score TO service_role;
GRANT EXECUTE ON FUNCTION calculate_workload_score TO service_role;
GRANT EXECUTE ON FUNCTION calculate_burnout_risk_score TO service_role;
