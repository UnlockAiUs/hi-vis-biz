import { createClient } from '@/lib/supabase/server'
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

  // Handle tokens passed as query params (some Supabase configurations)
  if (access_token && refresh_token) {
    const result = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })
    error = result.error
  }
  // Handle invite/recovery/signup flows (uses token_hash)
  else if (token_hash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'invite' | 'recovery' | 'signup' | 'email',
    })
    error = result.error
  }
  // Handle OAuth/PKCE flows (uses code)
  else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
  }
  
  if (!error) {
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
