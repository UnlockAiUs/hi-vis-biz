-- Migration: 007_complete_rls_setup.sql
-- Description: Complete RLS setup with all policies and exec_sql function
-- Run this in Supabase SQL Editor to fix organization creation
-- Created: 2025-11-25

-- ============================================
-- PART 1: Create exec_sql function for MCP server
-- ============================================

CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  EXECUTE sql_query INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;

-- ============================================
-- PART 2: Helper functions (idempotent)
-- ============================================

CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = check_org_id AND user_id = auth.uid() AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_org_admin(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = check_org_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: Drop all existing policies (clean slate)
-- ============================================

-- Organizations policies
DROP POLICY IF EXISTS "org_members_can_view_org" ON organizations;
DROP POLICY IF EXISTS "org_owners_can_update_org" ON organizations;
DROP POLICY IF EXISTS "authenticated_can_create_org" ON organizations;
DROP POLICY IF EXISTS "authenticated_users_can_create_orgs" ON organizations;
DROP POLICY IF EXISTS "org_admins_can_update_orgs" ON organizations;

-- Departments policies
DROP POLICY IF EXISTS "org_members_can_view_departments" ON departments;
DROP POLICY IF EXISTS "org_admins_can_create_departments" ON departments;
DROP POLICY IF EXISTS "org_admins_can_update_departments" ON departments;
DROP POLICY IF EXISTS "org_admins_can_delete_departments" ON departments;

-- Organization members policies
DROP POLICY IF EXISTS "org_members_can_view_members" ON organization_members;
DROP POLICY IF EXISTS "org_admins_can_insert_members" ON organization_members;
DROP POLICY IF EXISTS "org_admins_can_update_members" ON organization_members;
DROP POLICY IF EXISTS "users_can_update_own_membership" ON organization_members;
DROP POLICY IF EXISTS "users_can_become_owner_or_admins_insert" ON organization_members;
DROP POLICY IF EXISTS "users_can_view_own_or_org_members" ON organization_members;

-- User profiles policies (if table exists)
DROP POLICY IF EXISTS "users_can_view_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admins_can_view_org_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;

-- ============================================
-- PART 4: Create all policies
-- ============================================

-- ORGANIZATIONS POLICIES
-- Allow any authenticated user to create an organization
CREATE POLICY "authenticated_can_create_org" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Members can view their organization
CREATE POLICY "org_members_can_view_org" ON organizations
  FOR SELECT USING (is_org_member(id));

-- Owners can update their organization
CREATE POLICY "org_owners_can_update_org" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = id AND user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- DEPARTMENTS POLICIES
CREATE POLICY "org_members_can_view_departments" ON departments
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "org_admins_can_create_departments" ON departments
  FOR INSERT WITH CHECK (is_org_admin(org_id));

CREATE POLICY "org_admins_can_update_departments" ON departments
  FOR UPDATE USING (is_org_admin(org_id));

CREATE POLICY "org_admins_can_delete_departments" ON departments
  FOR DELETE USING (is_org_admin(org_id));

-- ORGANIZATION MEMBERS POLICIES
-- Users can view their own membership or members in their org
CREATE POLICY "users_can_view_own_or_org_members" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    is_org_member(org_id)
  );

-- Allow users to insert themselves as owner of a NEW org (no existing members)
-- OR allow existing admins to insert new members
CREATE POLICY "users_can_become_owner_or_admins_insert" ON organization_members
  FOR INSERT WITH CHECK (
    -- Case 1: User is already an admin of this org
    is_org_admin(org_id)
    OR
    -- Case 2: User is inserting themselves as owner of a brand new org
    (
      user_id = auth.uid() 
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM organization_members om WHERE om.org_id = organization_members.org_id
      )
    )
  );

-- Admins can update members
CREATE POLICY "org_admins_can_update_members" ON organization_members
  FOR UPDATE USING (is_org_admin(org_id));

-- Users can update their own membership status
CREATE POLICY "users_can_update_own_membership" ON organization_members
  FOR UPDATE USING (user_id = auth.uid());

-- USER PROFILES POLICIES (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "users_can_view_own_profile" ON user_profiles FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "admins_can_view_org_profiles" ON user_profiles FOR SELECT USING (is_org_admin(org_id))';
    EXECUTE 'CREATE POLICY "users_can_update_own_profile" ON user_profiles FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "users_can_insert_own_profile" ON user_profiles FOR INSERT WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- ============================================
-- PART 5: Verify RLS is enabled
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Enable on user_profiles if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY (run this to check)
-- ============================================
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;
