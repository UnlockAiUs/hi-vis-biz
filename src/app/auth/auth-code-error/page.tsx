/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/auth/auth-code-error/page.tsx
 * PURPOSE: Error page shown when OAuth/invite callback fails
 * EXPORTS: AuthCodeErrorPage (default)
 * 
 * KEY LOGIC:
 * - Displays user-friendly error message for auth failures
 * - Common causes: expired link, already used link
 * - Provides link back to login page
 */

import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold text-red-600">Authentication Error</h1>
          <p className="mt-4 text-gray-600">
            There was an error processing your authentication request.
            This could happen if the link has expired or was already used.
          </p>
        </div>
        <div className="space-y-4">
          <Link
            href="/auth/login"
            className="inline-block font-medium text-blue-600 hover:text-blue-500"
          >
            Return to login
          </Link>
          <p className="text-sm text-gray-500">
            If you continue to have problems, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
