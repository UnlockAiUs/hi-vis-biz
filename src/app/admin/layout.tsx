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

  // Check if user is admin/owner of an organization
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations(name, trial_ends_at, subscription_status)')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .maybeSingle()

  // If no org membership or error, allow access to setup page without admin chrome
  if (!membership || membershipError) {
    return <>{children}</>
  }

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
