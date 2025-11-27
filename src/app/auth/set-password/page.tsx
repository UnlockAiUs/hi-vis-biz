'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check for session or handle hash fragments from Supabase
    const checkSession = async () => {
      try {
        // First, try to get the session from URL hash (Supabase sometimes sends tokens in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          // Set the session from URL hash
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) {
            console.error('Error setting session from hash:', sessionError)
          }
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
        }
        
        // Now check if we have a valid session
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('No user session found:', userError?.message)
          setError('Your session has expired or is invalid. Please request a new invite.')
          setChecking(false)
          return
        }
        
        setUserEmail(user.email || null)
        setChecking(false)
      } catch (err) {
        console.error('Session check error:', err)
        setError('An error occurred while verifying your session.')
        setChecking(false)
      }
    }
    
    checkSession()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    // Double-check we have a session before updating
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Session expired. Please request a new invite from your administrator.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // IMPORTANT: Call the server-side API to link invited users to their org membership
    // This uses the service role key to bypass RLS (since organization_members records
    // have user_id = NULL until linked)
    try {
      const linkResponse = await fetch('/api/auth/link-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const linkResult = await linkResponse.json()
      console.log('Link invite result:', linkResult)
      
      if (linkResult.linked) {
        console.log('Successfully linked user to invited membership')
      } else if (linkResult.isNewUser) {
        console.log('New user - no invited membership found')
      }
    } catch (linkErr) {
      console.error('Error calling link-invite API:', linkErr)
      // Continue anyway - the onboarding page will handle the routing
    }

    // Password set successfully, redirect to onboarding to complete profile
    router.push('/onboarding')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your invitation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {userEmail ? (
              <>Welcome <strong>{userEmail}</strong>! Please create a password for your account.</>
            ) : (
              'Welcome! Please create a password for your account.'
            )}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              {loading ? 'Setting password...' : 'Set Password & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
