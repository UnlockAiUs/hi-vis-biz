/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/api/admin/setup/route.ts
 * PURPOSE: Organization creation API - creates new org + owner membership
 * EXPORTS: POST (create organization)
 * 
 * POST: Creates org, adds user as owner, creates user_profile
 * - Uses service role client to bypass RLS
 * - Validates user not already in org
 * - Rolls back on failure
 * 
 * DEPENDENCIES: @supabase/supabase-js, @supabase/ssr
 * TABLES: organizations, organization_members, user_profiles
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create a Supabase client with the service role key for privileged operations
function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Create a Supabase client to verify the user's session
async function createUserClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { name, timezone, size_band } = body

    // Validate required fields
    if (!name || !timezone || !size_band) {
      return NextResponse.json(
        { error: 'Missing required fields: name, timezone, size_band' },
        { status: 400 }
      )
    }

    // Get the authenticated user from the session
    const userClient = await createUserClient()
    const { data: { user }, error: userError } = await userClient.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to create an organization' },
        { status: 401 }
      )
    }

    // Use service role client for privileged operations
    const serviceClient = createServiceRoleClient()

    // Check if user already has an organization
    // Use maybeSingle() to handle 0 results without error
    const { data: existingMembership } = await serviceClient
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of an organization' },
        { status: 400 }
      )
    }

    // Create organization using service role (bypasses RLS)
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .insert({
        name,
        timezone,
        size_band,
      })
      .select()
      .single()

    if (orgError) {
      console.error('Failed to create organization:', orgError)
      return NextResponse.json(
        { error: `Failed to create organization: ${orgError.message}` },
        { status: 500 }
      )
    }

    // Create organization_member with owner role
    const { error: memberError } = await serviceClient
      .from('organization_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'owner',
        level: 'exec',
        status: 'active',
      })

    if (memberError) {
      // Rollback org creation if member creation fails
      await serviceClient.from('organizations').delete().eq('id', org.id)
      console.error('Failed to create organization member:', memberError)
      return NextResponse.json(
        { error: `Failed to create organization member: ${memberError.message}` },
        { status: 500 }
      )
    }

    // Create initial user_profile
    const { error: profileError } = await serviceClient
      .from('user_profiles')
      .insert({
        org_id: org.id,
        user_id: user.id,
        profile_json: {},
      })

    if (profileError) {
      console.error('Failed to create user profile:', profileError)
      // Non-critical, continue anyway
    }

    return NextResponse.json({
      success: true,
      organization: org,
    })
  } catch (error) {
    console.error('Organization setup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
