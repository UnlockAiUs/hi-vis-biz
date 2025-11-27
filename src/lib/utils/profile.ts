/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/utils/profile.ts
 * PURPOSE: Profile merge utilities for AI agent outputs
 * EXPORTS:
 *   - mergeAgentOutputIntoProfile(profile, agentOutput) - merges agent data into user profile
 *   - updateProfileGaps(profile) - calculates what profile data is still missing
 * MERGE LOGIC: Each agent type has specific merge rules (pulse->morale, role_mapper->summary, etc.)
 */

import { ProfileJson, PulseOutput, RoleMapperOutput, WorkflowMapperOutput, PainScannerOutput, FocusTrackerOutput } from '@/types/database'
import { AgentOutput } from '@/lib/ai/agents'

/**
 * Merge agent response data into user profile
 */
export function mergeAgentOutputIntoProfile(
  currentProfile: ProfileJson | null,
  agentOutput: AgentOutput
): ProfileJson {
  const profile = currentProfile || {}
  const now = new Date().toISOString()
  
  switch (agentOutput.type) {
    case 'pulse':
      return mergePulseOutput(profile, agentOutput.data)
    
    case 'role_mapper':
      return mergeRoleMapperOutput(profile, agentOutput.data)
    
    case 'workflow_mapper':
      return mergeWorkflowMapperOutput(profile, agentOutput.data)
    
    case 'pain_scanner':
      return mergePainScannerOutput(profile, agentOutput.data)
    
    case 'focus_tracker':
      return mergeFocusTrackerOutput(profile, agentOutput.data, now)
    
    default:
      return profile
  }
}

/**
 * Merge pulse check output - updates morale trend
 */
function mergePulseOutput(profile: ProfileJson, data: PulseOutput): ProfileJson {
  // Convert rating to trend description
  let trend = 'stable'
  if (data.rating >= 4) {
    trend = 'positive'
  } else if (data.rating <= 2) {
    trend = 'declining'
  }
  
  // Add burnout risk info if high
  if (data.burnout_risk === 'high') {
    trend = 'at_risk'
  }
  
  return {
    ...profile,
    morale_trend: trend,
  }
}

/**
 * Merge role mapper output - updates role summary and duties
 */
function mergeRoleMapperOutput(profile: ProfileJson, data: RoleMapperOutput): ProfileJson {
  return {
    ...profile,
    role_summary: data.role_summary,
    primary_duties: data.primary_duties,
    customer_facing: data.customer_facing,
  }
}

/**
 * Merge workflow mapper output - adds/updates workflows
 */
function mergeWorkflowMapperOutput(profile: ProfileJson, data: WorkflowMapperOutput): ProfileJson {
  const existingWorkflows = profile.main_workflows || []
  
  // Check if this workflow already exists
  const existingIndex = existingWorkflows.findIndex(
    w => w.workflow_ref === data.workflow_name
  )
  
  const newWorkflow = {
    workflow_ref: data.workflow_name,
    display_label: data.display_label,
    tools: data.tools,
    data_sources: data.data_sources,
  }
  
  let updatedWorkflows: typeof existingWorkflows
  if (existingIndex >= 0) {
    // Update existing workflow
    updatedWorkflows = [...existingWorkflows]
    updatedWorkflows[existingIndex] = newWorkflow
  } else {
    // Add new workflow
    updatedWorkflows = [...existingWorkflows, newWorkflow]
  }
  
  // Also update primary tools list
  const allTools = new Set<string>(profile.primary_tools || [])
  for (const tool of data.tools) {
    allTools.add(tool)
  }
  
  return {
    ...profile,
    main_workflows: updatedWorkflows,
    primary_tools: Array.from(allTools),
  }
}

/**
 * Merge pain scanner output - adds/updates pain points
 */
function mergePainScannerOutput(profile: ProfileJson, data: PainScannerOutput): ProfileJson {
  const existingPainPoints = profile.pain_points || []
  
  // Generate an ID for this pain point based on workflow and tool
  const painId = `${data.workflow_ref}_${data.tool_ref}`.replace(/\s+/g, '_').toLowerCase()
  
  // Check if this pain point already exists
  const existingIndex = existingPainPoints.findIndex(p => p.id === painId)
  
  // Determine severity trend based on rating
  let severityTrend = 'stable'
  if (data.pain_rating >= 4) {
    severityTrend = 'worsening'
  } else if (data.pain_rating <= 2) {
    severityTrend = 'improving'
  }
  
  const newPainPoint = {
    id: painId,
    label: data.reason,
    related_workflow_ref: data.workflow_ref,
    severity_trend: severityTrend,
  }
  
  let updatedPainPoints: typeof existingPainPoints
  if (existingIndex >= 0) {
    // Update existing pain point
    updatedPainPoints = [...existingPainPoints]
    updatedPainPoints[existingIndex] = newPainPoint
  } else {
    // Add new pain point (keep max 5)
    updatedPainPoints = [...existingPainPoints, newPainPoint].slice(-5)
  }
  
  return {
    ...profile,
    pain_points: updatedPainPoints,
  }
}

/**
 * Merge focus tracker output - updates current focus
 */
function mergeFocusTrackerOutput(
  profile: ProfileJson, 
  data: FocusTrackerOutput,
  timestamp: string
): ProfileJson {
  return {
    ...profile,
    current_focus: {
      label: data.current_focus_label,
      tags: data.current_focus_tags,
      last_updated: timestamp,
    },
  }
}

/**
 * Update profile gaps based on what's still missing
 */
export function updateProfileGaps(profile: ProfileJson): ProfileJson {
  const gaps: ProfileJson['open_profile_gaps'] = []
  
  if (!profile.role_summary) {
    gaps.push({
      id: 'role_summary',
      priority: 'high',
      description: 'We need to understand your role better',
      suggested_agent: 'role_mapper',
    })
  }
  
  if (!profile.main_workflows || profile.main_workflows.length === 0) {
    gaps.push({
      id: 'main_workflows',
      priority: 'high',
      description: 'Help us map your key workflows',
      suggested_agent: 'workflow_mapper',
    })
  }
  
  if (!profile.current_focus) {
    gaps.push({
      id: 'current_focus',
      priority: 'medium',
      description: 'What are you currently focused on?',
      suggested_agent: 'focus_tracker',
    })
  }
  
  if (!profile.pain_points || profile.pain_points.length === 0) {
    gaps.push({
      id: 'pain_points',
      priority: 'low',
      description: 'Any friction points we should know about?',
      suggested_agent: 'pain_scanner',
    })
  }
  
  return {
    ...profile,
    open_profile_gaps: gaps,
  }
}
