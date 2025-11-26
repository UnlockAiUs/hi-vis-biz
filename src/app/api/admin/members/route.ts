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

    // Get the member to delete
    const { data: memberToDelete } = await supabase
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

    // Can't delete owner
    if (memberToDelete.role === 'owner') {
      return NextResponse.json({ error: 'Cannot delete organization owner' }, { status: 400 })
    }

    // Use service client to delete (bypasses RLS)
    const serviceClient = await createServiceClient()
    
    const { error: deleteError } = await serviceClient
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
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

// PATCH /api/admin/members - Update member role (promote to owner)
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

    // Verify current user is owner (only owners can promote)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check user is owner
    const { data: currentUserMembership } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single()

    if (!currentUserMembership) {
      return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 })
    }

    // Get the member to update
    const { data: memberToUpdate } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('id', memberId)
      .single()

    if (!memberToUpdate) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify member is in same org
    if (memberToUpdate.org_id !== currentUserMembership.org_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Use service client to update (bypasses RLS)
    const serviceClient = await createServiceClient()
    
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
