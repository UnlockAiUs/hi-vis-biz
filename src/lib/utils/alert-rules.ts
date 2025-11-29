/**
 * @file src/lib/utils/alert-rules.ts
 * @description Alert Rules Engine - Evaluates health metrics against thresholds to generate pattern alerts
 * @ai-context Part of Phase 6 Manager Coaching Layer. Used by scheduler/cron to detect org health issues.
 */

import { createServiceClient } from '@/lib/supabase/server'

// Alert type definitions
export type AlertType = 
  | 'low_participation'
  | 'high_friction'
  | 'sentiment_drop'
  | 'workload_spike'
  | 'burnout_risk'
  | 'focus_drift'
  | 'process_variance'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface AlertThreshold {
  type: AlertType
  metric: string
  warningThreshold: number
  criticalThreshold: number
  direction: 'above' | 'below' // whether alert triggers above or below threshold
  description: string
}

export interface AlertDetails {
  metrics_snapshot: Record<string, number>
  threshold_breached: {
    metric_name: string
    threshold_value: number
    actual_value: number
  }
  affected_workflows?: string[]
  affected_users_count?: number
  time_period: {
    start: string
    end: string
  }
  trend_direction: 'improving' | 'worsening' | 'stable'
}

export interface CoachingSuggestion {
  action: string
  reason: string
  effort: 'low' | 'medium' | 'high'
  priority: number
}

// Default alert thresholds
export const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  {
    type: 'low_participation',
    metric: 'participation_rate',
    warningThreshold: 50,
    criticalThreshold: 30,
    direction: 'below',
    description: 'Team participation in check-ins is low'
  },
  {
    type: 'high_friction',
    metric: 'friction_index',
    warningThreshold: 50,
    criticalThreshold: 70,
    direction: 'above',
    description: 'High friction detected in workflows'
  },
  {
    type: 'sentiment_drop',
    metric: 'sentiment_score',
    warningThreshold: 40,
    criticalThreshold: 25,
    direction: 'below',
    description: 'Team sentiment has dropped significantly'
  },
  {
    type: 'workload_spike',
    metric: 'workload_score',
    warningThreshold: 70,
    criticalThreshold: 85,
    direction: 'above',
    description: 'Team workload is elevated'
  },
  {
    type: 'burnout_risk',
    metric: 'burnout_risk_score',
    warningThreshold: 50,
    criticalThreshold: 70,
    direction: 'above',
    description: 'Elevated burnout risk detected'
  },
  {
    type: 'focus_drift',
    metric: 'focus_score',
    warningThreshold: 40,
    criticalThreshold: 25,
    direction: 'below',
    description: 'Team focus appears to be drifting'
  }
]

