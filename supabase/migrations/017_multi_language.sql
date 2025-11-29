-- Migration: 017_multi_language.sql
-- Description: Add multi-language support - user language preferences and dual text storage
-- Phase: Feature Update Phase 4
-- Created: 2025-11-28

-- ============================================================================
-- 1. Add language preference to organization_members (user-level setting)
-- ============================================================================

ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS preferred_language_code VARCHAR(10) DEFAULT 'en';

-- Add comment describing supported languages
COMMENT ON COLUMN organization_members.preferred_language_code IS 
'ISO 639-1 language code. Supported: en, es, fr, de, pt, it, nl, pl, ja, zh, ko';

-- ============================================================================
-- 2. Add org-level translation settings to organizations
-- ============================================================================

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS allow_translation BOOLEAN DEFAULT true;

COMMENT ON COLUMN organizations.allow_translation IS 
'If true, non-English responses are automatically translated for analytics';

-- ============================================================================
-- 3. Extend answers table with dual text storage
-- ============================================================================

-- Add language_code to track original language of the answer
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS language_code VARCHAR(10) DEFAULT 'en';

-- Add translated_text_en for English translation of non-English responses
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS translated_text_en TEXT;

-- Add translation confidence score (0.0 to 1.0)
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS translation_confidence DECIMAL(3,2);

-- Add flag to indicate if translation was used
ALTER TABLE answers
ADD COLUMN IF NOT EXISTS was_translated BOOLEAN DEFAULT false;

COMMENT ON COLUMN answers.language_code IS 
'ISO 639-1 code of the original language used in the check-in';

COMMENT ON COLUMN answers.translated_text_en IS 
'English translation of answer_text for non-English responses. NULL if original was English.';

COMMENT ON COLUMN answers.translation_confidence IS 
'AI confidence in translation quality (0.0-1.0). NULL if no translation needed.';

-- ============================================================================
-- 4. Add indexes for language-based queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_answers_language_code ON answers(language_code);
CREATE INDEX IF NOT EXISTS idx_org_members_language ON organization_members(preferred_language_code);

-- ============================================================================
-- 5. Create supported_languages reference table
-- ============================================================================

CREATE TABLE IF NOT EXISTS supported_languages (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  native_name VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial supported languages
INSERT INTO supported_languages (code, name, native_name, is_active) VALUES
  ('en', 'English', 'English', true),
  ('es', 'Spanish', 'Español', true),
  ('fr', 'French', 'Français', true),
  ('de', 'German', 'Deutsch', true),
  ('pt', 'Portuguese', 'Português', true),
  ('it', 'Italian', 'Italiano', true),
  ('nl', 'Dutch', 'Nederlands', true),
  ('pl', 'Polish', 'Polski', true),
  ('ja', 'Japanese', '日本語', true),
  ('zh', 'Chinese', '中文', true),
  ('ko', 'Korean', '한국어', true)
ON CONFLICT (code) DO NOTHING;

-- Enable RLS on supported_languages
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read supported languages (public reference data)
CREATE POLICY "Anyone can read supported languages"
  ON supported_languages FOR SELECT
  USING (true);

-- ============================================================================
-- 6. Add to audit_log for language changes
-- ============================================================================

-- Language preference changes will be logged via existing audit_log table
-- No additional schema changes needed

-- ============================================================================
-- Done
-- ============================================================================
