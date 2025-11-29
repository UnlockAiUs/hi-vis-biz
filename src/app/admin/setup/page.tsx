/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/setup/page.tsx
 * PURPOSE: Step 1 of setup wizard - Organization basic info
 * EXPORTS: SetupStep1Page (default)
 * 
 * KEY FEATURES:
 * - Organization name input
 * - Timezone selection
 * - Organization size band selection
 * - Responsive mobile-friendly design
 * 
 * STATE: Saves to localStorage via onboarding-wizard utilities
 * NEXT: /admin/setup/departments (Step 2)
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  loadOnboardingState,
  saveOnboardingState,
  INITIAL_ONBOARDING_STATE,
  TIMEZONES,
  SIZE_BANDS,
  INDUSTRIES,
  type OnboardingState,
  type OrganizationData
} from '@/lib/utils/onboarding-wizard'

export default function SetupStep1Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE)
  const [formData, setFormData] = useState<OrganizationData>({
    name: '',
    timezone: 'America/Denver',
    sizeBand: '11-50',
    industry: '',
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkUserAndLoadState = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        // Check if user already has an organization
        const { data: membership } = await supabase
          .from('organization_members')
          .select('org_id, role')
          .eq('user_id', user.id)
          .single()

        if (membership) {
          // User already has an org, redirect to admin dashboard
          router.push('/admin')
          return
        }

        // Load any existing wizard state
        const savedState = loadOnboardingState()
        setState(savedState)
        
        // If org data exists in saved state, populate form
        if (savedState.organization) {
          setFormData(savedState.organization)
        }

        setLoading(false)
      } catch (err) {
        console.error('Error loading state:', err)
        setLoading(false)
      }
    }

    checkUserAndLoadState()
  }, [supabase, router])

  const handleNext = () => {
    // Validate form
    if (!formData.name.trim()) {
      setError('Please enter an organization name')
      return
    }

    if (!formData.timezone) {
      setError('Please select a timezone')
      return
    }

    if (!formData.sizeBand) {
      setError('Please select an organization size')
      return
    }

    if (!formData.industry) {
      setError('Please select an industry')
      return
    }

    setError(null)

    // Save to wizard state
    const newState: OnboardingState = {
      ...state,
      currentStep: 2,
      organization: {
        name: formData.name.trim(),
        timezone: formData.timezone,
        sizeBand: formData.sizeBand,
        industry: formData.industry,
      },
    }
    
    setState(newState)
    saveOnboardingState(newState)

    // Navigate to Step 2
    router.push('/admin/setup/departments')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-0">
      {/* Step Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Company Basics
        </h2>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Step 1 of 4: Tell us about your organization
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Organization Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-base"
              placeholder="Acme Corporation"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              This is the name of your company or organization
            </p>
          </div>

          {/* Timezone */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
              Timezone <span className="text-red-500">*</span>
            </label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-base"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Used for scheduling check-ins and displaying times
            </p>
          </div>

          {/* Organization Size */}
          <div>
            <label htmlFor="sizeBand" className="block text-sm font-medium text-gray-700 mb-1">
              Team Size <span className="text-red-500">*</span>
            </label>
            <select
              id="sizeBand"
              value={formData.sizeBand}
              onChange={(e) => setFormData({ ...formData, sizeBand: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-base"
            >
              {SIZE_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Approximate number of people in your organization
            </p>
          </div>

          {/* Industry */}
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
              Industry <span className="text-red-500">*</span>
            </label>
            <select
              id="industry"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-base"
            >
              <option value="">Select your industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind.value} value={ind.value}>
                  {ind.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Helps us customize check-in questions for your business
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Next: Add Departments →
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Quick setup, big visibility
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Add your departments</li>
                <li>Import your team (CSV or manual)</li>
                <li>Configure check-in schedule</li>
                <li>Start collecting dots!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