// Coaching suggestion templates based on alert type
const COACHING_TEMPLATES: Record<AlertType, CoachingSuggestion[]> = {
  low_participation: [
    { action: 'Send a team reminder about the value of regular check-ins', reason: 'Increases awareness and buy-in', effort: 'low', priority: 1 },
    { action: 'Schedule a brief team meeting to discuss any blockers', reason: 'Identifies root causes of low engagement', effort: 'medium', priority: 2 },
    { action: 'Review check-in timing - ensure it fits team schedules', reason: 'Removes friction from participation', effort: 'low', priority: 3 }
  ],
  high_friction: [
    { action: 'Review the top friction-causing workflows with the team', reason: 'Direct insight from those experiencing the friction', effort: 'medium', priority: 1 },
    { action: 'Prioritize fixing the most impactful friction point', reason: 'Quick wins build momentum', effort: 'medium', priority: 2 },
    { action: 'Document workarounds that team members have developed', reason: 'Captures institutional knowledge', effort: 'low', priority: 3 }
  ],
  sentiment_drop: [
    { action: 'Have 1:1 conversations with team members', reason: 'Shows care and surfaces hidden issues', effort: 'medium', priority: 1 },
    { action: 'Review recent changes that may have affected morale', reason: 'Identifies potential causes', effort: 'low', priority: 2 },
    { action: 'Consider a team retrospective to discuss concerns openly', reason: 'Creates safe space for feedback', effort: 'medium', priority: 3 }
  ],
  workload_spike: [
    { action: 'Review current project deadlines and priorities', reason: 'Ensures focus on truly critical work', effort: 'low', priority: 1 },
    { action: 'Consider redistributing tasks across the team', reason: 'Prevents individual burnout', effort: 'medium', priority: 2 },
    { action: 'Identify tasks that can be deferred or delegated', reason: 'Creates immediate relief', effort: 'low', priority: 3 }
  ],
  burnout_risk: [
    { action: 'Encourage team members to take PTO or breaks', reason: 'Rest is essential for sustainable performance', effort: 'low', priority: 1 },
    { action: 'Review workload distribution for equity', reason: 'Ensures no one is carrying too much', effort: 'medium', priority: 2 },
    { action: 'Have private conversations about wellbeing', reason: 'Shows personal care and support', effort: 'medium', priority: 3 },
    { action: 'Consider bringing in temporary help for critical projects', reason: 'Reduces sustained pressure', effort: 'high', priority: 4 }
  ],
  focus_drift: [
    { action: 'Clarify team priorities and OKRs', reason: 'Provides clear direction', effort: 'low', priority: 1 },
    { action: 'Reduce meeting load to protect focus time', reason: 'Creates space for deep work', effort: 'low', priority: 2 },
    { action: 'Review if context switching is causing distraction', reason: 'Identifies systemic issues', effort: 'medium', priority: 3 }
  ],
  process_variance: [
    { action: 'Document the standard process for the varying workflow', reason: 'Creates a reference point', effort: 'medium', priority: 1 },
    { action: 'Discuss with the team whether variance is intentional or accidental', reason: 'Distinguishes good vs bad variance', effort: 'low', priority: 2 },
    { action: 'If variance is beneficial, update the standard process', reason: 'Captures improvements', effort: 'medium', priority: 3 }
  ]
}

/**
 * Evaluates a single metric against its threshold
 */
function evaluateThreshold(
  value: number,
  threshold: AlertThreshold
): { triggered: boolean; severity: AlertSeverity } {
  if (threshold.direction === 'below') {
    if (value <= threshold.criticalThreshold) {
      return { triggered: true, severity: 'critical' }
    }
    if (value <= threshold.warningThreshold) {
      return { triggered: true, severity: 'warning' }
    }
  } else {
    if (value >= threshold.criticalThreshold) {
      return { triggered: true, severity: 'critical' }
    }
    if (value >= threshold.warningThreshold) {
      return { triggered: true, severity: 'warning' }
    }
  }
  return { triggered: false, severity: 'info' }
}

/**
 * Determines trend direction by comparing current to previous metrics
 */
function determineTrend(
  currentValue: number,
  previousValue: number | null,
  direction: 'above' | 'below'
): 'improving' | 'worsening' | 'stable' {
  if (previousValue === null) return 'stable'
  
  const diff = currentValue - previousValue
  const threshold = 5 // 5% change threshold for trend detection
  
  if (Math.abs(diff) < threshold) return 'stable'
  
  // For "below" alerts (e.g., participation), increasing is improving
  // For "above" alerts (e.g., friction), decreasing is improving
  if (direction === 'below') {
    return diff > 0 ? 'improving' : 'worsening'
  } else {
    return diff < 0 ? 'improving' : 'worsening'
  }
}

/**
 * Main function to evaluate health metrics and create alerts
 */
