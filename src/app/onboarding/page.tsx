'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Department, OrganizationMember } from '@/types/database'

interface MemberWithEmail extends OrganizationMember {
  email?: string
}

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [potentialSupervisors, setPotentialSupervisors] = useState<MemberWithEmail[]>([])
  const [membership, setMembership] = useState<OrganizationMember | null>(null)
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

        // Get user's organization membership
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (memberError || !memberData) {
          setError('You are not associated with any organization. Please contact your administrator.')
          setChecking(false)
          return
        }

        setMembership(memberData)

        // Check if user already has a profile
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

        // Load potential supervisors (active members in the same org, excluding self)
        const { data: membersData } = await supabase
          .from('organization_members')
          .select('*')
          .eq('org_id', memberData.org_id)
          .eq('status', 'active')
          .neq('user_id', user.id)
          .in('level', ['exec', 'manager'])

        // Fetch emails for supervisors
        if (membersData && membersData.length > 0) {
          const membersWithEmails: MemberWithEmail[] = []
          for (const member of membersData) {
            // Get user profile to find their name, or fall back to auth metadata
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('profile_json')
              .eq('user_id', member.user_id)
              .single()
            
            const profileName = profileData?.profile_json 
              ? (profileData.profile_json as Record<string, unknown>).name as string
              : null

            membersWithEmails.push({
              ...member,
              email: profileName || member.user_id.substring(0, 8) + '...'
            })
          }
          setPotentialSupervisors(membersWithEmails)
        }

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
        location: location.trim() || undefined,
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

      // Update organization_members with department and supervisor
      const memberUpdate: Record<string, unknown> = {
        department_id: departmentId,
        updated_at: new Date().toISOString()
      }

      if (supervisorId) {
        memberUpdate.supervisor_user_id = supervisorId
      }

      const { error: memberError } = await supabase
        .from('organization_members')
        .update(memberUpdate)
        .eq('id', membership.id)

      if (memberError) {
        console.error('Member update error:', memberError)
        // Don't fail the whole operation, just log it
      }

      // Redirect to dashboard
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
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Help us understand your role so we can personalize your experience
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                {error}
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
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                placeholder="New York, NY"
              />
            </div>

            {potentialSupervisors.length > 0 && (
              <div>
                <label htmlFor="supervisor" className="block text-sm font-medium text-gray-700">
                  Supervisor <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  id="supervisor"
                  name="supervisor"
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                >
                  <option value="">Select your supervisor</option>
                  {potentialSupervisors.map((member) => (
                    <option key={member.id} value={member.user_id}>
                      {member.email} ({member.level})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || departments.length === 0}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          You can update this information anytime from your profile settings
        </p>
      </div>
    </div>
  )
}
