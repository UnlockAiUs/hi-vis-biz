/**
 * @file src/lib/utils/team-health.ts
 * @description Team health metric computation utilities for Phase 5
 * 
 * AI AGENT INSTRUCTIONS:
 * - This file computes team health metrics from check-in data
 * - Metrics are computed per department/time window and stored idempotently
 * - All computations use 0-100 scale for consistency
 * - Risk levels: low (0-33), medium (34-66), high (67-100)
 */

import { createServiceClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseServiceClient = any // Awaited return type of createServiceClient

// Time window types
export type TimeWindow = 'week' | 'month' | 'quarter'

// Health metric output
export interface TeamHealthMetric {
  org_id: string
  department_id: string | null
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
  inputs: Record<string, unknown>
}

// Topic summary output
export interface TopicSummary {
  org_id: string
  department_id: string | null
  time_window_start: string
  time_window_end: string
  topic_key: string
  topic_label: string
  topic_category: string
  mention_count: number
  unique_users: number
  sentiment_trend: 'improving' | 'stable' | 'declining' | null
  summary_text: string | null
  source_dot_ids: string[]
}

/**
 * Get time window boundaries based on type
 */
export function getTimeWindowBoundaries(
  windowType: TimeWindow,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const end = new Date(referenceDate)
  end.setHours(0, 0, 0, 0)
  
  const start = new Date(end)
  
  switch (windowType) {
    case 'week':
      start.setDate(end.getDate() - 7)
      break
    case 'month':
      start.setMonth(end.getMonth() - 1)
      break
    case 'quarter':
      start.setMonth(end.getMonth() - 3)
      break
  }
  
  return { start, end }
}

/**
 * Calculate participation rate: % of active members who completed at least one check-in
 */
export async function calculateParticipationRate(
  supabase: SupabaseServiceClient,
  orgId: string,
  departmentId: string | null,
  startDate: Date,
  endDate: Date
): Promise<{ rate: number; totalMembers: number; activeMembers: number; completedSessions: number }> {
  // Get active members count
  let membersQuery = supabase
    .from('organization_members')
    .select('user_id', { count: 'exact' })
    .eq('org_id', orgId)
    .eq('status', 'active')
  
  if (departmentId) {
    membersQuery = membersQuery.eq('department_id', departmentId)
  }
  
  const { count: totalMembers } = await membersQuery
  
  if (!totalMembers || totalMembers === 0) {
    return { rate: 0, totalMembers: 0, activeMembers: 0, completedSessions: 0 }
  }
  
  // Get unique users who completed sessions in the time window
  const { data: completedSessions } = await supabase
    .from('sessions')
    .select(`
      user_id,
      organization_members!inner(org_id, department_id)
    `)
    .eq('organization_members.org_id', orgId)
    .not('completed_at', 'is', null)
    .gte('completed_at', startDate.toISOString())
    .lt('completed_at', endDate.toISOString())
  
  // Filter by department if specified
  const filteredSessions = departmentId
    ? completedSessions?.filter((s: any) => s.organization_members?.department_id === departmentId)
    : completedSessions
  
  const uniqueUsers = new Set(filteredSessions?.map((s: any) => s.user_id) || [])
  const activeMembers = uniqueUsers.size
  
  const rate = Math.round((activeMembers / totalMembers) * 100 * 100) / 100
  
  return {
    rate,
    totalMembers,
    activeMembers,
    completedSessions: filteredSessions?.length || 0
  }
}

/**
 * Calculate sentiment score from pulse check-ins (0-100, higher = more positive)
 */
export async function calculateSentimentScore(
  supabase: SupabaseServiceClient,
  orgId: string,
  departmentId: string | null,
  startDate: Date,
  endDate: Date
): Promise<number | null> {
  // Get pulse answers with ratings
  const { data: pulseAnswers } = await supabase
    .from('answers')
    .select(`
      extracted_data,
      session:sessions!inner(
        agent_code,
        completed_at,
        user_id
      )
    `)
    .eq('session.agent_code', 'pulse')
    .gte('session.completed_at', startDate.toISOString())
    .lt('session.completed_at', endDate.toISOString())
  
  if (!pulseAnswers || pulseAnswers.length === 0) {
    return null
  }
  
  // Extract ratings and calculate average
  const ratings: number[] = []
  for (const answer of pulseAnswers) {
    const extracted = answer.extracted_data as Record<string, unknown> | null
    const rating = extracted?.rating as number | undefined
    if (rating && rating >= 1 && rating <= 5) {
      ratings.push(rating)
    }
  }
  
  if (ratings.length === 0) {
    return null
  }
  
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
  // Convert 1-5 scale to 0-100
  return Math.round(((avgRating - 1) / 4) * 100 * 100) / 100
}

/**
 * Calculate workload score from pulse check-ins (0-100, higher = heavier workload)
 */
export async function calculateWorkloadScore(
  supabase: SupabaseServiceClient,
  orgId: string,
  departmentId: string | null,
  startDate: Date,
  endDate: Date
): Promise<number | null> {
  const { data: pulseAnswers } = await supabase
    .from('answers')
    .select(`
      extracted_data,
      session:sessions!inner(
        agent_code,
        completed_at
      )
    `)
    .eq('session.agent_code', 'pulse')
    .gte('session.completed_at', startDate.toISOString())
    .lt('session.completed_at', endDate.toISOString())
  
  if (!pulseAnswers || pulseAnswers.length === 0) {
    return null
  }
  
  const workloadRatings: number[] = []
  for (const answer of pulseAnswers) {
    const extracted = answer.extracted_data as Record<string, unknown> | null
    const workload = extracted?.workload_rating as number | undefined
    if (workload && workload >= 1 && workload <= 5) {
      workloadRatings.push(workload)
    }
  }
  
  if (workloadRatings.length === 0) {
    return null
  }
  
  const avgWorkload = workloadRatings.reduce((a, b) => a + b, 0) / workloadRatings.length
  return Math.round(((avgWorkload - 1) / 4) * 100 * 100) / 100
}

/**
 * Calculate burnout risk score (0-100, higher = more risk)
 */
export async function calculateBurnoutRiskScore(
  supabase: SupabaseServiceClient,
  orgId: string,
  departmentId: string | null,
  startDate: Date,
  endDate: Date
): Promise<number | null> {
  const { data: pulseAnswers } = await supabase
    .from('answers')
    .select(`
      extracted_data,
      session:sessions!inner(
        agent_code,
        completed_at
      )
    `)
    .eq('session.agent_code', 'pulse')
    .gte('session.completed_at', startDate.toISOString())
    .lt('session.completed_at', endDate.toISOString())
  
  if (!pulseAnswers || pulseAnswers.length === 0) {
    return null
  }
  
  let highCount = 0
  let mediumCount = 0
  let totalCount = 0
  
  for (const answer of pulseAnswers) {
    const extracted = answer.extracted_data as Record<string, unknown> | null
    const burnoutRisk = extracted?.burnout_risk as string | undefined
    if (burnoutRisk) {
      totalCount++
      if (burnoutRisk === 'high') highCount++
      else if (burnoutRisk === 'medium') mediumCount++
    }
  }
  
  if (totalCount === 0) {
    return null
  }
  
  // Weighted: high=100, medium=50, low=0
  const riskScore = ((highCount * 100) + (mediumCount * 50)) / totalCount
  return Math.round(riskScore * 100) / 100
}

/**
 * Calculate friction index based on workflow variants marked as friction
 */
export async function calculateFrictionIndex(
  supabase: SupabaseServiceClient,
  orgId: string,
  departmentId: string | null,
  startDate: Date,
  endDate: Date
): Promise<{ frictionIndex: number; canonical: number; allowed: number; friction: number }> {
  // Get variant counts
  const { data: variants } = await supabase
    .from('workflow_variants')
    .select(`
      is_allowed,
      workflow:workflows!inner(org_id, department_id)
    `)
    .eq('workflow.org_id', orgId)
  
  if (!variants || variants.length === 0) {
    return { frictionIndex: 0, canonical: 0, allowed: 0, friction: 0 }
  }
  
  let allowed = 0
  let friction = 0
  
  for (const variant of variants) {
    if (variant.is_allowed) {
      allowed++
    } else {
      friction++
    }
  }
  
  const total = allowed + friction
  const frictionIndex = total > 0 ? Math.round((friction / total) * 100 * 100) / 100 : 0
  
  return { frictionIndex, canonical: 0, allowed, friction }
}

/**
 * Calculate focus score from focus tracker check-ins
 */
export async function calculateFocusScore(
  supabase: SupabaseServiceClient,
  orgId: string,
  departmentId: string | null,
  startDate: Date,
  endDate: Date
): Promise<number | null> {
  const { data: focusAnswers } = await supabase
    .from('answers')
    .select(`
      extracted_data,
      session:sessions!inner(
        agent_code,
        completed_at
      )
    `)
    .eq('session.agent_code', 'focus_tracker')
    .gte('session.completed_at', startDate.toISOString())
    .lt('session.completed_at', endDate.toISOString())
  
  if (!focusAnswers || focusAnswers.length === 0) {
    return null
  }
  
  const focusRatings: number[] = []
  for (const answer of focusAnswers) {
    const extracted = answer.extracted_data as Record<string, unknown> | null
    const focusRating = extracted?.focus_rating as number | undefined
    if (focusRating && focusRating >= 1 && focusRating <= 5) {
      focusRatings.push(focusRating)
    }
  }
  
  if (focusRatings.length === 0) {
    return null
  }
  
  const avgFocus = focusRatings.reduce((a, b) => a + b, 0) / focusRatings.length
  return Math.round(((avgFocus - 1) / 4) * 100 * 100) / 100
}

/**
 * Determine risk level based on metrics
 */
export function determineRiskLevel(metrics: {
  participationRate: number | null
  sentimentScore: number | null
  burnoutRiskScore: number | null
  frictionIndex: number | null
}): 'low' | 'medium' | 'high' {
  let riskPoints = 0
  
  // Low participation is risky
  if (metrics.participationRate !== null && metrics.participationRate < 50) {
    riskPoints += 2
  } else if (metrics.participationRate !== null && metrics.participationRate < 75) {
    riskPoints += 1
  }
  
  // Low sentiment is risky
  if (metrics.sentimentScore !== null && metrics.sentimentScore < 40) {
    riskPoints += 2
  } else if (metrics.sentimentScore !== null && metrics.sentimentScore < 60) {
    riskPoints += 1
  }
  
  // High burnout risk
  if (metrics.burnoutRiskScore !== null && metrics.burnoutRiskScore > 60) {
    riskPoints += 2
  } else if (metrics.burnoutRiskScore !== null && metrics.burnoutRiskScore > 30) {
    riskPoints += 1
  }
  
  // High friction
  if (metrics.frictionIndex !== null && metrics.frictionIndex > 50) {
    riskPoints += 2
  } else if (metrics.frictionIndex !== null && metrics.frictionIndex > 25) {
    riskPoints += 1
  }
  
  if (riskPoints >= 5) return 'high'
  if (riskPoints >= 2) return 'medium'
  return 'low'
}

/**
 * Compute and store team health metrics for an organization
 */
export async function computeTeamHealthMetrics(
  orgId: string,
  windowType: TimeWindow = 'week',
  referenceDate: Date = new Date()
): Promise<TeamHealthMetric[]> {
  const supabase = await createServiceClient()
  const { start, end } = getTimeWindowBoundaries(windowType, referenceDate)
  
  // Get all departments for the org
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('org_id', orgId)
  
  const results: TeamHealthMetric[] = []
  
  // Compute for each department + org-wide (null department)
  const departmentIds: (string | null)[] = [null, ...(departments?.map((d: { id: string }) => d.id) || [])]
  
  for (const deptId of departmentIds) {
    // Calculate all metrics
    const participation = await calculateParticipationRate(supabase, orgId, deptId, start, end)
    const sentimentScore = await calculateSentimentScore(supabase, orgId, deptId, start, end)
    const workloadScore = await calculateWorkloadScore(supabase, orgId, deptId, start, end)
    const burnoutRiskScore = await calculateBurnoutRiskScore(supabase, orgId, deptId, start, end)
    const frictionData = await calculateFrictionIndex(supabase, orgId, deptId, start, end)
    const focusScore = await calculateFocusScore(supabase, orgId, deptId, start, end)
    
    const riskLevel = determineRiskLevel({
      participationRate: participation.rate,
      sentimentScore,
      burnoutRiskScore,
      frictionIndex: frictionData.frictionIndex
    })
    
    const metric: TeamHealthMetric = {
      org_id: orgId,
      department_id: deptId,
      time_window_start: start.toISOString(),
      time_window_end: end.toISOString(),
      participation_rate: participation.rate,
      friction_index: frictionData.frictionIndex,
      sentiment_score: sentimentScore,
      focus_score: focusScore,
      workload_score: workloadScore,
      burnout_risk_score: burnoutRiskScore,
      risk_level: riskLevel,
      total_members: participation.totalMembers,
      active_members: participation.activeMembers,
      total_sessions: 0, // TODO: compute total scheduled sessions
      completed_sessions: participation.completedSessions,
      canonical_dots: frictionData.canonical,
      allowed_variant_dots: frictionData.allowed,
      friction_variant_dots: frictionData.friction,
      inputs: {
        window_type: windowType,
        computed_at: new Date().toISOString()
      }
    }
    
    // Upsert the metric (idempotent)
    await supabase
      .from('team_health_metrics')
      .upsert(metric, {
        onConflict: 'org_id,department_id,time_window_start,time_window_end'
      })
    
    results.push(metric)
  }
  
  return results
}

/**
 * Get latest team health metrics for an organization
 */
export async function getLatestTeamHealthMetrics(
  orgId: string
): Promise<TeamHealthMetric[]> {
  const supabase = await createServiceClient()
  
  const { data: metrics, error } = await supabase
    .from('team_health_metrics')
    .select('*')
    .eq('org_id', orgId)
    .order('time_window_end', { ascending: false })
    .order('department_id', { ascending: true, nullsFirst: true })
    .limit(20) // Get recent metrics for all departments
  
  if (error) {
    console.error('Error fetching team health metrics:', error)
    return []
  }
  
  return metrics || []
}
