'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { OrganizationMember, Department } from '@/types/database'

type MemberWithEmail = OrganizationMember & { email?: string }

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithEmail[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  
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
      
      // Get current user's org
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: membership } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single()

      if (!membership) throw new Error('Not an admin')
      
      setOrgId(membership.org_id)

      // Get members with auth.users email
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('org_id', membership.org_id)
        .order('created_at', { ascending: false })

      if (membersError) throw membersError

      // Get departments
      const { data: depts } = await supabase
        .from('departments')
        .select('*')
        .eq('org_id', membership.org_id)
        .order('name')

      setDepartments(depts || [])
      setMembers(membersData || [])
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
      // Call our API route to invite the user
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

      // Invite each email
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

  const updateMemberLevel = async (memberId: string, level: 'exec' | 'manager' | 'ic') => {
    try {
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ level })
        .eq('id', memberId)

      if (updateError) throw updateError

      setMembers(members.map(m => 
        m.id === memberId ? { ...m, level } : m
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization&apos;s team members
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCsvUpload(true); setShowAddForm(false) }}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Upload CSV
          </button>
          <button
            onClick={() => { setShowAddForm(true); setShowCsvUpload(false) }}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
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
        <div className="bg-white shadow rounded-lg p-6 mb-6">
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Level</label>
                <select
                  value={newMember.level}
                  onChange={(e) => setNewMember({ ...newMember, level: e.target.value as 'exec' | 'manager' | 'ic' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">No Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting || !newMember.email.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviting ? 'Sending Invite...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Upload */}
      {showCsvUpload && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload CSV</h2>
          <p className="text-sm text-gray-500 mb-4">
            Paste a list of email addresses (one per line or comma-separated)
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="john@company.com&#10;jane@company.com&#10;bob@company.com"
            rows={6}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowCsvUpload(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCsvUpload}
              disabled={inviting || !csvText.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviting ? 'Inviting...' : 'Invite All'}
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gray-200 text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.user_id.slice(0, 8)}...
                        </div>
                        <div className="text-sm text-gray-500">
                          Member since {new Date(member.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getDepartmentName(member.department_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={member.level || 'ic'}
                      onChange={(e) => updateMemberLevel(member.id, e.target.value as 'exec' | 'manager' | 'ic')}
                      className={`text-xs font-medium px-2.5 py-0.5 rounded ${getLevelBadge(member.level)} border-0 cursor-pointer`}
                    >
                      <option value="ic">IC</option>
                      <option value="manager">Manager</option>
                      <option value="exec">Executive</option>
                    </select>
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
                    {member.role !== 'owner' && (
                      member.status === 'active' ? (
                        <button
                          onClick={() => updateMemberStatus(member.id, 'inactive')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Deactivate
                        </button>
                      ) : member.status === 'inactive' ? (
                        <button
                          onClick={() => updateMemberStatus(member.id, 'active')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Activate
                        </button>
                      ) : null
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
