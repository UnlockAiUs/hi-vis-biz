import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// DELETE /api/admin/members - Delete a member
export async function DELETE(request: NextRequest) {
  try {
    const { memberId } = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    // Verify current user is admin/owner
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check user's membership
    const { data: currentUserMembership } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!currentUserMembership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Use service client for all operations (bypasses RLS)
    const serviceClient = await createServiceClient()

    // Get the member to delete
    const { data: memberToDelete } = await serviceClient
      .from('organization_members')
      .select('org_id, role, user_id')
      .eq('id', memberId)
      .single()

    if (!memberToDelete) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify member is in same org
    if (memberToDelete.org_id !== currentUserMembership.org_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Can't delete owner - they must be demoted first
    if (memberToDelete.role === 'owner') {
      return NextResponse.json({ error: 'Cannot delete an owner. Demote them first.' }, { status: 400 })
    }

    // Delete user profile first (if exists)
    await serviceClient
      .from('user_profiles')
      .delete()
      .eq('user_id', memberToDelete.user_id)

    // Delete the organization membership
    const { error: deleteError } = await serviceClient
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('Delete membership error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Also delete the user from Supabase Auth
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(
      memberToDelete.user_id
    )

    if (authDeleteError) {
      console.error('Delete auth user error:', authDeleteError)
      // Don't fail the request - the membership is already deleted
      // The orphaned auth user can be cleaned up later
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete member error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
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
