/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/api/admin/members/route.ts
 * PURPOSE: API endpoints for managing organization members (update role, status)
 * EXPORTS: DELETE (disabled), PATCH handlers
 * 
 * KEY LOGIC:
 * - DELETE: DISABLED - Users can never be deleted, only deactivated
 * - PATCH: Update member role (owner/admin/member) or status (active/inactive)
 * - Only owners can change roles
 * - Ensures at least one owner always exists
 * - Uses service client to bypass RLS for admin operations
 * 
 * IMPORTANT: Users are NEVER deleted. They can only be deactivated.
 * This preserves all historical data for analytics and compliance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// DELETE /api/admin/members - DISABLED
// Users can NEVER be deleted. They can only be deactivated.
// This preserves all historical data for analytics and compliance.
export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'User deletion is not allowed. Users can only be deactivated to preserve historical data. Use PATCH to change status to "inactive".' 
    }, 
    { status: 405 }
  )
}

// PATCH /api/admin/members - Update member role
export async function PATCH(request: NextRequest) {
  try {
    const { memberId, role } = await request.json()

    if (!memberId || !role) {
      return NextResponse.json({ error: 'Member ID and role are required' }, { status: 400 })
    }

    // Only allow certain roles
    if (!['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Verify current user is owner (only owners can change roles)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use service client for all operations (bypasses RLS)
    const serviceClient = await createServiceClient()

    // Check user is owner
    const { data: currentUserMembership } = await serviceClient
      .from('organization_members')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single()

    if (!currentUserMembership) {
      return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 })
    }

    // Get the member to update
    const { data: memberToUpdate } = await serviceClient
      .from('organization_members')
      .select('id, org_id, role, user_id')
      .eq('id', memberId)
      .single()

    if (!memberToUpdate) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify member is in same org
    if (memberToUpdate.org_id !== currentUserMembership.org_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // If demoting an owner, ensure there's at least one other owner
    if (memberToUpdate.role === 'owner' && role !== 'owner') {
      const { data: owners } = await serviceClient
        .from('organization_members')
        .select('id')
        .eq('org_id', currentUserMembership.org_id)
        .eq('role', 'owner')

      if (!owners || owners.length <= 1) {
        return NextResponse.json({ 
          error: 'Cannot demote the last owner. Promote someone else to owner first.' 
        }, { status: 400 })
      }
    }

    // Update the role
    const { error: updateError } = await serviceClient
      .from('organization_members')
      .update({ role })
      .eq('id', memberId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Update member role error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
