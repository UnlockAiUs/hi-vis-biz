/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/components/auth/HashHandler.tsx
 * PURPOSE: Client component to handle auth tokens in URL hash fragment
 * EXPORTS: default HashHandler component
 * 
 * WHY NEEDED: Supabase invite links redirect to /#access_token=...&type=invite
 * Hash fragments are client-side only, so server can't read them.
 * 
 * ROUTING BEHAVIOR:
 * - type=invite → /auth/set-password
 * - type=recovery → /auth/set-password
 * - other → /auth/callback (smart routing)
 * 
 * USED IN: src/app/layout.tsx (global, runs on every page)
 * DEPENDENCIES: @/lib/supabase/client
 */

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
              // SMART ROUTING for signup verification and other auth flows
              // Check membership and route accordingly (same logic as callback/route.ts)
              try {
                const { data: membership } = await supabase
                  .from('organization_members')
                  .select('role, invite_status')
                  .eq('user_id', data.session.user.id)
                  .maybeSingle()
                
                if (!membership) {
                  // NO MEMBERSHIP = NEW USER
                  // They just signed up and need to create their organization
                  console.log('HashHandler: New user - routing to /admin/setup')
                  router.push('/admin/setup')
                } else if (membership.role === 'owner' || membership.role === 'admin') {
                  // Admin/Owner - send to admin dashboard
                  console.log('HashHandler: Admin/Owner - routing to /admin')
                  router.push('/admin')
                } else {
                  // Regular employee - check if they've completed onboarding
                  const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('profile_json')
                    .eq('user_id', data.session.user.id)
                    .maybeSingle()
                  
                  const profileComplete = profile?.profile_json?.name || profile?.profile_json?.title
                  
                  if (!profileComplete && membership.invite_status !== 'accepted') {
                    console.log('HashHandler: Employee needs onboarding - routing to /onboarding')
                    router.push('/onboarding')
                  } else {
                    console.log('HashHandler: Employee - routing to /dashboard')
                    router.push('/dashboard')
                  }
                }
              } catch (routingError) {
                console.error('HashHandler: Error in smart routing:', routingError)
                // Fallback: send to dashboard and let middleware/layout handle it
                router.push('/dashboard')
              }
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
