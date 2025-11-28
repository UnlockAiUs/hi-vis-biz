/**
 * Vitest Test Setup
 * 
 * This file runs before all tests to configure the test environment.
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest'

// Mock environment variables for testing
beforeAll(() => {
  // Set test environment variables
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.OPENAI_API_KEY = 'test-openai-key'
  process.env.SCHEDULER_SECRET = 'test-scheduler-secret'
})

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Global cleanup
afterAll(() => {
  vi.resetAllMocks()
})

// Mock fetch globally for API tests
global.fetch = vi.fn()

// Mock console.error to not pollute test output (but allow assertions)
const originalConsoleError = console.error
console.error = vi.fn((...args) => {
  // Optionally log real errors during debugging
  if (process.env.DEBUG_TESTS) {
    originalConsoleError(...args)
  }
})

// Export commonly used test utilities
export { vi }
