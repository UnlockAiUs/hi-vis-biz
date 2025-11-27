/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/onboarding/page.tsx
 * PURPOSE: Employee onboarding - profile creation/confirmation for invited employees
 * EXPORTS: default OnboardingPage (client component)
 * 
 * LOGIC:
 * - No org membership → shows "Create Organization" prompt (redirects to /admin/setup)
 * - Has membership → pre-fills data from invite, lets user confirm/edit
 * - Creates user_profile, updates organization_members, creates initial role_mapper session
 * 
 * DEPENDENCIES: @/lib/supabase/client, @/types/database
 * TABLES: organization_members, user_profiles, departments, sessions, agents
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Department, OrganizationMember } from '@/types/database'

interface EnhancedMember extends OrganizationMember {
  department?: Department | null
}

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [membership, setMembership] = useState<EnhancedMember | null>(null)
  const [isPreFilled, setIsPreFilled] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        // Get user's organization membership with department
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('*, department:departments(*)')
          .eq('user_id', user.id)
          .single()

        if (memberError || !memberData) {
          // This user has no organization membership - they might be a new user
          // who should be creating their organization, not onboarding as an employee
          setError('NO_ORG_MEMBERSHIP')
          setChecking(false)
          return
        }

        setMembership(memberData as EnhancedMember)

        // Pre-fill from organization_members data (from enhanced onboarding)
        if (memberData.display_name) {
          setName(memberData.display_name)
          setIsPreFilled(true)
        }
        if (memberData.job_title) {
          setJobTitle(memberData.job_title)
        }
        if (memberData.department_id) {
          setDepartmentId(memberData.department_id)
        }

        // Check if user already has a completed profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .eq('org_id', memberData.org_id)
          .single()

        if (profileData && profileData.profile_json && 
            (profileData.profile_json as Record<string, unknown>).name) {
          // User already has a profile, redirect to dashboard
          router.push('/dashboard')
          return
        }

        // Load departments for this organization
        const { data: deptData } = await supabase
          .from('departments')
          .select('*')
          .eq('org_id', memberData.org_id)
          .order('name')

        setDepartments(deptData || [])
        setChecking(false)
      } catch (err) {
        console.error('Error loading data:', err)
        setError('An error occurred while loading your information.')
        setChecking(false)
      }
    }

    checkUserAndLoadData()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (!jobTitle.trim()) {
      setError('Please enter your job title')
      return
    }

    if (!departmentId) {
      setError('Please select your department')
      return
    }

    if (!membership) {
      setError('Organization membership not found')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expired. Please log in again.')
        setLoading(false)
        return
      }

      // Create or update user profile
      const profileJson = {
        name: name.trim(),
        role_summary: jobTitle.trim(),
        primary_duties: [],
        customer_facing: false,
        main_workflows: [],
        primary_tools: [],
        pain_points: [],
        open_profile_gaps: [
          {
            id: 'initial_role_mapping',
            priority: 'high',
            description: 'Complete initial role mapping',
            suggested_agent: 'role_mapper'
          }
        ]
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_id', membership.org_id)
        .single()

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            profile_json: profileJson,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id)

        if (updateError) {
          console.error('Profile update error:', updateError)
          setError('Failed to update your profile. Please try again.')
          setLoading(false)
          return
        }
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            org_id: membership.org_id,
            user_id: user.id,
            profile_json: profileJson
          })

        if (insertError) {
          console.error('Profile insert error:', insertError)
          setError('Failed to create your profile. Please try again.')
          setLoading(false)
          return
        }
      }

      // Update organization_members with any edits (name, title, department)
      const memberUpdate: Record<string, unknown> = {
        department_id: departmentId,
        display_name: name.trim(),
        job_title: jobTitle.trim(),
        updated_at: new Date().toISOString()
      }

      const { error: memberError } = await supabase
        .from('organization_members')
        .update(memberUpdate)
        .eq('id', membership.id)

      if (memberError) {
        console.error('Member update error:', memberError)
        // Don't fail the whole operation, just log it
      }

      // Check for existing sessions
      const { data: existingSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (!sessionsError && (!existingSessions || existingSessions.length === 0)) {
        // Create initial session with role_mapper agent
        const { data: roleMapperAgent } = await supabase
          .from('agents')
          .select('id')
          .eq('slug', 'role_mapper')
          .single()

        if (roleMapperAgent) {
          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert({
              user_id: user.id,
              agent_id: roleMapperAgent.id,
              status: 'active',
              summary_json: {
                title: 'Initial Role Mapping',
                started: new Date().toISOString()
              }
            })
            .select('id')
            .single()

          if (!sessionError && newSession) {
            // Redirect to the new session
            router.push(`/dashboard/session/${newSession.id}`)
            return
          }
        }
      }

      // If we have existing sessions or couldn't create one, go to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Onboarding error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Special UI for new users who don't have an organization yet
  if (error === 'NO_ORG_MEMBERSHIP') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to VizDots!
          </h2>
          <p className="text-gray-600 mb-8">
            Looks like you're a new user! Let's set up your organization so you can start getting insights from your team.
          </p>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-medium text-gray-900 mb-4">What you'll do:</h3>
            <ul className="text-left text-sm text-gray-600 space-y-3">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Create your organization</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Set up departments</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Invite your team members</span>
              </li>
            </ul>
          </div>
          
          <Link 
            href="/admin/setup"
            className="w-full inline-flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Your Organization
          </Link>
          
          <p className="mt-6 text-sm text-gray-500">
            Were you invited by someone? Check your email for an invitation link, or contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-yellow-500 rounded-lg flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {isPreFilled ? 'Confirm Your Information' : 'Complete Your Profile'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isPreFilled 
              ? 'Your administrator has pre-filled some details. Please review and confirm.'
              : 'Help us understand your role so we can personalize your experience'
            }
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
          {error && error !== 'NO_ORG_MEMBERSHIP' && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {isPreFilled && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                <p className="font-medium">Information pre-filled by your administrator</p>
                <p className="mt-1 text-blue-600">You can edit any fields if needed.</p>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                id="jobTitle"
                name="jobTitle"
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                placeholder="Software Engineer"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="department"
                name="department"
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
              >
                <option value="">Select a department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {departments.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No departments available. Please contact your administrator.
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || departments.length === 0}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : isPreFilled ? 'Confirm & Start First Session' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Complete a quick role mapping session (~3 min)</span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Get personalized AI recommendations</span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Access your personalized dashboard</span>
            </li>
          </ul>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          You can update this information anytime from your profile settings
        </p>
      </div>
    </div>
  )
}
