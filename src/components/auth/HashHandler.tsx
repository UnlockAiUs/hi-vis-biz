'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * This component handles auth tokens that come in the URL hash fragment.
 * Supabase invite links redirect to: /#access_token=...&type=invite
 * Hash fragments are client-side only, so we need to process them here.
 */
export default function HashHandler() {
  const router = useRouter()

  useEffect(() => {
    const handleHashAuth = async () => {
      // Check if we have auth tokens in the hash
      if (typeof window === 'undefined') return
      
      const hash = window.location.hash
      if (!hash || hash.length < 2) return
      
      // Parse the hash fragment (remove the leading #)
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')
      
      // If we have auth tokens, process them
      if (accessToken && refreshToken) {
        console.log('HashHandler: Found auth tokens in hash, type:', type)
        
        try {
          const supabase = createClient()
          
          // Set the session with the tokens from the hash
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (error) {
            console.error('HashHandler: Error setting session:', error)
            router.push('/auth/auth-code-error')
            return
          }
          
          if (data.session) {
            console.log('HashHandler: Session set successfully')
            
            // Clear the hash from the URL
            window.history.replaceState(null, '', window.location.pathname)
            
            // Redirect based on type
            if (type === 'invite') {
              // Invite users need to set their password
              router.push('/auth/set-password')
            } else if (type === 'recovery') {
              // Password recovery users also go to set-password
              router.push('/auth/set-password')
            } else {
              // Other authenticated users go through normal routing
              router.push('/auth/callback')
            }
          }
        } catch (err) {
          console.error('HashHandler: Exception processing auth:', err)
          router.push('/auth/auth-code-error')
        }
      }
    }
    
    handleHashAuth()
  }, [router])
  
  // This component doesn't render anything visible
  return null
}
