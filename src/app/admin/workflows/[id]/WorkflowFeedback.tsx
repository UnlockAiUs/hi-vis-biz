/**
 * FILE: src/app/admin/workflows/[id]/WorkflowFeedback.tsx
 * PURPOSE: Owner feedback controls for workflow accuracy rating
 * EXPORTS: default WorkflowFeedback (client component)
 * 
 * LOGIC:
 * - Displays feedback strip with accuracy buttons
 * - Opens modal for detailed feedback when "mostly right" or "incorrect" clicked
 * - Creates/updates workflow_overrides in database
 * - Provides "Reset to AI suggestion" functionality
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface WorkflowOverride {
  id: string
  workflow_id: string
  status: string
  override_reason: string | null
  override_payload: Record<string, unknown>
  accuracy_rating: string | null
  accuracy_feedback: Record<string, unknown> | null
}

interface WorkflowVersion {
  id: string
  version_number: number
  structure: Record<string, unknown>
}

interface WorkflowFeedbackProps {
  workflowId: string
  currentOverride: WorkflowOverride | null
  currentVersion: WorkflowVersion | null
}

export default function WorkflowFeedback({ 
  workflowId, 
  currentOverride, 
  currentVersion 
}: WorkflowFeedbackProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [selectedRating, setSelectedRating] = useState<string | null>(
    currentOverride?.accuracy_rating || null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Feedback form state
  const [feedbackOptions, setFeedbackOptions] = useState({
    missing_step: false,
    wrong_step: false,
    wrong_tools: false,
    process_not_exist: false,
  })
  const [feedbackText, setFeedbackText] = useState('')

  const handleRatingClick = async (rating: string) => {
    if (rating === 'accurate') {
      // Direct submission for "accurate"
      await submitFeedback(rating, {})
    } else {
      // Open modal for detailed feedback
      setSelectedRating(rating)
      setShowModal(true)
    }
  }

  const submitFeedback = async (
    rating: string, 
    feedback: Record<string, unknown>
  ) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/workflows/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          accuracyRating: rating,
          accuracyFeedback: feedback,
          overrideReason: feedback.notes || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setShowModal(false)
      setSelectedRating(rating)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleModalSubmit = () => {
    const feedback = {
      ...feedbackOptions,
      notes: feedbackText || null,
    }
    submitFeedback(selectedRating!, feedback)
  }

  const handleResetToAI = async () => {
    if (!confirm('Reset this workflow to the AI suggestion? Your override will be archived.')) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/workflows/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset workflow')
      }

      setSelectedRating(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Feedback Strip */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">How accurate is this workflow?</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Your feedback helps improve AI suggestions
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRatingClick('accurate')}
              disabled={isSubmitting}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedRating === 'accurate'
                  ? 'bg-green-100 text-green-800 ring-2 ring-green-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              ✅ Looks right
            </button>
            
            <button
              onClick={() => handleRatingClick('partially_right')}
              disabled={isSubmitting}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedRating === 'partially_right'
                  ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700'
              }`}
            >
              🤔 Mostly right
            </button>
            
            <button
              onClick={() => handleRatingClick('incorrect')}
              disabled={isSubmitting}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedRating === 'incorrect'
                  ? 'bg-red-100 text-red-800 ring-2 ring-red-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              ❌ Not quite right
            </button>

            {currentOverride && (
              <button
                onClick={handleResetToAI}
                disabled={isSubmitting}
                className="ml-2 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100"
              >
                ↺ Reset to AI
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-25" 
              onClick={() => setShowModal(false)}
            />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedRating === 'partially_right' 
                  ? 'What needs improvement?' 
                  : 'What\'s incorrect?'}
              </h3>

              <div className="space-y-3 mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={feedbackOptions.missing_step}
                    onChange={(e) => setFeedbackOptions(prev => ({
                      ...prev,
                      missing_step: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">A step is missing</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={feedbackOptions.wrong_step}
                    onChange={(e) => setFeedbackOptions(prev => ({
                      ...prev,
                      wrong_step: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">A step is wrong</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={feedbackOptions.wrong_tools}
                    onChange={(e) => setFeedbackOptions(prev => ({
                      ...prev,
                      wrong_tools: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Tools are wrong</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={feedbackOptions.process_not_exist}
                    onChange={(e) => setFeedbackOptions(prev => ({
                      ...prev,
                      process_not_exist: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">This process doesn&apos;t exist</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What should this look like instead? (optional)
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  placeholder="Describe the correct process..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
