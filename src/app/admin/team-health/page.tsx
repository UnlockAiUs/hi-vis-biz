/**
 * @file src/app/admin/team-health/page.tsx
 * @description Team Health Scorecard page (Phase 5)
 * 
 * AI AGENT INSTRUCTIONS:
 * - Displays team health metrics per department
 * - Shows risk levels with color coding (green/yellow/red)
 * - Allows triggering metric computation
 * - This is the "Analytics Backbone" UI for Phase 5
 */

'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface TeamHealthMetric {
  org_id: string
  department_id: string | null
  department_name: string
  time_window_start: string
  time_window_end: string
  participation_rate: number | null
  friction_index: number | null
  sentiment_score: number | null
  focus_score: number | null
  workload_score: number | null
  burnout_risk_score: number | null
  risk_level: 'low' | 'medium' | 'high'
  total_members: number
  active_members: number
  total_sessions: number
  completed_sessions: number
  canonical_dots: number
  allowed_variant_dots: number
  friction_variant_dots: number
}

type TimeWindow = 'week' | 'month' | 'quarter'

export default function TeamHealthPage() {
  const [metrics, setMetrics] = useState<TeamHealthMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>('week')

  useEffect(() => {
    fetchMetrics()
  }, [])

  async function fetchMetrics() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/team-health')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch metrics')
      }
      const data = await res.json()
      setMetrics(data.metrics || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function computeMetrics() {
    setComputing(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/team-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window_type: selectedWindow })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to compute metrics')
      }
      const data = await res.json()
      setMetrics(data.metrics || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setComputing(false)
    }
  }

  function getRiskColor(level: 'low' | 'medium' | 'high'): string {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'high': return 'bg-red-100 text-red-800 border-red-300'
    }
  }

  function getRiskBadge(level: 'low' | 'medium' | 'high'): string {
    switch (level) {
      case 'low': return '🟢 Low Risk'
      case 'medium': return '🟡 Medium Risk'
      case 'high': return '🔴 High Risk'
    }
  }

  function formatScore(score: number | null): string {
    if (score === null) return '—'
    return `${Math.round(score)}%`
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Group metrics by time window (get latest for each department)
  const latestMetrics = metrics.reduce((acc, m) => {
    const key = m.department_id || 'org-wide'
    if (!acc[key] || new Date(m.time_window_end) > new Date(acc[key].time_window_end)) {
      acc[key] = m
    }
    return acc
  }, {} as Record<string, TeamHealthMetric>)

  const sortedMetrics = Object.values(latestMetrics).sort((a, b) => {
    // Org-wide first, then by department name
    if (!a.department_id) return -1
    if (!b.department_id) return 1
    return a.department_name.localeCompare(b.department_name)
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Health Scorecard</h1>
          <p className="text-gray-600 mt-1">
            Monitor team wellness, participation, and identify areas needing attention
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedWindow}
            onChange={(e) => setSelectedWindow(e.target.value as TimeWindow)}
            className="input-field"
            disabled={computing}
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 90 days</option>
          </select>
          <button
            onClick={computeMetrics}
            disabled={computing}
            className="btn-primary flex items-center gap-2"
          >
            {computing ? (
              <>
                <LoadingSpinner size="sm" />
                Computing...
              </>
            ) : (
              <>
                <span>📊</span>
                Compute Metrics
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : sortedMetrics.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Health Metrics Yet</h3>
          <p className="text-gray-600 mb-4">
            Click &quot;Compute Metrics&quot; to generate team health scores based on check-in data.
          </p>
          <button
            onClick={computeMetrics}
            disabled={computing}
            className="btn-primary"
          >
            {computing ? 'Computing...' : 'Compute Metrics Now'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {sortedMetrics.slice(0, 1).map(m => (
              <div key="summary" className="col-span-full bg-white rounded-lg border shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Organization Overview</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(m.risk_level)}`}>
                    {getRiskBadge(m.risk_level)}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Participation</div>
                    <div className="text-2xl font-bold">{formatScore(m.participation_rate)}</div>
                    <div className="text-xs text-gray-400">{m.active_members} of {m.total_members} members</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Sentiment</div>
                    <div className="text-2xl font-bold">{formatScore(m.sentiment_score)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Burnout Risk</div>
                    <div className="text-2xl font-bold">{formatScore(m.burnout_risk_score)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Friction Index</div>
                    <div className="text-2xl font-bold">{formatScore(m.friction_index)}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t text-xs text-gray-400">
                  Data from {formatDate(m.time_window_start)} to {formatDate(m.time_window_end)}
                </div>
              </div>
            ))}
          </div>

          {/* Department Cards */}
          {sortedMetrics.length > 1 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mt-8">By Department</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedMetrics.slice(1).map((m) => (
                  <div
                    key={m.department_id}
                    className={`bg-white rounded-lg border shadow-sm p-4 ${getRiskColor(m.risk_level)} bg-opacity-10`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{m.department_name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(m.risk_level)}`}>
                        {m.risk_level.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Participation:</span>
                        <span className="ml-1 font-medium">{formatScore(m.participation_rate)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Sentiment:</span>
                        <span className="ml-1 font-medium">{formatScore(m.sentiment_score)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Workload:</span>
                        <span className="ml-1 font-medium">{formatScore(m.workload_score)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Focus:</span>
                        <span className="ml-1 font-medium">{formatScore(m.focus_score)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Burnout Risk:</span>
                        <span className="ml-1 font-medium">{formatScore(m.burnout_risk_score)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Friction:</span>
                        <span className="ml-1 font-medium">{formatScore(m.friction_index)}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                      {m.active_members} active / {m.total_members} total members • {m.completed_sessions} check-ins
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Legend */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <h4 className="font-medium text-gray-900 mb-2">Understanding Scores</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <li><strong>Participation:</strong> % of active members who completed check-ins</li>
              <li><strong>Sentiment:</strong> Average mood from pulse check-ins (0-100)</li>
              <li><strong>Workload:</strong> Perceived workload level (higher = heavier)</li>
              <li><strong>Focus:</strong> Ability to focus on priorities</li>
              <li><strong>Burnout Risk:</strong> Aggregated burnout signals (lower is better)</li>
              <li><strong>Friction Index:</strong> % of workflow variations causing friction</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
