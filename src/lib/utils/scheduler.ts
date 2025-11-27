/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/utils/scheduler.ts
 * PURPOSE: Session scheduling logic for automated micro-sessions
 * EXPORTS:
 *   - SCHEDULING_CONFIG - agent frequency settings (pulse weekly, role_mapper onboarding, etc.)
 *   - DEFAULT_SCHEDULE - default weekly schedule (Mon-Fri 9-5)
 *   - isSchedulingAllowed(orgSchedule, userOverride, timezone) - checks if scheduling is allowed now
 *   - determineSessionsToSchedule(context, maxSessions) - returns sessions to create
 *   - getProfileGaps(profile) - returns missing profile fields
 *   - calculateProfileCompleteness(profile) - returns 0-100 completeness score
 * CALLED BY: /api/internal/scheduler (Vercel cron job at 6 AM daily)
 */

import { ProfileJson } from '@/types/database'
import { AgentCode } from '@/lib/ai/agents'

// Schedule types
export type DaySchedule = {
  active: boolean
  start: string
  end: string
}

export type ScheduleConfig = {
  mon: DaySchedule
  tue: DaySchedule
  wed: DaySchedule
  thu: DaySchedule
  fri: DaySchedule
  sat: DaySchedule
  sun: DaySchedule
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  mon: { active: true, start: '09:00', end: '17:00' },
  tue: { active: true, start: '09:00', end: '17:00' },
  wed: { active: true, start: '09:00', end: '17:00' },
  thu: { active: true, start: '09:00', end: '17:00' },
  fri: { active: true, start: '09:00', end: '17:00' },
  sat: { active: false, start: '09:00', end: '17:00' },
  sun: { active: false, start: '09:00', end: '17:00' },
}

const DAY_KEYS: (keyof ScheduleConfig)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// Session scheduling configuration
export const SCHEDULING_CONFIG = {
  // Weekly check-ins
  pulse: {
    frequency: 'weekly',
    dayOfWeek: 1, // Monday
    priority: 1, // Highest priority
  },
  // Onboarding agents - run once then periodically
  role_mapper: {
    frequency: 'onboarding',
    priority: 2,
    periodicIntervalDays: 90, // Re-check every 90 days
  },
  workflow_mapper: {
    frequency: 'onboarding',
    priority: 3,
    periodicIntervalDays: 60,
  },
  pain_scanner: {
    frequency: 'periodic',
    priority: 4,
    intervalDays: 14, // Every 2 weeks
  },
  focus_tracker: {
    frequency: 'periodic',
    priority: 5,
    intervalDays: 7, // Weekly
  },
} as const

export interface UserSchedulingContext {
  userId: string
  orgId: string
  level: 'exec' | 'manager' | 'ic' | null
  profile: ProfileJson | null
  lastSessionsByAgent: Record<string, Date | null>
  pendingSessions: string[] // agent_codes with pending sessions
  orgScheduleConfig?: ScheduleConfig | null
  userScheduleOverride?: ScheduleConfig | null
  timezone?: string
}

export interface ScheduledSession {
  agentCode: AgentCode
  reason: string
  priority: number
}

/**
 * Check if scheduling is allowed based on schedule configuration
 */
export function isSchedulingAllowed(
  orgSchedule: ScheduleConfig | null | undefined,
  userOverride: ScheduleConfig | null | undefined,
  timezone: string = 'UTC'
): { allowed: boolean; reason: string } {
  // Use user override if set, otherwise use org schedule, otherwise use default
  const schedule = userOverride || orgSchedule || DEFAULT_SCHEDULE
  
  // Get current time in the specified timezone
  const now = new Date()
  let localTime: Date
  
  try {
    // Convert to timezone
    const tzString = now.toLocaleString('en-US', { timeZone: timezone })
    localTime = new Date(tzString)
  } catch {
    // Fallback to UTC if timezone is invalid
    localTime = now
  }
  
  const dayOfWeek = localTime.getDay() // 0 = Sunday, 1 = Monday, etc.
  const dayKey = DAY_KEYS[dayOfWeek]
  const dayConfig = schedule[dayKey]
  
  // Check if day is active
  if (!dayConfig.active) {
    return { 
      allowed: false, 
      reason: `Scheduling is disabled on ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}` 
    }
  }
  
  // Get current time as HH:MM
  const hours = localTime.getHours().toString().padStart(2, '0')
  const minutes = localTime.getMinutes().toString().padStart(2, '0')
  const currentTime = `${hours}:${minutes}`
  
  // Check if current time is within the scheduled window
  if (currentTime < dayConfig.start || currentTime > dayConfig.end) {
    return { 
      allowed: false, 
      reason: `Outside of scheduled hours (${dayConfig.start} - ${dayConfig.end})` 
    }
  }
  
  return { allowed: true, reason: 'Within scheduled hours' }
}

/**
 * Get the effective schedule for a user (user override or org default)
 */
export function getEffectiveSchedule(
  orgSchedule: ScheduleConfig | null | undefined,
  userOverride: ScheduleConfig | null | undefined
): ScheduleConfig {
  return userOverride || orgSchedule || DEFAULT_SCHEDULE
}

/**
 * Determine which sessions should be scheduled for a user
 */
