/**
 * FILE: src/lib/utils/workflow-resolver.ts
 * PURPOSE: Utility for resolving effective workflow with overrides applied
 * EXPORTS: getEffectiveWorkflow, getWorkflowWithNotes
 * 
 * LOGIC:
 * - Fetches workflow with latest version and active override
 * - Applies override payload to base structure
 * - Returns effective model for AI agents and UI
 * 
 * DEPENDENCIES: @/lib/supabase/server
 * TABLES: workflows, workflow_versions, workflow_overrides, owner_notes
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface WorkflowStructure {
  steps?: string[]
  tools?: string[]
  data_sources?: string[]
  roles_involved?: string[]
  estimated_duration?: string
  frequency?: string
  notes?: string
}

export interface OverridePayload {
  locked_steps?: string[]
  renamed_steps?: Record<string, string>
  tool_substitutions?: Record<string, string>
  removed_steps?: string[]
  added_steps?: string[]
  custom_notes?: string
}

export interface EffectiveWorkflow {
  id: string
  workflow_key: string
  display_name: string
  status: string
  department_id: string | null
  org_id: string
  
  // Version info
  version_number: number
  structure: WorkflowStructure
  created_by_type: string
  
  // Override info
  has_override: boolean
  override_id?: string
  accuracy_rating?: string
  override_reason?: string
  
  // Computed effective structure (with overrides applied)
  effective_structure: WorkflowStructure
  
  // Owner notes for context
  owner_notes: Array<{
    id: string
    note_type: string
    note_text: string
    visible_to: string
  }>
}

/**
 * Apply override payload to base workflow structure
 */
function applyOverrides(
  base: WorkflowStructure,
  override: OverridePayload | null
): WorkflowStructure {
  if (!override) return base

  const effective: WorkflowStructure = { ...base }

  // Apply step modifications
  if (base.steps) {
    let steps = [...base.steps]

    // Remove steps marked for removal
    if (override.removed_steps?.length) {
      steps = steps.filter(s => !override.removed_steps?.includes(s))
    }

    // Rename steps
    if (override.renamed_steps) {
      steps = steps.map(s => override.renamed_steps?.[s] || s)
    }

    // Add new steps
    if (override.added_steps?.length) {
      steps = [...steps, ...override.added_steps]
    }

    effective.steps = steps
  }

  // Apply tool substitutions
  if (base.tools && override.tool_substitutions) {
    effective.tools = base.tools.map(t => 
      override.tool_substitutions?.[t] || t
    )
  }

  // Add custom notes
  if (override.custom_notes) {
    effective.notes = override.custom_notes
  }

  return effective
}

/**
 * Get effective workflow with overrides applied
 * Used by AI agents when referencing workflow information
 */
export async function getEffectiveWorkflow(
  supabase: SupabaseClient,
  workflowId: string
): Promise<EffectiveWorkflow | null> {
  // Get workflow with latest version
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select(`
      id,
      workflow_key,
      display_name,
      status,
      department_id,
      org_id
    `)
    .eq('id', workflowId)
    .single()

  if (workflowError || !workflow) {
    console.error('Error fetching workflow:', workflowError)
    return null
  }

  // Get latest version
  const { data: version } = await supabase
    .from('workflow_versions')
    .select('version_number, structure, created_by_type')
    .eq('workflow_id', workflowId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  // Get active override
  const { data: override } = await supabase
    .from('workflow_overrides')
    .select('id, accuracy_rating, override_reason, override_payload')
    .eq('workflow_id', workflowId)
    .eq('status', 'active')
    .single()

  // Get owner notes
  const { data: notes } = await supabase
    .from('owner_notes')
    .select('id, note_type, note_text, visible_to')
    .eq('workflow_id', workflowId)
    .eq('is_active', true)

  const baseStructure = (version?.structure as WorkflowStructure) || {}
  const overridePayload = (override?.override_payload as OverridePayload) || null

  return {
    id: workflow.id,
    workflow_key: workflow.workflow_key,
    display_name: workflow.display_name,
    status: workflow.status,
    department_id: workflow.department_id,
    org_id: workflow.org_id,
    
    version_number: version?.version_number || 1,
    structure: baseStructure,
    created_by_type: version?.created_by_type || 'ai',
    
    has_override: !!override,
    override_id: override?.id,
    accuracy_rating: override?.accuracy_rating,
    override_reason: override?.override_reason,
    
    effective_structure: applyOverrides(baseStructure, overridePayload),
    
    owner_notes: notes || []
  }
}

/**
 * Get all effective workflows for an organization
 * Useful for analytics and coaching agents
 */
export async function getOrgEffectiveWorkflows(
  supabase: SupabaseClient,
  orgId: string
): Promise<EffectiveWorkflow[]> {
  // Get all active workflows for org
  const { data: workflows } = await supabase
    .from('workflows')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')

  if (!workflows?.length) return []

  // Fetch effective version for each
  const results = await Promise.all(
    workflows.map(w => getEffectiveWorkflow(supabase, w.id))
  )

  return results.filter((w): w is EffectiveWorkflow => w !== null)
}

/**
 * Build context string for AI agents
 * Includes override status and owner notes
 */
export function buildWorkflowContextForAI(workflow: EffectiveWorkflow): string {
  const lines: string[] = []
  
  lines.push(`Workflow: ${workflow.display_name}`)
  lines.push(`Version: ${workflow.version_number}`)
  
  if (workflow.has_override) {
    lines.push(`⚠️ This workflow has owner corrections applied`)
    if (workflow.accuracy_rating) {
      lines.push(`Owner rating: ${workflow.accuracy_rating}`)
    }
    if (workflow.override_reason) {
      lines.push(`Owner notes: ${workflow.override_reason}`)
    }
  }
  
  // Add owner notes as important context
  if (workflow.owner_notes.length > 0) {
    lines.push('\nOwner Context Notes:')
    workflow.owner_notes.forEach(note => {
      lines.push(`- [${note.note_type}] ${note.note_text}`)
    })
  }
  
  // Add effective structure
  const struct = workflow.effective_structure
  if (struct.steps?.length) {
    lines.push('\nSteps:')
    struct.steps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`)
    })
  }
  
  if (struct.tools?.length) {
    lines.push(`\nTools: ${struct.tools.join(', ')}`)
  }
  
  return lines.join('\n')
}
