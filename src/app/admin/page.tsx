/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/page.tsx
 * PURPOSE: Admin dashboard - Today's dots, participation, themes, early warnings, quick actions
 * EXPORTS: default AdminDashboardPage (server component)
 * 
 * LOGIC:
 * - No org membership → redirect to /admin/setup
 * - Shows "Today" section: Dots today, participation rate, top themes
 * - Shows "Early Warning Signals" when friction keywords or participation drops detected
 * - Stats: total members, active members, departments
 * - Quick action cards for common tasks
 * - Getting started guide for new orgs
 * 
 * DEPENDENCIES: @/lib/supabase/server
 * TABLES: organization_members, organizations, departments, sessions, answers
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Check if user has an organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations(name, subscription_status, trial_ends_at)')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single()

  if (!membership) {
    redirect('/admin/setup')
  }

  const orgId = membership.org_id
  // Handle the organization data - Supabase types foreign key relations as arrays
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgDataRaw = membership.organizations as any
  const orgName = (Array.isArray(orgDataRaw) ? orgDataRaw[0]?.name : orgDataRaw?.name) || 'Your Organization'

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get this week's date range (Monday to Sunday)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  // Get last week's date range for comparison
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(lastWeekStart)
  lastWeekEnd.setDate(lastWeekStart.getDate() + 7)

  // Get stats
  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: departments },
    { data: todaysSessions },
    { data: weekSessions },
    { data: lastWeekSessions },
    { data: recentAnswers },
    { data: departmentsList },
    { data: membersByDept },
  ] = await Promise.all([
    supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
    supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'active'),
    supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
    // Today's sessions
    supabase
      .from('sessions')
      .select('id, completed_at')
      .eq('org_id', orgId)
      .gte('scheduled_for', today.toISOString())
      .lt('scheduled_for', tomorrow.toISOString()),
    // This week's sessions
    supabase
      .from('sessions')
      .select('id, completed_at, user_id')
      .eq('org_id', orgId)
      .gte('scheduled_for', weekStart.toISOString())
      .lt('scheduled_for', weekEnd.toISOString()),
    // Last week's sessions for comparison
    supabase
      .from('sessions')
      .select('id, completed_at, user_id')
      .eq('org_id', orgId)
      .gte('scheduled_for', lastWeekStart.toISOString())
      .lt('scheduled_for', lastWeekEnd.toISOString()),
    // Recent answers for theme extraction and warning signals (last 100)
    supabase
      .from('answers')
      .select('structured_output, created_at')
      .eq('org_id', orgId)
      .not('structured_output', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
    // Get departments list
    supabase
      .from('departments')
      .select('id, name')
      .eq('org_id', orgId),
    // Get members by department for participation tracking
    supabase
      .from('organization_members')
      .select('user_id, department_id')
      .eq('org_id', orgId)
      .eq('status', 'active'),
  ])

  // Calculate today's dots
  const dotsToday = todaysSessions?.filter(s => s.completed_at !== null).length || 0
  const expectedToday = todaysSessions?.length || 0
  
  // Calculate this week's dots
  const dotsThisWeek = weekSessions?.filter(s => s.completed_at !== null).length || 0
  const expectedThisWeek = weekSessions?.length || 0

  // Calculate participation rate (active members who have completed at least one session this week)
  const participationRate = expectedThisWeek > 0 
    ? Math.round((dotsThisWeek / expectedThisWeek) * 100) 
    : 0

  // Extract top themes from recent answers
  const themes: Record<string, number> = {}
  recentAnswers?.forEach(answer => {
    const output = answer.structured_output as Record<string, unknown>
    if (!output) return
    
    // Extract from pain_scanner
    if (output.reason && typeof output.reason === 'string') {
      const words = output.reason.toLowerCase().split(/\s+/)
      words.forEach(word => {
        if (word.length > 4 && !['about', 'their', 'there', 'these', 'those', 'would', 'could', 'should'].includes(word)) {
          themes[word] = (themes[word] || 0) + 1
        }
      })
    }
    
    // Extract from workflow_mapper
    if (output.workflow_name && typeof output.workflow_name === 'string') {
      themes[output.workflow_name.toLowerCase()] = (themes[output.workflow_name.toLowerCase()] || 0) + 2
    }
    
    // Extract from focus_tracker
    if (output.current_focus_label && typeof output.current_focus_label === 'string') {
      themes[output.current_focus_label.toLowerCase()] = (themes[output.current_focus_label.toLowerCase()] || 0) + 2
    }
  })
  
  // Get top 3 themes
  const topThemes = Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme.charAt(0).toUpperCase() + theme.slice(1))

  // ========== EARLY WARNING SIGNALS ==========
  const warnings: Array<{ type: 'friction' | 'participation'; message: string; severity: 'high' | 'medium' | 'low' }> = []

  // 1. Detect warning keywords in recent answers
  const warningKeywords = ['blocked', 'delay', 'waiting', 'stuck', 'slow', 'problem', 'issue', 'frustrated', 'bottleneck', 'backlog']
  const warningMentions: Record<string, number> = {}
  
  recentAnswers?.forEach(answer => {
    const output = answer.structured_output as Record<string, unknown>
    if (!output) return
    
    // Check pain_scanner reasons
    if (output.reason && typeof output.reason === 'string') {
      const reasonLower = output.reason.toLowerCase()
      warningKeywords.forEach(keyword => {
        if (reasonLower.includes(keyword)) {
          warningMentions[keyword] = (warningMentions[keyword] || 0) + 1
        }
      })
    }
    
    // Check any text fields for warning signals
    const checkText = (text: unknown) => {
      if (typeof text === 'string') {
        const textLower = text.toLowerCase()
        warningKeywords.forEach(keyword => {
          if (textLower.includes(keyword)) {
            warningMentions[keyword] = (warningMentions[keyword] || 0) + 1
          }
        })
      }
    }
    
    checkText(output.current_blockers)
    checkText(output.friction_point)
    checkText(output.notes)
  })

  // Add friction warnings if keywords appear 3+ times
  const significantWarnings = Object.entries(warningMentions)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)

  significantWarnings.forEach(([keyword, count]) => {
    warnings.push({
      type: 'friction',
      message: `"${keyword}" mentioned ${count} times in recent check-ins`,
      severity: count >= 5 ? 'high' : 'medium'
    })
  })

  // 2. Detect participation drops by department
  if (departmentsList && membersByDept && weekSessions && lastWeekSessions) {
    const deptMap = new Map(departmentsList.map(d => [d.id, d.name]))
    
    // Get user to department mapping
    const userToDept: Record<string, string> = {}
    membersByDept.forEach(m => {
      if (m.department_id) {
        userToDept[m.user_id] = m.department_id
      }
    })

    // Count completions this week by department
    const thisWeekByDept: Record<string, number> = {}
    weekSessions.forEach(s => {
      if (s.completed_at && s.user_id && userToDept[s.user_id]) {
        const deptId = userToDept[s.user_id]
        thisWeekByDept[deptId] = (thisWeekByDept[deptId] || 0) + 1
      }
    })

    // Count completions last week by department
    const lastWeekByDept: Record<string, number> = {}
    lastWeekSessions.forEach(s => {
      if (s.completed_at && s.user_id && userToDept[s.user_id]) {
        const deptId = userToDept[s.user_id]
        lastWeekByDept[deptId] = (lastWeekByDept[deptId] || 0) + 1
      }
    })

    // Check for significant drops (>30% decrease)
    Object.keys(lastWeekByDept).forEach(deptId => {
      const lastWeek = lastWeekByDept[deptId] || 0
      const thisWeek = thisWeekByDept[deptId] || 0
      const deptName = deptMap.get(deptId) || 'Unknown'
      
      if (lastWeek >= 3 && thisWeek < lastWeek * 0.7) {
        const dropPercent = Math.round((1 - thisWeek / lastWeek) * 100)
        warnings.push({
          type: 'participation',
          message: `${deptName}: participation down ${dropPercent}% from last week`,
          severity: dropPercent >= 50 ? 'high' : 'medium'
        })
      }
    })
  }

  // Sort warnings by severity
  warnings.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  const stats = [
    {
      name: 'Total Members',
      value: totalMembers || 0,
      href: '/admin/members',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Active Members',
      value: activeMembers || 0,
      href: '/admin/members',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Departments',
      value: departments || 0,
      href: '/admin/departments',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Admin Dashboard — See how work is really happening
        </p>
      </div>

      {/* Today Section */}
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Today
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dots Today */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-bold">
              {dotsToday} <span className="text-lg font-normal opacity-75">/ {expectedToday}</span>
            </div>
            <div className="text-sm opacity-90 mt-1">Dots Today</div>
            <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${expectedToday > 0 ? (dotsToday / expectedToday) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          {/* Participation Rate */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-bold">{participationRate}%</div>
            <div className="text-sm opacity-90 mt-1">Participation This Week</div>
            <div className="text-xs opacity-75 mt-2">
              {dotsThisWeek} of {expectedThisWeek} check-ins completed
            </div>
          </div>
          
          {/* Top Themes */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-sm opacity-90 mb-2">Top Themes</div>
            {topThemes.length > 0 ? (
              <div className="space-y-1">
                {topThemes.map((theme, i) => (
                  <div key={theme} className="flex items-center text-sm">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs mr-2">
                      {i + 1}
                    </span>
                    {theme}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm opacity-75">
                Themes will appear after more check-ins
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Early Warning Signals */}
      {warnings.length > 0 && (
        <div className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Early Warning Signals
          </h2>
          <div className="space-y-3">
            {warnings.slice(0, 4).map((warning, index) => (
              <div 
                key={index}
                className={`flex items-start p-3 rounded-lg ${
                  warning.severity === 'high' 
                    ? 'bg-red-100 border border-red-200' 
                    : 'bg-orange-100 border border-orange-200'
                }`}
              >
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 mr-3 ${
                  warning.severity === 'high' ? 'bg-red-500' : 'bg-orange-500'
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    warning.severity === 'high' ? 'text-red-800' : 'text-orange-800'
                  }`}>
                    {warning.type === 'friction' ? '⚠️ Friction Signal' : '📉 Participation Drop'}
                  </p>
                  <p className={`text-sm ${
                    warning.severity === 'high' ? 'text-red-700' : 'text-orange-700'
                  }`}>
                    {warning.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-orange-600">
            These signals are detected from recent check-ins. Investigate to prevent issues.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 text-blue-500">
                  {stat.icon}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/members"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
          >
            <div className="flex-shrink-0 text-green-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Add People</p>
              <p className="text-sm text-gray-500">Invite team members</p>
            </div>
          </Link>

          <Link
            href="/admin/departments"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
          >
            <div className="flex-shrink-0 text-purple-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Departments</p>
              <p className="text-sm text-gray-500">Organize your team</p>
            </div>
          </Link>

          <Link
            href="/admin/workflows"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
          >
            <div className="flex-shrink-0 text-orange-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Workflows</p>
              <p className="text-sm text-gray-500">View processes</p>
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
          >
            <div className="flex-shrink-0 text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Settings</p>
              <p className="text-sm text-gray-500">Configure org</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Getting Started Guide */}
      {(totalMembers || 0) <= 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900">Getting Started</h3>
          <p className="mt-1 text-sm text-blue-700">
            Welcome to VizDots! Here&apos;s how to set up your organization:
          </p>
          <ol className="mt-4 space-y-2 text-sm text-blue-700">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-200 text-blue-800 text-xs font-medium mr-2">
                1
              </span>
              <span>Create departments to organize your team structure</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-200 text-blue-800 text-xs font-medium mr-2">
                2
              </span>
              <span>Invite team members by email</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-200 text-blue-800 text-xs font-medium mr-2">
                3
              </span>
              <span>Members will receive AI check-in sessions automatically</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-200 text-blue-800 text-xs font-medium mr-2">
                4
              </span>
              <span>View analytics to see team insights and morale trends</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
