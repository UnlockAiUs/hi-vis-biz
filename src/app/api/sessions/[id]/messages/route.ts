/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/api/sessions/[id]/messages/route.ts
 * PURPOSE: Core AI conversation endpoint - processes messages through AI agents
 * EXPORTS: POST handler
 * 
 * KEY LOGIC:
 * - Handles isOpening=true to get agent's opening message
 * - Processes user messages through agent.processTurn()
 * - Builds AgentContext with user profile, membership, supervisor info
 * - Maintains conversation history in answers.transcript_json
 * - Auto-marks session started/completed based on conversation state
 * - Stores extractedData from agent when conversation completes
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAgent, AgentContext, isValidAgentCode } from '@/lib/ai/agents'
import { ProfileJson } from '@/types/database'

// POST /api/sessions/[id]/messages - Send a message and get AI response
export async function POST(
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
  const { message, isOpening } = body // isOpening: true to get opening message without user input
  
  // Get session with context
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      *,
      organizations (
        name
      )
    `)
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  if (session.completed_at) {
    return NextResponse.json({ error: 'Session already completed' }, { status: 400 })
  }
  
  // Mark session as started if not already
  if (!session.started_at) {
    await supabase
      .from('sessions')
      .update({ started_at: new Date().toISOString() })
      .eq('id', sessionId)
  }
  
  // Get user profile for context
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('profile_json')
    .eq('user_id', user.id)
    .single()
  
  // Get user membership for context
  const { data: membership } = await supabase
    .from('organization_members')
    .select(`
      level,
      supervisor_user_id,
      departments (
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('org_id', session.org_id)
    .single()
  
  // Get supervisor name if exists
  let supervisorName: string | undefined
  if (membership?.supervisor_user_id) {
    const { data: supervisorProfile } = await supabase
      .from('user_profiles')
      .select('profile_json')
      .eq('user_id', membership.supervisor_user_id)
      .single()
    
    if (supervisorProfile?.profile_json) {
      const supervisorJson = supervisorProfile.profile_json as Record<string, unknown>
      supervisorName = supervisorJson?.name as string | undefined
    }
  }
  
  // Get existing answers for this session (conversation history)
  const { data: existingAnswers } = await supabase
    .from('answers')
    .select('transcript_json')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  
  // Build conversation history from existing answers
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  if (existingAnswers) {
    for (const answer of existingAnswers) {
      const transcript = answer.transcript_json as Array<{ role: string; content: string }> | null
      if (transcript && Array.isArray(transcript)) {
        for (const msg of transcript) {
          conversationHistory.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })
        }
      }
    }
  }
  
  // Get the agent
  if (!isValidAgentCode(session.agent_code)) {
    return NextResponse.json({ error: 'Invalid agent code' }, { status: 400 })
  }
  
  const agent = getAgent(session.agent_code)
  
  // Build agent context
  const profileJson = userProfile?.profile_json as ProfileJson | undefined
  const userName = profileJson?.role_summary?.split(' ')[0] || user.email?.split('@')[0] || 'there'
  // departments is an array from the join
  const departmentsArray = membership?.departments as { name: string }[] | null
  const department = departmentsArray && departmentsArray.length > 0 ? departmentsArray[0] : null
  
  const agentContext: AgentContext = {
    userId: user.id,
    userName,
    jobTitle: profileJson?.role_summary,
    department: department?.name,
    level: membership?.level as 'exec' | 'manager' | 'ic' | null,
    orgId: session.org_id,
    orgName: (session.organizations as { name: string })?.name || 'your organization',
    profile: profileJson,
    sessionId,
    topicCode: session.agent_code, // Using agent_code as topic for now
    hasSupervisor: !!membership?.supervisor_user_id,
    supervisorName,
    conversationHistory
  }
  
  try {
    // If this is an opening message request, get the opening message
    if (isOpening && conversationHistory.length === 0) {
      const openingMessage = await agent.getOpeningMessage(agentContext)
      
      // Save the opening message to answers as transcript
      const transcript = [{ role: 'assistant', content: openingMessage }]
      
      await supabase.from('answers').insert({
        org_id: session.org_id,
        session_id: sessionId,
        topic_code: session.agent_code,
        user_id: user.id,
        agent_code: session.agent_code,
        transcript_json: transcript
      })
      
      return NextResponse.json({
        message: openingMessage,
        isComplete: false
      })
    }
    
    // Process the user's message
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    
    const result = await agent.processTurn(agentContext, message)
    
    // Update or create answer with transcript
    const newTranscript = [
      ...conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: result.message }
    ]
    
    // Get the last answer to update, or create new one
    const { data: lastAnswer } = await supabase
      .from('answers')
      .select('id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (lastAnswer) {
      // Update existing answer with full transcript
      await supabase
        .from('answers')
        .update({
          transcript_json: newTranscript,
          answer_json: result.isComplete && result.extractedData ? result.extractedData.data : null
        })
        .eq('id', lastAnswer.id)
    } else {
      // Create new answer
      await supabase.from('answers').insert({
        org_id: session.org_id,
        session_id: sessionId,
        topic_code: session.agent_code,
        user_id: user.id,
        agent_code: session.agent_code,
        transcript_json: newTranscript,
        answer_json: result.isComplete && result.extractedData ? result.extractedData.data : null
      })
    }
    
    // If conversation is complete, mark session as completed
    if (result.isComplete) {
      await supabase
        .from('sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionId)
    }
    
    return NextResponse.json({
      message: result.message,
      isComplete: result.isComplete,
      extractedData: result.extractedData
    })
  } catch (error) {
    console.error('Error processing message:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
