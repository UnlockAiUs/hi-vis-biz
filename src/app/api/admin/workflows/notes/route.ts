/**
 * FILE: src/app/api/admin/workflows/notes/route.ts
 * PURPOSE: API route for managing owner notes
 * EXPORTS: POST (create), DELETE (archive) handlers
 * 
 * LOGIC:
 * - POST: Creates a new owner_note for a workflow
 * - DELETE: Archives an existing note (sets is_active = false)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { workflowId, orgId, noteType, noteText, visibleTo } = body

    if (!workflowId || !orgId || !noteType || !noteText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user has admin access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create the note
    const { data: newNote, error: noteError } = await supabase
      .from('owner_notes')
      .insert({
        org_id: orgId,
        workflow_id: workflowId,
        author_user_id: user.id,
        note_type: noteType,
        note_text: noteText,
        visible_to: visibleTo || 'admins_only',
        is_active: true,
      })
      .select()
      .single()

    if (noteError) {
      console.error('Error creating note:', noteError)
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      note: newNote 
    })

  } catch (error) {
    console.error('Error in notes API (POST):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { noteId } = body

    if (!noteId) {
      return NextResponse.json(
        { error: 'Missing note ID' },
        { status: 400 }
      )
    }

    // Get the note to verify access
    const { data: note } = await supabase
      .from('owner_notes')
      .select('id, org_id')
      .eq('id', noteId)
      .single()

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Verify user has admin access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', note.org_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Archive the note (set is_active = false)
    const { error: archiveError } = await supabase
      .from('owner_notes')
      .update({ is_active: false })
      .eq('id', noteId)

    if (archiveError) {
      console.error('Error archiving note:', archiveError)
      return NextResponse.json(
        { error: 'Failed to archive note' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in notes API (DELETE):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
