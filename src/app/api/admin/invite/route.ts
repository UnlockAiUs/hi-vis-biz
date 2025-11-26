import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const { email, level, department_id } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Get current user and verify they're an admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is admin/owner of an organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const orgId = membership.org_id

    // Use service client for admin operations
    const serviceClient = await createServiceClient()

    // Invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hi-vis-biz.vercel.app'}/auth/callback?next=/onboarding`,
    })

    if (inviteError) {
      // Check if user already exists
      if (inviteError.message.includes('already been registered')) {
        // User exists, try to find them and add to org
        const { data: existingUsers } = await serviceClient.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email === email)
        
        if (existingUser) {
          // Check if already a member
          const { data: existingMembership } = await supabase
            .from('organization_members')
            .select('id')
            .eq('org_id', orgId)
            .eq('user_id', existingUser.id)
            .single()

          if (existingMembership) {
            return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 })
          }

          // Add existing user to organization
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              org_id: orgId,
              user_id: existingUser.id,
              role: 'member',
              level: level || 'ic',
              department_id: department_id || null,
              status: 'active',
            })

          if (memberError) {
            return NextResponse.json({ error: memberError.message }, { status: 500 })
          }

          return NextResponse.json({ success: true, message: 'Existing user added to organization' })
        }
      }
      
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    if (!inviteData.user) {
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Create organization_member record with invited status
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        org_id: orgId,
        user_id: inviteData.user.id,
        role: 'member',
        level: level || 'ic',
        department_id: department_id || null,
        status: 'invited',
      })

    if (memberError) {
      // Clean up: delete the invited user if we can't create the membership
      await serviceClient.auth.admin.deleteUser(inviteData.user.id)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // Create initial user_profile
    await supabase
      .from('user_profiles')
      .insert({
        org_id: orgId,
        user_id: inviteData.user.id,
        profile_json: {},
      })

    return NextResponse.json({ 
      success: true, 
      message: `Invitation sent to ${email}`,
      userId: inviteData.user.id 
    })

  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
