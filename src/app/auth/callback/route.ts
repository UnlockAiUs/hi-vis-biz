import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()
  let error = null

  // Handle invite/recovery/signup flows (uses token_hash)
  if (token_hash && type) {
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
    
    // For invite type, redirect to onboarding
    const redirectPath = type === 'invite' ? '/onboarding' : next
    
    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${redirectPath}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
    } else {
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
