/**
 * @file src/app/admin/alerts/page.tsx
 * @description Pattern Alerts page - View and manage org health alerts with coaching suggestions
 * @ai-context Part of Phase 6 Manager Coaching Layer. Displays alerts with drill-down and action buttons.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Department {
  id: string
  name: string
}

interface AlertDetails {
  metrics_snapshot: Record<string, number>
  threshold_breached: {
    metric_name: string
    threshold_value: number
    actual_value: number
  }
  time_period: {
    start: string
    end: string
  }
  trend_direction: 'improving' | 'worsening' | 'stable'
}

interface CoachingSuggestion {
  action: string
  reason: string
  effort: 'low' | 'medium' | 'high'
  priority: number
}

interface Alert {
  id: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed'
  summary: string
  details: AlertDetails
  coaching_suggestions: CoachingSuggestion[]
  created_at: string
  department_id: string | null
  department: Department | null
  acknowledged_at: string | null
  acknowledged_note: string | null
  resolved_at: string | null
  resolved_note: string | null
}

interface AlertStats {
  total: number
  critical: number
  warning: number
  acknowledged: number
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  low_participation: 'Low Participation',
  high_friction: 'High Friction',
  sentiment_drop: 'Sentiment Drop',
  workload_spike: 'Workload Spike',
  burnout_risk: 'Burnout Risk',
  focus_drift: 'Focus Drift',
  process_variance: 'Process Variance'
}

const ALERT_TYPE_ICONS: Record<string, string> = {
  low_participation: '📉',
  high_friction: '⚡',
  sentiment_drop: '😟',
  workload_spike: '📈',
  burnout_risk: '🔥',
  focus_drift: '🎯',
  process_variance: '🔀'
}

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700' },
  info: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' }
}

const EFFORT_BADGES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700'
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null)
  const [includeResolved, setIncludeResolved] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState<string>('')
  const [showNoteModal, setShowNoteModal] = useState<{ alertId: string; action: string } | null>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true)
      const url = `/api/admin/alerts${includeResolved ? '?include_resolved=true' : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      setAlerts(data.alerts)
      setStats(data.stats)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [includeResolved])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const updateAlertStatus = async (alertId: string, status: string, note?: string) => {
    try {
      setUpdatingId(alertId)
      const response = await fetch('/api/admin/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, status, note })
      })

      if (!response.ok) {
        throw new Error('Failed to update alert')
      }

      await fetchAlerts()
      setShowNoteModal(null)
      setNoteInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alert')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleAction = (alertId: string, action: string) => {
    if (action === 'resolved' || action === 'dismissed') {
      setShowNoteModal({ alertId, action })
    } else {
      updateAlertStatus(alertId, action)
    }
  }

  const formatMetricName = (name: string) => {
    return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pattern Alerts</h1>
          <p className="text-gray-600 mt-1">Monitor org health issues and get coaching suggestions</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={includeResolved}
            onChange={(e) => setIncludeResolved(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show resolved alerts
        </label>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Alerts</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            <div className="text-sm text-red-600">Critical</div>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <div className="text-2xl font-bold text-yellow-700">{stats.warning}</div>
            <div className="text-sm text-yellow-600">Warning</div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="text-2xl font-bold text-blue-700">{stats.acknowledged}</div>
            <div className="text-sm text-blue-600">Acknowledged</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* No Alerts State */}
      {!loading && alerts.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-green-800">All Clear!</h3>
          <p className="text-green-600 mt-1">No active alerts at this time. Your team health looks good.</p>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.map((alert) => {
          const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.info
          const isExpanded = expandedAlertId === alert.id

          return (
            <div
              key={alert.id}
              className={`${colors.bg} border ${colors.border} rounded-lg overflow-hidden transition-all`}
            >
              {/* Alert Header */}
              <div
                className="p-4 cursor-pointer flex items-start justify-between"
                onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{ALERT_TYPE_ICONS[alert.alert_type] || '⚠️'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${colors.text}`}>
                        {ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                        alert.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      {alert.status === 'acknowledged' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-200 text-purple-800">
                          ACKNOWLEDGED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{alert.summary}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {alert.department && (
                        <span>📁 {alert.department.name}</span>
                      )}
                      <span>📅 {formatDate(alert.created_at)}</span>
                      <span className={`flex items-center gap-1 ${
                        alert.details.trend_direction === 'improving' ? 'text-green-600' :
                        alert.details.trend_direction === 'worsening' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {alert.details.trend_direction === 'improving' ? '📈' :
                         alert.details.trend_direction === 'worsening' ? '📉' : '➡️'}
                        {alert.details.trend_direction}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-200 bg-white">
                  {/* Metric Details */}
                  <div className="py-4 border-b">
                    <h4 className="font-medium text-gray-900 mb-2">Metric Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-500">Metric</div>
                        <div className="font-medium">{formatMetricName(alert.details.threshold_breached.metric_name)}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-500">Current Value</div>
                        <div className={`font-medium ${colors.text}`}>
                          {alert.details.threshold_breached.actual_value.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-500">Threshold</div>
                        <div className="font-medium">{alert.details.threshold_breached.threshold_value}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Coaching Suggestions */}
                  {alert.coaching_suggestions.length > 0 && (
                    <div className="py-4 border-b">
                      <h4 className="font-medium text-gray-900 mb-3">💡 Suggested Actions</h4>
                      <div className="space-y-3">
                        {alert.coaching_suggestions.map((suggestion, idx) => (
                          <div key={idx} className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-blue-900">{suggestion.action}</div>
                                <div className="text-sm text-blue-700 mt-1">{suggestion.reason}</div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${EFFORT_BADGES[suggestion.effort]}`}>
                                {suggestion.effort} effort
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {alert.status !== 'resolved' && alert.status !== 'dismissed' && (
                    <div className="pt-4 flex flex-wrap gap-2">
                      {alert.status === 'open' && (
                        <button
                          onClick={() => handleAction(alert.id, 'acknowledged')}
                          disabled={updatingId === alert.id}
                          className="btn-secondary text-sm"
                        >
                          {updatingId === alert.id ? <LoadingSpinner size="sm" /> : '👀 Acknowledge'}
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(alert.id, 'resolved')}
                        disabled={updatingId === alert.id}
                        className="btn-primary text-sm"
                      >
                        {updatingId === alert.id ? <LoadingSpinner size="sm" /> : '✅ Mark Resolved'}
                      </button>
                      <button
                        onClick={() => handleAction(alert.id, 'dismissed')}
                        disabled={updatingId === alert.id}
                        className="btn-ghost text-sm text-gray-500"
                      >
                        {updatingId === alert.id ? <LoadingSpinner size="sm" /> : '❌ Dismiss'}
                      </button>
                    </div>
                  )}

                  {/* Resolution Info */}
                  {(alert.status === 'resolved' || alert.status === 'dismissed') && (
                    <div className="pt-4">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="text-sm text-gray-600">
                          {alert.status === 'resolved' ? '✅ Resolved' : '❌ Dismissed'}
                          {alert.resolved_at && ` on ${formatDate(alert.resolved_at)}`}
                        </div>
                        {alert.resolved_note && (
                          <div className="text-sm text-gray-700 mt-1">Note: {alert.resolved_note}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {showNoteModal.action === 'resolved' ? 'Mark as Resolved' : 'Dismiss Alert'}
            </h3>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add an optional note about this action..."
              className="w-full border rounded-lg p-3 h-24 text-sm"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowNoteModal(null)
                  setNoteInput('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => updateAlertStatus(showNoteModal.alertId, showNoteModal.action, noteInput)}
                disabled={updatingId !== null}
                className="btn-primary"
              >
                {updatingId ? <LoadingSpinner size="sm" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
