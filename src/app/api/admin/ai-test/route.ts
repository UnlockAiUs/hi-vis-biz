/**
 * @file src/app/api/admin/ai-test/route.ts
 * @description API endpoint for AI Test Lab - tests agents with sample input
 * @see MASTER_PROJECT_CONTEXT.md for full documentation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/ai/agents'
import type { AgentCode } from '@/lib/ai/agents/base'
import { withAILogging } from '@/lib/utils/ai-logger'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin/owner role
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!member || !['admin', 'owner'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request
    const body = await request.json()
    const { agent_code, input_text } = body

    if (!agent_code || !input_text) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_code and input_text' },
        { status: 400 }
      )
    }

    // Validate agent code
    const validAgents: AgentCode[] = ['pulse', 'role_mapper', 'workflow_mapper', 'pain_scanner', 'focus_tracker']
    if (!validAgents.includes(agent_code)) {
      return NextResponse.json(
        { error: `Invalid agent_code. Must be one of: ${validAgents.join(', ')}` },
        { status: 400 }
      )
    }

    // Get the agent
    const agent = getAgent(agent_code)
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agent_code}` },
        { status: 404 }
      )
    }

    // Create minimal context for testing
    const testContext = {
      userId: 'test-user-id',
      userName: 'Test User',
      jobTitle: 'Test Role',
      department: 'Test Department',
      level: 'ic' as const,
      orgId: 'test-org-id',
      orgName: 'Test Organization',
      profile: {},
      sessionId: 'test-session-id',
      topicCode: agent_code,
      hasSupervisor: false,
      conversationHistory: []
    }

    const startTime = Date.now()
    // Use AI logging for test lab calls (helps with debugging)
    const result = await withAILogging(
      `test_lab_${agent_code}`,
      () => agent.processTurn(testContext, input_text),
      { user_id: user.id }
    )
    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      agent: agent_code,
      response: result.message,
      output: result.extractedData?.data || null,
      isComplete: result.isComplete,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Test Lab error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    )
  }
}
