-- Migration: 016_workflow_variants.sql
-- Purpose: Phase 3 - Variants, Friction & "Different but OK"
-- Creates workflow_variants and workflow_variant_dot_links tables
-- Allows owners to distinguish acceptable variations from friction-causing differences

-- ============================================================================
-- WORKFLOW VARIANTS TABLE
-- Tracks detected variations in how workflows are executed
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Variant identification
  variant_key TEXT NOT NULL,              -- e.g., "Tool: Asana vs Jira", "Skips QA step"
  description TEXT,                        -- Human-readable description of the variant
  
  -- Classification
  is_allowed BOOLEAN DEFAULT NULL,         -- NULL = unclassified, TRUE = OK, FALSE = friction
  
  -- Metadata
  notes TEXT,                              -- Optional notes about this variant
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'owner', 'manager')),
  
  -- Who classified this variant (if classified)
  classified_by_user_id UUID REFERENCES auth.users(id),
  classified_at TIMESTAMPTZ,
  
  -- Variant details (JSONB for flexibility)
  details JSONB DEFAULT '{}'::jsonb,       -- e.g., {"original": "Jira", "variant": "Asana", "frequency": 15}
  
  -- Unique constraint: one variant_key per workflow
  CONSTRAINT unique_variant_per_workflow UNIQUE (workflow_id, variant_key)
);

-- ============================================================================
-- WORKFLOW VARIANT DOT LINKS TABLE
-- Many-to-many relationship between variants and the dots that exhibit them
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_variant_dot_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES workflow_variants(id) ON DELETE CASCADE,
  dot_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Link metadata
  confidence DECIMAL(3,2) DEFAULT 1.00,    -- How confident the AI is about this link (0.00-1.00)
  
  -- Unique constraint: one link per variant-dot pair
  CONSTRAINT unique_variant_dot_link UNIQUE (variant_id, dot_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workflow_variants_workflow_id ON workflow_variants(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_variants_is_allowed ON workflow_variants(is_allowed) WHERE is_allowed IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_variants_source ON workflow_variants(source);
CREATE INDEX IF NOT EXISTS idx_workflow_variant_dot_links_variant_id ON workflow_variant_dot_links(variant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_variant_dot_links_dot_id ON workflow_variant_dot_links(dot_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger for workflow_variants
CREATE OR REPLACE FUNCTION update_workflow_variant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workflow_variant_timestamp ON workflow_variants;
CREATE TRIGGER trg_workflow_variant_timestamp
  BEFORE UPDATE ON workflow_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_variant_timestamp();

-- Audit log trigger for variant classification changes
CREATE OR REPLACE FUNCTION log_variant_classification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when is_allowed changes from NULL or to a different value
  IF (OLD.is_allowed IS DISTINCT FROM NEW.is_allowed) AND NEW.is_allowed IS NOT NULL THEN
    INSERT INTO audit_log (
      org_id,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      action,
      details
    )
    SELECT 
      w.org_id,
      'owner',
      NEW.classified_by_user_id,
      'workflow_variant',
      NEW.id,
      CASE 
        WHEN NEW.is_allowed = TRUE THEN 'variant_marked_ok'
        WHEN NEW.is_allowed = FALSE THEN 'variant_marked_friction'
      END,
      jsonb_build_object(
        'workflow_id', NEW.workflow_id,
        'variant_key', NEW.variant_key,
        'previous_is_allowed', OLD.is_allowed,
        'new_is_allowed', NEW.is_allowed,
        'notes', NEW.notes
      )
    FROM workflows w
    WHERE w.id = NEW.workflow_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_variant_classification ON workflow_variants;
CREATE TRIGGER trg_log_variant_classification
  AFTER UPDATE ON workflow_variants
  FOR EACH ROW
  EXECUTE FUNCTION log_variant_classification();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE workflow_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_variant_dot_links ENABLE ROW LEVEL SECURITY;

-- workflow_variants: Users can view variants for workflows in their org
CREATE POLICY "Users can view workflow variants in their org"
  ON workflow_variants FOR SELECT
  USING (
    workflow_id IN (
      SELECT w.id FROM workflows w
      WHERE w.org_id IN (
        SELECT org_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- workflow_variants: Admins/owners can insert variants
CREATE POLICY "Admins can insert workflow variants"
  ON workflow_variants FOR INSERT
  WITH CHECK (
    workflow_id IN (
      SELECT w.id FROM workflows w
      WHERE w.org_id IN (
        SELECT org_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- workflow_variants: Admins/owners can update variants (classify them)
CREATE POLICY "Admins can update workflow variants"
  ON workflow_variants FOR UPDATE
  USING (
    workflow_id IN (
      SELECT w.id FROM workflows w
      WHERE w.org_id IN (
        SELECT org_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- workflow_variant_dot_links: Users can view links for variants in their org
CREATE POLICY "Users can view variant dot links in their org"
  ON workflow_variant_dot_links FOR SELECT
  USING (
    variant_id IN (
      SELECT wv.id FROM workflow_variants wv
      JOIN workflows w ON wv.workflow_id = w.id
      WHERE w.org_id IN (
        SELECT org_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- workflow_variant_dot_links: Admins can insert links (AI or manual)
CREATE POLICY "Admins can insert variant dot links"
  ON workflow_variant_dot_links FOR INSERT
  WITH CHECK (
    variant_id IN (
      SELECT wv.id FROM workflow_variants wv
      JOIN workflows w ON wv.workflow_id = w.id
      WHERE w.org_id IN (
        SELECT org_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Service role bypass for all tables (for AI operations)
CREATE POLICY "Service role can manage workflow_variants"
  ON workflow_variants FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage workflow_variant_dot_links"
  ON workflow_variant_dot_links FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE workflow_variants IS 'Tracks detected variations in workflow execution - allows distinguishing acceptable diversity from friction';
COMMENT ON COLUMN workflow_variants.variant_key IS 'Short identifier for the variant type, e.g., "Tool: Asana vs Jira"';
COMMENT ON COLUMN workflow_variants.is_allowed IS 'NULL = unclassified, TRUE = acceptable variation, FALSE = friction that needs addressing';
COMMENT ON COLUMN workflow_variants.source IS 'Who/what detected this variant: ai, owner, or manager';
COMMENT ON COLUMN workflow_variants.details IS 'Flexible JSONB for variant-specific data like tool names, step differences, frequency counts';

COMMENT ON TABLE workflow_variant_dot_links IS 'Links variants to the specific dots (check-in answers) that exhibit them';
COMMENT ON COLUMN workflow_variant_dot_links.confidence IS 'AI confidence score for this link (0.00-1.00)';
