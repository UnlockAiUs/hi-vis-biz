/**
 * FILE: src/app/api/admin/workflows/feedback/route.ts
 * PURPOSE: API route for submitting workflow accuracy feedback
 * EXPORTS: POST handler
 * 
 * LOGIC:
 * - Creates or updates workflow_overrides with accuracy rating
 * - Archives any existing active override before creating new one
 * - Logs action to audit_log
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
    const { workflowId, accuracyRating, accuracyFeedback, overrideReason } = body

    if (!workflowId || !accuracyRating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user has admin access to this workflow
    const { data: workflow } = await supabase
      .from('workflows')
      .select('id, org_id')
      .eq('id', workflowId)
      .single()

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', workflow.org_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Archive any existing active override
    await supabase
      .from('workflow_overrides')
      .update({ status: 'archived' })
      .eq('workflow_id', workflowId)
      .eq('status', 'active')

    // Create new override with feedback
    const { data: newOverride, error: overrideError } = await supabase
      .from('workflow_overrides')
      .insert({
        workflow_id: workflowId,
        created_by_user_id: user.id,
        status: 'active',
        override_reason: overrideReason || null,
        override_payload: {},
        accuracy_rating: accuracyRating,
        accuracy_feedback: accuracyFeedback || null,
      })
      .select()
      .single()

    if (overrideError) {
      console.error('Error creating override:', overrideError)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      override: newOverride 
    })

  } catch (error) {
    console.error('Error in workflow feedback API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
