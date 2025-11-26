'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { OrganizationMember, Department } from '@/types/database'
import ActionMenu, { ActionMenuIcons } from '@/components/ui/ActionMenu'
import type { ActionMenuItem } from '@/components/ui/ActionMenu'

type MemberWithProfile = OrganizationMember & { 
  email?: string
  display_name?: string
  job_title?: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  
  // Add member form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMember, setNewMember] = useState({
    email: '',
    level: 'ic' as 'exec' | 'manager' | 'ic',
    department_id: '',
  })
  const [inviting, setInviting] = useState(false)

  // CSV upload
  const [csvText, setCsvText] = useState('')
  const [showCsvUpload, setShowCsvUpload] = useState(false)

  // Edit member state
  const [editingMember, setEditingMember] = useState<MemberWithProfile | null>(null)
  const [editLevel, setEditLevel] = useState<'exec' | 'manager' | 'ic'>('ic')
  const [editDepartment, setEditDepartment] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Delete confirmation state
  const [deletingMember, setDeletingMember] = useState<MemberWithProfile | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Role change state
  const [changingRole, setChangingRole] = useState<MemberWithProfile | null>(null)
  const [newRole, setNewRole] = useState<'owner' | 'admin' | 'member'>('member')
  const [changingRoleLoading, setChangingRoleLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: membership } = await supabase
        .from('organization_members')
        .select('org_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single()

      if (!membership) throw new Error('Not an admin')
      
      setOrgId(membership.org_id)
      setCurrentUserRole(membership.role)

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('org_id', membership.org_id)
        .order('created_at', { ascending: false })

      if (membersError) throw membersError

      // Fetch user profiles to get display names
      const userIds = (membersData || []).map(m => m.user_id)
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, profile_json')
        .in('user_id', userIds)

      // Map profiles to members
      const membersWithProfiles = (membersData || []).map(member => {
        const profile = profiles?.find(p => p.user_id === member.user_id)
        const profileJson = profile?.profile_json as { name?: string; job_title?: string } | null
        return {
          ...member,
          display_name: profileJson?.name || undefined,
          job_title: profileJson?.job_title || undefined,
        }
      })

      const { data: depts } = await supabase
        .from('departments')
        .select('*')
        .eq('org_id', membership.org_id)
        .order('name')

      setDepartments(depts || [])
      setMembers(membersWithProfiles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMember.email.trim() || !orgId) return

    setInviting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMember.email.trim(),
          level: newMember.level,
          department_id: newMember.department_id || null,
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite member')
      }

      setSuccess(`Invitation sent to ${newMember.email}`)
      setNewMember({ email: '', level: 'ic', department_id: '' })
      setShowAddForm(false)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member')
    } finally {
      setInviting(false)
    }
  }

  const handleCsvUpload = async () => {
    if (!csvText.trim() || !orgId) return

    setInviting(true)
    setError(null)
    setSuccess(null)

    try {
      const lines = csvText.trim().split('\n')
      const emails = lines
        .map(line => line.trim().split(',')[0].trim())
        .filter(email => email && email.includes('@'))

      if (emails.length === 0) {
        throw new Error('No valid emails found in CSV')
      }

      const results = await Promise.allSettled(
        emails.map(email =>
          fetch('/api/admin/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, level: 'ic', department_id: null }),
          })
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      setSuccess(`Invited ${successful} members${failed > 0 ? `, ${failed} failed` : ''}`)
      setCsvText('')
      setShowCsvUpload(false)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process CSV')
    } finally {
      setInviting(false)
    }
  }

  const startEdit = (member: MemberWithProfile) => {
    setEditingMember(member)
    setEditLevel((member.level as 'exec' | 'manager' | 'ic') || 'ic')
    setEditDepartment(member.department_id || '')
  }

  const saveEdit = async () => {
    if (!editingMember) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ 
          level: editLevel,
          department_id: editDepartment || null
        })
        .eq('id', editingMember.id)

      if (updateError) throw updateError

      setMembers(members.map(m => 
        m.id === editingMember.id 
          ? { ...m, level: editLevel, department_id: editDepartment || null } 
          : m
      ))
      
      setEditingMember(null)
      setSuccess('Member updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingMember || deleteConfirmText !== 'DeleteForever') return

    setDeleting(true)
    setError(null)

    try {
      // Use API route to bypass RLS
      const response = await fetch('/api/admin/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: deletingMember.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete member')
      }

      setMembers(members.filter(m => m.id !== deletingMember.id))
      setDeletingMember(null)
      setDeleteConfirmText('')
      setSuccess('Member removed successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member')
    } finally {
      setDeleting(false)
    }
  }

  const changeRole = async () => {
    if (!changingRole || !newRole) return

    setChangingRoleLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: changingRole.id, role: newRole }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change role')
      }

      setMembers(members.map(m => 
        m.id === changingRole.id ? { ...m, role: newRole } : m
      ))
      setChangingRole(null)
      setSuccess(`Role changed to ${newRole} successfully`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role')
    } finally {
      setChangingRoleLoading(false)
    }
  }

  const updateMemberStatus = async (memberId: string, status: 'active' | 'inactive') => {
    try {
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ status })
        .eq('id', memberId)

      if (updateError) throw updateError

      setMembers(members.map(m => 
        m.id === memberId ? { ...m, status } : m
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member')
    }
  }

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return 'Unassigned'
    const dept = departments.find(d => d.id === deptId)
    return dept?.name || 'Unknown'
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      invited: 'bg-yellow-100 text-yellow-800',
    }
    return styles[status as keyof typeof styles] || styles.inactive
  }

  const getLevelBadge = (level: string | null) => {
    const styles = {
      exec: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      ic: 'bg-gray-100 text-gray-800',
    }
    return styles[(level as keyof typeof styles) || 'ic'] || styles.ic
  }

  const getLevelLabel = (level: string | null) => {
    const labels = { exec: 'Executive', manager: 'Manager', ic: 'IC' }
    return labels[(level as keyof typeof labels) || 'ic'] || 'IC'
  }

  const getMemberDisplayName = (member: MemberWithProfile) => {
    if (member.display_name) return member.display_name
    return `User ${member.user_id.slice(0, 8)}...`
  }

  const getMemberSubtitle = (member: MemberWithProfile) => {
    if (member.job_title) return member.job_title
    return `Since ${new Date(member.created_at).toLocaleDateString()}`
  }

  const getActionMenuItems = (member: MemberWithProfile): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      {
        label: 'Edit',
        onClick: () => startEdit(member),
        icon: ActionMenuIcons.edit,
      },
    ]

    if (currentUserRole === 'owner') {
      items.push({
        label: 'Change Role',
        onClick: () => { setChangingRole(member); setNewRole(member.role as 'owner' | 'admin' | 'member'); },
        icon: ActionMenuIcons.role,
      })
    }

    if (member.role !== 'owner') {
      if (member.status === 'active') {
        items.push({
          label: 'Deactivate',
          onClick: () => updateMemberStatus(member.id, 'inactive'),
          icon: ActionMenuIcons.deactivate,
          variant: 'warning',
        })
      } else if (member.status === 'inactive') {
        items.push({
          label: 'Activate',
          onClick: () => updateMemberStatus(member.id, 'active'),
          icon: ActionMenuIcons.activate,
          variant: 'success',
        })
      }

      items.push({
        label: 'Delete',
        onClick: () => setDeletingMember(member),
        icon: ActionMenuIcons.delete,
        variant: 'danger',
      })
    }

    return items
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="px-2 sm:px-0">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Members</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization&apos;s team members
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCsvUpload(true); setShowAddForm(false) }}
            className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Upload CSV
          </button>
          <button
            onClick={() => { setShowAddForm(true); setShowCsvUpload(false) }}
            className="flex-1 sm:flex-none px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Add Member
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}

      {/* Add Member Form */}
      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invite New Member</h2>
          <form onSubmit={inviteMember} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="employee@company.com"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Level</label>
                <select
                  value={newMember.level}
                  onChange={(e) => setNewMember({ ...newMember, level: e.target.value as 'exec' | 'manager' | 'ic' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="ic">Individual Contributor</option>
                  <option value="manager">Manager</option>
                  <option value="exec">Executive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select
                  value={newMember.department_id}
                  onChange={(e) => setNewMember({ ...newMember, department_id: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">No Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting || !newMember.email.trim()}
                className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviting ? 'Sending Invite...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Upload */}
      {showCsvUpload && (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload CSV</h2>
          <p className="text-sm text-gray-500 mb-4">
            Paste a list of email addresses (one per line or comma-separated)
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="john@company.com&#10;jane@company.com&#10;bob@company.com"
            rows={6}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowCsvUpload(false)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCsvUpload}
              disabled={inviting || !csvText.trim()}
              className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviting ? 'Inviting...' : 'Invite All'}
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    No members yet. Invite your first team member above.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-medium">
                          {getMemberDisplayName(member).charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getMemberDisplayName(member)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getMemberSubtitle(member)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDepartmentName(member.department_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${getLevelBadge(member.level)}`}>
                        {getLevelLabel(member.level)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex text-xs font-medium px-2.5 py-0.5 rounded ${getStatusBadge(member.status)}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <ActionMenu items={getActionMenuItems(member)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-gray-200">
          {members.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              No members yet. Invite your first team member above.
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-medium">
                      {getMemberDisplayName(member).charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {getMemberDisplayName(member)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.role} • {getMemberSubtitle(member)}
                      </div>
                    </div>
                  </div>
                  <ActionMenu items={getActionMenuItems(member)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${getStatusBadge(member.status)}`}>
                    {member.status}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${getLevelBadge(member.level)}`}>
                    {getLevelLabel(member.level)}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {getDepartmentName(member.department_id)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value as 'exec' | 'manager' | 'ic')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="ic">Individual Contributor</option>
                  <option value="manager">Manager</option>
                  <option value="exec">Executive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">No Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Member</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to remove this member from the organization? 
              This action cannot be undone.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              Type <strong className="text-red-600">DeleteForever</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm mb-4"
              placeholder="DeleteForever"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setDeletingMember(null); setDeleteConfirmText('') }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== 'DeleteForever' || deleting}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {changingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Change Member Role</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select a new role for this member. Owners have full control, admins can manage members, and members have basic access.
            </p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="role"
                  value="member"
                  checked={newRole === 'member'}
                  onChange={() => setNewRole('member')}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">Member</span>
                  <span className="block text-xs text-gray-500">Basic access to the organization</span>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={newRole === 'admin'}
                  onChange={() => setNewRole('admin')}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">Admin</span>
                  <span className="block text-xs text-gray-500">Can manage members and departments</span>
                </div>
              </label>
              <label className="flex items-center p-3 border border-purple-200 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100">
                <input
                  type="radio"
                  name="role"
                  value="owner"
                  checked={newRole === 'owner'}
                  onChange={() => setNewRole('owner')}
                  className="h-4 w-4 text-purple-600"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-purple-900">Owner</span>
                  <span className="block text-xs text-purple-700">Full control over the organization</span>
                </div>
              </label>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setChangingRole(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={changeRole}
                disabled={changingRoleLoading}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {changingRoleLoading ? 'Changing...' : 'Change Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
