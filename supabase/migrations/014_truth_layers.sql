-- Migration: 014_truth_layers.sql
-- Description: Phase 1 of FEATURE_UPDATE_EXECUTION_PLAN - Data Truth Layers & Audit Trail
-- Purpose: Introduce workflow versioning and global audit log for change tracking
-- Created: 2025-11-28

-- ============================================================================
-- WORKFLOW VERSIONING
-- ============================================================================
-- Workflows are now versioned entities. Each workflow has a stable identifier
-- (workflow_id) and multiple versions over time. The latest version is the
-- current canonical representation.

-- workflows: Stable identifiers for discovered processes
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_key VARCHAR(200) NOT NULL, -- Unique key within org (e.g., "sales-lead-qualification")
  display_name VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique workflow key per org
  UNIQUE(org_id, workflow_key)
);

-- workflow_versions: Versioned snapshots of workflow structure
CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_type VARCHAR(20) NOT NULL CHECK (created_by_type IN ('ai', 'owner', 'admin', 'system')),
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for AI/system
  
  -- Source dots that informed this version
  source_dot_ids UUID[] DEFAULT '{}', -- Array of answer IDs used as evidence
  
  -- Full workflow structure
  structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "steps": ["Step 1", "Step 2", ...],
  --   "tools": ["Tool A", "Tool B", ...],
  --   "data_sources": ["Source 1", ...],
  --   "roles_involved": ["Role 1", ...],
  --   "estimated_duration": "15 min",
  --   "frequency": "daily",
  --   "notes": "Any additional context"
  -- }
  
  -- Change metadata
  change_summary TEXT, -- Brief description of what changed from previous version
  
  -- Ensure unique version per workflow
  UNIQUE(workflow_id, version_number)
);

-- Create indexes for workflow queries
CREATE INDEX idx_workflows_org_id ON workflows(org_id);
CREATE INDEX idx_workflows_department_id ON workflows(department_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX idx_workflow_versions_created_at ON workflow_versions(created_at);

-- ============================================================================
-- GLOBAL AUDIT LOG
-- ============================================================================
-- All significant changes (AI or human) are logged here for full traceability.
-- This is a write-only table - entries are never updated or deleted.

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Who made the change
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('ai', 'owner', 'admin', 'member', 'system')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for AI/system
  
  -- What was changed
  entity_type VARCHAR(50) NOT NULL, -- e.g., 'workflow', 'theme', 'health_metric', 'override', 'variant'
  entity_id UUID, -- The ID of the affected entity (workflow_id, theme_id, etc.)
  entity_name VARCHAR(255), -- Human-readable name for quick identification
  
  -- Change details
  action VARCHAR(50) NOT NULL, -- e.g., 'created', 'updated', 'version_created', 'override_applied', 'override_reverted', 'archived'
  details JSONB DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "previous_version": 1,
  --   "new_version": 2,
  --   "changes": { "steps": { "added": [...], "removed": [...] } },
  --   "reason": "User feedback",
  --   "source_dots": ["uuid1", "uuid2"]
  -- }
  
  -- Optional context
  session_id UUID, -- If change was triggered during a session
  notes TEXT -- Optional human-readable notes
);

-- Create indexes for audit log queries
CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX idx_audit_log_actor_type ON audit_log(actor_type);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Composite index for common query patterns
CREATE INDEX idx_audit_log_org_entity ON audit_log(org_id, entity_type, created_at DESC);

-- ============================================================================
-- FACT IMMUTABILITY ENFORCEMENT
-- ============================================================================
-- Add a trigger to prevent updates to core fact tables (answers)
-- This ensures raw dots remain immutable facts

CREATE OR REPLACE FUNCTION prevent_answer_mutation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates only to non-fact columns if needed in the future
  -- For now, prevent all updates to preserve fact immutability
  RAISE EXCEPTION 'Answers are immutable facts and cannot be updated. Create a new record instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_answer_immutability
  BEFORE UPDATE ON answers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_answer_mutation();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Workflows: Users can view workflows in their org
CREATE POLICY "Users can view workflows in their org"
  ON workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = workflows.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Workflows: Only admins/owners can insert workflows
CREATE POLICY "Admins can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = workflows.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Workflows: Only admins/owners can update workflows
CREATE POLICY "Admins can update workflows"
  ON workflows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = workflows.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Workflow versions: Users can view versions for workflows in their org
CREATE POLICY "Users can view workflow versions in their org"
  ON workflow_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN organization_members om ON om.org_id = w.org_id
      WHERE w.id = workflow_versions.workflow_id
      AND om.user_id = auth.uid()
    )
  );

-- Workflow versions: Only admins/owners can insert versions
CREATE POLICY "Admins can create workflow versions"
  ON workflow_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN organization_members om ON om.org_id = w.org_id
      WHERE w.id = workflow_versions.workflow_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Audit log: Users can view audit entries for their org
CREATE POLICY "Users can view audit log in their org"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = audit_log.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Audit log: Anyone in org can insert audit entries (system/AI will use service role)
CREATE POLICY "Users can create audit entries in their org"
  ON audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = audit_log.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Service role policies for system/AI operations
CREATE POLICY "Service role can manage workflows"
  ON workflows FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage workflow versions"
  ON workflow_versions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage audit log"
  ON audit_log FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTION: Get current workflow version
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_workflow_version(p_workflow_id UUID)
RETURNS workflow_versions AS $$
DECLARE
  result workflow_versions;
BEGIN
  SELECT * INTO result
  FROM workflow_versions
  WHERE workflow_id = p_workflow_id
  ORDER BY version_number DESC
  LIMIT 1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- HELPER FUNCTION: Create new workflow version
-- ============================================================================

CREATE OR REPLACE FUNCTION create_workflow_version(
  p_workflow_id UUID,
  p_created_by_type VARCHAR(20),
  p_created_by_id UUID,
  p_structure JSONB,
  p_source_dot_ids UUID[],
  p_change_summary TEXT DEFAULT NULL
)
RETURNS workflow_versions AS $$
DECLARE
  next_version INT;
  result workflow_versions;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM workflow_versions
  WHERE workflow_id = p_workflow_id;
  
  -- Insert new version
  INSERT INTO workflow_versions (
    workflow_id,
    version_number,
    created_by_type,
    created_by_id,
    structure,
    source_dot_ids,
    change_summary
  ) VALUES (
    p_workflow_id,
    next_version,
    p_created_by_type,
    p_created_by_id,
    p_structure,
    p_source_dot_ids,
    p_change_summary
  )
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE workflows IS 'Stable identifiers for discovered business processes. Each workflow can have multiple versions over time.';
COMMENT ON TABLE workflow_versions IS 'Versioned snapshots of workflow structure. New versions are created (never updated) to preserve history.';
COMMENT ON TABLE audit_log IS 'Global change log for all significant modifications. Write-only - entries are never updated or deleted.';
COMMENT ON FUNCTION prevent_answer_mutation() IS 'Trigger function that prevents updates to the answers table, ensuring raw dots remain immutable facts.';
COMMENT ON FUNCTION get_current_workflow_version(UUID) IS 'Returns the latest version of a workflow by version_number.';
COMMENT ON FUNCTION create_workflow_version(UUID, VARCHAR, UUID, JSONB, UUID[], TEXT) IS 'Creates a new workflow version with auto-incremented version_number.';
