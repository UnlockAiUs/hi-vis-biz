/**
 * FILE: src/app/admin/workflows/[id]/OwnerNotes.tsx
 * PURPOSE: Owner notes section with composer and display
 * EXPORTS: default OwnerNotes (client component)
 * 
 * LOGIC:
 * - Displays existing notes with type chips
 * - Provides note composer with visibility selector
 * - Creates owner_notes in database
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OwnerNote {
  id: string
  note_type: string
  note_text: string
  visible_to: string
  is_active: boolean
  created_at: string
  author: { display_name: string } | null
}

interface OwnerNotesProps {
  workflowId: string
  orgId: string
  existingNotes: OwnerNote[]
}

const NOTE_TYPES = [
  { value: 'clarification', label: 'Clarification', color: 'bg-blue-100 text-blue-700' },
  { value: 'policy', label: 'Policy', color: 'bg-purple-100 text-purple-700' },
  { value: 'question', label: 'Question', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'alert', label: 'Alert', color: 'bg-red-100 text-red-700' },
  { value: 'exception', label: 'Exception', color: 'bg-orange-100 text-orange-700' },
]

const VISIBILITY_OPTIONS = [
  { value: 'admins_only', label: 'Admins only' },
  { value: 'managers', label: 'Managers & admins' },
  { value: 'everyone', label: 'Everyone' },
]

export default function OwnerNotes({ 
  workflowId, 
  orgId, 
  existingNotes 
}: OwnerNotesProps) {
  const router = useRouter()
  const [showComposer, setShowComposer] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Composer form state
  const [noteType, setNoteType] = useState('clarification')
  const [noteText, setNoteText] = useState('')
  const [visibleTo, setVisibleTo] = useState('admins_only')

  const handleSubmit = async () => {
    if (!noteText.trim()) {
      setError('Please enter a note')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/workflows/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          orgId,
          noteType,
          noteText: noteText.trim(),
          visibleTo,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add note')
      }

      // Reset form
      setNoteText('')
      setNoteType('clarification')
      setVisibleTo('admins_only')
      setShowComposer(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchiveNote = async (noteId: string) => {
    if (!confirm('Archive this note?')) return

    try {
      const response = await fetch('/api/admin/workflows/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })

      if (!response.ok) {
        throw new Error('Failed to archive note')
      }

      router.refresh()
    } catch (err) {
      console.error('Error archiving note:', err)
    }
  }

  const getNoteTypeConfig = (type: string) => {
    return NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[0]
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Owner Notes</h2>
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
        >
          {showComposer ? 'Cancel' : '+ Add Note'}
        </button>
      </div>

      {/* Note Composer */}
      {showComposer && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note Type
            </label>
            <div className="flex flex-wrap gap-2">
              {NOTE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setNoteType(type.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    noteType === type.value
                      ? `${type.color} ring-2 ring-offset-1 ring-gray-400`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder="Add context about this workflow..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can see this?
            </label>
            <select
              value={visibleTo}
              onChange={(e) => setVisibleTo(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}

      {/* Existing Notes */}
      {existingNotes.length > 0 ? (
        <div className="space-y-3">
          {existingNotes.map((note) => {
            const typeConfig = getNoteTypeConfig(note.note_type)
            return (
              <div 
                key={note.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{note.note_text}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>{note.author?.display_name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="capitalize">{note.visible_to.replace('_', ' ')}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleArchiveNote(note.id)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Archive note"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          No notes yet. Add notes to provide context for your team and AI.
        </p>
      )}
    </div>
  )
}
