import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/sessions/[id] - Get session details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const sessionId = params.id
  
  // Get session with related data
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      agents (
        name,
        description
      ),
      session_topics (
        id,
        topic_code,
        sequence,
        topic_archetypes (
          display_name,
          kind
        )
      ),
      answers (
        id,
        topic_code,
        answer_text,
        answer_json,
        transcript_json,
        created_at
      )
    `)
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()
  
  if (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  return NextResponse.json({ session })
}

// PATCH /api/sessions/[id] - Update session (start, complete)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const sessionId = params.id
  const body = await request.json()
  const { action } = body // 'start' or 'complete'
  
  // Verify session belongs to user
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id, started_at, completed_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()
  
  if (!existingSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  let updateData: Record<string, string> = {}
  
  if (action === 'start' && !existingSession.started_at) {
    updateData.started_at = new Date().toISOString()
  } else if (action === 'complete' && !existingSession.completed_at) {
    updateData.completed_at = new Date().toISOString()
    if (!existingSession.started_at) {
      updateData.started_at = new Date().toISOString()
    }
  }
  
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid action' }, { status: 400 })
  }
  
  const { data: session, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
  
  return NextResponse.json({ session })
}
