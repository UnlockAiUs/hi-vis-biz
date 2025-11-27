/**
 * CSV Parser for Employee Bulk Upload
 * 
 * Handles parsing CSV files for employee data and generates
 * downloadable CSV templates.
 */

import { EmployeeEntry, generateTempId, isValidEmail } from './onboarding-wizard'

// CSV column headers (must match exactly in uploaded files)
export const CSV_HEADERS = [
  'name',
  'email',
  'department',
  'title',
  'has_direct_reports',
  'can_view_reports',
] as const

// Example data for the template
const TEMPLATE_EXAMPLE_ROWS = [
  ['John Smith', 'john.smith@example.com', 'Engineering', 'Senior Developer', 'no', 'no'],
  ['Jane Doe', 'jane.doe@example.com', 'Engineering', 'Engineering Manager', 'yes', 'yes'],
  ['Bob Johnson', 'bob.johnson@example.com', 'Sales', 'Sales Representative', 'no', 'no'],
  ['Alice Williams', 'alice.williams@example.com', 'Sales', 'Sales Manager', 'yes', 'yes'],
]

export interface ParseResult {
  success: boolean
  employees: EmployeeEntry[]
  errors: ParseError[]
  warnings: string[]
}

export interface ParseError {
  row: number
  column?: string
  message: string
}

/**
 * Generate a CSV template string for download
 */
export function generateCSVTemplate(): string {
  const headerRow = CSV_HEADERS.join(',')
  const exampleRows = TEMPLATE_EXAMPLE_ROWS.map(row => row.join(',')).join('\n')
  
  return `${headerRow}\n${exampleRows}`
}

/**
 * Download the CSV template as a file
 */
export function downloadCSVTemplate(): void {
  const csvContent = generateCSVTemplate()
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = 'employee_upload_template.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Parse a CSV string into employee entries
 */
export function parseCSV(csvContent: string, validDepartments: string[]): ParseResult {
  const result: ParseResult = {
    success: true,
    employees: [],
    errors: [],
    warnings: [],
  }
  
  // Normalize line endings and split into lines
  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim() !== '')
  
  if (lines.length === 0) {
    result.success = false
    result.errors.push({
      row: 0,
      message: 'CSV file is empty',
    })
    return result
  }
  
  // Parse header row
  const headerRow = parseCSVLine(lines[0])
  const headerMap = validateHeaders(headerRow)
  
  if (headerMap.errors.length > 0) {
    result.success = false
    result.errors.push(...headerMap.errors.map(msg => ({
      row: 1,
      message: msg,
    })))
    return result
  }
  
  // Track seen emails for duplicate detection
  const seenEmails = new Set<string>()
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1 // 1-indexed for user-friendly error messages
    const values = parseCSVLine(lines[i])
    
    // Skip empty rows
    if (values.every(v => v.trim() === '')) {
      continue
    }
    
    const employeeResult = parseEmployeeRow(
      values,
      headerMap.columnMap,
      rowNumber,
      validDepartments,
      seenEmails
    )
    
    if (employeeResult.employee) {
      result.employees.push(employeeResult.employee)
      seenEmails.add(employeeResult.employee.email.toLowerCase())
    }
    
    if (employeeResult.errors.length > 0) {
      result.errors.push(...employeeResult.errors)
    }
    
    if (employeeResult.warnings.length > 0) {
      result.warnings.push(...employeeResult.warnings)
    }
  }
  
  // Set success based on whether we have any errors
  if (result.errors.length > 0) {
    result.success = false
  }
  
  // Warning if no valid employees found
  if (result.employees.length === 0 && result.errors.length === 0) {
    result.warnings.push('No employees found in the CSV file')
  }
  
  return result
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"'
          i++ // Skip next char
        } else {
          // End of quoted section
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  
  // Don't forget the last value
  result.push(current.trim())
  
  return result
}

/**
 * Validate CSV headers and create column mapping
 */
