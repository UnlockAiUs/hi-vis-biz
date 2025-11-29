/**
 * @file src/components/ui/PrivacyInfoModal.tsx
 * @description Privacy information modal for employees
 * @ai-instruction This component shows employees how their data is used
 */

'use client'

import { useState, useEffect } from 'react'

interface PrivacyInfoModalProps {
  isOpen: boolean
  onClose: () => void
  customPolicyUrl?: string | null
}

export default function PrivacyInfoModal({ isOpen, onClose, customPolicyUrl }: PrivacyInfoModalProps) {
  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="privacy-modal-title" className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Your Privacy at VizDots
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            aria-label="Close privacy information"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* What We Collect */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-500">📥</span>
              What We Collect
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Your responses to check-in questions (mood, workload, blockers, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Session timestamps (when you complete check-ins)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Basic profile info (name, job title, department)</span>
              </li>
            </ul>
          </section>

          {/* How We Use It */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-500">🔍</span>
              How We Use Your Data
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Aggregate insights:</strong> Your responses are combined with others to show team-level trends (never individual data shared without consent)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>AI analysis:</strong> Our AI reads your responses to identify common themes, workflows, and potential friction points</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Building your profile:</strong> Over time, we learn about your role and work patterns to make check-ins more relevant</span>
              </li>
            </ul>
          </section>

          {/* Who Sees What */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-500">👁️</span>
              Who Sees What
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Your raw responses</span>
                <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded">Admins only</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Team-level summaries</span>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Managers & Admins</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Your personal history</span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Only you</span>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-500">⚖️</span>
              Your Rights
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">★</span>
                <span>You can view all your past check-ins in "My Dots"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">★</span>
                <span>Your data is stored securely and never sold to third parties</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">★</span>
                <span>Contact your admin if you have concerns about your data</span>
              </li>
            </ul>
          </section>

          {/* Custom Policy Link */}
          {customPolicyUrl && (
            <section className="border-t border-gray-200 pt-4">
              <a 
                href={customPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View our full privacy policy
              </a>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full btn-primary py-2"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}
