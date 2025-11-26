import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's organization membership
  const { data: membership } = await supabase
    .from('organization_members')
    .select(`
      *,
      organizations (name),
      departments (name)
    `)
    .eq('user_id', user.id)
    .single()

  // Get user's profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const profileJson = profile?.profile_json as Record<string, unknown> | null

  // Check if profile is incomplete (redirect to onboarding)
  if (!profileJson?.name) {
    redirect('/onboarding')
  }

  // Get pending sessions for the user
  const { data: pendingSessions } = await supabase
    .from('sessions')
    .select(`
      *,
      agents (name, description)
    `)
    .eq('user_id', user.id)
    .is('completed_at', null)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(5)

  // Get upcoming sessions
  const { data: upcomingSessions } = await supabase
    .from('sessions')
    .select(`
      *,
      agents (name, description)
    `)
    .eq('user_id', user.id)
    .is('completed_at', null)
    .gt('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(3)

  // Get recent completed sessions
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select(`
      *,
      agents (name)
    `)
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(5)

  const orgName = (membership?.organizations as Record<string, unknown>)?.name as string || 'Your Organization'
  const deptName = (membership?.departments as Record<string, unknown>)?.name as string || 'Not assigned'
  const profileGaps = (profileJson?.open_profile_gaps as Array<Record<string, unknown>>) || []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profileJson?.name as string}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {profileJson?.role_summary as string || 'Team member'} at {orgName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending check-ins */}
          {pendingSessions && pendingSessions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-yellow-800 flex items-center mb-4">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You have {pendingSessions.length} check-in{pendingSessions.length > 1 ? 's' : ''} ready
              </h2>
              <div className="space-y-3">
                {pendingSessions.map((session) => {
                  const agent = session.agents as Record<string, unknown>
                  return (
                    <div
                      key={session.id}
                      className="bg-white rounded-lg p-4 border border-yellow-100 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{agent?.name as string || 'Check-in'}</h3>
                        <p className="text-sm text-gray-500">{agent?.description as string || 'Quick conversation'}</p>
                      </div>
                      <button
                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium"
                        disabled
                      >
                        Start (Coming Soon)
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No pending sessions */}
          {(!pendingSessions || pendingSessions.length === 0) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-800 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                All caught up!
              </h2>
              <p className="mt-2 text-sm text-green-700">
                You have no pending check-ins right now. Check back later for your next micro-session.
              </p>
            </div>
          )}

          {/* Upcoming sessions */}
          {upcomingSessions && upcomingSessions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Check-ins</h2>
              <div className="space-y-3">
                {upcomingSessions.map((session) => {
                  const agent = session.agents as Record<string, unknown>
                  const scheduledFor = new Date(session.scheduled_for)
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{agent?.name as string || 'Check-in'}</h3>
                        <p className="text-sm text-gray-500">
                          {scheduledFor.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        Scheduled
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {recentSessions && recentSessions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentSessions.map((session) => {
                  const agent = session.agents as Record<string, unknown>
                  const completedAt = session.completed_at ? new Date(session.completed_at) : null
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{agent?.name as string || 'Check-in'}</h3>
                          <p className="text-sm text-gray-500">
                            {completedAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        Completed
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state if no sessions at all */}
          {(!recentSessions || recentSessions.length === 0) && (!upcomingSessions || upcomingSessions.length === 0) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
              <p className="text-sm text-gray-500">
                Your check-ins will appear here once they&apos;re scheduled. This usually happens within a day of completing your profile.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Name</label>
                <p className="text-sm font-medium text-gray-900">{profileJson?.name as string}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Role</label>
                <p className="text-sm font-medium text-gray-900">{profileJson?.role_summary as string || 'Not set'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Department</label>
                <p className="text-sm font-medium text-gray-900">{deptName}</p>
              </div>
              {profileJson?.location && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Location</label>
                  <p className="text-sm font-medium text-gray-900">{profileJson?.location as string}</p>
                </div>
              )}
            </div>
            <Link
              href="/onboarding"
              className="mt-4 block text-center text-sm text-yellow-600 hover:text-yellow-700"
            >
              Edit profile
            </Link>
          </div>

          {/* Profile completeness */}
          {profileGaps.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">Complete Your Profile</h2>
              <p className="text-sm text-blue-700 mb-4">
                Answer a few more questions to help us personalize your experience.
              </p>
              <ul className="space-y-2">
                {profileGaps.slice(0, 3).map((gap, index) => (
                  <li key={gap.id as string || index} className="flex items-center text-sm text-blue-700">
                    <svg className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {gap.description as string}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick stats */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{recentSessions?.length || 0}</p>
                <p className="text-xs text-gray-500">Check-ins completed</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{profile?.version || 1}</p>
                <p className="text-xs text-gray-500">Profile version</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
