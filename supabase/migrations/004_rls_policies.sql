-- Migration: 004_rls_policies.sql
-- Description: Row Level Security policies for all tables
-- Created: 2025-11-25

-- ============================================
-- HELPER FUNCTION: Check if user is org member
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

-- ============================================
-- HELPER FUNCTION: Check if user is org admin/owner
-- ============================================
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
-- ORGANIZATIONS POLICIES
-- ============================================

-- Members can view their org
CREATE POLICY "org_members_can_view_org" ON organizations
  FOR SELECT USING (is_org_member(id));

-- Only owners can update org
CREATE POLICY "org_owners_can_update_org" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = id AND user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Any authenticated user can create an org (they become owner)
CREATE POLICY "authenticated_can_create_org" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- DEPARTMENTS POLICIES
-- ============================================

-- Org members can view departments
CREATE POLICY "org_members_can_view_departments" ON departments
  FOR SELECT USING (is_org_member(org_id));

-- Only admins can create departments
CREATE POLICY "org_admins_can_create_departments" ON departments
  FOR INSERT WITH CHECK (is_org_admin(org_id));

-- Only admins can update departments
CREATE POLICY "org_admins_can_update_departments" ON departments
  FOR UPDATE USING (is_org_admin(org_id));

-- Only admins can delete departments
CREATE POLICY "org_admins_can_delete_departments" ON departments
  FOR DELETE USING (is_org_admin(org_id));

-- ============================================
-- ORGANIZATION_MEMBERS POLICIES
-- ============================================

-- Members can view other members in their org
CREATE POLICY "org_members_can_view_members" ON organization_members
  FOR SELECT USING (is_org_member(org_id));

-- Only admins can insert members
CREATE POLICY "org_admins_can_insert_members" ON organization_members
  FOR INSERT WITH CHECK (is_org_admin(org_id));

-- Only admins can update members
CREATE POLICY "org_admins_can_update_members" ON organization_members
  FOR UPDATE USING (is_org_admin(org_id));

-- Users can update their own status (e.g., accept invite)
CREATE POLICY "users_can_update_own_membership" ON organization_members
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- AGENTS POLICIES (read-only for all authenticated users)
-- ============================================

CREATE POLICY "authenticated_can_view_agents" ON agents
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- TOPIC_ARCHETYPES POLICIES (read-only for all authenticated users)
-- ============================================

CREATE POLICY "authenticated_can_view_topics" ON topic_archetypes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- SESSIONS POLICIES
-- ============================================

-- Users can view their own sessions
CREATE POLICY "users_can_view_own_sessions" ON sessions
  FOR SELECT USING (user_id = auth.uid());

-- Admins can view all sessions in their org
CREATE POLICY "admins_can_view_org_sessions" ON sessions
  FOR SELECT USING (is_org_admin(org_id));

-- System can create sessions (via service role) - handled by service role bypass
-- Users can update their own sessions (start/complete)
CREATE POLICY "users_can_update_own_sessions" ON sessions
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- SESSION_TOPICS POLICIES
-- ============================================

-- Users can view topics for their sessions
CREATE POLICY "users_can_view_own_session_topics" ON session_topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- ============================================
-- ANSWERS POLICIES
-- ============================================

-- Users can view their own answers
CREATE POLICY "users_can_view_own_answers" ON answers
  FOR SELECT USING (user_id = auth.uid());

-- Admins can view all answers in their org (for analytics)
CREATE POLICY "admins_can_view_org_answers" ON answers
  FOR SELECT USING (is_org_admin(org_id));

-- Users can insert their own answers
CREATE POLICY "users_can_insert_own_answers" ON answers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- USER_TOPIC_HISTORY POLICIES
-- ============================================

-- Users can view their own history
CREATE POLICY "users_can_view_own_topic_history" ON user_topic_history
  FOR SELECT USING (user_id = auth.uid());

-- System updates history (via service role) - handled by service role bypass

-- ============================================
-- USER_PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "users_can_view_own_profile" ON user_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Admins can view all profiles in their org
CREATE POLICY "admins_can_view_org_profiles" ON user_profiles
  FOR SELECT USING (is_org_admin(org_id));

-- Users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "users_can_insert_own_profile" ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
