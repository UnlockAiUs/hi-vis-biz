/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/dashboard/layout.tsx
 * PURPOSE: Layout wrapper for employee dashboard with navigation
 * EXPORTS: DashboardLayout (default)
 * 
 * KEY LOGIC:
 * - Server component that verifies user authentication
 * - Redirects to /auth/login if not authenticated
 * - Fetches membership role to show/hide Admin link
 * - Displays user name from profile_json.name
 * - Provides logout button using server action
 */

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
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role, org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Get user's profile for display name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('profile_json')
    .eq('user_id', user.id)
    .maybeSingle()

  const profileJson = profile?.profile_json as Record<string, unknown> | null
  const displayName = profileJson?.name as string || user.email || 'User'
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'

  // If user has no organization membership, show friendly no-team message
  if (!membership || membershipError) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Minimal nav for no-membership state */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">VizDots</span>
              </div>
              <div className="flex items-center">
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
        </nav>

        {/* No membership message */}
        <div className="flex items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg 
                className="w-8 h-8 text-blue-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
                />
              </svg>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              No team connected yet
            </h1>
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              We couldn&apos;t find a team linked to your account
            </h2>

            {/* Description */}
            <p className="text-gray-500 mb-8">
              Ask your admin to invite you to their VizDots workspace, or contact support if you think this is a mistake.
            </p>

            {/* CTAs */}
            <div className="space-y-3">
              <a
                href="mailto:support@vizdots.com?subject=Help%20connecting%20to%20my%20team"
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact support
              </a>
              <form action={logout} className="w-full">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign out and try a different account
                </button>
              </form>
            </div>

            {/* Help text */}
            <p className="mt-8 text-sm text-gray-400">
              If you&apos;re an admin setting up a new workspace, go to{' '}
              <Link href="/admin/setup" className="text-blue-600 hover:text-blue-500 underline">
                admin setup
              </Link>.
            </p>
          </div>
        </div>
      </div>
    )
  }

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
                <span className="ml-2 text-xl font-bold text-gray-900">VizDots</span>
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
              <Link
                href="/dashboard/settings"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Settings
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
          <Link
            href="/dashboard/settings"
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            Settings
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
