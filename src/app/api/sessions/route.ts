import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/sessions - List user's sessions
export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // 'pending', 'completed', 'all'
  const limit = parseInt(searchParams.get('limit') || '10')
  
  let query = supabase
    .from('sessions')
    .select(`
      *,
      agents (
        name,
        description
      )
    `)
    .eq('user_id', user.id)
    .order('scheduled_for', { ascending: true })
    .limit(limit)
  
  if (status === 'pending') {
    query = query.is('completed_at', null)
  } else if (status === 'completed') {
    query = query.not('completed_at', 'is', null)
  }
  
  const { data: sessions, error } = await query
  
  if (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
  
  return NextResponse.json({ sessions })
}

// POST /api/sessions - Create a new session (for manual triggers)
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  const { agent_code, topic_codes } = body
  
  if (!agent_code) {
    return NextResponse.json({ error: 'agent_code is required' }, { status: 400 })
  }
  
  // Get user's org
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()
  
  if (!membership) {
    return NextResponse.json({ error: 'User not in an organization' }, { status: 400 })
  }
  
  // Create session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      org_id: membership.org_id,
      user_id: user.id,
      agent_code,
      scheduled_for: new Date().toISOString(),
      source: 'manual'
    })
    .select()
    .single()
  
  if (sessionError) {
    console.error('Error creating session:', sessionError)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
  
  // Add session topics if provided
  if (topic_codes && Array.isArray(topic_codes) && topic_codes.length > 0) {
    const topicsToInsert = topic_codes.map((topic_code: string, index: number) => ({
      session_id: session.id,
      topic_code,
      sequence: index + 1
    }))
    
    await supabase.from('session_topics').insert(topicsToInsert)
  }
  
  return NextResponse.json({ session })
}
