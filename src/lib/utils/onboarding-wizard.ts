/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/utils/onboarding-wizard.ts
 * PURPOSE: Admin onboarding wizard state management with localStorage persistence
 * EXPORTS:
 *   - OnboardingState, EmployeeEntry, DepartmentEntry, OrganizationData, ScheduleSettings types
 *   - loadOnboardingState(), saveOnboardingState(), clearOnboardingState()
 *   - Validation helpers: isValidEmail, isValidEmployee, isValidOrganization
 *   - Step navigation: WIZARD_STEPS, getStepPath, canAccessStep, getStepValidation
 *   - Constants: SIZE_BANDS, TIMEZONES, INDUSTRIES
 * USED BY: /admin/setup/* wizard pages (4-step org setup flow)
 */

// Types for the onboarding wizard

export interface EmployeeEntry {
  id: string // Temporary ID for UI tracking
  name: string
  email: string
  department: string // Department name (matched to department during submit)
  title: string
  hasDirectReports: boolean
  canViewReports: boolean
  supervisorId?: string // Reference to another employee's id
}

export interface DepartmentEntry {
  id: string // Temporary ID for UI tracking
  name: string
}

export interface OrganizationData {
  name: string
  timezone: string
  sizeBand: string
  industry: string
}

export interface ScheduleSettings {
  frequency: 'daily' | 'weekly'
  preferredDays: string[] // For weekly: ['monday', 'wednesday', 'friday']
  timeWindowStart: string // e.g., '09:00'
  timeWindowEnd: string // e.g., '17:00'
}

export interface OnboardingState {
  currentStep: 1 | 2 | 3 | 4
  organization: OrganizationData | null
  departments: DepartmentEntry[]
  employees: EmployeeEntry[]
  scheduleSettings: ScheduleSettings | null
  isComplete: boolean
  lastUpdated: string
}

// Default schedule settings
export const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettings = {
  frequency: 'weekly',
  preferredDays: ['monday', 'wednesday', 'friday'],
  timeWindowStart: '09:00',
  timeWindowEnd: '17:00',
}

// Default initial state
export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  currentStep: 1,
  organization: null,
  departments: [],
  employees: [],
  scheduleSettings: null,
  isComplete: false,
  lastUpdated: new Date().toISOString(),
}

// localStorage key
const STORAGE_KEY = 'vizdots_onboarding_state'

/**
 * Load onboarding state from localStorage
 */
export function loadOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') {
    return INITIAL_ONBOARDING_STATE
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as OnboardingState
      // Validate the parsed state has required fields
      if (parsed.currentStep && Array.isArray(parsed.departments) && Array.isArray(parsed.employees)) {
        return parsed
      }
    }
  } catch (error) {
    console.error('Failed to load onboarding state:', error)
  }
  
  return INITIAL_ONBOARDING_STATE
}

/**
 * Save onboarding state to localStorage
 */
export function saveOnboardingState(state: OnboardingState): void {
  if (typeof window === 'undefined') return
  
  try {
    const stateWithTimestamp = {
      ...state,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithTimestamp))
  } catch (error) {
    console.error('Failed to save onboarding state:', error)
  }
}

/**
 * Clear onboarding state from localStorage
 */
export function clearOnboardingState(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear onboarding state:', error)
  }
}

/**
 * Generate a temporary unique ID for UI tracking
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if an employee entry is valid
 */
export function isValidEmployee(employee: Partial<EmployeeEntry>): employee is EmployeeEntry {
  return !!(
    employee.id &&
    employee.name?.trim() &&
    employee.email?.trim() &&
    isValidEmail(employee.email) &&
    employee.department?.trim() &&
    employee.title?.trim() &&
    typeof employee.hasDirectReports === 'boolean' &&
    typeof employee.canViewReports === 'boolean'
  )
}

/**
 * Check if organization data is valid
 */
export function isValidOrganization(org: Partial<OrganizationData> | null): org is OrganizationData {
  return !!(
    org &&
    org.name?.trim() &&
    org.timezone?.trim() &&
    org.sizeBand?.trim() &&
    org.industry?.trim()
  )
}

/**
 * Get employees who can be supervisors (has_direct_reports = true)
 */
export function getPotentialSupervisors(employees: EmployeeEntry[]): EmployeeEntry[] {
  return employees.filter(emp => emp.hasDirectReports)
}

/**
 * Get the supervisor name for an employee
 */
export function getSupervisorName(employees: EmployeeEntry[], supervisorId: string | undefined): string | null {
  if (!supervisorId) return null
  const supervisor = employees.find(emp => emp.id === supervisorId)
  return supervisor?.name || null
}

/**
 * Step configuration for the wizard (4 steps)
 */
export const WIZARD_STEPS = [
  { step: 1, title: 'Company', path: '/admin/setup' },
  { step: 2, title: 'Departments', path: '/admin/setup/departments' },
  { step: 3, title: 'People', path: '/admin/setup/people' },
  { step: 4, title: 'Settings', path: '/admin/setup/settings' },
] as const

/**
 * Get the path for a specific step
 */
export function getStepPath(step: number): string {
  const stepConfig = WIZARD_STEPS.find(s => s.step === step)
  return stepConfig?.path || '/admin/setup'
}

/**
 * Get the next step number
 */
export function getNextStep(currentStep: number): number {
  return Math.min(currentStep + 1, 4)
}

/**
 * Get the previous step number
 */
export function getPreviousStep(currentStep: number): number {
  return Math.max(currentStep - 1, 1)
}

/**
 * Check if a step can be accessed (all previous steps must be complete)
 */
export function canAccessStep(state: OnboardingState, step: number): boolean {
  if (step === 1) return true
  if (step === 2) return isValidOrganization(state.organization)
  if (step === 3) return isValidOrganization(state.organization) && state.departments.length > 0
  if (step === 4) return isValidOrganization(state.organization) && state.departments.length > 0 && state.employees.length > 0
  return false
}

/**
 * Get validation status for each step
 */
export function getStepValidation(state: OnboardingState): Record<number, { valid: boolean; message?: string }> {
  return {
    1: {
      valid: isValidOrganization(state.organization),
      message: !isValidOrganization(state.organization) ? 'Please enter organization details' : undefined
    },
    2: {
      valid: state.departments.length > 0,
      message: state.departments.length === 0 ? 'Please add at least one department' : undefined
    },
    3: {
      valid: state.employees.length > 0,
      message: state.employees.length === 0 ? 'Please add at least one employee' : undefined
    },
    4: {
      valid: isValidOrganization(state.organization) && state.departments.length > 0 && state.employees.length > 0,
      message: 'Please complete all previous steps'
    }
  }
}

// Size band options
export const SIZE_BANDS = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
]

// Timezone options
export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  { value: 'America/Anchorage', label: 'Alaska (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HI)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
]

// Industry options
export const INDUSTRIES = [
  { value: 'service_field', label: 'Service & Field Operations' },
  { value: 'logistics', label: 'Logistics & Dispatch' },
  { value: 'trades', label: 'Trades & Construction' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality & Food Service' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'technology', label: 'Technology' },
  { value: 'education', label: 'Education' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'other', label: 'Other' },
]

// Days of the week for scheduling
export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]
