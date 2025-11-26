-- Migration: 008_schedule_settings.sql
-- Description: Add schedule configuration columns to organizations and organization_members
-- Created: 2025-11-26

-- Add schedule_config JSONB column to organizations table
-- Structure: { "mon": {"active": true, "start": "09:00", "end": "17:00"}, "tue": {...}, ... }
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{
  "mon": {"active": true, "start": "09:00", "end": "17:00"},
  "tue": {"active": true, "start": "09:00", "end": "17:00"},
  "wed": {"active": true, "start": "09:00", "end": "17:00"},
  "thu": {"active": true, "start": "09:00", "end": "17:00"},
  "fri": {"active": true, "start": "09:00", "end": "17:00"},
  "sat": {"active": false, "start": "09:00", "end": "17:00"},
  "sun": {"active": false, "start": "09:00", "end": "17:00"}
}'::jsonb;

-- Add schedule_override JSONB column to organization_members table
-- When set, overrides the organization's default schedule for this specific member
-- Structure: same as schedule_config, or null to use org defaults
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS schedule_override JSONB DEFAULT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN organizations.schedule_config IS 'Default check-in schedule for the organization. Each day has active (boolean), start (HH:MM), and end (HH:MM) fields.';
COMMENT ON COLUMN organization_members.schedule_override IS 'Optional per-user schedule override. When set, overrides org defaults. Same structure as organizations.schedule_config.';

-- Create index for efficient querying of active schedules
CREATE INDEX IF NOT EXISTS idx_org_schedule_config ON organizations USING gin(schedule_config);
CREATE INDEX IF NOT EXISTS idx_member_schedule_override ON organization_members USING gin(schedule_override) WHERE schedule_override IS NOT NULL;
