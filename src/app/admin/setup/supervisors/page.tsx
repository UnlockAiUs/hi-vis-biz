/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/setup/supervisors/page.tsx
 * PURPOSE: Step 4 of setup wizard - Assign supervisors to employees
 * EXPORTS: SetupStep4Page (default)
 * 
 * KEY FEATURES:
 * - Supervisor assignment per employee
 * - Only employees with hasDirectReports=true can be supervisors
 * - Group employees by department for display
 * - Skip option (supervisor assignment is optional)
 * 
 * STATE: Saves to localStorage via onboarding-wizard utilities
 * PREV: /admin/setup/employees (Step 3) | NEXT: /admin/setup/review (Step 5)
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  loadOnboardingState,
  saveOnboardingState,
  INITIAL_ONBOARDING_STATE,
  getPotentialSupervisors,
  getSupervisorName,
  type OnboardingState,
  type EmployeeEntry,
} from '@/lib/utils/onboarding-wizard'

export default function SetupStep4Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE)
  const [employees, setEmployees] = useState<EmployeeEntry[]>([])
  const [potentialSupervisors, setPotentialSupervisors] = useState<EmployeeEntry[]>([])

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
    setEmployees(savedState.employees)
    setPotentialSupervisors(getPotentialSupervisors(savedState.employees))
    setLoading(false)
  }, [router])

  const handleSupervisorChange = (employeeId: string, supervisorId: string | null) => {
    const updatedEmployees = employees.map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, supervisorId: supervisorId || undefined }
      }
      return emp
    })
    
    setEmployees(updatedEmployees)
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      employees: updatedEmployees,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleSkip = () => {
    // Save current state and navigate
    const newState: OnboardingState = {
      ...state,
      currentStep: 5,
    }
    setState(newState)
    saveOnboardingState(newState)
    
    router.push('/admin/setup/review')
  }

  const handleBack = () => {
    router.push('/admin/setup/employees')
  }

  const handleNext = () => {
    // Save current state and navigate
    const newState: OnboardingState = {
      ...state,
      currentStep: 5,
      employees,
    }
    setState(newState)
    saveOnboardingState(newState)
    
    router.push('/admin/setup/review')
  }

  // Group employees by department for display
  const employeesByDepartment = employees.reduce((acc, emp) => {
    if (!acc[emp.department]) {
      acc[emp.department] = []
    }
    acc[emp.department].push(emp)
    return acc
  }, {} as Record<string, EmployeeEntry[]>)

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
          Assign Supervisors
        </h2>
        <p className="mt-2 text-gray-600">
          Step 4 of 5: Set up reporting relationships (optional)
        </p>
      </div>

      {/* Info Card */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              About Supervisor Assignment
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Only employees marked as &quot;Has direct reports&quot; can be supervisors</li>
                <li>This step is optional - you can assign supervisors later</li>
                <li>Supervisors can view their team&apos;s aggregated analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {potentialSupervisors.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No Supervisors Available
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            None of your employees were marked as having direct reports.
            <br />
            You can skip this step or go back to mark some employees as supervisors.
          </p>
          <div className="mt-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
            >
              ← Go Back to Edit
            </button>
            <button
              onClick={handleSkip}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
            >
              Skip & Continue →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Supervisor Assignment Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Assign Supervisors
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {potentialSupervisors.length} employee{potentialSupervisors.length !== 1 ? 's' : ''} available as supervisors
              </p>
            </div>

            {/* Group by department */}
            {Object.entries(employeesByDepartment).map(([department, deptEmployees]) => (
              <div key={department} className="border-b border-gray-200 last:border-b-0">
                <div className="bg-gray-50 px-6 py-3">
                  <h4 className="text-sm font-medium text-gray-700">{department}</h4>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
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
                    {deptEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {emp.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {emp.email}
                              </div>
                            </div>
                            {emp.hasDirectReports && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Supervisor
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {emp.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={emp.supervisorId || ''}
                            onChange={(e) => handleSupervisorChange(emp.id, e.target.value || null)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                          >
                            <option value="">None</option>
                            {potentialSupervisors
                              .filter(sup => sup.id !== emp.id) // Can't be own supervisor
                              .map(sup => (
                                <option key={sup.id} value={sup.id}>
                                  {sup.name} - {sup.title}
                                </option>
                              ))
                            }
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white shadow rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {employees.length}
              </div>
              <div className="text-sm text-gray-500">Total Employees</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {potentialSupervisors.length}
              </div>
              <div className="text-sm text-gray-500">Supervisors</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {employees.filter(e => e.supervisorId).length}
              </div>
              <div className="text-sm text-gray-500">Assigned to Supervisor</div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              ← Back
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Next: Review →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
