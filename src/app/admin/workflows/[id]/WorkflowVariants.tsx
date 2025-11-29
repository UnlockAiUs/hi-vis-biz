/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/workflows/[id]/WorkflowVariants.tsx
 * PURPOSE: Phase 3 - Display and manage workflow variants (OK vs Friction)
 * EXPORTS: default WorkflowVariants (client component)
 * 
 * LOGIC:
 * - Fetches variants for a workflow
 * - Displays variants as interactive chips
 * - Allows owners to mark variants as "OK" or "friction"
 * - Shows summary stats (unclassified, allowed, friction)
 * 
 * API: /api/admin/workflows/variants
 */

'use client'

import { useState, useEffect } from 'react'

interface WorkflowVariant {
  id: string
  variant_key: string
  description: string | null
  is_allowed: boolean | null
  notes: string | null
  source: string
  classified_at: string | null
  details: Record<string, unknown>
  created_at: string
  updated_at: string
  dot_count: number
}

interface VariantSummary {
  total: number
  unclassified: number
  allowed: number
  friction: number
}

interface WorkflowVariantsProps {
  workflowId: string
}

export default function WorkflowVariants({ workflowId }: WorkflowVariantsProps) {
  const [variants, setVariants] = useState<WorkflowVariant[]>([])
  const [summary, setSummary] = useState<VariantSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Fetch variants on mount
  useEffect(() => {
    async function fetchVariants() {
      try {
        const response = await fetch(`/api/admin/workflows/variants?workflow_id=${workflowId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch variants')
        }
        const data = await response.json()
        setVariants(data.variants || [])
        setSummary(data.summary || null)
      } catch (err) {
        console.error('Error fetching variants:', err)
        setError('Failed to load variants')
      } finally {
        setLoading(false)
      }
    }

    fetchVariants()
  }, [workflowId])

  // Classify a variant as OK or friction
  async function classifyVariant(variantId: string, isAllowed: boolean) {
    setUpdatingId(variantId)
    
    try {
      const response = await fetch('/api/admin/workflows/variants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: variantId,
          is_allowed: isAllowed
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update variant')
      }

      // Update local state
      setVariants(prev => prev.map(v => 
        v.id === variantId 
          ? { ...v, is_allowed: isAllowed, classified_at: new Date().toISOString() }
          : v
      ))

      // Update summary
      if (summary) {
        const oldVariant = variants.find(v => v.id === variantId)
        const newSummary = { ...summary }
        
        // Decrement old category
        if (oldVariant?.is_allowed === null) newSummary.unclassified--
        else if (oldVariant?.is_allowed === true) newSummary.allowed--
        else if (oldVariant?.is_allowed === false) newSummary.friction--
        
        // Increment new category
        if (isAllowed) newSummary.allowed++
        else newSummary.friction++
        
        setSummary(newSummary)
      }
    } catch (err) {
      console.error('Error classifying variant:', err)
      setError('Failed to update variant')
    } finally {
      setUpdatingId(null)
    }
  }

  // Get chip color based on classification
  function getChipColor(isAllowed: boolean | null): string {
    if (isAllowed === null) return 'bg-gray-100 text-gray-700 border-gray-300'
    if (isAllowed === true) return 'bg-green-100 text-green-800 border-green-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  // Get status label
  function getStatusLabel(isAllowed: boolean | null): string {
    if (isAllowed === null) return 'Unclassified'
    if (isAllowed === true) return 'OK'
    return 'Friction'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="flex flex-wrap gap-2">
            <div className="h-8 bg-gray-200 rounded-full w-32"></div>
            <div className="h-8 bg-gray-200 rounded-full w-40"></div>
            <div className="h-8 bg-gray-200 rounded-full w-36"></div>
          </div>
        </div>
      </div>
    )
  }

  // Don't show section if no variants
  if (variants.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Detected Variants</h2>
        {summary && (
          <div className="flex items-center gap-3 text-sm">
            {summary.unclassified > 0 && (
              <span className="text-gray-500">
                {summary.unclassified} unclassified
              </span>
            )}
            {summary.allowed > 0 && (
              <span className="text-green-600">
                {summary.allowed} OK
              </span>
            )}
            {summary.friction > 0 && (
              <span className="text-red-600">
                {summary.friction} friction
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-600 mb-4">
        Different people may do things differently. Mark each variation as &quot;OK&quot; (acceptable diversity) 
        or &quot;Friction&quot; (needs addressing).
      </p>

      {/* Variant Chips */}
      <div className="space-y-3">
        {variants.map((variant) => (
          <div 
            key={variant.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${getChipColor(variant.is_allowed)}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{variant.variant_key}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  variant.source === 'ai' ? 'bg-blue-100 text-blue-700' :
                  variant.source === 'owner' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {variant.source}
                </span>
                {variant.dot_count > 0 && (
                  <span className="text-xs text-gray-500">
                    {variant.dot_count} {variant.dot_count === 1 ? 'occurrence' : 'occurrences'}
                  </span>
                )}
              </div>
              {variant.description && (
                <p className="text-xs text-gray-600 mt-1 truncate">{variant.description}</p>
              )}
              {variant.notes && (
                <p className="text-xs text-gray-500 mt-1 italic">{variant.notes}</p>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              {/* Current status indicator */}
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                variant.is_allowed === null ? 'bg-gray-200 text-gray-600' :
                variant.is_allowed === true ? 'bg-green-200 text-green-800' :
                'bg-red-200 text-red-800'
              }`}>
                {getStatusLabel(variant.is_allowed)}
              </span>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => classifyVariant(variant.id, true)}
                  disabled={updatingId === variant.id || variant.is_allowed === true}
                  className={`p-1.5 rounded transition-colors ${
                    variant.is_allowed === true
                      ? 'bg-green-500 text-white cursor-default'
                      : 'hover:bg-green-100 text-green-600'
                  } ${updatingId === variant.id ? 'opacity-50 cursor-wait' : ''}`}
                  title="Mark as OK"
                  aria-label="Mark as OK"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => classifyVariant(variant.id, false)}
                  disabled={updatingId === variant.id || variant.is_allowed === false}
                  className={`p-1.5 rounded transition-colors ${
                    variant.is_allowed === false
                      ? 'bg-red-500 text-white cursor-default'
                      : 'hover:bg-red-100 text-red-600'
                  } ${updatingId === variant.id ? 'opacity-50 cursor-wait' : ''}`}
                  title="Mark as Friction"
                  aria-label="Mark as Friction"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <strong>Tip:</strong> Variants marked as &quot;friction&quot; will be tracked in analytics and may trigger 
        pattern alerts. Variants marked as &quot;OK&quot; are considered acceptable diversity.
      </div>
    </div>
  )
}
