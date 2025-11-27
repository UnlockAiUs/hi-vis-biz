import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin, hash } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'
  const access_token = searchParams.get('access_token')
  const refresh_token = searchParams.get('refresh_token')

  const supabase = await createClient()
  let error = null
  let isInvite = type === 'invite'
  let authResult: { data: { user: { id: string; email?: string } | null }; error: Error | null } | null = null

  // Handle tokens passed as query params (some Supabase configurations)
  if (access_token && refresh_token) {
    const result = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })
    error = result.error
    authResult = result as typeof authResult
  }
  // Handle invite/recovery/signup flows (uses token_hash)
  else if (token_hash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'invite' | 'recovery' | 'signup' | 'email',
    })
    error = result.error
    authResult = result as typeof authResult
  }
  // Handle OAuth/PKCE flows (uses code)
  else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
    authResult = result as typeof authResult
  }
  
  if (!error) {
    // For invite users, link auth user to existing organization_members record
    if (isInvite && authResult?.data?.user) {
      const user = authResult.data.user
      const userEmail = user.email
      
      if (userEmail) {
        try {
          // Use service role client to update organization_members (bypasses RLS)
          const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          // Find and update the organization_member record that matches this email
          const { error: updateError } = await serviceClient
            .from('organization_members')
            .update({
              user_id: user.id,
              invite_status: 'accepted'
            })
            .eq('invited_email', userEmail)
            .is('user_id', null) // Only update records that haven't been linked yet
          
          if (updateError) {
            console.error('Error linking invite to user:', updateError)
          } else {
            console.log(`Successfully linked invite for ${userEmail} to user ${user.id}`)
          }
        } catch (linkError) {
          console.error('Error in invite linking process:', linkError)
        }
      }
    }
    
    // Redirect to the next URL or dashboard after successful auth
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    
    // For invite type, redirect to set-password page first
    const redirectPath = isInvite ? '/auth/set-password' : next
    
    let baseUrl: string
    if (isLocalEnv) {
      baseUrl = origin
    } else if (forwardedHost) {
      baseUrl = `https://${forwardedHost}`
    } else {
      baseUrl = origin
    }
    
    return NextResponse.redirect(`${baseUrl}${redirectPath}`)
  }

  // Log the error for debugging
  console.error('Auth callback error:', error)
  
  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