export async function evaluateAndCreateAlerts(
  orgId: string,
  departmentId: string | null,
  metrics: {
    participation_rate: number
    friction_index: number
    sentiment_score: number
    focus_score: number
    workload_score: number
    burnout_risk_score: number
  },
  previousMetrics?: {
    participation_rate: number
    friction_index: number
    sentiment_score: number
    focus_score: number
    workload_score: number
    burnout_risk_score: number
  } | null,
  timeWindow?: { start: string; end: string }
): Promise<{ alertsCreated: number; errors: string[] }> {
  const supabase = await createServiceClient()
  const errors: string[] = []
  let alertsCreated = 0

  const metricsMap: Record<string, number> = {
    participation_rate: metrics.participation_rate,
    friction_index: metrics.friction_index,
    sentiment_score: metrics.sentiment_score,
    focus_score: metrics.focus_score,
    workload_score: metrics.workload_score,
    burnout_risk_score: metrics.burnout_risk_score
  }

  const previousMetricsMap: Record<string, number | null> = previousMetrics ? {
    participation_rate: previousMetrics.participation_rate,
    friction_index: previousMetrics.friction_index,
    sentiment_score: previousMetrics.sentiment_score,
    focus_score: previousMetrics.focus_score,
    workload_score: previousMetrics.workload_score,
    burnout_risk_score: previousMetrics.burnout_risk_score
  } : {}

  for (const threshold of DEFAULT_THRESHOLDS) {
    const value = metricsMap[threshold.metric]
    if (value === undefined) continue

    const evaluation = evaluateThreshold(value, threshold)
    
    if (evaluation.triggered) {
      const previousValue = previousMetricsMap[threshold.metric] ?? null
      const trend = determineTrend(value, previousValue, threshold.direction)

      const alertDetails: AlertDetails = {
        metrics_snapshot: metricsMap,
        threshold_breached: {
          metric_name: threshold.metric,
          threshold_value: evaluation.severity === 'critical' 
            ? threshold.criticalThreshold 
            : threshold.warningThreshold,
          actual_value: value
        },
        time_period: timeWindow || {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        trend_direction: trend
      }

      const coachingSuggestions = COACHING_TEMPLATES[threshold.type] || []

      // Insert alert (unique constraint will prevent duplicates per day)
      const { error } = await supabase
        .from('pattern_alerts')
        .insert({
          org_id: orgId,
          department_id: departmentId,
          alert_type: threshold.type,
          severity: evaluation.severity,
          status: 'open',
          summary: threshold.description,
          details: alertDetails,
          coaching_suggestions: coachingSuggestions
        })

      if (error) {
        // Ignore unique constraint violations (duplicate alert for same day)
        if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
          errors.push(`Failed to create ${threshold.type} alert: ${error.message}`)
        }
      } else {
        alertsCreated++
      }
    }
  }

  return { alertsCreated, errors }
}

/**
 * Gets open alerts for an organization
 */
export async function getOpenAlerts(
  orgId: string,
  departmentId?: string
): Promise<{
  alerts: Array<{
    id: string
    alert_type: AlertType
    severity: AlertSeverity
    status: string
    summary: string
    details: AlertDetails
    coaching_suggestions: CoachingSuggestion[]
    created_at: string
    department_id: string | null
  }>
  error: string | null
}> {
  const supabase = await createServiceClient()
  
  let query = supabase
    .from('pattern_alerts')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'open')
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })

  if (departmentId) {
    query = query.eq('department_id', departmentId)
  }

  const { data, error } = await query

  if (error) {
    return { alerts: [], error: error.message }
  }

  return { alerts: data || [], error: null }
}

/**
 * Updates alert status
 */
export async function updateAlertStatus(
  alertId: string,
  status: 'acknowledged' | 'resolved' | 'dismissed',
  userId: string,
  note?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createServiceClient()
  
  const updateData: Record<string, unknown> = { status }
  
  if (status === 'acknowledged') {
    updateData.acknowledged_at = new Date().toISOString()
    updateData.acknowledged_by = userId
    updateData.acknowledged_note = note || null
  } else if (status === 'resolved' || status === 'dismissed') {
    updateData.resolved_at = new Date().toISOString()
    updateData.resolved_by = userId
    updateData.resolved_note = note || null
  }

  const { error } = await supabase
    .from('pattern_alerts')
    .update(updateData)
    .eq('id', alertId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}
