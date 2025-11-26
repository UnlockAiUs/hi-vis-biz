'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OrgMember {
  id: string
  user_id: string
  level: string
  department_id: string | null
  supervisor_user_id: string | null
  status: string
  name: string
  jobTitle: string
  departmentName: string | null
}

interface TreeNode {
  member: OrgMember
  directReports: TreeNode[]
}

export default function OrgChartPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [treeRoots, setTreeRoots] = useState<TreeNode[]>([])
  const [unassignedMembers, setUnassignedMembers] = useState<OrgMember[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    loadOrgChart()
  }, [])

  const loadOrgChart = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        return
      }

      // Get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('org_id, role')
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        setError('Organization not found')
        return
      }

      // Only owners and admins can view org chart
      if (!['owner', 'admin'].includes(membership.role)) {
        setError('You do not have permission to view the org chart')
        return
      }

      // Get all active members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('org_id', membership.org_id)
        .eq('status', 'active')

      if (membersError) {
        throw membersError
      }

      // Get departments
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name')
        .eq('org_id', membership.org_id)

      const deptMap = new Map(departments?.map(d => [d.id, d.name]) || [])

      // Get user profiles for names
      const enrichedMembers: OrgMember[] = []
      for (const member of membersData || []) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('profile_json')
          .eq('user_id', member.user_id)
          .single()

        const profileJson = profile?.profile_json as Record<string, unknown> | null
        
        enrichedMembers.push({
          id: member.id,
          user_id: member.user_id,
          level: member.level || 'ic',
          department_id: member.department_id,
          supervisor_user_id: member.supervisor_user_id,
          status: member.status,
          name: (profileJson?.name as string) || 'Unknown Member',
          jobTitle: (profileJson?.role_summary as string) || member.level || 'Team Member',
          departmentName: member.department_id ? deptMap.get(member.department_id) || null : null
        })
      }

      setMembers(enrichedMembers)

      // Build the org tree
      buildOrgTree(enrichedMembers)
      
      // Expand all nodes by default
      setExpandedNodes(new Set(enrichedMembers.map(m => m.user_id)))

      setLoading(false)
    } catch (err) {
      console.error('Error loading org chart:', err)
      setError('Failed to load organization chart')
      setLoading(false)
    }
  }

  const buildOrgTree = (members: OrgMember[]) => {
    const memberMap = new Map(members.map(m => [m.user_id, m]))
    const childrenMap = new Map<string | null, OrgMember[]>()

    // Group members by their supervisor
    for (const member of members) {
      const supervisorId = member.supervisor_user_id
      if (!childrenMap.has(supervisorId)) {
        childrenMap.set(supervisorId, [])
      }
      childrenMap.get(supervisorId)!.push(member)
    }

    // Build tree recursively
    const buildNode = (member: OrgMember): TreeNode => {
      const directReports = childrenMap.get(member.user_id) || []
      return {
        member,
        directReports: directReports.map(buildNode)
      }
    }

    // Find root nodes (members with no supervisor or supervisor not in org)
    const roots: TreeNode[] = []
    const unassigned: OrgMember[] = []

    const topLevel = childrenMap.get(null) || []
    
    for (const member of topLevel) {
      // Check if this member has any direct reports
      const hasReports = childrenMap.has(member.user_id)
      
      if (hasReports || member.level === 'exec' || member.level === 'manager') {
        roots.push(buildNode(member))
      } else {
        unassigned.push(member)
      }
    }

    // Also add members whose supervisor_user_id doesn't exist in the org
    for (const member of members) {
      if (member.supervisor_user_id && !memberMap.has(member.supervisor_user_id)) {
        // Supervisor doesn't exist in org, treat as root
        const hasReports = childrenMap.has(member.user_id)
        if (hasReports || member.level === 'exec' || member.level === 'manager') {
          roots.push(buildNode(member))
        } else {
          unassigned.push(member)
        }
      }
    }

    // Sort roots by level (exec first, then manager, then ic)
    const levelOrder = { exec: 0, manager: 1, ic: 2 }
    roots.sort((a, b) => {
      const orderA = levelOrder[a.member.level as keyof typeof levelOrder] ?? 2
      const orderB = levelOrder[b.member.level as keyof typeof levelOrder] ?? 2
      return orderA - orderB
    })

    setTreeRoots(roots)
    setUnassignedMembers(unassigned)
  }

  const toggleExpanded = (userId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'exec':
        return 'bg-purple-100 text-purple-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.directReports.length > 0
    const isExpanded = expandedNodes.has(node.member.user_id)

    return (
      <div key={node.member.id} className={depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}>
        <div className="flex items-start gap-3 py-2">
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(node.member.user_id)}
              className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          
          <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-medium">
                {node.member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-gray-900 truncate">{node.member.name}</h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLevelBadgeColor(node.member.level)}`}>
                    {node.member.level.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{node.member.jobTitle}</p>
                {node.member.departmentName && (
                  <p className="text-xs text-gray-400">{node.member.departmentName}</p>
                )}
              </div>
              {hasChildren && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {node.directReports.length} report{node.directReports.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.directReports.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Organization Chart</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your organization&apos;s reporting structure
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {members.length} team member{members.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              if (expandedNodes.size === members.length) {
                setExpandedNodes(new Set())
              } else {
                setExpandedNodes(new Set(members.map(m => m.user_id)))
              }
            }}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {expandedNodes.size === members.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">EXEC</span>
          <span className="text-gray-500">Executive</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">MANAGER</span>
          <span className="text-gray-500">Manager</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">IC</span>
          <span className="text-gray-500">Individual Contributor</span>
        </div>
      </div>

      {/* Org Tree */}
      {treeRoots.length > 0 ? (
        <div className="space-y-2">
          {treeRoots.map(root => renderTreeNode(root))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>No reporting structure defined yet</p>
          <p className="text-sm mt-1">Employees can set their manager during onboarding or in their profile</p>
        </div>
      )}

      {/* Unassigned Members */}
      {unassignedMembers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Unassigned Members ({unassignedMembers.length})
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            These team members haven&apos;t selected a manager yet
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unassignedMembers.map(member => (
              <div key={member.id} className="bg-white border border-yellow-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate">{member.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLevelBadgeColor(member.level)}`}>
                        {member.level.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{member.jobTitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