export function determineSessionsToSchedule(
  context: UserSchedulingContext,
  maxSessions: number = 2
): ScheduledSession[] {
  const sessions: ScheduledSession[] = []
  
  // Check if scheduling is allowed based on schedule settings
  const scheduleCheck = isSchedulingAllowed(
    context.orgScheduleConfig,
    context.userScheduleOverride,
    context.timezone
  )
  
  if (!scheduleCheck.allowed) {
    // Return empty - scheduling is not allowed at this time
    return []
  }
  
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Skip if user already has pending sessions
  if (context.pendingSessions.length >= maxSessions) {
    return []
  }
  
  // Check profile completeness to determine onboarding needs
  const profileGaps = getProfileGaps(context.profile)
  
  // 1. Check if pulse check is needed (weekly, Mondays)
  if (dayOfWeek === 1 && !context.pendingSessions.includes('pulse')) {
    const lastPulse = context.lastSessionsByAgent['pulse']
    const daysSinceLastPulse = lastPulse 
      ? Math.floor((now.getTime() - lastPulse.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity
    
    if (daysSinceLastPulse >= 6) { // At least 6 days since last pulse
      sessions.push({
        agentCode: 'pulse',
        reason: 'Weekly morale check-in',
        priority: SCHEDULING_CONFIG.pulse.priority,
      })
    }
  }
  
  // 2. Check onboarding needs based on profile gaps
  if (profileGaps.includes('role_summary') && !context.pendingSessions.includes('role_mapper')) {
    const lastRoleMapper = context.lastSessionsByAgent['role_mapper']
    if (!lastRoleMapper) {
      sessions.push({
        agentCode: 'role_mapper',
        reason: 'Complete role profile',
        priority: SCHEDULING_CONFIG.role_mapper.priority,
      })
    }
  }
  
  if (profileGaps.includes('main_workflows') && !context.pendingSessions.includes('workflow_mapper')) {
    const lastWorkflow = context.lastSessionsByAgent['workflow_mapper']
    if (!lastWorkflow) {
      sessions.push({
        agentCode: 'workflow_mapper',
        reason: 'Map key workflows',
        priority: SCHEDULING_CONFIG.workflow_mapper.priority,
      })
    }
  }
  
  // 3. Check periodic agents
  // Focus tracker - weekly
  if (!context.pendingSessions.includes('focus_tracker')) {
    const lastFocus = context.lastSessionsByAgent['focus_tracker']
    const daysSinceLastFocus = lastFocus
      ? Math.floor((now.getTime() - lastFocus.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity
    
    if (daysSinceLastFocus >= SCHEDULING_CONFIG.focus_tracker.intervalDays) {
      sessions.push({
        agentCode: 'focus_tracker',
        reason: 'Track current priorities',
        priority: SCHEDULING_CONFIG.focus_tracker.priority,
      })
    }
  }
  
  // Pain scanner - bi-weekly
  if (!context.pendingSessions.includes('pain_scanner')) {
    const lastPain = context.lastSessionsByAgent['pain_scanner']
    const daysSinceLastPain = lastPain
      ? Math.floor((now.getTime() - lastPain.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity
    
    if (daysSinceLastPain >= SCHEDULING_CONFIG.pain_scanner.intervalDays) {
      sessions.push({
        agentCode: 'pain_scanner',
        reason: 'Identify work friction',
        priority: SCHEDULING_CONFIG.pain_scanner.priority,
      })
    }
  }
  
  // Sort by priority and limit
  sessions.sort((a, b) => a.priority - b.priority)
  
  const slotsAvailable = maxSessions - context.pendingSessions.length
  return sessions.slice(0, slotsAvailable)
}

/**
 * Get list of profile fields that are missing or incomplete
 */
export function getProfileGaps(profile: ProfileJson | null): string[] {
  const gaps: string[] = []
  
  if (!profile) {
    return ['role_summary', 'primary_duties', 'main_workflows', 'primary_tools', 'current_focus']
  }
  
  if (!profile.role_summary) {
    gaps.push('role_summary')
  }
  
  if (!profile.primary_duties || profile.primary_duties.length === 0) {
    gaps.push('primary_duties')
  }
  
  if (!profile.main_workflows || profile.main_workflows.length === 0) {
    gaps.push('main_workflows')
  }
  
  if (!profile.primary_tools || profile.primary_tools.length === 0) {
    gaps.push('primary_tools')
  }
  
  if (!profile.current_focus) {
    gaps.push('current_focus')
  }
  
  return gaps
}

/**
 * Calculate profile completeness percentage
 */
export function calculateProfileCompleteness(profile: ProfileJson | null): number {
  if (!profile) return 0
  
  const fields = [
    { key: 'role_summary', weight: 20 },
    { key: 'primary_duties', weight: 15, isArray: true },
    { key: 'main_workflows', weight: 20, isArray: true },
    { key: 'primary_tools', weight: 10, isArray: true },
    { key: 'current_focus', weight: 15, isObject: true },
    { key: 'pain_points', weight: 10, isArray: true },
    { key: 'morale_trend', weight: 10 },
  ]
  
  let total = 0
  
  for (const field of fields) {
    const value = profile[field.key as keyof ProfileJson]
    
    if (field.isArray) {
      if (Array.isArray(value) && value.length > 0) {
        total += field.weight
      }
    } else if (field.isObject) {
      if (value && typeof value === 'object') {
        total += field.weight
      }
    } else {
      if (value) {
        total += field.weight
      }
    }
  }
  
  return total
}
