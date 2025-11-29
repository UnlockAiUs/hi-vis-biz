/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/workflows/[id]/page.tsx
 * PURPOSE: Workflow detail view with owner feedback controls and notes
 * EXPORTS: default WorkflowDetailPage (server component)
 * 
 * LOGIC:
 * - Displays workflow details with version history
 * - Shows feedback strip for accuracy rating
 * - Owner notes section with composer
 * - Reset to AI suggestion functionality
 * 
 * DEPENDENCIES: @/lib/supabase/server
 * TABLES: workflows, workflow_versions, workflow_overrides, owner_notes, audit_log
 */

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import WorkflowFeedback from './WorkflowFeedback'
import OwnerNotes from './OwnerNotes'
import WorkflowVariants from './WorkflowVariants'

interface WorkflowDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Check if user has admin access
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single()

  if (!membership) {
    redirect('/admin/setup')
  }

  const orgId = membership.org_id

  // Get workflow details
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select(`
      id,
      workflow_key,
      display_name,
      department_id,
      status,
      created_at,
      updated_at,
      department:departments(id, name)
    `)
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (workflowError || !workflow) {
    notFound()
  }

  // Get current workflow version
  const { data: currentVersion } = await supabase
    .from('workflow_versions')
    .select('*')
    .eq('workflow_id', id)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  // Get all versions for history
  const { data: versions } = await supabase
    .from('workflow_versions')
    .select('id, version_number, created_at, created_by_type, change_summary')
    .eq('workflow_id', id)
    .order('version_number', { ascending: false })

  // Get active override if any
  const { data: activeOverride } = await supabase
    .from('workflow_overrides')
    .select('*')
    .eq('workflow_id', id)
    .eq('status', 'active')
    .single()

  // Get owner notes for this workflow
  const { data: notes } = await supabase
    .from('owner_notes')
    .select(`
      id,
      note_type,
      note_text,
      visible_to,
      is_active,
      created_at,
      author:organization_members!owner_notes_author_user_id_fkey(display_name)
    `)
    .eq('workflow_id', id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Parse structure from current version
  const structure = currentVersion?.structure as {
    steps?: string[]
    tools?: string[]
    data_sources?: string[]
    roles_involved?: string[]
    estimated_duration?: string
    frequency?: string
    notes?: string
  } || {}

  // Get department name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deptRaw = workflow.department as any
  const departmentName = Array.isArray(deptRaw) ? deptRaw[0]?.name : deptRaw?.name || 'General'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link 
          href="/admin/workflows" 
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Workflows
        </Link>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workflow.display_name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {departmentName} • Version {currentVersion?.version_number || 1}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              workflow.status === 'active' ? 'bg-green-100 text-green-800' :
              workflow.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {workflow.status}
            </span>
            {activeOverride && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Has Override
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Strip - Phase 2.2 */}
      <WorkflowFeedback 
        workflowId={id}
        currentOverride={activeOverride}
        currentVersion={currentVersion}
      />

      {/* Workflow Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Steps</h2>
        
        {structure.steps && structure.steps.length > 0 ? (
          <ol className="space-y-3">
            {structure.steps.map((step, idx) => (
              <li key={idx} className="flex items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium mr-3">
                  {idx + 1}
                </span>
                <span className="text-gray-700 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-500 italic">No steps defined yet.</p>
        )}

        {/* Tools */}
        {structure.tools && structure.tools.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Tools Used</h3>
            <div className="flex flex-wrap gap-2">
              {structure.tools.map((tool, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Data Sources */}
        {structure.data_sources && structure.data_sources.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Data Sources</h3>
            <div className="flex flex-wrap gap-2">
              {structure.data_sources.map((source, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
          {structure.estimated_duration && (
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="ml-2 text-gray-900">{structure.estimated_duration}</span>
            </div>
          )}
          {structure.frequency && (
            <div>
              <span className="text-gray-500">Frequency:</span>
              <span className="ml-2 text-gray-900">{structure.frequency}</span>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Variants - Phase 3 */}
      <WorkflowVariants workflowId={id} />

      {/* Owner Notes - Phase 2.3 */}
      <OwnerNotes 
        workflowId={id}
        orgId={orgId}
        existingNotes={(notes || []).map((note: {
          id: string
          note_type: string
          note_text: string
          visible_to: string
          is_active: boolean
          created_at: string
          author: { display_name: string }[] | { display_name: string } | null
        }) => ({
          id: note.id,
          note_type: note.note_type,
          note_text: note.note_text,
          visible_to: note.visible_to,
          is_active: note.is_active,
          created_at: note.created_at,
          // Supabase returns joined data as array, convert to object
          author: Array.isArray(note.author) ? note.author[0] || null : note.author
        }))}
      />

      {/* Version History */}
      {versions && versions.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
          <div className="space-y-3">
            {versions.map((version) => (
              <div 
                key={version.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">v{version.version_number}</span>
                  <span className={`ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    version.created_by_type === 'ai' ? 'bg-blue-100 text-blue-700' :
                    version.created_by_type === 'owner' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {version.created_by_type}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {version.change_summary || 'Initial version'}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(version.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">About Workflow Feedback</h3>
        <p className="text-sm text-blue-700">
          Your feedback helps VizDots learn how your business actually works. Mark workflows as accurate, 
          partially right, or incorrect to help improve future suggestions. Add notes to provide context 
          that both AI and your team can reference.
        </p>
      </div>
    </div>
  )
}