function validateHeaders(headers: string[]): {
  columnMap: Map<string, number>
  errors: string[]
} {
  const columnMap = new Map<string, number>()
  const errors: string[] = []
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/['"]/g, ''))
  
  // Check for required headers
  for (const required of CSV_HEADERS) {
    const index = normalizedHeaders.indexOf(required)
    if (index === -1) {
      errors.push(`Missing required column: "${required}"`)
    } else {
      columnMap.set(required, index)
    }
  }
  
  return { columnMap, errors }
}

/**
 * Parse a single employee row
 */
function parseEmployeeRow(
  values: string[],
  columnMap: Map<string, number>,
  rowNumber: number,
  validDepartments: string[],
  seenEmails: Set<string>
): {
  employee: EmployeeEntry | null
  errors: ParseError[]
  warnings: string[]
} {
  const errors: ParseError[] = []
  const warnings: string[] = []
  
  // Extract values using column map
  const getValue = (column: string): string => {
    const index = columnMap.get(column)
    if (index === undefined || index >= values.length) {
      return ''
    }
    return values[index].trim().replace(/^["']|["']$/g, '') // Remove quotes
  }
  
  const name = getValue('name')
  const email = getValue('email')
  const department = getValue('department')
  const title = getValue('title')
  const hasDirectReportsStr = getValue('has_direct_reports').toLowerCase()
  const canViewReportsStr = getValue('can_view_reports').toLowerCase()
  
  // Validate required fields
  if (!name) {
    errors.push({ row: rowNumber, column: 'name', message: 'Name is required' })
  }
  
  if (!email) {
    errors.push({ row: rowNumber, column: 'email', message: 'Email is required' })
  } else if (!isValidEmail(email)) {
    errors.push({ row: rowNumber, column: 'email', message: `Invalid email format: "${email}"` })
  } else if (seenEmails.has(email.toLowerCase())) {
    errors.push({ row: rowNumber, column: 'email', message: `Duplicate email: "${email}"` })
  }
  
  if (!department) {
    errors.push({ row: rowNumber, column: 'department', message: 'Department is required' })
  } else {
    // Check if department exists (case-insensitive)
    const matchedDept = validDepartments.find(
      d => d.toLowerCase() === department.toLowerCase()
    )
    if (!matchedDept) {
      errors.push({
        row: rowNumber,
        column: 'department',
        message: `Department "${department}" does not exist. Valid departments: ${validDepartments.join(', ')}`,
      })
    }
  }
  
  if (!title) {
    errors.push({ row: rowNumber, column: 'title', message: 'Title is required' })
  }
  
  // Parse boolean fields
  const hasDirectReports = parseBoolean(hasDirectReportsStr)
  const canViewReports = parseBoolean(canViewReportsStr)
  
  if (hasDirectReports === null) {
    warnings.push(`Row ${rowNumber}: Invalid value for has_direct_reports "${hasDirectReportsStr}", defaulting to "no"`)
  }
  
  if (canViewReports === null) {
    warnings.push(`Row ${rowNumber}: Invalid value for can_view_reports "${canViewReportsStr}", defaulting to "no"`)
  }
  
  // If there are errors, don't create the employee
  if (errors.length > 0) {
    return { employee: null, errors, warnings }
  }
  
  // Find the correctly cased department name
  const correctDepartment = validDepartments.find(
    d => d.toLowerCase() === department.toLowerCase()
  ) || department
  
  const employee: EmployeeEntry = {
    id: generateTempId(),
    name,
    email,
    department: correctDepartment,
    title,
    hasDirectReports: hasDirectReports ?? false,
    canViewReports: canViewReports ?? false,
  }
  
  return { employee, errors, warnings }
}

/**
 * Parse a boolean value from CSV (yes/no, true/false, 1/0, y/n)
 */
function parseBoolean(value: string): boolean | null {
  const normalized = value.toLowerCase().trim()
  
  if (['yes', 'true', '1', 'y'].includes(normalized)) {
    return true
  }
  
  if (['no', 'false', '0', 'n', ''].includes(normalized)) {
    return false
  }
  
  return null // Invalid value
}

/**
 * Convert employees back to CSV format for export
 */
export function employeesToCSV(employees: EmployeeEntry[]): string {
  const headerRow = CSV_HEADERS.join(',')
  const dataRows = employees.map(emp => [
    escapeCSVValue(emp.name),
    escapeCSVValue(emp.email),
    escapeCSVValue(emp.department),
    escapeCSVValue(emp.title),
    emp.hasDirectReports ? 'yes' : 'no',
    emp.canViewReports ? 'yes' : 'no',
  ].join(','))
  
  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escape a value for CSV (wrap in quotes if needed)
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Read a file and return its contents as string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
