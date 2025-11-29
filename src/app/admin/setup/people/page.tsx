/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/setup/people/page.tsx
 * PURPOSE: Step 3 of setup wizard - Add people/employees
 * EXPORTS: SetupStep3Page (default)
 * 
 * KEY FEATURES:
 * - Manual employee entry form (name, email, department, title, supervisor)
 * - Supervisor assignment via "Reports To" dropdown
 * - CSV upload with drag-and-drop
 * - CSV template download
 * - Inline editing/deletion
 * - Responsive mobile-friendly design
 * 
 * STATE: Saves to localStorage via onboarding-wizard utilities
 * PREV: /admin/setup/departments (Step 2) | NEXT: /admin/setup/settings (Step 4)
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  loadOnboardingState,
  saveOnboardingState,
  INITIAL_ONBOARDING_STATE,
  generateTempId,
  isValidEmail,
  type OnboardingState,
  type EmployeeEntry,
} from '@/lib/utils/onboarding-wizard'
import {
  parseCSV,
  downloadCSVTemplate,
  readFileAsText,
  type ParseResult,
} from '@/lib/utils/csv-parser'

type Tab = 'manual' | 'csv'

export default function SetupStep3Page() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE)
  const [employees, setEmployees] = useState<EmployeeEntry[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('manual')
  const [error, setError] = useState<string | null>(null)
  
  // Manual entry form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    title: '',
    hasDirectReports: false,
    canViewReports: false,
    supervisorId: '',
  })
  
  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<EmployeeEntry | null>(null)
  
  // CSV upload state
  const [csvParseResult, setCsvParseResult] = useState<ParseResult | null>(null)
  const [showCsvPreview, setShowCsvPreview] = useState(false)
  const [dragOver, setDragOver] = useState(false)

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
    
    setState(savedState)
    setEmployees(savedState.employees || [])
    
    // Set default department if only one exists
    if (savedState.departments.length === 1) {
      setFormData(prev => ({ ...prev, department: savedState.departments[0].name }))
    }
    
    setLoading(false)
  }, [router])

  // Get supervisors (people with hasDirectReports = true)
  const getSupervisors = (excludeId?: string) => {
    return employees.filter(emp => emp.hasDirectReports && emp.id !== excludeId)
  }

  // Get supervisor name by ID
  const getSupervisorName = (supervisorId?: string) => {
    if (!supervisorId) return null
    const supervisor = employees.find(emp => emp.id === supervisorId)
    return supervisor?.name || null
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Name is required'
    if (!formData.email.trim()) return 'Email is required'
    if (!isValidEmail(formData.email)) return 'Invalid email format'
    if (!formData.department) return 'Department is required'
    if (!formData.title.trim()) return 'Title is required'
    
    // Check for duplicate email (excluding current if editing)
    const emailLower = formData.email.toLowerCase()
    const duplicate = employees.find(
      emp => emp.email.toLowerCase() === emailLower && emp.id !== editingId
    )
    if (duplicate) return 'An employee with this email already exists'
    
    return null
  }

  const handleAddEmployee = () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    
    setError(null)
    
    const newEmployee: EmployeeEntry = {
      id: generateTempId(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      department: formData.department,
      title: formData.title.trim(),
      hasDirectReports: formData.hasDirectReports,
      canViewReports: formData.canViewReports,
      supervisorId: formData.supervisorId || undefined,
    }
    
    const updatedEmployees = [...employees, newEmployee]
    setEmployees(updatedEmployees)
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      department: state.departments.length === 1 ? state.departments[0].name : '',
      title: '',
      hasDirectReports: false,
      canViewReports: false,
      supervisorId: '',
    })
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      employees: updatedEmployees,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleStartEdit = (emp: EmployeeEntry) => {
    setEditingId(emp.id)
    setEditingData({ ...emp })
  }

  const handleSaveEdit = () => {
    if (!editingId || !editingData) return
    
    // Validate editing data
    if (!editingData.name.trim()) {
      setError('Name is required')
      return
    }
    if (!editingData.email.trim()) {
      setError('Email is required')
      return
    }
    if (!isValidEmail(editingData.email)) {
      setError('Invalid email format')
      return
    }
    if (!editingData.department) {
      setError('Department is required')
      return
    }
    if (!editingData.title.trim()) {
      setError('Title is required')
      return
    }
    
    // Check for duplicate email
    const emailLower = editingData.email.toLowerCase()
    const duplicate = employees.find(
      emp => emp.email.toLowerCase() === emailLower && emp.id !== editingId
    )
    if (duplicate) {
      setError('An employee with this email already exists')
      return
    }

    // If this person is no longer a supervisor, clear any supervisorId references to them
    let updatedEmployees = employees.map(emp =>
      emp.id === editingId ? { ...editingData } : emp
    )
    
    if (!editingData.hasDirectReports) {
      updatedEmployees = updatedEmployees.map(emp => 
        emp.supervisorId === editingId ? { ...emp, supervisorId: undefined } : emp
      )
    }
    
    setError(null)
    setEmployees(updatedEmployees)
    setEditingId(null)
    setEditingData(null)
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      employees: updatedEmployees,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingData(null)
    setError(null)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to remove this person?')) return
    
    // Also clear any supervisorId references to this person
    let updatedEmployees = employees.filter(emp => emp.id !== id)
    updatedEmployees = updatedEmployees.map(emp => 
      emp.supervisorId === id ? { ...emp, supervisorId: undefined } : emp
    )
    setEmployees(updatedEmployees)
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      employees: updatedEmployees,
    }
    setState(newState)
    saveOnboardingState(newState)
  }

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }
    
    try {
      const content = await readFileAsText(file)
      const departmentNames = state.departments.map(d => d.name)
      const result = parseCSV(content, departmentNames)
      
      // Check for duplicate emails against existing employees
      const existingEmails = new Set(employees.map(e => e.email.toLowerCase()))
      const duplicates: string[] = []
      
      result.employees = result.employees.filter(emp => {
        if (existingEmails.has(emp.email.toLowerCase())) {
          duplicates.push(emp.email)
          return false
        }
        return true
      })
      
      if (duplicates.length > 0) {
        result.warnings.push(`Skipped ${duplicates.length} person(s) with duplicate emails: ${duplicates.join(', ')}`)
      }
      
      setCsvParseResult(result)
      setShowCsvPreview(true)
      setError(null)
    } catch (err) {
      setError('Failed to read CSV file')
      console.error(err)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleConfirmCSVImport = () => {
    if (!csvParseResult || csvParseResult.employees.length === 0) return
    
    const updatedEmployees = [...employees, ...csvParseResult.employees]
    setEmployees(updatedEmployees)
    
    // Save to state
    const newState: OnboardingState = {
      ...state,
      employees: updatedEmployees,
    }
    setState(newState)
    saveOnboardingState(newState)
    
    // Close preview
    setCsvParseResult(null)
    setShowCsvPreview(false)
  }

  const handleCancelCSVImport = () => {
    setCsvParseResult(null)
    setShowCsvPreview(false)
  }

  const handleBack = () => {
    router.push('/admin/setup/departments')
  }

  const handleNext = () => {
    if (employees.length === 0) {
      setError('Please add at least one person')
      return
    }
    
    setError(null)
    
    // Save current state and navigate
    const newState: OnboardingState = {
      ...state,
      currentStep: 4,
      employees,
    }
    setState(newState)
    saveOnboardingState(newState)
    
    router.push('/admin/setup/settings')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0">
      {/* Step Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          People Import
        </h2>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Step 3 of 4: Add your team members
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4 sm:mb-6">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'manual'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setActiveTab('csv')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'csv'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          CSV Upload
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Person</h3>
          
          <div className="space-y-4">
            {/* Row 1: Name and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-base"
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-base"
                  placeholder="john@company.com"
                />
              </div>
            </div>

            {/* Row 2: Department and Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-base"
                >
                  <option value="">Select department</option>
                  {state.departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-base"
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            {/* Row 3: Reports To */}
            <div>
              <label htmlFor="supervisorId" className="block text-sm font-medium text-gray-700 mb-1">
                Reports To
              </label>
              <select
                id="supervisorId"
                value={formData.supervisorId}
                onChange={(e) => setFormData(prev => ({ ...prev, supervisorId: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-base"
              >
                <option value="">No direct supervisor</option>
                {getSupervisors().map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name} ({sup.title})</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Only people marked as &quot;Has direct reports&quot; appear here
              </p>
            </div>
          
            {/* Checkboxes */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasDirectReports}
                  onChange={(e) => setFormData(prev => ({ ...prev, hasDirectReports: e.target.checked }))}
                  className="h-5 w-5 text-yellow-500 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Has direct reports (is a supervisor)</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.canViewReports}
                  onChange={(e) => setFormData(prev => ({ ...prev, canViewReports: e.target.checked }))}
                  className="h-5 w-5 text-yellow-500 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Can view team reports</span>
              </label>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleAddEmployee}
            className="mt-6 w-full sm:w-auto px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Add Person
          </button>
        </div>
      )}

      {/* CSV Upload Tab */}
      {activeTab === 'csv' && !showCsvPreview && (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload CSV</h3>
          
          <div className="mb-4">
            <button
              onClick={() => downloadCSVTemplate()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV Template
            </button>
          </div>
          
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium text-yellow-600">Click to upload</span> or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">CSV files only</p>
          </div>
          
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">CSV Format Requirements</h4>
            <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
              <li>Required columns: name, email, department, title, has_direct_reports, can_view_reports</li>
              <li>Department names must match exactly (case-insensitive)</li>
              <li>has_direct_reports and can_view_reports accept: yes/no, true/false, y/n, 1/0</li>
            </ul>
          </div>
        </div>
      )}

      {/* CSV Preview Modal */}
      {showCsvPreview && csvParseResult && (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            CSV Import Preview
          </h3>
          
          {csvParseResult.errors.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Errors ({csvParseResult.errors.length})
              </h4>
              <ul className="text-sm text-red-700 list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                {csvParseResult.errors.map((err, i) => (
                  <li key={i}>Row {err.row}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}
          
          {csvParseResult.warnings.length > 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                Warnings ({csvParseResult.warnings.length})
              </h4>
              <ul className="text-sm text-yellow-700 list-disc pl-5 space-y-1">
                {csvParseResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
          
          {csvParseResult.employees.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                People to import ({csvParseResult.employees.length})
              </h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Department</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Title</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 max-h-60 overflow-y-auto">
                    {csvParseResult.employees.slice(0, 10).map((emp, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-gray-900">{emp.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 truncate max-w-[200px]">{emp.email}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 hidden sm:table-cell">{emp.department}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 hidden sm:table-cell">{emp.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvParseResult.employees.length > 10 && (
                  <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
                    ...and {csvParseResult.employees.length - 10} more people
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={handleCancelCSVImport}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCSVImport}
              disabled={csvParseResult.employees.length === 0}
              className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {csvParseResult.employees.length} People
            </button>
          </div>
        </div>
      )}

      {/* People List */}
      <div className="mt-6 bg-white shadow rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          People ({employees.length})
        </h3>
        
        {employees.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No people added yet</p>
            <p className="text-xs text-gray-400">Add people manually or upload a CSV</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {employees.map((emp) => (
                <div key={emp.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingId === emp.id && editingData ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingData.name}
                        onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Name"
                      />
                      <input
                        type="email"
                        value={editingData.email}
                        onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Email"
                      />
                      <select
                        value={editingData.department}
                        onChange={(e) => setEditingData({ ...editingData, department: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {state.departments.map(dept => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editingData.title}
                        onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Title"
                      />
                      <select
                        value={editingData.supervisorId || ''}
                        onChange={(e) => setEditingData({ ...editingData, supervisorId: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">No supervisor</option>
                        {getSupervisors(editingId).map(sup => (
                          <option key={sup.id} value={sup.id}>{sup.name}</option>
                        ))}
                      </select>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900 flex items-center flex-wrap gap-2">
                            {emp.name}
                            {emp.hasDirectReports && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Supervisor
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 truncate">{emp.email}</div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStartEdit(emp)}
                            className="text-gray-400 hover:text-blue-600 p-1"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="inline-block bg-gray-100 rounded px-2 py-0.5 mr-2">{emp.department}</span>
                        {emp.title}
                      </div>
                      {emp.supervisorId && (
                        <div className="text-xs text-gray-500 mt-1">
                          Reports to: {getSupervisorName(emp.supervisorId)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports To</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      {editingId === emp.id && editingData ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editingData.name}
                              onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm min-w-[120px]"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="email"
                              value={editingData.email}
                              onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm min-w-[160px]"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editingData.department}
                              onChange={(e) => setEditingData({ ...editingData, department: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm min-w-[100px]"
                            >
                              {state.departments.map(dept => (
                                <option key={dept.id} value={dept.name}>{dept.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editingData.title}
                              onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm min-w-[120px]"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editingData.supervisorId || ''}
                              onChange={(e) => setEditingData({ ...editingData, supervisorId: e.target.value || undefined })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm min-w-[120px]"
                            >
                              <option value="">None</option>
                              {getSupervisors(editingId).map(sup => (
                                <option key={sup.id} value={sup.id}>{sup.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-right space-x-1 whitespace-nowrap">
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
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[150px]">{emp.name}</span>
                              {emp.hasDirectReports && (
                                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Supervisor
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <span className="truncate block max-w-[200px]">{emp.email}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{emp.department}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <span className="truncate block max-w-[150px]">{emp.title}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {getSupervisorName(emp.supervisorId) || '—'}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => handleStartEdit(emp)}
                              className="text-gray-400 hover:text-blue-600 p-1"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="text-gray-400 hover:text-red-600 p-1"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={employees.length === 0}
          className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Check-In Settings →
        </button>
      </div>
    </div>
  )
}
