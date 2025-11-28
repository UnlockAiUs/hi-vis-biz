/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/layout.tsx
 * PURPOSE: Admin layout wrapper - auth check, sidebar, trial banner
 * EXPORTS: default AdminLayout (server component)
 * 
 * LOGIC:
 * - No membership → render children only (for /admin/setup)
 * - Has membership → render with sidebar + trial banner
 * 
 * DEPENDENCIES: @/lib/supabase/server, AdminSidebar
 * TABLES: organization_members, organizations
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from './AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // First, check if user has ANY membership (to distinguish new owners from regular employees)
  const { data: anyMembership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  // Check if user is admin/owner of an organization
  const { data: adminMembership, error: membershipError } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations(name, trial_ends_at, subscription_status)')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .maybeSingle()

  // If user has a membership but NOT as admin/owner, show access denied
  if (anyMembership && !adminMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg 
              className="w-8 h-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <h2 className="text-lg font-medium text-gray-700 mb-4">
            You don&apos;t have access to the admin console
          </h2>

          {/* Description */}
          <p className="text-gray-500 mb-8">
            Only organization owners and admins can access this area. 
            If you think you should have access, please contact your administrator.
          </p>

          {/* CTA */}
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to your dashboard
          </Link>
        </div>
      </div>
    )
  }

  // If no org membership at all, allow access to setup page without admin chrome
  // (This is for new org owners who haven't completed setup yet)
  if (!adminMembership || membershipError) {
    return <>{children}</>
  }

  const membership = adminMembership

  const organizations = membership.organizations as { 
    name: string
    trial_ends_at?: string
    subscription_status?: string 
  } | { 
    name: string
    trial_ends_at?: string
    subscription_status?: string 
  }[] | null
  
  const org = Array.isArray(organizations) ? organizations[0] : organizations
  const orgName = org?.name || 'Organization'
  
  // Calculate trial days remaining
  let trialDaysRemaining = 0
  let showTrialBanner = false
  if (org?.subscription_status === 'trialing' && org?.trial_ends_at) {
    const trialEnds = new Date(org.trial_ends_at)
    const now = new Date()
    trialDaysRemaining = Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    showTrialBanner = trialDaysRemaining > 0
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar orgName={orgName} />
      
      {/* Main content */}
      <div className="lg:pl-64">
        {/* Trial Banner */}
        {showTrialBanner && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 text-center text-sm">
            <span className="font-medium">
              {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in your free trial
            </span>
            <span className="mx-2">•</span>
            <Link href="/admin/billing" className="underline hover:no-underline font-medium">
              View billing options
            </Link>
          </div>
        )}
        
        <main className="py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
