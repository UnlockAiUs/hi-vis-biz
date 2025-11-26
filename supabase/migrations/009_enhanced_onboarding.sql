-- Migration: 009_enhanced_onboarding.sql
-- Description: Add enhanced onboarding columns to organization_members
-- Created: 2025-11-26
-- Purpose: Support new 6-step onboarding wizard with pre-invite employee data

-- Add columns to store employee data BEFORE auth user exists
-- This allows the owner to set up all employee info during onboarding wizard
-- and match it to auth.users when employees accept their invite

-- Display name (employee's full name, set by owner during setup)
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Job title (set by owner during setup)
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

-- Whether this employee has direct reports (manages others)
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS has_direct_reports BOOLEAN DEFAULT false;

-- Whether this employee can view reports/analytics
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN DEFAULT false;

-- Invite tracking: pending (not sent), sent (email sent), accepted (user set password)
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS invite_status VARCHAR(20) DEFAULT 'pending';

-- Add check constraint for invite_status values
-- First check if constraint exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_invite_status_check'
  ) THEN
    ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_invite_status_check
    CHECK (invite_status IN ('pending', 'sent', 'accepted'));
  END IF;
END $$;

-- When the invite email was sent
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ;

-- Email address used for invite (before auth.users record exists)
-- This allows matching the invited email to the organization_member record
-- when the user accepts the invite and creates their account
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS invited_email VARCHAR(255);

-- Make user_id nullable to support pre-invite member records
-- The owner creates member records during setup wizard, user_id is set when invite is accepted
ALTER TABLE organization_members
ALTER COLUMN user_id DROP NOT NULL;

-- Add index for looking up members by invited email (for invite acceptance matching)
CREATE INDEX IF NOT EXISTS idx_org_members_invited_email ON organization_members(invited_email) WHERE invited_email IS NOT NULL;

-- Add index for invite status queries (admin dashboard filtering)
CREATE INDEX IF NOT EXISTS idx_org_members_invite_status ON organization_members(invite_status);

-- Add comments explaining the new columns
COMMENT ON COLUMN organization_members.display_name IS 'Employee full name, set by owner during onboarding wizard';
COMMENT ON COLUMN organization_members.job_title IS 'Employee job title, set by owner during onboarding wizard';
COMMENT ON COLUMN organization_members.has_direct_reports IS 'Whether this employee manages other employees';
COMMENT ON COLUMN organization_members.can_view_reports IS 'Whether this employee can view analytics/reports';
COMMENT ON COLUMN organization_members.invite_status IS 'Invite lifecycle: pending (not sent), sent (email sent), accepted (user active)';
COMMENT ON COLUMN organization_members.invite_sent_at IS 'Timestamp when invite email was sent';
COMMENT ON COLUMN organization_members.invited_email IS 'Email address for invite, used to match auth.users on acceptance';
