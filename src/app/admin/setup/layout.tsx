/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/setup/layout.tsx
 * PURPOSE: Layout wrapper for organization setup wizard (4-step onboarding)
 * EXPORTS: SetupLayout (default)
 * 
 * KEY FEATURES:
 * - Step progress indicator (1-4)
 * - Header with VizDots branding
 * - Footer with support contact
 * 
 * WIZARD STEPS: 1=Company Basics, 2=Departments & Roles, 3=People, 4=Settings & Launch
 * IMPORTS: WIZARD_STEPS from @/lib/utils/onboarding-wizard
 */
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { WIZARD_STEPS } from '@/lib/utils/onboarding-wizard'

interface SetupLayoutProps {
  children: React.ReactNode
}

export default function SetupLayout({ children }: SetupLayoutProps) {
  const pathname = usePathname()
  
  // Determine current step from pathname
  const getCurrentStep = (): number => {
    if (pathname === '/admin/setup') return 1
    if (pathname === '/admin/setup/departments') return 2
    if (pathname === '/admin/setup/people') return 3
    if (pathname === '/admin/setup/settings') return 4
    return 1
  }
  
  const currentStep = getCurrentStep()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">VizDots</h1>
                <p className="text-sm text-gray-500">Organization Setup</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {WIZARD_STEPS.map((step, index) => {
                const isComplete = step.step < currentStep
                const isCurrent = step.step === currentStep
                const isUpcoming = step.step > currentStep
                
                return (
                  <li key={step.step} className="relative flex-1">
                    {/* Connector line */}
                    {index > 0 && (
                      <div 
                        className={`absolute left-0 top-4 w-full h-0.5 -translate-x-1/2 ${
                          isComplete || isCurrent ? 'bg-yellow-500' : 'bg-gray-200'
                        }`}
                        style={{ width: 'calc(100% - 2rem)', left: '-50%', marginLeft: '1rem' }}
                      />
                    )}
                    
                    <div className="relative flex flex-col items-center group">
                      {/* Step circle */}
                      <span
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium z-10 ${
                          isComplete
                            ? 'bg-yellow-500 text-white'
                            : isCurrent
                            ? 'bg-yellow-500 text-white ring-2 ring-yellow-500 ring-offset-2'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isComplete ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          step.step
                        )}
                      </span>
                      
                      {/* Step title */}
                      <span
                        className={`mt-2 text-xs font-medium ${
                          isCurrent ? 'text-yellow-600' : isComplete ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        <span className="hidden sm:inline">{step.title}</span>
                        <span className="sm:hidden">{step.step}</span>
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Need help? Contact support at support@vizdots.com
          </p>
        </div>
      </footer>
    </div>
  )
}
