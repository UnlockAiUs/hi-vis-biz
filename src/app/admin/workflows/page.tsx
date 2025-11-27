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
 * - Extracts workflows from workflow_mapper agent outputs
 * - Groups workflows by department/role
 * - Shows workflow steps and tools used
 * - Labels as "Beta" to set expectations
 * 
 * DEPENDENCIES: @/lib/supabase/server
 * TABLES: answers, organization_members, departments
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface WorkflowOutput {
  workflow_name: string
  display_label?: string
  steps: string[]
  tools: string[]
  data_sources?: string[]
}

interface WorkflowWithMeta {
  id: string
  workflow: WorkflowOutput
  department: string
  role: string
  createdAt: string
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

  // Get all workflow_mapper outputs
  const { data: workflowAnswers } = await supabase
    .from('answers')
    .select(`
      id,
      structured_output,
      created_at,
      session:sessions(
        user_id,
        agent_code
      )
    `)
    .eq('org_id', orgId)
    .not('structured_output', 'is', null)
    .order('created_at', { ascending: false })

  // Get members with their departments
  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id, display_name, job_title, department:departments(name)')
    .eq('org_id', orgId)

  // Get departments
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('org_id', orgId)

  // Create member lookup
  const memberLookup: Record<string, { name: string; title: string; department: string }> = {}
  members?.forEach(m => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deptRaw = m.department as any
    const deptName = Array.isArray(deptRaw) ? deptRaw[0]?.name : deptRaw?.name
    memberLookup[m.user_id] = {
      name: m.display_name || 'Unknown',
      title: m.job_title || 'Team Member',
      department: deptName || 'General'
    }
  })

  // Extract workflows from answers
  const workflows: WorkflowWithMeta[] = []
  const seenWorkflows = new Set<string>()

  workflowAnswers?.forEach(answer => {
    const output = answer.structured_output as Record<string, unknown>
    if (!output) return

    // Check if this is a workflow_mapper output
    if (output.workflow_name && output.steps && Array.isArray(output.steps)) {
      const session = answer.session as { user_id: string; agent_code: string } | null
      if (!session || session.agent_code !== 'workflow_mapper') return

      const workflowKey = `${output.workflow_name}-${session.user_id}`
      if (seenWorkflows.has(workflowKey)) return
      seenWorkflows.add(workflowKey)

      const memberInfo = memberLookup[session.user_id] || { 
        name: 'Unknown', 
        title: 'Team Member', 
        department: 'General' 
      }

      workflows.push({
        id: answer.id,
        workflow: {
          workflow_name: output.workflow_name as string,
          display_label: (output.display_label as string) || (output.workflow_name as string),
          steps: output.steps as string[],
          tools: (output.tools as string[]) || [],
          data_sources: (output.data_sources as string[]) || []
        },
        department: memberInfo.department,
        role: memberInfo.title,
        createdAt: answer.created_at
      })
    }
  })

  // Group workflows by department
  const workflowsByDepartment: Record<string, WorkflowWithMeta[]> = {}
  workflows.forEach(w => {
    if (!workflowsByDepartment[w.department]) {
      workflowsByDepartment[w.department] = []
    }
    workflowsByDepartment[w.department].push(w)
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
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4\" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                {deptWorkflows.map((wf) => (
                  <div 
                    key={wf.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-medium text-gray-900">
                        {wf.workflow.display_label || wf.workflow.workflow_name}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {wf.role}
                      </span>
                    </div>
                    
                    {/* Steps */}
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Steps
                      </div>
                      <ol className="space-y-1">
                        {wf.workflow.steps.slice(0, 5).map((step, idx) => (
                          <li key={idx} className="flex items-start text-sm text-gray-600">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs mr-2">
                              {idx + 1}
                            </span>
                            <span className="line-clamp-1">{step}</span>
                          </li>
                        ))}
                        {wf.workflow.steps.length > 5 && (
                          <li className="text-xs text-gray-400 ml-7">
                            +{wf.workflow.steps.length - 5} more steps
                          </li>
                        )}
                      </ol>
                    </div>
                    
                    {/* Tools */}
                    {wf.workflow.tools.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          Tools Used
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {wf.workflow.tools.slice(0, 4).map((tool, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {tool}
                            </span>
                          ))}
                          {wf.workflow.tools.length > 4 && (
                            <span className="text-xs text-gray-400">
                              +{wf.workflow.tools.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
