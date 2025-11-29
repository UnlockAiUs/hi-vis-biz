/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/workflows/page.tsx
 * PURPOSE: Admin workflows page - shows detected workflows from check-ins
 * EXPORTS: default WorkflowsPage (server component)
 * 
 * LOGIC:
 * - Fetches workflows from workflows table (Phase 1 architecture)
 * - Gets latest version for each workflow
 * - Groups workflows by department
 * - Links to detail view with feedback controls
 * 
 * DEPENDENCIES: @/lib/supabase/server
 * TABLES: workflows, workflow_versions, workflow_overrides, departments
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface WorkflowStructure {
  steps?: string[]
  tools?: string[]
  data_sources?: string[]
  roles_involved?: string[]
  estimated_duration?: string
  frequency?: string
}

interface WorkflowWithVersion {
  id: string
  workflow_key: string
  display_name: string
  status: string
  department_id: string | null
  department: { name: string } | null
  created_at: string
  latest_version: {
    version_number: number
    structure: WorkflowStructure
    created_by_type: string
  } | null
  has_override: boolean
}

export default async function WorkflowsPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Check if user has an organization
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

  // Get all workflows with their departments
  const { data: workflowsData } = await supabase
    .from('workflows')
    .select(`
      id,
      workflow_key,
      display_name,
      status,
      department_id,
      created_at,
      department:departments(name)
    `)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('display_name')

  // Get latest version for each workflow
  const workflowIds = workflowsData?.map(w => w.id) || []
  
  const { data: versionsData } = await supabase
    .from('workflow_versions')
    .select('workflow_id, version_number, structure, created_by_type')
    .in('workflow_id', workflowIds)
    .order('version_number', { ascending: false })

  // Get active overrides
  const { data: overridesData } = await supabase
    .from('workflow_overrides')
    .select('workflow_id')
    .in('workflow_id', workflowIds)
    .eq('status', 'active')

  // Create lookup maps
  const latestVersions: Record<string, { version_number: number; structure: WorkflowStructure; created_by_type: string }> = {}
  versionsData?.forEach(v => {
    if (!latestVersions[v.workflow_id]) {
      latestVersions[v.workflow_id] = {
        version_number: v.version_number,
        structure: v.structure as WorkflowStructure,
        created_by_type: v.created_by_type
      }
    }
  })

  const workflowsWithOverrides = new Set(overridesData?.map(o => o.workflow_id) || [])

  // Build workflows with versions
  const workflows: WorkflowWithVersion[] = (workflowsData || []).map(w => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deptRaw = w.department as any
    const deptName = Array.isArray(deptRaw) ? deptRaw[0]?.name : deptRaw?.name
    
    return {
      id: w.id,
      workflow_key: w.workflow_key,
      display_name: w.display_name,
      status: w.status,
      department_id: w.department_id,
      department: deptName ? { name: deptName } : null,
      created_at: w.created_at,
      latest_version: latestVersions[w.id] || null,
      has_override: workflowsWithOverrides.has(w.id)
    }
  })

  // Group workflows by department
  const workflowsByDepartment: Record<string, WorkflowWithVersion[]> = {}
  workflows.forEach(w => {
    const deptName = w.department?.name || 'General'
    if (!workflowsByDepartment[deptName]) {
      workflowsByDepartment[deptName] = []
    }
    workflowsByDepartment[deptName].push(w)
  })

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
            <p className="mt-1 text-sm text-gray-500">
              Processes discovered from employee check-ins
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Beta
          </span>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflows Detected Yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Workflows are automatically discovered as your team completes check-ins. 
            Each dot adds context about how work happens, building a map of your processes over time.
          </p>
          <Link
            href="/admin/members"
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Invite Team Members
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(workflowsByDepartment).map(([department, deptWorkflows]) => (
            <div key={department}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {department}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({deptWorkflows.length} workflow{deptWorkflows.length !== 1 ? 's' : ''})
                </span>
              </h2>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {deptWorkflows.map((wf) => {
                  const structure = wf.latest_version?.structure || {}
                  const steps = structure.steps || []
                  const tools = structure.tools || []
                  
                  return (
                    <Link 
                      key={wf.id}
                      href={`/admin/workflows/${wf.id}`}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all block"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-gray-900">
                          {wf.display_name}
                        </h3>
                        <div className="flex items-center gap-1">
                          {wf.has_override && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              Override
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            v{wf.latest_version?.version_number || 1}
                          </span>
                        </div>
                      </div>
                      
                      {/* Steps */}
                      <div className="mb-4">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          Steps
                        </div>
                        {steps.length > 0 ? (
                          <ol className="space-y-1">
                            {steps.slice(0, 5).map((step, idx) => (
                              <li key={idx} className="flex items-start text-sm text-gray-600">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs mr-2">
                                  {idx + 1}
                                </span>
                                <span className="line-clamp-1">{step}</span>
                              </li>
                            ))}
                            {steps.length > 5 && (
                              <li className="text-xs text-gray-400 ml-7">
                                +{steps.length - 5} more steps
                              </li>
                            )}
                          </ol>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No steps defined</p>
                        )}
                      </div>
                      
                      {/* Tools */}
                      {tools.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                            Tools Used
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {tools.slice(0, 4).map((tool, idx) => (
                              <span 
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                              >
                                {tool}
                              </span>
                            ))}
                            {tools.length > 4 && (
                              <span className="text-xs text-gray-400">
                                +{tools.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Click hint */}
                      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-blue-600 flex items-center">
                        View details & provide feedback
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          How Workflows Are Discovered
        </h3>
        <p className="text-sm text-blue-700">
          When employees complete check-ins, they describe their daily tasks and processes. 
          VizDots analyzes these descriptions to identify and document workflows automatically. 
          The more check-ins completed, the more accurate and complete your workflow maps become.
        </p>
      </div>
    </div>
  )
}
