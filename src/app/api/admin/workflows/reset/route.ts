/**
 * FILE: src/app/api/admin/workflows/reset/route.ts
 * PURPOSE: API route for resetting workflow to AI suggestion
 * EXPORTS: POST handler
 * 
 * LOGIC:
 * - Archives the active override for a workflow
 * - Logs 'override_reverted' action to audit_log via trigger
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
    const { workflowId } = body

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Missing workflow ID' },
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

    // Archive the active override (trigger will log to audit_log)
    const { data: archivedOverride, error: archiveError } = await supabase
      .from('workflow_overrides')
      .update({ status: 'archived' })
      .eq('workflow_id', workflowId)
      .eq('status', 'active')
      .select()
      .single()

    if (archiveError && archiveError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (no active override to archive)
      console.error('Error archiving override:', archiveError)
      return NextResponse.json(
        { error: 'Failed to reset workflow' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      archivedOverride: archivedOverride || null 
    })

  } catch (error) {
    console.error('Error in workflow reset API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
