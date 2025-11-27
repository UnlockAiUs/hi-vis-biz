/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/setup/settings/page.tsx
 * PURPOSE: Step 4 (final) of setup wizard - Check-in settings & submit
 * EXPORTS: SetupStep4Page (default)
 * 
 * KEY FEATURES:
 * - Check-in frequency selection (daily/weekly)
 * - Time window configuration
 * - Setup summary review
 * - Submit calls /api/admin/setup/complete POST
 * - On success: clears localStorage state, redirects to /admin
 * 
 * STATE: Reads from localStorage via onboarding-wizard utilities
 * PREV: /admin/setup/people (Step 3)
 * API: POST /api/admin/setup/complete
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  loadOnboardingState,
  saveOnboardingState,
  clearOnboardingState,
  INITIAL_ONBOARDING_STATE,
  DEFAULT_SCHEDULE_SETTINGS,
  DAYS_OF_WEEK,
  type OnboardingState,
  type ScheduleSettings,
} from '@/lib/utils/onboarding-wizard'

export default function SetupStep4Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE)
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(DEFAULT_SCHEDULE_SETTINGS)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load wizard state
    const savedState = loadOnboardingState()
    
    // Check if previous steps are complete
    if (!savedState.organization) {
      router.push('/admin/setup')
      return
    }
    
    if (savedState.departments.length === 0) {
      router.push('/admin/setup/departments')
      return
    }
    
    if (savedState.employees.length === 0) {
      router.push('/admin/setup/people')
      return
    }
    
    setState(savedState)
    
    // Load saved schedule settings or use defaults
    if (savedState.scheduleSettings) {
      setScheduleSettings(savedState.scheduleSettings)
    }
    
    setLoading(false)
  }, [router])

  const handleFrequencyChange = (frequency: 'daily' | 'weekly') => {
    const newSettings = {
      ...scheduleSettings,
      frequency,
      // Reset preferred days for daily
      preferredDays: frequency === 'daily' ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] : scheduleSettings.preferredDays,
    }
    setScheduleSettings(newSettings)
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      scheduleSettings: newSettings,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleDayToggle = (day: string) => {
    const newDays = scheduleSettings.preferredDays.includes(day)
      ? scheduleSettings.preferredDays.filter(d => d !== day)
      : [...scheduleSettings.preferredDays, day]
    
    // Ensure at least one day is selected
    if (newDays.length === 0) return
    
    const newSettings = {
      ...scheduleSettings,
      preferredDays: newDays,
    }
    setScheduleSettings(newSettings)
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      scheduleSettings: newSettings,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleTimeChange = (field: 'timeWindowStart' | 'timeWindowEnd', value: string) => {
    const newSettings = {
      ...scheduleSettings,
      [field]: value,
    }
    setScheduleSettings(newSettings)
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      scheduleSettings: newSettings,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleBack = () => {
    router.push('/admin/setup/people')
  }

  const handleEditStep = (step: number) => {
    const paths = [
      '/admin/setup',
      '/admin/setup/departments',
      '/admin/setup/people',
    ]
    router.push(paths[step - 1])
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization: state.organization,
          departments: state.departments,
          employees: state.employees,
          scheduleSettings: scheduleSettings,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete setup')
      }
      
      // Clear wizard state
      clearOnboardingState()
      
      // Redirect to admin dashboard with success message
      router.push('/admin?setup=complete')
    } catch (err) {
      console.error('Setup error:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete setup')
      setSubmitting(false)
    }
  }

  // Calculate stats
  const stats = {
    departments: state.departments.length,
    employees: state.employees.length,
    supervisors: state.employees.filter(e => e.hasDirectReports).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Check-In Settings & Review
        </h2>
        <p className="mt-2 text-gray-600">
          Step 4 of 4: Configure check-ins and launch your organization
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Check-In Settings */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Check-In Schedule</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure when your team receives their check-in prompts
          </p>
        </div>
        <div className="px-6 py-4 space-y-6">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How often should check-ins occur?
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleFrequencyChange('daily')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  scheduleSettings.frequency === 'daily'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Daily</div>
                <div className="text-xs text-gray-500 mt-1">
                  Short check-ins every day
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleFrequencyChange('weekly')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  scheduleSettings.frequency === 'weekly'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Weekly</div>
                <div className="text-xs text-gray-500 mt-1">
                  Check-ins on selected days
                </div>
              </button>
            </div>
          </div>

          {/* Days of week (for weekly) */}
          {scheduleSettings.frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Which days?
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      scheduleSettings.preferredDays.includes(day.value)
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Check-in time window
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="startTime" className="block text-xs text-gray-500 mb-1">
                  From
                </label>
                <input
                  type="time"
                  id="startTime"
                  value={scheduleSettings.timeWindowStart}
                  onChange={(e) => handleTimeChange('timeWindowStart', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                />
              </div>
              <span className="text-gray-500 pt-5">to</span>
              <div className="flex-1">
                <label htmlFor="endTime" className="block text-xs text-gray-500 mb-1">
                  Until
                </label>
                <input
                  type="time"
                  id="endTime"
                  value={scheduleSettings.timeWindowEnd}
                  onChange={(e) => handleTimeChange('timeWindowEnd', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Check-ins will be scheduled within this time window in your organization&apos;s timezone
            </p>
          </div>
        </div>
      </div>

      {/* Setup Summary */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Setup Summary</h3>
        </div>
        
        {/* Organization */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Organization</h4>
              <p className="text-sm text-gray-500">{state.organization?.name}</p>
            </div>
            <button
              onClick={() => handleEditStep(1)}
              className="text-sm text-yellow-600 hover:text-yellow-700"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Departments */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Departments</h4>
              <p className="text-sm text-gray-500">
                {state.departments.map(d => d.name).join(', ')}
              </p>
            </div>
            <button
              onClick={() => handleEditStep(2)}
              className="text-sm text-yellow-600 hover:text-yellow-700"
            >
              Edit
            </button>
          </div>
        </div>

        {/* People */}
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium text-gray-900">People</h4>
              <p className="text-sm text-gray-500">
                {stats.employees} people ({stats.supervisors} supervisors)
              </p>
            </div>
            <button
              onClick={() => handleEditStep(3)}
              className="text-sm text-yellow-600 hover:text-yellow-700"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.departments}</div>
          <div className="text-sm text-gray-500">Departments</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.employees}</div>
          <div className="text-sm text-gray-500">People</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.supervisors}</div>
          <div className="text-sm text-gray-500">Supervisors</div>
        </div>
      </div>

      {/* Launch Info */}
      <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Ready to launch!
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>When you launch, we will:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Create your organization and departments</li>
                <li>Send invitation emails to all {stats.employees} team members</li>
                <li>Schedule their first check-ins based on your settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={submitting}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-8 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
        >
          {submitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Launching...
            </span>
          ) : (
            `Launch VizDots →`
          )}
        </button>
      </div>
    </div>
  )
}
