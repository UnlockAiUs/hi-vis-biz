/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/setup/review/page.tsx
 * PURPOSE: Step 5 (final) of setup wizard - Review and submit
 * EXPORTS: SetupStep5Page (default)
 * 
 * KEY FEATURES:
 * - Summary display of org, departments, employees
 * - Stats overview (supervisors, can view reports)
 * - Edit buttons to go back to previous steps
 * - Submit calls /api/admin/setup/complete POST
 * - On success: clears localStorage state, redirects to /admin
 * 
 * STATE: Reads from localStorage via onboarding-wizard utilities
 * PREV: /admin/setup/supervisors (Step 4)
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
  getSupervisorName,
  type OnboardingState,
} from '@/lib/utils/onboarding-wizard'

export default function SetupStep5Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE)
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
      router.push('/admin/setup/employees')
      return
    }
    
    setState(savedState)
    setLoading(false)
  }, [router])

  const handleBack = () => {
    router.push('/admin/setup/supervisors')
  }

  const handleEditStep = (step: number) => {
    const paths = [
      '/admin/setup',
      '/admin/setup/departments',
      '/admin/setup/employees',
      '/admin/setup/supervisors',
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
    assignedToSupervisor: state.employees.filter(e => e.supervisorId).length,
    canViewReports: state.employees.filter(e => e.canViewReports).length,
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
          Review & Send Invites
        </h2>
        <p className="mt-2 text-gray-600">
          Step 5 of 5: Review your setup and send invitations
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

      {/* Organization Summary */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Organization</h3>
          <button
            onClick={() => handleEditStep(1)}
            className="text-sm text-yellow-600 hover:text-yellow-700"
          >
            Edit
          </button>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{state.organization?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Timezone</dt>
              <dd className="mt-1 text-sm text-gray-900">{state.organization?.timezone}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Size</dt>
              <dd className="mt-1 text-sm text-gray-900">{state.organization?.sizeBand}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Departments Summary */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Departments ({stats.departments})
          </h3>
          <button
            onClick={() => handleEditStep(2)}
            className="text-sm text-yellow-600 hover:text-yellow-700"
          >
            Edit
          </button>
        </div>
        <div className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {state.departments.map((dept) => (
              <span
                key={dept.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
              >
                {dept.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Employees Summary */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Employees ({stats.employees})
          </h3>
          <button
            onClick={() => handleEditStep(3)}
            className="text-sm text-yellow-600 hover:text-yellow-700"
          >
            Edit
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supervisor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {state.employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                      {emp.hasDirectReports && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Supervisor
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emp.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emp.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emp.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getSupervisorName(state.employees, emp.supervisorId) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.departments}</div>
          <div className="text-sm text-gray-500">Departments</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.employees}</div>
          <div className="text-sm text-gray-500">Employees</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.supervisors}</div>
          <div className="text-sm text-gray-500">Supervisors</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.canViewReports}</div>
          <div className="text-sm text-gray-500">Can View Reports</div>
        </div>
      </div>

      {/* Warning/Info */}
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              What happens when you send invites?
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Your organization and departments will be created</li>
                <li>Employee records will be created with the provided information</li>
                <li>Invitation emails will be sent to all employees</li>
                <li>Employees will set their password and confirm their details</li>
                <li>Each employee will start their first micro-session</li>
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
              Creating Organization...
            </span>
          ) : (
            `Send ${stats.employees} Invite${stats.employees !== 1 ? 's' : ''} →`
          )}
        </button>
      </div>
    </div>
  )
}
