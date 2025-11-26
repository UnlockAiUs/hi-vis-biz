import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's membership to check if they're admin/owner
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, org_id')
    .eq('user_id', user.id)
    .single()

  // Get user's profile for display name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profile_json')
    .eq('user_id', user.id)
    .single()

  const profileJson = profile?.profile_json as Record<string, unknown> | null
  const displayName = profileJson?.name as string || user.email || 'User'
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and brand */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center">
                <div className="h-8 w-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">Hi-Vis Biz</span>
              </Link>
            </div>

            {/* Navigation links */}
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              <Link
                href="/dashboard"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Dashboard
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  Admin
                </Link>
              )}
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <span className="text-sm text-gray-700">{displayName}</span>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md border border-gray-300"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="sm:hidden border-t border-gray-200 px-4 py-2 flex space-x-2">
          <Link
            href="/dashboard"
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            Dashboard
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Admin
            </Link>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main>{children}</main>
    </div>
  )
}
