-- Migration 020: Privacy & Trust Controls (Phase 7 of FEATURE_UPDATE_EXECUTION_PLAN)
-- Adds org-level privacy settings and answer-level privacy flags

-- ============================================================================
-- 7.1 Org-level Privacy Settings
-- ============================================================================

-- Add privacy settings columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS allow_free_text_sentiment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_translation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS employee_can_mark_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_policy_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_processing_consent_required BOOLEAN DEFAULT false;

-- Add comment explaining these fields
COMMENT ON COLUMN organizations.allow_free_text_sentiment IS 'When false, sentiment analysis uses only structured ratings, not free text';
COMMENT ON COLUMN organizations.allow_translation IS 'When false, multi-language responses are not auto-translated';
COMMENT ON COLUMN organizations.data_retention_days IS 'Number of days to retain raw dot data (null = indefinite)';
COMMENT ON COLUMN organizations.employee_can_mark_private IS 'When true, employees can mark individual answers as private to managers';
COMMENT ON COLUMN organizations.privacy_policy_url IS 'URL to org-specific privacy policy';
COMMENT ON COLUMN organizations.data_processing_consent_required IS 'When true, employees must consent before first check-in';

-- ============================================================================
-- 7.2 Answer-level Privacy Flags
-- ============================================================================

-- Add privacy flag to answers table
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'standard' CHECK (privacy_level IN ('standard', 'managers_only', 'admins_only'));

COMMENT ON COLUMN answers.is_private IS 'When true, answer is excluded from analytics and manager views';
COMMENT ON COLUMN answers.privacy_level IS 'Controls visibility: standard (all), managers_only (managers+admins), admins_only';

-- ============================================================================
-- 7.3 Data Consent Tracking
-- ============================================================================

-- Create table for tracking user consent
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('data_processing', 'analytics', 'translation', 'email_notifications')),
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  consent_version TEXT DEFAULT '1.0',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, org_id, consent_type)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_org ON user_consents(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);

-- ============================================================================
-- 7.4 Data Export Requests
-- ============================================================================

-- Create table for tracking data export requests
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('full_org', 'single_user', 'department', 'date_range')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  filters JSONB DEFAULT '{}',
  download_url TEXT,
  download_expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_data_export_requests_org ON data_export_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);

-- ============================================================================
-- 7.5 Data Retention Archival Tracking
-- ============================================================================

-- Create table for tracking archived data
CREATE TABLE IF NOT EXISTS archived_data_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('answer', 'session', 'dot')),
  entity_id UUID NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  retention_policy_days INTEGER,
  original_created_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_archived_data_log_org ON archived_data_log(org_id);
CREATE INDEX IF NOT EXISTS idx_archived_data_log_entity ON archived_data_log(entity_type, entity_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_data_log ENABLE ROW LEVEL SECURITY;

-- user_consents policies
CREATE POLICY "Users can view own consents"
  ON user_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own consents"
  ON user_consents FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org consents"
  ON user_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.org_id = user_consents.org_id
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- data_export_requests policies
CREATE POLICY "Admins can manage export requests"
  ON data_export_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.org_id = data_export_requests.org_id
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- archived_data_log policies (admin-only read access)
CREATE POLICY "Admins can view archived data log"
  ON archived_data_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
        AND organization_members.org_id = archived_data_log.org_id
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Audit log trigger for privacy changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_privacy_setting_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log changes to privacy-related organization settings
  IF (OLD.allow_free_text_sentiment IS DISTINCT FROM NEW.allow_free_text_sentiment) OR
     (OLD.allow_translation IS DISTINCT FROM NEW.allow_translation) OR
     (OLD.data_retention_days IS DISTINCT FROM NEW.data_retention_days) OR
     (OLD.employee_can_mark_private IS DISTINCT FROM NEW.employee_can_mark_private) THEN
    INSERT INTO audit_log (org_id, actor_type, actor_id, entity_type, entity_id, action, details)
    VALUES (
      NEW.id,
      'admin',
      auth.uid(),
      'organization',
      NEW.id,
      'privacy_settings_updated',
      jsonb_build_object(
        'changes', jsonb_build_object(
          'allow_free_text_sentiment', jsonb_build_object('old', OLD.allow_free_text_sentiment, 'new', NEW.allow_free_text_sentiment),
          'allow_translation', jsonb_build_object('old', OLD.allow_translation, 'new', NEW.allow_translation),
          'data_retention_days', jsonb_build_object('old', OLD.data_retention_days, 'new', NEW.data_retention_days),
          'employee_can_mark_private', jsonb_build_object('old', OLD.employee_can_mark_private, 'new', NEW.employee_can_mark_private)
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger only if audit_log table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    DROP TRIGGER IF EXISTS trigger_log_privacy_setting_change ON organizations;
    CREATE TRIGGER trigger_log_privacy_setting_change
      AFTER UPDATE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION log_privacy_setting_change();
  END IF;
END $$;
