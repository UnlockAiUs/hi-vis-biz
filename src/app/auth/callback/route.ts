/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/auth/callback/route.ts
 * PURPOSE: Auth callback handler for Supabase auth flows - SMART ROUTING
 * 
 * HANDLES:
 * - OAuth/PKCE flows (code exchange)
 * - Token-based flows (token_hash)
 * - Direct token flows (access_token, refresh_token)
 * - Invite user linking (updates organization_members)
 * 
 * SMART ROUTING LOGIC:
 * 1. Invite users → /auth/set-password
 * 2. No membership → /admin/setup (new org owner)
 * 3. Owner/Admin → /admin
 * 4. Member without profile → /onboarding
 * 5. Member with profile → /dashboard
 * 
 * USES SERVICE ROLE for DB operations (bypasses RLS)
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const access_token = searchParams.get('access_token')
  const refresh_token = searchParams.get('refresh_token')

  const supabase = await createClient()
  let error = null
  let isInvite = type === 'invite'
  let authUser: { id: string; email?: string } | null = null

  // Handle tokens passed as query params (some Supabase configurations)
  if (access_token && refresh_token) {
    const result = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })
    error = result.error
    authUser = result.data?.user ?? null
  }
  // Handle invite/recovery/signup flows (uses token_hash)
  else if (token_hash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'invite' | 'recovery' | 'signup' | 'email',
    })
    error = result.error
    authUser = result.data?.user ?? null
  }
  // Handle OAuth/PKCE flows (uses code)
  else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
    authUser = result.data?.user ?? null
  }
  
  if (!error && authUser) {
    // Use service role client for database operations (bypasses RLS)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const userEmail = authUser.email
    
    // For invite users, link auth user to existing organization_members record
    if (isInvite && userEmail) {
      try {
        // Find and update the organization_member record that matches this email
        const { error: updateError } = await serviceClient
          .from('organization_members')
          .update({
            user_id: authUser.id,
            invite_status: 'accepted'
          })
          .eq('invited_email', userEmail)
          .is('user_id', null) // Only update records that haven't been linked yet
        
        if (updateError) {
          console.error('Error linking invite to user:', updateError)
        } else {
          console.log(`Successfully linked invite for ${userEmail} to user ${authUser.id}`)
        }
      } catch (linkError) {
        console.error('Error in invite linking process:', linkError)
      }
      
      // Invite users go to set-password page
      return redirectTo(request, '/auth/set-password')
    }
    
    // SMART ROUTING: Determine where to send the user based on their status
    try {
      // Check if user has an organization_members record
      const { data: membership, error: membershipError } = await serviceClient
        .from('organization_members')
        .select('role, invite_status')
        .eq('user_id', authUser.id)
        .maybeSingle()
      
      if (membershipError) {
        console.error('Error checking membership:', membershipError)
      }
      
      if (!membership) {
        // NO MEMBERSHIP = NEW USER
        // They just signed up and need to create their organization
        console.log(`New user ${authUser.id} - routing to /admin/setup`)
        return redirectTo(request, '/admin/setup')
      }
      
      // User has membership - check their role
      if (membership.role === 'owner' || membership.role === 'admin') {
        // Admin/Owner - send to admin dashboard
        console.log(`Admin/Owner ${authUser.id} - routing to /admin`)
        return redirectTo(request, '/admin')
      }
      
      // Regular employee - check if they've completed onboarding
      const { data: profile, error: profileError } = await serviceClient
        .from('user_profiles')
        .select('profile_json')
        .eq('user_id', authUser.id)
        .maybeSingle()
      
      if (profileError) {
        console.error('Error checking profile:', profileError)
      }
      
      // Check if profile exists and has required info
      const profileComplete = profile?.profile_json?.name || profile?.profile_json?.title
      
      if (!profileComplete && membership.invite_status !== 'accepted') {
        // Employee hasn't completed onboarding
        console.log(`Employee ${authUser.id} needs onboarding - routing to /onboarding`)
        return redirectTo(request, '/onboarding')
      }
      
      // Employee with completed profile - send to dashboard
      console.log(`Employee ${authUser.id} - routing to /dashboard`)
      return redirectTo(request, '/dashboard')
      
    } catch (routingError) {
      console.error('Error in smart routing:', routingError)
      // Fallback: send to dashboard and let middleware handle it
      return redirectTo(request, '/dashboard')
    }
  }

  // Handle error case
  if (error) {
    console.error('Auth callback error:', error)
    return redirectTo(request, '/auth/auth-code-error')
  }
  
  // No user and no error - something went wrong
  console.error('Auth callback: No user and no error')
  return redirectTo(request, '/auth/auth-code-error')
}

// Helper function to handle redirects with proper base URL
function redirectTo(request: Request, path: string): NextResponse {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  
  let baseUrl: string
  if (isLocalEnv) {
    baseUrl = origin
  } else if (forwardedHost) {
    baseUrl = `https://${forwardedHost}`
  } else {
    baseUrl = origin
  }
  
  return NextResponse.redirect(`${baseUrl}${path}`)
}
