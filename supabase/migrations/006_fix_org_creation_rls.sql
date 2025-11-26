-- Migration: 006_fix_org_creation_rls.sql
-- Description: Fix RLS policies to allow initial organization creation
-- Created: 2025-11-25

-- The problem: When creating a new org, the user needs to:
-- 1. Create the organization record
-- 2. Create themselves as an owner member
-- But existing policies may be too restrictive for step 1.

-- Solution: 
-- 1. Allow any authenticated user to create an organization
-- 2. Allow users to insert themselves as owner of a new org

-- ============================================
-- FIX 1: Allow authenticated users to create organizations
-- ============================================

-- Drop any existing insert policy on organizations
DROP POLICY IF EXISTS "authenticated_users_can_create_orgs" ON organizations;
DROP POLICY IF EXISTS "org_admins_can_update" ON organizations;

-- Allow any authenticated user to create an organization
CREATE POLICY "authenticated_users_can_create_orgs" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow org admins/owners to update their organization
CREATE POLICY "org_admins_can_update_orgs" ON organizations
  FOR UPDATE USING (is_org_admin(id));

-- ============================================
-- FIX 2: Allow users to become owner of new orgs
-- ============================================

-- Drop the existing restrictive policy for member insertion
DROP POLICY IF EXISTS "org_admins_can_insert_members" ON organization_members;

-- New policy: Allow admins to insert members OR allow users to insert
-- themselves as owner of a brand new org (no existing members)
CREATE POLICY "users_can_become_owner_or_admins_insert" ON organization_members
  FOR INSERT WITH CHECK (
    -- Case 1: User is already an admin of this org (existing behavior)
    is_org_admin(org_id)
    OR
    -- Case 2: User is inserting themselves as owner of a new org (no existing members)
    (
      user_id = auth.uid() 
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM organization_members WHERE org_id = organization_members.org_id
      )
    )
  );

-- Also allow users to view their own membership even before org is fully set up
-- (needed for the initial check in the setup page)
DROP POLICY IF EXISTS "org_members_can_view_members" ON organization_members;

CREATE POLICY "users_can_view_own_or_org_members" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    is_org_member(org_id)
  );
