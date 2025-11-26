-- Migration: 003_user_profiles.sql
-- Description: Create user_profiles table with JSONB profile_json
-- Created: 2025-11-25

-- User profiles table (stores evolving employee profile data)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_json JSONB DEFAULT '{}'::jsonb,
  version INT DEFAULT 1, -- Increment on role change
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one profile per user per org
  UNIQUE(org_id, user_id)
);

-- Create indexes for profile lookups
CREATE INDEX idx_user_profiles_org_id ON user_profiles(org_id);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- GIN index for JSONB queries on profile_json
CREATE INDEX idx_user_profiles_profile_json ON user_profiles USING GIN (profile_json);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment describing the profile_json schema
COMMENT ON COLUMN user_profiles.profile_json IS 
'Schema: {
  "role_summary": "string",
  "primary_duties": ["string"],
  "customer_facing": "boolean",
  "main_workflows": [{
    "workflow_ref": "string",
    "display_label": "string",
    "tools": ["string"],
    "data_sources": ["string"]
  }],
  "primary_tools": ["string"],
  "current_focus": {
    "label": "string",
    "tags": ["string"],
    "last_updated": "ISO8601"
  },
  "pain_points": [{
    "id": "string",
    "label": "string",
    "related_workflow_ref": "string",
    "severity_trend": "string"
  }],
  "morale_trend": "string",
  "open_profile_gaps": [{
    "id": "string",
    "priority": "string",
    "description": "string",
    "suggested_agent": "string"
  }]
}';
