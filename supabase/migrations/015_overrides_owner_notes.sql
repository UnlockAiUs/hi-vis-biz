-- Migration: 015_overrides_owner_notes.sql
-- Phase 2: Overrides, Corrections & Owner Notes
-- Created: 2025-11-28
-- Purpose: Add workflow overrides and owner notes tables for steering wheel functionality

-- ============================================================================
-- WORKFLOW OVERRIDES TABLE
-- Stores owner/admin corrections to AI-generated workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Override status: draft (being edited), active (in use), archived (reverted/replaced)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  
  -- Reason for the override (optional but helpful for audit)
  override_reason TEXT,
  
  -- The actual override data - flexible JSONB structure
  -- Can include: locked_steps, renamed_steps, tool_substitutions, removed_steps, added_steps, etc.
  override_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Accuracy feedback from owner
  accuracy_rating TEXT CHECK (accuracy_rating IN ('accurate', 'partially_right', 'incorrect')),
  accuracy_feedback JSONB -- Structured feedback: { missing_steps: true, wrong_tools: true, notes: "..." }
);

-- Index for fast lookups by workflow
CREATE INDEX IF NOT EXISTS idx_workflow_overrides_workflow_id ON workflow_overrides(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_overrides_status ON workflow_overrides(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_workflow_overrides_created_by ON workflow_overrides(created_by_user_id);

-- Only one active override per workflow at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_overrides_unique_active 
  ON workflow_overrides(workflow_id) WHERE status = 'active';

-- ============================================================================
-- OWNER NOTES TABLE
-- Stores owner/manager notes that inform AI and signal teams
-- ============================================================================

CREATE TABLE IF NOT EXISTS owner_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Optional links to specific entities (all nullable for org-wide notes)
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  author_user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Type of note
  note_type TEXT NOT NULL DEFAULT 'clarification' 
    CHECK (note_type IN ('question', 'clarification', 'policy', 'alert', 'exception')),
  
  -- The actual note content
  note_text TEXT NOT NULL,
  
  -- Visibility control
  visible_to TEXT NOT NULL DEFAULT 'admins_only' 
    CHECK (visible_to IN ('admins_only', 'managers', 'everyone')),
  
  -- Whether this note is currently active or archived
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_owner_notes_org_id ON owner_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_owner_notes_workflow_id ON owner_notes(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_owner_notes_department_id ON owner_notes(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_owner_notes_active ON owner_notes(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_owner_notes_type ON owner_notes(note_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE workflow_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_notes ENABLE ROW LEVEL SECURITY;

-- Workflow Overrides: Users can view/manage overrides for workflows in their org
DROP POLICY IF EXISTS workflow_overrides_select ON workflow_overrides;
CREATE POLICY workflow_overrides_select ON workflow_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN organization_members om ON om.org_id = w.org_id
      WHERE w.id = workflow_overrides.workflow_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS workflow_overrides_insert ON workflow_overrides;
CREATE POLICY workflow_overrides_insert ON workflow_overrides
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN organization_members om ON om.org_id = w.org_id
      WHERE w.id = workflow_overrides.workflow_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS workflow_overrides_update ON workflow_overrides;
CREATE POLICY workflow_overrides_update ON workflow_overrides
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN organization_members om ON om.org_id = w.org_id
      WHERE w.id = workflow_overrides.workflow_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS workflow_overrides_delete ON workflow_overrides;
CREATE POLICY workflow_overrides_delete ON workflow_overrides
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN organization_members om ON om.org_id = w.org_id
      WHERE w.id = workflow_overrides.workflow_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- Owner Notes: Users can view notes based on visibility, manage notes if admin/owner
DROP POLICY IF EXISTS owner_notes_select ON owner_notes;
CREATE POLICY owner_notes_select ON owner_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = owner_notes.org_id
        AND om.user_id = auth.uid()
        AND (
          -- Admins/owners see all notes
          om.role IN ('owner', 'admin')
          -- Managers see manager+ visibility notes
          OR (om.level = 'manager' AND owner_notes.visible_to IN ('managers', 'everyone'))
          -- Everyone sees public notes
          OR owner_notes.visible_to = 'everyone'
        )
    )
  );

DROP POLICY IF EXISTS owner_notes_insert ON owner_notes;
CREATE POLICY owner_notes_insert ON owner_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = owner_notes.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS owner_notes_update ON owner_notes;
CREATE POLICY owner_notes_update ON owner_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = owner_notes.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS owner_notes_delete ON owner_notes;
CREATE POLICY owner_notes_delete ON owner_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = owner_notes.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_overrides_updated_at ON workflow_overrides;
CREATE TRIGGER workflow_overrides_updated_at
  BEFORE UPDATE ON workflow_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS owner_notes_updated_at ON owner_notes;
CREATE TRIGGER owner_notes_updated_at
  BEFORE UPDATE ON owner_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOG: Trigger to automatically log override changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_override_change()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_action TEXT;
BEGIN
  -- Get org_id from the workflow
  SELECT w.org_id INTO v_org_id
  FROM workflows w
  WHERE w.id = COALESCE(NEW.workflow_id, OLD.workflow_id);
  
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'override_created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'archived' AND NEW.status = 'archived' THEN
      v_action := 'override_reverted';
    ELSE
      v_action := 'override_updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'override_deleted';
  END IF;
  
  -- Insert audit log entry
  INSERT INTO audit_log (org_id, actor_type, actor_id, entity_type, entity_id, action, details)
  VALUES (
    v_org_id,
    'owner',
    COALESCE(NEW.created_by_user_id, OLD.created_by_user_id),
    'workflow_override',
    COALESCE(NEW.id, OLD.id),
    v_action,
    jsonb_build_object(
      'workflow_id', COALESCE(NEW.workflow_id, OLD.workflow_id),
      'old_status', OLD.status,
      'new_status', NEW.status,
      'override_reason', NEW.override_reason
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS workflow_overrides_audit ON workflow_overrides;
CREATE TRIGGER workflow_overrides_audit
  AFTER INSERT OR UPDATE OR DELETE ON workflow_overrides
  FOR EACH ROW EXECUTE FUNCTION log_override_change();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workflow_overrides IS 'Stores owner/admin corrections to AI-generated workflows. Only one active override per workflow.';
COMMENT ON TABLE owner_notes IS 'Stores contextual notes from owners/admins that inform AI and signal teams.';
COMMENT ON COLUMN workflow_overrides.override_payload IS 'JSONB containing override data: locked_steps[], renamed_steps{}, tool_substitutions{}, etc.';
COMMENT ON COLUMN workflow_overrides.accuracy_rating IS 'Owner feedback on AI accuracy: accurate, partially_right, or incorrect';
COMMENT ON COLUMN owner_notes.note_type IS 'Type of note: question, clarification, policy, alert, or exception';
COMMENT ON COLUMN owner_notes.visible_to IS 'Visibility level: admins_only, managers, or everyone';
