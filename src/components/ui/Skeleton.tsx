/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/components/ui/Skeleton.tsx
 * PURPOSE: Skeleton loading placeholder components for UI loading states
 * EXPORTS: Skeleton, SkeletonCard, SkeletonTable, SkeletonStats, SkeletonChart, SkeletonForm, SkeletonList
 * 
 * COMPONENTS:
 * - Skeleton: Base pulsing placeholder div
 * - SkeletonCard: Card loading state
 * - SkeletonTable: Table with rows loading state
 * - SkeletonStats: 4-column stats grid loading state
 * - SkeletonChart: Chart with title loading state
 * - SkeletonForm: Form with fields loading state
 * - SkeletonList: List items loading state
 * 
 * STYLING: Tailwind CSS (animate-pulse, bg-gray-200)
 */

import { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} style={style}></div>
  )
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <Skeleton className="h-6 w-1/4" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4">
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Skeleton className="h-6 w-1/4 mb-4" />
      <Skeleton className={`w-full`} style={{ height }} />
    </div>
  )
}

export function SkeletonForm() {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <Skeleton className="h-6 w-1/3 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-1/4 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-32 mt-6" />
    </div>
  )
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}
