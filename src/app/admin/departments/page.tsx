'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Department } from '@/types/database'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newDeptName, setNewDeptName] = useState('')
  const [creating, setCreating] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  // Edit state
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete confirmation state
  const [deletingDept, setDeletingDept] = useState<Department | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

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
        .select('org_id')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single()

      if (!membership) throw new Error('Not an admin')
      
      setOrgId(membership.org_id)

      const { data: depts, error: deptsError } = await supabase
        .from('departments')
        .select('*')
        .eq('org_id', membership.org_id)
        .order('name')

      if (deptsError) throw deptsError
      setDepartments(depts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  const createDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeptName.trim() || !orgId) return

    setCreating(true)
    setError(null)

    try {
      const { data, error: createError } = await supabase
        .from('departments')
        .insert({
          org_id: orgId,
          name: newDeptName.trim(),
        })
        .select()
        .single()

      if (createError) throw createError

      setDepartments([...departments, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewDeptName('')
      setSuccess('Department created successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create department')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (dept: Department) => {
    setEditingDept(dept)
    setEditName(dept.name)
  }

  const saveEdit = async () => {
    if (!editingDept || !editName.trim()) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('departments')
        .update({ name: editName.trim() })
        .eq('id', editingDept.id)

      if (updateError) throw updateError

      setDepartments(departments.map(d => 
        d.id === editingDept.id ? { ...d, name: editName.trim() } : d
      ).sort((a, b) => a.name.localeCompare(b.name)))
      
      setEditingDept(null)
      setEditName('')
      setSuccess('Department renamed successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update department')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingDept || deleteConfirmText !== 'DeleteForever') return

    try {
      // First unassign all members from this department
      await supabase
        .from('organization_members')
        .update({ department_id: null })
        .eq('department_id', deletingDept.id)

      const { error: deleteError } = await supabase
        .from('departments')
        .delete()
        .eq('id', deletingDept.id)

      if (deleteError) throw deleteError

      setDepartments(departments.filter(d => d.id !== deletingDept.id))
      setDeletingDept(null)
      setDeleteConfirmText('')
      setSuccess('Department deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete department')
    }
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
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Departments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Organize your team into departments
        </p>
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

      {/* Add Department Form */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Add Department</h2>
        <form onSubmit={createDepartment} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input
            type="text"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            placeholder="Department name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            required
          />
          <button
            type="submit"
            disabled={creating || !newDeptName.trim()}
            className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Adding...' : 'Add Department'}
          </button>
        </form>
      </div>

      {/* Departments List - Cards on mobile, Table on desktop */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden sm:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                    No departments yet. Add your first department above.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(dept.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => startEdit(dept)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingDept(dept)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-gray-200">
          {departments.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              No departments yet. Add your first department above.
            </div>
          ) : (
            departments.map((dept) => (
              <div key={dept.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                      <div className="text-xs text-gray-500">
                        Created {new Date(dept.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(dept)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingDept(dept)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingDept && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Department</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm mb-4"
              placeholder="Department name"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setEditingDept(null); setEditName('') }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editName.trim() || editName === editingDept.name}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDept && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Department</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete <strong>&quot;{deletingDept.name}&quot;</strong>? 
              All members in this department will be unassigned.
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
                onClick={() => { setDeletingDept(null); setDeleteConfirmText('') }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== 'DeleteForever'}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
