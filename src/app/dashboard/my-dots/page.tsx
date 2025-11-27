/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/dashboard/my-dots/page.tsx
 * PURPOSE: "My Dots" page - shows employee's check-in history and patterns
 * EXPORTS: default MyDotsPage (server component)
 * 
 * LOGIC:
 * - Shows all completed check-ins (dots) with dates and agent types
 * - Displays simple summary of top themes
 * - Links back to dashboard for pending check-ins
 * 
 * DEPENDENCIES: @/lib/supabase/server
 * TABLES: sessions, agents, answers, user_profiles
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MyDotsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

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

  // Get all completed sessions (dots) for the user
  const { data: completedDots } = await supabase
    .from('sessions')
    .select(`
      *,
      agents (name, code, description)
    `)
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })

  // Get answers to extract themes
  const { data: answers } = await supabase
    .from('answers')
    .select('structured_output, session_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Extract themes from recent answers
  const themes: string[] = []
  if (answers) {
    answers.forEach((answer) => {
      const output = answer.structured_output as Record<string, unknown> | null
      if (output) {
        // Extract current focus from focus_tracker
        if (output.current_focus_label) {
          themes.push(output.current_focus_label as string)
        }
        // Extract workflow names
        if (output.workflow_name) {
          themes.push(output.workflow_name as string)
        }
        // Extract pain points
        if (output.reason && typeof output.pain_rating === 'number') {
          themes.push('Friction point noted')
        }
      }
    })
  }

  // Get unique themes (top 5)
  const uniqueThemes = Array.from(new Set(themes)).slice(0, 5)

  // Calculate stats
  const totalDots = completedDots?.length || 0
  const thisWeekDots = completedDots?.filter((dot) => {
    const completedAt = new Date(dot.completed_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return completedAt >= weekAgo
  }).length || 0

  const thisMonthDots = completedDots?.filter((dot) => {
    const completedAt = new Date(dot.completed_at)
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    return completedAt >= monthAgo
  }).length || 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Dots</h1>
            <p className="mt-1 text-sm text-gray-600">
              Every dot represents a small truth about how your work happens.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-yellow-600 hover:text-yellow-700 flex items-center"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-500">{totalDots}</p>
          <p className="text-sm text-gray-500">Total Dots</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{thisWeekDots}</p>
          <p className="text-sm text-gray-500">This Week</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-500">{thisMonthDots}</p>
          <p className="text-sm text-gray-500">This Month</p>
        </div>
      </div>

      {/* Themes Summary */}
      {uniqueThemes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">
            Your Top Themes
          </h2>
          <div className="flex flex-wrap gap-2">
            {uniqueThemes.map((theme, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"
              >
                {theme}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-yellow-700">
            These themes emerged from your recent check-ins.
          </p>
        </div>
      )}

      {/* Dots List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Your Dots</h2>
        </div>
        
        {completedDots && completedDots.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {completedDots.map((dot) => {
              const agent = dot.agents as Record<string, unknown>
              const completedAt = new Date(dot.completed_at)
              const agentCode = agent?.code as string
              
              // Determine dot color based on agent type
              let dotColor = 'bg-gray-400'
              if (agentCode === 'pulse') dotColor = 'bg-red-400'
              else if (agentCode === 'role_mapper') dotColor = 'bg-blue-400'
              else if (agentCode === 'workflow_mapper') dotColor = 'bg-green-400'
              else if (agentCode === 'pain_scanner') dotColor = 'bg-orange-400'
              else if (agentCode === 'focus_tracker') dotColor = 'bg-purple-400'

              return (
                <div
                  key={dot.id}
                  className="px-6 py-4 flex items-center hover:bg-gray-50"
                >
                  <div className={`h-3 w-3 rounded-full ${dotColor} mr-4 flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {agent?.name as string || 'Check-in'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {agent?.description as string || 'Quick conversation about your work'}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <p className="text-sm text-gray-900">
                      {completedAt.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: completedAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {completedAt.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dots yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Complete your first check-in to add a dot. Each dot helps build a clearer picture of how your work really happens.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              What are dots?
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Each dot is a small clue about workflows, roadblocks, responsibilities, and your experience at work. 
              Over time, VizDots connects these dots into a clear, living picture of how your team operates.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
