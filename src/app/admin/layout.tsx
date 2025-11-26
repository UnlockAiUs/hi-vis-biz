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
    .select('org_id, role, organizations(name)')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .maybeSingle()

  // If no org membership or error, allow access to setup page without admin chrome
  if (!membership || membershipError) {
    return <>{children}</>
  }

  const organizations = membership.organizations as { name: string } | { name: string }[] | null
  const orgName = Array.isArray(organizations) 
    ? organizations[0]?.name 
    : organizations?.name || 'Organization'

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar orgName={orgName} />
      
      {/* Main content */}
      <div className="lg:pl-64">
        <main className="py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
