/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/api/auth/link-invite/route.ts
 * PURPOSE: Links invited users to their organization membership after signup
 * EXPORTS: POST handler
 * 
 * KEY LOGIC:
 * - Called after user completes invite signup flow
 * - Finds organization_members record by invited_email where user_id is null
 * - Links the auth user to that membership record
 * - Updates status to 'active' and invite_status to 'accepted'
 * - Uses service role to bypass RLS (needed because user_id was null)
 * - Returns isNewUser:true if no invited membership found (user needs to create org)
 */

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// This route uses the service role key to link invited users to their org membership
// The service role key bypasses RLS, which is needed because the organization_members
// record has user_id = NULL until we link it here

export async function POST() {
  try {
    // Get the authenticated user from the request
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authenticated user' },
        { status: 401 }
      )
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'No email', message: 'User has no email address' },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Missing service role key or URL')
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // First check if user already has a membership by user_id
    const { data: existingMembership } = await adminClient
      .from('organization_members')
      .select('id, org_id, invited_email')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMembership) {
      // User already linked, just update status
      await adminClient
        .from('organization_members')
        .update({ 
          status: 'active', 
          invite_status: 'accepted' 
        })
        .eq('user_id', user.id)

      return NextResponse.json({
        success: true,
        linked: false,
        message: 'User already has membership',
        membership: existingMembership
      })
    }

    // Find the invited membership record by email
    const { data: invitedMembership, error: findError } = await adminClient
      .from('organization_members')
      .select('id, org_id, invited_email, display_name, job_title')
      .eq('invited_email', user.email)
      .is('user_id', null)
      .maybeSingle()

    if (findError) {
      console.error('Error finding invited membership:', findError)
      return NextResponse.json(
        { error: 'Database error', message: findError.message },
        { status: 500 }
      )
    }

    if (!invitedMembership) {
      // No invited membership found - this is a new user who needs to create an org
      return NextResponse.json({
        success: true,
        linked: false,
        isNewUser: true,
        message: 'No invited membership found for this email'
      })
    }

    // Link the user to their invited membership
    const { error: updateError } = await adminClient
      .from('organization_members')
      .update({
        user_id: user.id,
        status: 'active',
        invite_status: 'accepted'
      })
      .eq('id', invitedMembership.id)

    if (updateError) {
      console.error('Error linking membership:', updateError)
      return NextResponse.json(
        { error: 'Link error', message: updateError.message },
        { status: 500 }
      )
    }

    console.log(`Successfully linked user ${user.id} to membership ${invitedMembership.id}`)

    return NextResponse.json({
      success: true,
      linked: true,
      membership: invitedMembership,
      message: 'Successfully linked user to invited membership'
    })

  } catch (err) {
    console.error('Link invite error:', err)
    return NextResponse.json(
      { error: 'Server error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
