/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/setup/departments/page.tsx
 * PURPOSE: Step 2 of setup wizard - Create departments
 * EXPORTS: SetupStep2Page (default)
 * 
 * KEY FEATURES:
 * - Add/edit/delete departments
 * - Duplicate name validation
 * - Inline editing mode
 * 
 * STATE: Saves to localStorage via onboarding-wizard utilities
 * PREV: /admin/setup (Step 1) | NEXT: /admin/setup/people (Step 3)
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  loadOnboardingState,
  saveOnboardingState,
  INITIAL_ONBOARDING_STATE,
  generateTempId,
  type OnboardingState,
  type DepartmentEntry
} from '@/lib/utils/onboarding-wizard'

export default function SetupStep2Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE)
  const [departments, setDepartments] = useState<DepartmentEntry[]>([])
  const [newDeptName, setNewDeptName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load wizard state
    const savedState = loadOnboardingState()
    
    // Check if step 1 is complete
    if (!savedState.organization) {
      router.push('/admin/setup')
      return
    }
    
    setState(savedState)
    setDepartments(savedState.departments || [])
    setLoading(false)
  }, [router])

  const handleAddDepartment = () => {
    const trimmedName = newDeptName.trim()
    
    if (!trimmedName) {
      setError('Please enter a department name')
      return
    }
    
    // Check for duplicates
    if (departments.some(d => d.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A department with this name already exists')
      return
    }
    
    setError(null)
    
    const newDept: DepartmentEntry = {
      id: generateTempId(),
      name: trimmedName,
    }
    
    const updatedDepartments = [...departments, newDept]
    setDepartments(updatedDepartments)
    setNewDeptName('')
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      departments: updatedDepartments,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleStartEdit = (dept: DepartmentEntry) => {
    setEditingId(dept.id)
    setEditingName(dept.name)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    
    const trimmedName = editingName.trim()
    
    if (!trimmedName) {
      setError('Department name cannot be empty')
      return
    }
    
    // Check for duplicates (excluding current)
    if (departments.some(d => d.id !== editingId && d.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A department with this name already exists')
      return
    }
    
    setError(null)
    
    const updatedDepartments = departments.map(d => 
      d.id === editingId ? { ...d, name: trimmedName } : d
    )
    setDepartments(updatedDepartments)
    setEditingId(null)
    setEditingName('')
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      departments: updatedDepartments,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return
    
    const updatedDepartments = departments.filter(d => d.id !== id)
    setDepartments(updatedDepartments)
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      departments: updatedDepartments,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleBack = () => {
    router.push('/admin/setup')
  }

  const handleNext = () => {
    if (departments.length === 0) {
      setError('Please add at least one department')
      return
    }
    
    setError(null)
    
    // Save current state and navigate
    const newState: OnboardingState = {
      ...state,
      currentStep: 3,
      departments,
    }
    setState(newState)
    saveOnboardingState(newState)
    
    router.push('/admin/setup/people')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Step Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Departments & Roles
        </h2>
        <p className="mt-2 text-gray-600">
          Step 2 of 4: Add your organization&apos;s departments
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Add Department Form */}
        <div className="mb-6">
          <label htmlFor="deptName" className="block text-sm font-medium text-gray-700 mb-1">
            Add Department
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="deptName"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
              placeholder="e.g. Engineering, Sales, Marketing"
            />
            <button
              type="button"
              onClick={handleAddDepartment}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Add
            </button>
          </div>
        </div>

        {/* Departments List */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Departments ({departments.length})
          </h3>
          
          {departments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                No departments added yet
              </p>
              <p className="text-xs text-gray-400">
                Add your first department above
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
              {departments.map((dept) => (
                <li key={dept.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  {editingId === dept.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Save"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Cancel"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-gray-900">{dept.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(dept)}
                          className="text-gray-400 hover:text-blue-600 p-1"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={departments.length === 0}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Add People →
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
              Tips for departments
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Add all departments where employees will be assigned</li>
                <li>You can add more departments later from the admin panel</li>
                <li>Department names should be clear and recognizable</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
